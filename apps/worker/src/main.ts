import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();

  console.log("🔄 CineMatch Worker started");
  console.log("📮 Listening for BullMQ jobs on Redis...");

  // Keep the process alive until shutdown.
  // Once queue processors are registered (Phase 4), BullMQ's
  // Redis subscriptions will naturally hold the event loop open
  // and this interval can be removed.
  const keepAlive = setInterval(() => {}, 1 << 30);

  const shutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down gracefully...`);
    clearInterval(keepAlive);
    await app.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  console.error("Failed to start worker:", err);
  process.exit(1);
});
