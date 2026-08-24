/**
 * Restore customer documents that were deleted directly from the DB while
 * accounts / bills / cash memos / returns still reference them.
 *
 * Recreates each missing customer with its ORIGINAL _id (so every existing
 * reference becomes valid again) and placeholder data you can edit later
 * from the Accounts page.
 *
 * Usage (from server/):
 *   node scripts/restore-missing-customers.mjs --dry-run
 *   node scripts/restore-missing-customers.mjs
 *
 * Environment (or server/.env):
 *   MONGODB_URI — target database
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI ?? '';
const DRY_RUN = process.argv.includes('--dry-run');

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set (server/.env)');
  process.exit(1);
}

// collection name → field holding the customer reference
const REFERENCING_COLLECTIONS = [
  ['accounts', 'customerId'],
  ['bills', 'customerId'],
  ['cashmemos', 'customerId'],
  ['returnitems', 'customerId'],
];

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  console.log(`Connected to ${db.databaseName}${DRY_RUN ? ' (dry run)' : ''}`);

  // 1. Gather every referenced customerId along with its tenantId.
  //    Map: customerId (hex) → { tenantId, sources: [collection names] }
  const referenced = new Map();
  for (const [collection, field] of REFERENCING_COLLECTIONS) {
    const cursor = db
      .collection(collection)
      .find({ [field]: { $ne: null } }, { projection: { [field]: 1, tenantId: 1 } });
    for await (const doc of cursor) {
      const id = doc[field]?.toString();
      if (!id) continue;
      const entry = referenced.get(id) ?? { tenantId: doc.tenantId, sources: new Set() };
      entry.tenantId = entry.tenantId ?? doc.tenantId;
      entry.sources.add(collection);
      referenced.set(id, entry);
    }
  }
  console.log(`Found ${referenced.size} distinct referenced customer ids`);

  // 2. Which of them are missing from the customers collection?
  const ids = [...referenced.keys()].map((id) => new mongoose.Types.ObjectId(id));
  const existing = await db
    .collection('customers')
    .find({ _id: { $in: ids } }, { projection: { _id: 1 } })
    .toArray();
  const existingSet = new Set(existing.map((c) => c._id.toString()));
  const missing = [...referenced.entries()].filter(([id]) => !existingSet.has(id));

  if (missing.length === 0) {
    console.log('No missing customers — all references are intact.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Missing customers to restore: ${missing.length}`);

  // 3. Recreate each missing customer under its original _id.
  const now = new Date();
  let restored = 0;
  for (const [id, info] of missing) {
    const doc = {
      _id: new mongoose.Types.ObjectId(id),
      tenantId: info.tenantId,
      name: `Recovered Customer ${id.slice(-4).toUpperCase()}`,
      phone: '',
      address: '',
      createdAt: now,
      updatedAt: now,
    };
    console.log(
      `${DRY_RUN ? '[dry-run] would restore' : 'restoring'} ${doc.name} (${id}) ` +
        `referenced by: ${[...info.sources].join(', ')}`
    );
    if (!DRY_RUN) {
      await db.collection('customers').insertOne(doc);
      restored += 1;
    }
  }

  console.log(
    DRY_RUN
      ? `Dry run complete — ${missing.length} customer(s) would be restored.`
      : `Done — restored ${restored} customer(s). Edit their name/phone from the Accounts page.`
  );
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
