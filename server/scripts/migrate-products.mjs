/**
 * Migrate brands, product types, and products from paintPWA → paint-saas.
 *
 * Usage (from server/):
 *   node scripts/migrate-products.mjs
 *   node scripts/migrate-products.mjs --dry-run
 *
 * Environment (or server/.env):
 *   SOURCE_MONGODB_URI  — legacy DB (default: paintPWA)
 *   TARGET_MONGODB_URI  — v2 DB (falls back to MONGODB_URI)
 *   TENANT_ID           — optional; uses existing tenant or auto-creates one
 *   MIGRATE_TENANT_NAME / MIGRATE_TENANT_SLUG — override auto-created tenant
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env') });

const PAINT_SIZES = ['50ml', '100ml', '200ml', '500ml', '1L', '4L', '10L', '20L'];

const SOURCE_URI =
  process.env.SOURCE_MONGODB_URI ??
  'mongodb://adminUser:Beingsahil%402002@31.97.224.214:27017/paintPWA?authSource=admin';

const TARGET_URI =
  process.env.TARGET_MONGODB_URI ?? process.env.MONGODB_URI ?? '';

const TENANT_ID = process.env.TENANT_ID?.trim() || '';
const CREATE_TENANT_NAME = process.env.MIGRATE_TENANT_NAME?.trim() || '';
const CREATE_TENANT_SLUG = process.env.MIGRATE_TENANT_SLUG?.trim() || '';
const DRY_RUN = process.argv.includes('--dry-run');

function emptySizeMap() {
  return Object.fromEntries(PAINT_SIZES.map((s) => [s, 0]));
}

function normalizeSizeMap(raw) {
  const out = emptySizeMap();
  if (!raw || typeof raw !== 'object') return out;
  for (const size of PAINT_SIZES) {
    const v = raw[size];
    out[size] = typeof v === 'number' && v >= 0 ? v : 0;
  }
  return out;
}

function sumStock(map) {
  return PAINT_SIZES.reduce((n, s) => n + (map[s] ?? 0), 0);
}

function inferIcon(name) {
  const n = String(name).toLowerCase();
  if (n.includes('emulsion')) return 'paintbrush';
  if (n.includes('distemper')) return 'droplets';
  if (n.includes('primer')) return 'layers';
  if (n.includes('water')) return 'shield';
  if (n.includes('enamel')) return 'brush';
  if (n.includes('exterior')) return 'home';
  return 'package';
}

function typeCollection(db) {
  return db.collection('producttypes');
}

async function createTenant(targetDb, name, slug) {
  const doc = {
    name,
    slug: slug.toLowerCase(),
    plan: 'free',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  if (DRY_RUN) {
    console.log(`[dry-run] would create tenant: ${doc.name} (${doc.slug})`);
    return new mongoose.Types.ObjectId();
  }
  const result = await targetDb.collection('tenants').insertOne(doc);
  console.log(`Created tenant: ${doc.name} (${result.insertedId})`);
  return result.insertedId;
}

async function resolveTenantId(targetDb) {
  if (TENANT_ID) {
    const tenant = await targetDb.collection('tenants').findOne({
      _id: new mongoose.Types.ObjectId(TENANT_ID),
    });
    if (!tenant) throw new Error(`TENANT_ID not found in target: ${TENANT_ID}`);
    console.log(`Using tenant: ${tenant.name} (${tenant._id})`);
    return tenant._id;
  }

  const tenant = await targetDb.collection('tenants').findOne({}, { sort: { createdAt: 1 } });
  if (tenant) {
    console.log(`Using tenant: ${tenant.name} (${tenant._id})`);
    return tenant._id;
  }

  const name = CREATE_TENANT_NAME || 'Paint ERP Shop';
  const slug = CREATE_TENANT_SLUG || 'paint-erp-shop';
  console.log('No tenant in paint-saas — creating one for migration…');
  return createTenant(targetDb, name, slug);
}

async function ensureBrands(sourceDb, targetDb, tenantId) {
  const sourceBrands = await sourceDb.collection('brands').find({}).toArray();
  const targetBrandIds = new Set(
    (await targetDb.collection('brands').find({}, { projection: { _id: 1 } }).toArray()).map(
      (b) => b._id.toString()
    )
  );

  let inserted = 0;
  let skipped = 0;

  for (const brand of sourceBrands) {
    const id = brand._id.toString();
    if (targetBrandIds.has(id)) {
      skipped++;
      continue;
    }

    const doc = {
      _id: brand._id,
      tenantId,
      name: brand.name?.trim() ?? 'Unknown',
      image: brand.image ?? '',
      isActive: brand.isActive !== false,
      createdAt: brand.createdAt ?? new Date(),
      updatedAt: brand.updatedAt ?? new Date(),
    };

    if (DRY_RUN) {
      console.log(`[dry-run] would insert brand: ${doc.name}`);
      inserted++;
      continue;
    }

    try {
      await targetDb.collection('brands').insertOne(doc);
      targetBrandIds.add(id);
      inserted++;
      console.log(`Brand migrated: ${doc.name}`);
    } catch (err) {
      if (err.code === 11000) {
        skipped++;
      } else {
        console.warn(`Brand skip ${doc.name}:`, err.message);
      }
    }
  }

  return { inserted, skipped, total: sourceBrands.length };
}

/**
 * Legacy product types are global (name only). v2 scopes types per brand + tenant.
 * We derive (brandId, typeName) pairs from products and merge metadata from producttypes.
 */
async function migrateProductTypes(sourceDb, targetDb, tenantId, validBrandIds) {
  const sourceTypes = await typeCollection(sourceDb).find({}).toArray();
  const sourceProducts = await sourceDb.collection('products').find({}).toArray();

  const typeMeta = new Map();
  for (const t of sourceTypes) {
    const name = String(t.name ?? '').trim();
    if (!name) continue;
    typeMeta.set(name, {
      icon: t.icon?.trim() || inferIcon(name),
      isActive: t.isActive !== false,
      sourceId: t._id,
    });
  }

  /** @type {Map<string, { brandId: import('mongoose').Types.ObjectId, name: string, icon: string, isActive: boolean, sourceId?: import('mongoose').Types.ObjectId }>} */
  const pairs = new Map();

  for (const p of sourceProducts) {
    const brandId = p.brand?.toString?.() ?? String(p.brand ?? '');
    const name = String(p.type ?? '').trim();
    if (!name || !validBrandIds.has(brandId)) continue;

    const key = `${brandId}|${name}`;
    if (pairs.has(key)) continue;

    const meta = typeMeta.get(name);
    pairs.set(key, {
      brandId: p.brand,
      name,
      icon: meta?.icon ?? inferIcon(name),
      isActive: meta?.isActive ?? true,
      sourceId: meta?.sourceId,
    });
  }

  // Types defined in source but with no products — attach to every migrated brand
  for (const [typeName, meta] of typeMeta) {
    const usedByProducts = sourceProducts.some(
      (p) => String(p.type ?? '').trim() === typeName
    );
    if (usedByProducts) continue;

    for (const brandIdStr of validBrandIds) {
      const key = `${brandIdStr}|${typeName}`;
      if (pairs.has(key)) continue;
      pairs.set(key, {
        brandId: new mongoose.Types.ObjectId(brandIdStr),
        name: typeName,
        icon: meta.icon,
        isActive: meta.isActive,
        sourceId: meta.sourceId,
      });
    }
  }

  console.log(`\nProduct type pairs to migrate: ${pairs.size} (${sourceTypes.length} in source producttypes)`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const [, entry] of pairs) {
    const doc = {
      tenantId,
      brandId: entry.brandId,
      name: entry.name,
      icon: entry.icon || inferIcon(entry.name),
      isActive: entry.isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (DRY_RUN) {
      console.log(`[dry-run] would upsert type: ${entry.name} (brand ${entry.brandId})`);
      migrated++;
      continue;
    }

    try {
      const existing = await typeCollection(targetDb).findOne({
        tenantId,
        brandId: entry.brandId,
        name: entry.name,
      });

      if (existing) {
        await typeCollection(targetDb).updateOne(
          { _id: existing._id },
          {
            $set: {
              icon: doc.icon,
              isActive: doc.isActive,
              updatedAt: doc.updatedAt,
            },
          }
        );
        skipped++;
        continue;
      }

      // Preserve legacy _id only when this type maps to a single brand
      const brandsForName = [...pairs.values()].filter((v) => v.name === entry.name);
      if (brandsForName.length === 1 && entry.sourceId) {
        doc._id = entry.sourceId;
      }

      await typeCollection(targetDb).insertOne(doc);
      migrated++;
      if (migrated % 25 === 0) console.log(`  … ${migrated} product types inserted`);
    } catch (err) {
      if (err.code === 11000) {
        skipped++;
      } else {
        console.warn(`Type fail "${entry.name}":`, err.message);
        failed++;
      }
    }
  }

  return { migrated, skipped, failed, total: pairs.size, sourceTypeCount: sourceTypes.length };
}

function mapProduct(doc, tenantId, validBrandIds) {
  const brandId = doc.brand?.toString?.() ?? String(doc.brand);
  if (!validBrandIds.has(brandId)) {
    return { error: `brand ${brandId} missing in target` };
  }

  const stockBySize = normalizeSizeMap(doc.stockBySize);
  const stockFromSizes = sumStock(stockBySize);
  const stock =
    stockFromSizes > 0 ? stockFromSizes : typeof doc.stock === 'number' ? doc.stock : 0;

  if (stockFromSizes === 0 && stock > 0) {
    stockBySize['1L'] = stock;
  }

  return {
    _id: doc._id,
    tenantId,
    name: String(doc.name ?? '').trim(),
    brand: doc.brand,
    type: String(doc.type ?? 'General').trim(),
    productCode: String(doc.productCode ?? '').trim(),
    productImage: doc.productImage ?? '',
    description: doc.description ?? '',
    base: doc.base ?? '',
    unit: doc.unit ?? 'L',
    stock,
    lowStockThreshold: doc.lowStockThreshold ?? 5,
    stockBySize,
    isActive: doc.isActive !== false,
    createdAt: doc.createdAt ?? new Date(),
    updatedAt: doc.updatedAt ?? new Date(),
  };
}

async function migrateProducts(sourceDb, targetDb, tenantId, validBrandIds) {
  const sourceProducts = await sourceDb.collection('products').find({}).toArray();
  console.log(`\nSource products: ${sourceProducts.length}`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const raw of sourceProducts) {
    const mapped = mapProduct(raw, tenantId, validBrandIds);

    if (mapped.error) {
      console.warn(`Skip "${raw.name}": ${mapped.error}`);
      skipped++;
      continue;
    }

    if (!mapped.name || !mapped.productCode) {
      console.warn(`Skip _id ${raw._id}: missing name or productCode`);
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`[dry-run] would upsert product: ${mapped.name} (${mapped.productCode})`);
      migrated++;
      continue;
    }

    try {
      await targetDb.collection('products').replaceOne(
        { _id: mapped._id },
        mapped,
        { upsert: true }
      );
      migrated++;
      if (migrated % 50 === 0) console.log(`  … ${migrated} products migrated`);
    } catch (err) {
      if (err.code === 11000) {
        try {
          const { _id, ...withoutId } = mapped;
          await targetDb.collection('products').replaceOne(
            {
              tenantId: mapped.tenantId,
              brand: mapped.brand,
              productCode: mapped.productCode,
              base: mapped.base ?? '',
            },
            { ...withoutId, _id },
            { upsert: true }
          );
          migrated++;
        } catch (err2) {
          console.warn(`Fail "${mapped.name}":`, err2.message);
          failed++;
        }
      } else {
        console.warn(`Fail "${mapped.name}":`, err.message);
        failed++;
      }
    }
  }

  return { migrated, skipped, failed, total: sourceProducts.length };
}

async function main() {
  if (!TARGET_URI) {
    console.error('Set TARGET_MONGODB_URI or MONGODB_URI in server/.env');
    process.exit(1);
  }

  console.log('Paint PWA → paint-saas migration (brands, product types, products)');
  console.log(`Source: ${SOURCE_URI.replace(/:[^:@/]+@/, ':***@')}`);
  console.log(`Target: ${TARGET_URI.replace(/:[^:@/]+@/, ':***@')}`);
  if (DRY_RUN) console.log('Mode: DRY RUN (no writes)\n');

  const sourceConn = await mongoose.createConnection(SOURCE_URI).asPromise();
  const targetConn = await mongoose.createConnection(TARGET_URI).asPromise();

  const sourceDb = sourceConn.db;
  const targetDb = targetConn.db;

  try {
    const tenantId = await resolveTenantId(targetDb);

    console.log('\n--- Brands ---');
    const brandStats = await ensureBrands(sourceDb, targetDb, tenantId);
    console.log(
      `Brands: ${brandStats.inserted} inserted, ${brandStats.skipped} already present (${brandStats.total} in source)`
    );

    const validBrandIds = new Set(
      (await targetDb.collection('brands').find({ tenantId }, { projection: { _id: 1 } }).toArray()).map(
        (b) => b._id.toString()
      )
    );

    console.log('\n--- Product types ---');
    const typeStats = await migrateProductTypes(sourceDb, targetDb, tenantId, validBrandIds);
    console.log(
      `Types: ${typeStats.migrated} inserted, ${typeStats.skipped} updated/existing, ${typeStats.failed} failed (${typeStats.total} pairs, ${typeStats.sourceTypeCount} in source)`
    );

    console.log('\n--- Products ---');
    const productStats = await migrateProducts(sourceDb, targetDb, tenantId, validBrandIds);

    console.log('\n--- Summary ---');
    console.log(`Product types inserted: ${typeStats.migrated}`);
    console.log(`Product types skipped:  ${typeStats.skipped}`);
    console.log(`Products migrated: ${productStats.migrated}`);
    console.log(`Products skipped:  ${productStats.skipped}`);
    console.log(`Products failed:   ${productStats.failed}`);
    console.log(`Products in source: ${productStats.total}`);

    const typeCount = await typeCollection(targetDb).countDocuments({ tenantId });
    const targetCount = await targetDb.collection('products').countDocuments({ tenantId });
    console.log(`Product types in target (tenant): ${typeCount}`);
    console.log(`Products in target (tenant): ${targetCount}`);
  } finally {
    await sourceConn.close();
    await targetConn.close();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
