import { createApp } from './app';

async function main() {
  const app = await createApp();

  try {
    const host = process.env.HOST || '0.0.0.0';
    const port = parseInt(process.env.PORT || '3000', 10);

    await app.listen({ host, port });
    console.log(`🚀 Server running at http://${host}:${port}`);
    console.log(`📚 API docs: http://${host}:${port}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
