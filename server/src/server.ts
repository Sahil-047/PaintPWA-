import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { startReportCron } from './jobs/report.cron.js';
import { ensureSuperAdmin, migrateLegacyTenants } from './modules/admin/admin.service.js';

async function main() {
  await connectDB();
  await migrateLegacyTenants();
  await ensureSuperAdmin();
  startReportCron();

  const server = app.listen(env.PORT, () => {
    console.log(`paintapp running on port ${env.PORT}`);
    console.log(`Environment: ${env.NODE_ENV}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${env.PORT} is already in use. Stop the other process or change PORT in server/.env`);
      process.exit(1);
    }
    throw err;
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

