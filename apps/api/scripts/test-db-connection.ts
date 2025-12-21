import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  console.log('🔍 Probando conexión a la base de datos...\n');

  try {
    console.log('1️⃣ Intentando conectar...');
    await prisma.$connect();
    console.log('✅ Conectado a la base de datos\n');

    console.log('2️⃣ Ejecutando query de prueba...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query ejecutada exitosamente:', result);
    console.log('');

    console.log('3️⃣ Buscando usuarios...');
    const users = await prisma.user.findMany({ take: 5 });
    console.log(`✅ Encontrados ${users.length} usuarios`);
    users.forEach(u => {
      console.log(`   - ${u.email} (${u.name || 'Sin nombre'})`);
    });
    console.log('');

    console.log('4️⃣ Probando query de login...');
    const testUser = await prisma.user.findUnique({
      where: { email: 'klever@admin.com' },
      include: {
        tenantmembership: {
          include: {
            tenant: true,
          },
        },
      },
    });
    
    if (testUser) {
      console.log('✅ Usuario encontrado:', testUser.email);
      console.log(`   - Membresías: ${testUser.tenantmembership?.length || 0}`);
      testUser.tenantmembership?.forEach(m => {
        console.log(`     • Tenant: ${m.tenant.name} (${m.tenant.status}) - Rol: ${m.role}`);
      });
    } else {
      console.log('⚠️ Usuario de prueba no encontrado');
    }

    console.log('\n✅ Todas las pruebas pasaron');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('\n❌ Error de conexión:', errorMessage);
    console.error('\n💡 Posibles causas:');
    console.error('   1. MySQL no está corriendo');
    console.error('   2. DATABASE_URL incorrecta en .env');
    console.error('   3. La base de datos no existe');
    console.error('   4. Credenciales incorrectas');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

