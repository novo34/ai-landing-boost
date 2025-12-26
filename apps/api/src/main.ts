import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { validateEnv, loadEnvLocal } from './config/env.validation';

// Cargar .env.local si existe (para DEV) antes de validar
loadEnvLocal();

async function bootstrap() {
  // Validar variables de entorno antes de iniciar
  validateEnv();
  
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Habilitar raw body para webhooks (Stripe, WhatsApp Cloud API)
  });

  // Helmet: Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false, // Compatible con cookies
    }),
  );

  // Cookie parser: necesario para leer cookies HttpOnly
  app.use(cookieParser());

  // CORS: Configuración estricta para producción, flexible para desarrollo
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const allowedOrigins = frontendUrl.split(',').map((url) => url.trim());

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir requests sin origin en desarrollo
      if (!origin) {
        if (process.env.NODE_ENV !== 'production') {
          return callback(null, true);
        }
        console.warn('❌ Request without origin rejected (production mode)');
        return callback(new Error('Origin required in production'));
      }

      // En desarrollo, permitir cualquier localhost en cualquier puerto
      if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }

      // En desarrollo, permitir IPs locales (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      if (process.env.NODE_ENV !== 'production') {
        const localIpPattern = /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+):\d+$/;
        if (localIpPattern.test(origin)) {
          return callback(null, true);
        }
      }

      // En desarrollo, permitir URLs de ngrok (para acceso remoto)
      if (process.env.NODE_ENV !== 'production') {
        const ngrokPattern = /^https?:\/\/.*\.ngrok(-free)?\.(app|dev|io|com)$/;
        if (ngrokPattern.test(origin)) {
          return callback(null, true);
        }
      }

      // Verificar si el origin está permitido
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Solo loguear en desarrollo o si está habilitado el debug
        if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_CORS === 'true') {
          console.warn(`❌ CORS blocked origin: ${origin}`);
          console.warn(`✅ Allowed origins: ${allowedOrigins.join(', ')}`);
          console.warn(`💡 Configure FRONTEND_URL in .env to allow this origin`);
        }
        callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
    exposedHeaders: ['x-tenant-id'],
  });

  // Validación global con ValidationPipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true, // Transforma tipos según los decoradores @Type() en los DTOs
    }),
  );

  // Guard global JWT (las rutas marcadas con @Public() no requieren autenticación)
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  // Prefijo global (opcional, por ahora sin prefijo para endpoints públicos)
  // app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 3001;
  const host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '0.0.0.0');
  await app.listen(port, host);

  const url = await app.getUrl();
  console.log('');
  console.log('========================================');
  console.log('  ✅ API is running');
  console.log('========================================');
  console.log(`  URL: ${url}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  CORS enabled for: ${allowedOrigins.join(', ')}`);
  console.log('========================================');
  console.log('');
}
bootstrap();

