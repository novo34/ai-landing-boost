import { PrismaClient, $Enums } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

interface UserToCreate {
  email: string;
  password: string;
  name: string;
  role: $Enums.tenantmembership_role;
  tenantName?: string;
}

// Función para generar slug desde texto
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres especiales con guiones
    .replace(/^-+|-+$/g, '') // Eliminar guiones al inicio y final
    .substring(0, 50); // Limitar longitud
}

async function createUser(userData: UserToCreate, tenantId: string) {
  const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  const passwordHash = await bcrypt.hash(userData.password, bcryptRounds);

  // Verificar si el usuario ya existe
  const existingUser = await prisma.user.findUnique({
    where: { email: userData.email },
  });

  if (existingUser) {
    console.log(`⚠️  Usuario ${userData.email} ya existe. Verificando membresía...`);
    
    // Verificar si ya tiene membresía en este tenant
    const existingMembership = await prisma.tenantmembership.findUnique({
      where: {
        userId_tenantId: {
          userId: existingUser.id,
          tenantId: tenantId,
        },
      },
    });

    if (existingMembership) {
      console.log(`⚠️  Usuario ${userData.email} ya tiene membresía en este tenant con rol ${existingMembership.role}`);
      return { user: existingUser, membership: existingMembership };
    }

    // Crear membresía para usuario existente
    const membership = await prisma.tenantmembership.create({
      data: {
        id: randomUUID(),
        userId: existingUser.id,
        tenantId: tenantId,
        role: userData.role,
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Membresía creada para usuario existente ${userData.email} con rol ${userData.role}`);
    return { user: existingUser, membership };
  }

  // Crear nuevo usuario
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: userData.email,
      passwordHash,
      name: userData.name,
      locale: 'es-ES',
      emailVerified: true, // Marcar como verificado para facilitar acceso
      updatedAt: new Date(),
    },
  });

  // Crear membresía
  const membership = await prisma.tenantmembership.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      tenantId: tenantId,
      role: userData.role,
      updatedAt: new Date(),
    },
  });

  console.log(`✅ Usuario ${userData.email} creado con rol ${userData.role}`);
  return { user, membership };
}

async function getOrCreateTenant(tenantName: string, slug: string) {
  // Buscar tenant existente
  let tenant = await prisma.tenant.findUnique({
    where: { slug },
  });

  if (!tenant) {
    // Crear nuevo tenant
    tenant = await prisma.tenant.create({
      data: {
        id: randomUUID(),
        name: tenantName,
        slug,
        country: 'ES',
        defaultLocale: 'es-ES',
        dataRegion: 'EU',
        status: $Enums.tenant_status.ACTIVE,
        updatedAt: new Date(),
      },
    });
    console.log(`✅ Tenant "${tenantName}" creado con slug "${slug}"`);
  } else {
    console.log(`ℹ️  Usando tenant existente "${tenantName}" con slug "${slug}"`);
  }

  return tenant;
}

async function main() {
  console.log('🚀 Iniciando creación de usuarios...\n');

  try {
    // Crear o obtener tenant principal
    const mainTenant = await getOrCreateTenant('AI Landing Boost', 'ai-landing-boost');

    // Definir usuarios a crear
    // ⚠️ IMPORTANTE: Para mayor seguridad, usa variables de entorno o un archivo de configuración externo
    // Ejemplo: CREATE_USERS_CONFIG='[{"email":"test@example.com","password":"securepass","name":"Test User","role":"ADMIN"}]' npm run create-users
    const usersConfigEnv = process.env.CREATE_USERS_CONFIG;
    let usersToCreate: UserToCreate[] = [];

    if (usersConfigEnv) {
      try {
        usersToCreate = JSON.parse(usersConfigEnv);
      } catch (error) {
        console.error('❌ Error al parsear CREATE_USERS_CONFIG. Debe ser un JSON válido.');
        console.error('   Ejemplo: CREATE_USERS_CONFIG=\'[{"email":"test@example.com","password":"securepass","name":"Test","role":"ADMIN"}]\'');
        process.exit(1);
      }
    } else {
      console.warn('⚠️  CREATE_USERS_CONFIG no está configurado. No se crearán usuarios.');
      console.warn('   Para crear usuarios, configura la variable de entorno:');
      console.warn('   CREATE_USERS_CONFIG=\'[{"email":"test@example.com","password":"securepass","name":"Test User","role":"ADMIN"}]\'');
      return;
    }

    const results: Array<{ email: string; password: string; role: $Enums.tenantmembership_role; name: string }> = [];

    // Crear usuarios
    for (const userData of usersToCreate) {
      const { user } = await createUser(userData, mainTenant.id);
      results.push({
        email: user.email,
        password: userData.password,
        role: userData.role,
        name: userData.name,
      });
    }

    console.log('\n📋 RESUMEN DE USUARIOS CREADOS:\n');
    console.log('═'.repeat(80));
    results.forEach((user) => {
      console.log(`Email: ${user.email}`);
      // No mostrar contraseñas por seguridad
      console.log(`Nombre: ${user.name}`);
      console.log(`Rol: ${user.role}`);
      console.log('─'.repeat(80));
    });

    console.log('\n✅ Todos los usuarios han sido creados exitosamente!');
  } catch (error) {
    console.error('❌ Error al crear usuarios:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

