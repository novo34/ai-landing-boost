import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function testLogin() {
  console.log('🔍 Auditing login system...\n');

  try {
    // 1. Verificar conexión a BD
    console.log('1️⃣ Verificando conexión a base de datos...');
    await prisma.$connect();
    console.log('✅ Conexión a BD exitosa\n');

    // 2. Listar usuarios creados
    console.log('2️⃣ Verificando usuarios en la base de datos...');
    const users = await prisma.user.findMany({
      include: {
        tenantmembership: {
          include: {
            tenant: true,
          },
        },
      },
    });

    console.log(`📊 Total de usuarios encontrados: ${users.length}\n`);

    if (users.length === 0) {
      console.log('❌ No hay usuarios en la base de datos!');
      return;
    }

    // 3. Verificar cada usuario
    // Usar variables de entorno para emails de prueba
    const testUsersEnv = process.env.TEST_USERS;
    const testUsers = testUsersEnv 
      ? testUsersEnv.split(',').map(u => u.trim())
      : []; // Si no hay usuarios configurados, lista vacía

    for (const testEmail of testUsers) {
      console.log(`\n🔍 Verificando usuario: ${testEmail}`);
      const user = users.find((u) => u.email === testEmail);

      if (!user) {
        console.log(`❌ Usuario ${testEmail} NO encontrado en BD`);
        continue;
      }

      console.log(`✅ Usuario encontrado:`);
      console.log(`   - ID: ${user.id}`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Nombre: ${user.name || 'N/A'}`);
      console.log(`   - PasswordHash: ${user.passwordHash ? '✅ Existe' : '❌ NO EXISTE'}`);
      console.log(`   - Email verificado: ${user.emailVerified ? '✅' : '❌'}`);

      // Verificar membresías
      if (!user.tenantmembership || user.tenantmembership.length === 0) {
        console.log(`   - Membresías: ❌ NO TIENE MEMBRESÍAS`);
      } else {
        console.log(`   - Membresías: ${user.tenantmembership.length}`);
        user.tenantmembership.forEach((m) => {
          console.log(`     • Tenant: ${m.tenant.name} (${m.tenant.status}) - Rol: ${m.role}`);
        });
      }

      // Probar contraseña
      // Usar variable de entorno para contraseña de prueba
      if (user.passwordHash) {
        const testPassword = process.env.TEST_PASSWORD;
        const testPasswords = testPassword ? [testPassword] : [];

        let passwordMatch = false;
        for (const testPwd of testPasswords) {
          try {
            const isValid = await bcrypt.compare(testPwd, user.passwordHash);
            if (isValid) {
              console.log(`   - Contraseña válida: ✅ "${testPwd}"`);
              passwordMatch = true;
              break;
            }
          } catch (error) {
            console.log(`   - Error al verificar contraseña: ${error.message}`);
          }
        }

        if (!passwordMatch) {
          console.log(`   - ⚠️ Ninguna de las contraseñas de prueba coincide`);
        }
      }
    }

    // 4. Verificar tenant
    console.log('\n\n3️⃣ Verificando tenant...');
    const tenants = await prisma.tenant.findMany({
      include: {
        tenantmembership: {
          include: {
            user: true,
          },
        },
      },
    });

    console.log(`📊 Total de tenants: ${tenants.length}`);
    tenants.forEach((tenant) => {
      console.log(`\n   Tenant: ${tenant.name}`);
      console.log(`   - ID: ${tenant.id}`);
      console.log(`   - Slug: ${tenant.slug}`);
      console.log(`   - Status: ${tenant.status}`);
      console.log(`   - Miembros: ${tenant.tenantmembership?.length || 0}`);
    });

    // 5. Probar login directamente
    console.log('\n\n4️⃣ Probando login directo...');
    const testEmail = process.env.TEST_EMAIL;
    const testPassword = process.env.TEST_PASSWORD;

    if (!testEmail || !testPassword) {
      console.log('⚠️  TEST_EMAIL y TEST_PASSWORD no configurados, omitiendo prueba de login directo');
      console.log('   Configura: TEST_EMAIL=test@example.com TEST_PASSWORD=yourpassword');
      return;
    }

    const testUser = await prisma.user.findUnique({
      where: { email: testEmail },
      include: {
        tenantmembership: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!testUser) {
      console.log(`❌ Usuario ${testEmail} no encontrado`);
    } else if (!testUser.passwordHash) {
      console.log(`❌ Usuario ${testEmail} no tiene passwordHash`);
    } else {
      const isValid = await bcrypt.compare(testPassword, testUser.passwordHash);
      if (isValid) {
        console.log(`✅ Contraseña válida para ${testEmail}`);
        
        // Verificar tenant
        const activeMembership = testUser.tenantmembership?.find(
          (m) => m.tenant.status === 'ACTIVE' || m.tenant.status === 'TRIAL',
        ) || testUser.tenantmembership?.[0];

        if (!activeMembership) {
          console.log(`❌ Usuario ${testEmail} no tiene tenant activo`);
        } else {
          console.log(`✅ Tenant encontrado: ${activeMembership.tenant.name} (${activeMembership.tenant.status})`);
        }
      } else {
        console.log(`❌ Contraseña inválida para ${testEmail}`);
        console.log(`   Hash almacenado: ${testUser.passwordHash.substring(0, 20)}...`);
      }
    }

    console.log('\n✅ Auditoría completada');
  } catch (error) {
    console.error('❌ Error durante la auditoría:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

