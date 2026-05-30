import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { WsAdapter } from "@nestjs/platform-ws";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // MatchGateway runs on the native `ws` server (not socket.io), so the
  // ws adapter must be registered for its handlers to receive messages.
  app.useWebSocketAdapter(new WsAdapter(app));

  // Dev-friendly CORS: allow the Expo web bundle (and any local dev origin)
  // to call the REST API. Tighten this before production.
  app.enableCors({ origin: true, credentials: true });

  app.setGlobalPrefix("api/v1", { exclude: ["health"] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("CineMatch API")
    .setDescription("REST + WebSocket API for the CineMatch movie-matching app")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.API_PORT || 3000;
  await app.listen(port);

  console.log(`🎬 CineMatch API running on http://localhost:${port}`);
  console.log(`📊 Health: GET http://localhost:${port}/health`);
  console.log(`📚 Swagger: http://localhost:${port}/api/docs`);
}

bootstrap().catch((err) => {
  console.error("Failed to start API:", err);
  process.exit(1);
});
