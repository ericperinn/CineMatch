import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  console.log("🔄 CineMatch Worker started");
  console.log("📮 Listening for BullMQ jobs on Redis...");

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down gracefully...");
    await app.close();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("SIGINT received, shutting down gracefully...");
    await app.close();
    process.exit(0);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start worker:", err);
  process.exit(1);
});
