import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import basicAuth from 'express-basic-auth';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const swaggerUser = configService.get<string>('SWAGGER_USER');
  const swaggerPass = configService.get<string>('SWAGGER_PASS');

  if (!swaggerUser || !swaggerPass) {
    throw new Error('Las variables SWAGGER_USER y SWAGGER_PASS deben estar definidas en el entorno');
  }

  // Protección de Swagger con user/contraseña
  app.use(
    ['/api/docs'],
    basicAuth({
      challenge: true,
      users: {
        [swaggerUser]: swaggerPass,
      },
    }),
  );



  app.enableCors({
    origin: [
      configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173',
      'http://localhost:3000', // Para React en puerto 3000
      'http://127.0.0.1:3000',
      'https://disemsas.com',
      'https://www.disemsas.com',
      'https://disemsas.netlify.app',


    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina propiedades que no estén en el DTO
      forbidNonWhitelisted: false,
      transform: true, // transforma payloads a objetos de las clases DTO
    }),
  );

  // Swagger Config
  const config = new DocumentBuilder()
    .setTitle('Sistema de Ventas API')
    .setDescription('API para gestión de productos, usuarios y facturas')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
// Trigger Restart
bootstrap();
