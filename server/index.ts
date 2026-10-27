import { createApp } from './app';
import { pool } from './db';
import { env } from './env';
import { logger } from './logger';
import { migrate } from './migrate';
import { closePdfBrowser } from './routes/pdf';

async function main() {
  await migrate();
  const server = createApp().listen(env.PORT, () => logger.info(`PrepLedger listening on http://localhost:${env.PORT}`));
  const shutdown = async () => {
    logger.info('shutting down');
    server.close();
    await closePdfBrowser();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((e) => {
  logger.fatal(e);
  process.exit(1);
});
