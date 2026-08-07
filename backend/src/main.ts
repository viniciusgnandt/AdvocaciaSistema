import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

const logger = new Logger('Process');

// Node derruba o processo inteiro em promises rejeitadas sem catch (padrão desde
// o Node 15). Sem isso, um erro assíncrono qualquer mata a API inteira sem deixar
// rastro no log - loga aqui em vez de deixar o processo morrer silenciosamente.
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason instanceof Error ? reason.stack : reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', err.stack);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  const config = new DocumentBuilder()
    .setTitle('Trilva API')
    .setDescription('API de monitoramento de publicacoes e gestao de escritorios de advocacia')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Trilva API rodando em http://localhost:${port} (docs em /docs)`);
}

bootstrap();
