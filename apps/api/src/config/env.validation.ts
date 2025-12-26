/**
 * Validación de variables de entorno
 * Se ejecuta al iniciar la aplicación
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Carga variables de entorno desde .env.local si existe
 * Útil para desarrollo local sin sobrescribir variables del sistema
 */
export function loadEnvLocal(): void {
  // Usar process.cwd() para obtener el directorio del proyecto (más confiable que __dirname)
  const envLocalPath = path.join(process.cwd(), '.env.local');
  
  if (fs.existsSync(envLocalPath)) {
    const envContent = fs.readFileSync(envLocalPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      // Ignorar líneas vacías y comentarios
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          // Solo cargar si no existe ya en process.env (para no sobrescribir variables del sistema)
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
  }
}

export function validateEnv() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => {
      console.error(`   - ${key}`);
    });
    console.error('\n💡 Please copy .env.example to .env and configure the values.');
    console.error('   Example: cp apps/api/.env.example apps/api/.env\n');
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  // ✅ Validación estricta de JWT_REFRESH_SECRET (reforzar validación existente)
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET es obligatorio. Por favor, configura esta variable de entorno.');
  }

  // ✅ Validar que JWT_REFRESH_SECRET no sea valor por defecto
  const defaultSecrets = [
    'your-secret-key-change-in-production',
    'your-super-secret-jwt-key-change-in-production-min-32-chars',
  ];
  
  if (defaultSecrets.includes(process.env.JWT_REFRESH_SECRET)) {
    throw new Error(
      'JWT_REFRESH_SECRET no puede ser un valor por defecto. Genera un secreto seguro con: openssl rand -base64 64'
    );
  }

  // ✅ Validar longitud mínima de JWT_REFRESH_SECRET
  if (process.env.JWT_REFRESH_SECRET.length < 32) {
    console.warn('⚠️ JWT_REFRESH_SECRET should be at least 32 characters long');
  }

  // Validar que JWT_SECRET no sea el valor por defecto en producción
  const defaultJwtSecret = 'your-secret-key-change-in-production';
  const defaultJwtSecretLong = 'your-super-secret-jwt-key-change-in-production-min-32-chars';
  
  if (
    (process.env.JWT_SECRET === defaultJwtSecret || 
     process.env.JWT_SECRET === defaultJwtSecretLong) && 
    process.env.NODE_ENV === 'production'
  ) {
    console.error('❌ JWT_SECRET must be changed from default value in production!');
    console.error('   Generate a secure secret with: openssl rand -base64 32\n');
    throw new Error('JWT_SECRET must be changed from default value in production');
  }

  // Validar formato de DATABASE_URL
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('mysql://')) {
    console.warn('⚠️ DATABASE_URL should start with mysql://');
  }

  // Validar que JWT_SECRET tiene longitud mínima
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️ JWT_SECRET should be at least 32 characters long');
  }

  console.log('✅ Environment variables validated');
}

// Validar al importar el módulo
if (require.main === module) {
  validateEnv();
}







