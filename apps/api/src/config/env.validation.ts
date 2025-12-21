/**
 * Validación de variables de entorno
 * Se ejecuta al iniciar la aplicación
 */

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







