import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();

  console.log("🔄 CineMatch Worker started");
  console.log("📮 Listening for BullMQ jobs on Redis...");

  const shutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down gracefully...`);
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
