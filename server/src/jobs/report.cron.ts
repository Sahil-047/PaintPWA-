import cron from 'node-cron';
import { TenantModel } from '../modules/auth/auth.model.js';
import { buildMonthlySnapshot } from '../modules/reports/reports.service.js';
import { Types } from 'mongoose';

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function startReportCron(): void {
  // Runs daily at 2 AM — materialises current month snapshot per tenant
  cron.schedule('0 2 * * *', async () => {
    const period = currentPeriod();
    const tenants = await TenantModel.find().select('_id');

    for (const tenant of tenants) {
      try {
        await buildMonthlySnapshot(tenant._id as Types.ObjectId, period);
        console.log(`Report snapshot built for tenant ${tenant._id} — ${period}`);
      } catch (err) {
        console.error(`Snapshot failed for tenant ${tenant._id}:`, err);
      }
    }
  });

  console.log('Report cron scheduled (daily 2 AM)');
}
