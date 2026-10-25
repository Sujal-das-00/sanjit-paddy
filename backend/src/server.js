const { createApp } = require('./app');
const { env } = require('./config/env');
// const { ensurePaymentSchema } = require('./config/bootstrap');
const { runPendingMigrations } = require('./config/migrations');

async function startServer() {
  // await ensurePaymentSchema();
  await runPendingMigrations();
  const app = createApp();

  app.listen(env.port, () => {
    console.log(`Paddy backend running on port ${env.port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start paddy backend', error);
  process.exit(1);
});
