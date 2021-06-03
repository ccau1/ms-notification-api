require("dotenv").config();
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { RequestTimeLogInterceptor } from "./core/interceptors/RequestTimeLogInterceptor";
import { FileSDK } from "@oodles-dev/file-sdk";
import { HttpExceptionFilter } from "./core/pipes/http-exception.filter";
import { urlencoded, json } from "express";
import timeout from "connect-timeout";
import { Locale, LocaleMiddleware } from "@oodles-dev/nest-locale-module";

Locale.defaultLocale = process.env.DEFAULT_LOCALE;

async function bootstrap() {
  const port = process.env.PORT || 3000;
  FileSDK.fileApiUrl = process.env.API_FILE;
  FileSDK.bucketFilePath = process.env.FILE_SDK_BUCKET_FILE_PATH;
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.use(
    urlencoded({ limit: "20mb", extended: true, parameterLimit: 1000000 })
  );
  app.use(json({ limit: "20mb" }));
  app.use(timeout(30000)); // 600,000=> 10Min, 1200,000=>20Min, 1800,000=>30Min
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );
  app.use(LocaleMiddleware);
  app.useGlobalInterceptors(new RequestTimeLogInterceptor());
  await app.listen(port);
  console.info(`Application started on port ${port}`);
}
bootstrap();
