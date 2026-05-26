import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = process.env.API_PORT || 3000;

  await app.listen(port);
  console.log(`🎬 CineMatch API running on http://localhost:${port}`);
  console.log(`📊 Health check: GET http://localhost:${port}/health`);
}

bootstrap().catch((err) => {
  console.error("Failed to start API:", err);
  process.exit(1);
});
