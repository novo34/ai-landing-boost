/**
 * Script de prueba para verificar credenciales de Evolution API
 * 
 * Uso:
 *   npx ts-node apps/api/scripts/test-evolution-api.ts
 * 
 * O desde la raíz del proyecto:
 *   cd apps/api && npx ts-node scripts/test-evolution-api.ts
 */

import axios from 'axios';

// ============================================
// CONFIGURACIÓN - Reemplaza con tus datos
// ============================================
const API_KEY = '429683C4C977415CAAFCCE10F7D57E11';
const BASE_URL = 'https://jn-evolution-api.xvvcvg.easypanel.host';

// ============================================
// FUNCIONES DE PRUEBA
// ============================================

/**
 * Prueba 1: Verificar conexión básica
 */
async function testConnection(): Promise<boolean> {
  console.log('\n🔍 Prueba 1: Verificando conexión básica...');
  try {
    const response = await axios.get(`${BASE_URL}/instance/fetchInstances`, {
      headers: { apikey: API_KEY },
      timeout: 10000,
    });
    
    console.log('✅ Conexión exitosa');
    console.log(`   Status: ${response.status}`);
    console.log(`   Instancias encontradas: ${Array.isArray(response.data) ? response.data.length : 'N/A'}`);
    
    if (Array.isArray(response.data) && response.data.length > 0) {
      console.log('\n   Instancias existentes:');
      response.data.forEach((inst: any, index: number) => {
        const name = inst.name || inst.instance?.instanceName || 'N/A';
        const state = inst.connectionStatus || inst.instance?.state || 'N/A';
        console.log(`   ${index + 1}. ${name} - Estado: ${state}`);
      });
    }
    
    return true;
  } catch (error: any) {
    console.error('❌ Error de conexión:');
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error(`   No se puede conectar a ${BASE_URL}`);
      console.error(`   Verifica que la URL sea correcta y esté accesible`);
    } else if (error.response?.status === 401 || error.response?.status === 403) {
      console.error(`   API Key inválida o sin permisos`);
      console.error(`   Status: ${error.response?.status}`);
      console.error(`   Response: ${JSON.stringify(error.response?.data, null, 2)}`);
    } else {
      console.error(`   Error: ${error.message}`);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    return false;
  }
}

/**
 * Prueba 2: Verificar permisos para crear instancias
 */
async function testCreateInstancePermission(): Promise<boolean> {
  console.log('\n🔍 Prueba 2: Verificando permisos para crear instancias...');
  
  // Generar nombre de instancia de prueba único
  const testInstanceName = `test-instance-${Date.now()}`;
  
  try {
    console.log(`   Intentando crear instancia de prueba: ${testInstanceName}`);
    
    const response = await axios.post(
      `${BASE_URL}/instance/create`,
      {
        instanceName: testInstanceName,
        qrcode: true,
        integration: 'EVOLUTION',
      },
      {
        headers: { apikey: API_KEY },
        timeout: 15000,
      }
    );
    
    console.log('✅ Permisos para crear instancias: OK');
    console.log(`   Instancia creada: ${testInstanceName}`);
    console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
    
    // Intentar eliminar la instancia de prueba
    try {
      await axios.delete(`${BASE_URL}/instance/delete/${testInstanceName}`, {
        headers: { apikey: API_KEY },
        timeout: 10000,
      });
      console.log(`   ✅ Instancia de prueba eliminada correctamente`);
    } catch (deleteError: any) {
      console.warn(`   ⚠️  No se pudo eliminar la instancia de prueba (puedes eliminarla manualmente): ${deleteError.message}`);
    }
    
    return true;
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error('❌ API Key no tiene permisos para crear instancias');
      console.error(`   Status: ${error.response?.status}`);
      console.error(`   Response: ${JSON.stringify(error.response?.data, null, 2)}`);
    } else if (error.response?.status === 400) {
      console.error('❌ Error al crear instancia (posiblemente ya existe o datos inválidos)');
      console.error(`   Response: ${JSON.stringify(error.response?.data, null, 2)}`);
    } else {
      console.error(`❌ Error: ${error.message}`);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    return false;
  }
}

/**
 * Prueba 3: Verificar estructura de respuesta del QR code
 */
async function testQRCodeStructure(): Promise<boolean> {
  console.log('\n🔍 Prueba 3: Verificando estructura de respuesta del QR code...');
  
  // Primero crear una instancia de prueba
  const testInstanceName = `test-qr-${Date.now()}`;
  
  try {
    // Crear instancia
    const createResponse = await axios.post(
      `${BASE_URL}/instance/create`,
      {
        instanceName: testInstanceName,
        qrcode: true,
        integration: 'EVOLUTION',
      },
      {
        headers: { apikey: API_KEY },
        timeout: 15000,
      }
    );
    
    console.log('   Instancia creada para prueba de QR');
    
    // Intentar obtener QR code
    try {
      const qrResponse = await axios.get(`${BASE_URL}/instance/connect/${testInstanceName}`, {
        headers: { apikey: API_KEY },
        timeout: 10000,
      });
      
      console.log('✅ Estructura de QR code verificada');
      console.log(`   Response keys: ${Object.keys(qrResponse.data).join(', ')}`);
      
      // Verificar diferentes formatos posibles
      if (qrResponse.data?.qrcode?.base64) {
        console.log('   ✅ Formato encontrado: qrcode.base64');
      } else if (qrResponse.data?.qrcode) {
        console.log('   ✅ Formato encontrado: qrcode (string)');
      } else if (qrResponse.data?.base64) {
        console.log('   ✅ Formato encontrado: base64 (directo)');
      } else {
        console.log('   ⚠️  Formato de QR no reconocido, estructura completa:');
        console.log(`   ${JSON.stringify(qrResponse.data, null, 2)}`);
      }
      
      // Limpiar: eliminar instancia de prueba
      try {
        await axios.delete(`${BASE_URL}/instance/delete/${testInstanceName}`, {
          headers: { apikey: API_KEY },
          timeout: 10000,
        });
      } catch (deleteError) {
        // Ignorar error de eliminación
      }
      
      return true;
    } catch (qrError: any) {
      console.error('❌ Error al obtener QR code:');
      console.error(`   ${qrError.message}`);
      if (qrError.response) {
        console.error(`   Status: ${qrError.response.status}`);
        console.error(`   Response: ${JSON.stringify(qrError.response.data, null, 2)}`);
      }
      
      // Limpiar: eliminar instancia de prueba
      try {
        await axios.delete(`${BASE_URL}/instance/delete/${testInstanceName}`, {
          headers: { apikey: API_KEY },
          timeout: 10000,
        });
      } catch (deleteError) {
        // Ignorar error de eliminación
      }
      
      return false;
    }
  } catch (error: any) {
    console.error('❌ Error al crear instancia para prueba de QR:');
    console.error(`   ${error.message}`);
    return false;
  }
}

/**
 * Prueba 4: Verificar endpoint de estado de conexión
 */
async function testConnectionState(): Promise<boolean> {
  console.log('\n🔍 Prueba 4: Verificando endpoint de estado de conexión...');
  
  // Primero obtener lista de instancias
  try {
    const instancesResponse = await axios.get(`${BASE_URL}/instance/fetchInstances`, {
      headers: { apikey: API_KEY },
      timeout: 10000,
    });
    
    if (!Array.isArray(instancesResponse.data) || instancesResponse.data.length === 0) {
      console.log('   ⚠️  No hay instancias para probar el estado de conexión');
      console.log('   (Esto es normal si no tienes instancias creadas)');
      return true; // No es un error, solo no hay instancias
    }
    
    // Probar con la primera instancia
    const firstInstance = instancesResponse.data[0];
    const instanceName = firstInstance.name || firstInstance.instance?.instanceName;
    
    if (!instanceName) {
      console.log('   ⚠️  No se pudo obtener el nombre de la instancia');
      return true;
    }
    
    console.log(`   Probando con instancia: ${instanceName}`);
    
    try {
      const stateResponse = await axios.get(
        `${BASE_URL}/instance/connectionState/${instanceName}`,
        {
          headers: { apikey: API_KEY },
          timeout: 10000,
        }
      );
      
      console.log('✅ Endpoint de estado de conexión funciona');
      console.log(`   Response: ${JSON.stringify(stateResponse.data, null, 2)}`);
      
      return true;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('   ⚠️  Instancia no encontrada (puede ser normal si fue eliminada)');
        return true;
      }
      console.error('❌ Error al obtener estado de conexión:');
      console.error(`   ${error.message}`);
      return false;
    }
  } catch (error: any) {
    console.error('❌ Error al obtener lista de instancias:');
    console.error(`   ${error.message}`);
    return false;
  }
}

// ============================================
// EJECUCIÓN DE PRUEBAS
// ============================================

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 PRUEBAS DE EVOLUTION API');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`\n📋 Configuración:`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   API Key: ${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)}`);
  console.log('\n═══════════════════════════════════════════════════════════');
  
  const results = {
    connection: false,
    createPermission: false,
    qrCode: false,
    connectionState: false,
  };
  
  // Ejecutar pruebas
  results.connection = await testConnection();
  results.createPermission = await testCreateInstancePermission();
  results.qrCode = await testQRCodeStructure();
  results.connectionState = await testConnectionState();
  
  // Resumen
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 RESUMEN DE PRUEBAS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Conexión básica:              ${results.connection ? 'OK' : 'FALLO'}`);
  console.log(`✅ Permisos crear instancias:    ${results.createPermission ? 'OK' : 'FALLO'}`);
  console.log(`✅ Estructura QR code:           ${results.qrCode ? 'OK' : 'FALLO'}`);
  console.log(`✅ Estado de conexión:          ${results.connectionState ? 'OK' : 'FALLO'}`);
  console.log('\n═══════════════════════════════════════════════════════════');
  
  const allPassed = Object.values(results).every(r => r === true);
  
  if (allPassed) {
    console.log('✅ TODAS LAS PRUEBAS PASARON');
    console.log('\n🎉 Tus credenciales están listas para desarrollar la funcionalidad');
    console.log('\n📝 Próximos pasos:');
    console.log('   1. Agregar variables de entorno en apps/api/.env:');
    console.log(`      EVOLUTION_API_BASE_URL=${BASE_URL}`);
    console.log(`      EVOLUTION_API_MASTER_KEY=${API_KEY}`);
    console.log('   2. Implementar el método createInstance() en EvolutionProvider');
    console.log('   3. Agregar endpoint POST /whatsapp/accounts/create-instance');
    console.log('   4. Modificar el wizard del frontend para la nueva opción');
  } else {
    console.log('❌ ALGUNAS PRUEBAS FALLARON');
    console.log('\n⚠️  Revisa los errores arriba y corrige los problemas antes de desarrollar');
    
    if (!results.connection) {
      console.log('\n🔧 Problema de conexión:');
      console.log('   - Verifica que la Base URL sea correcta');
      console.log('   - Verifica que el servidor esté accesible');
      console.log('   - Verifica que no haya problemas de firewall');
    }
    
    if (!results.createPermission) {
      console.log('\n🔧 Problema de permisos:');
      console.log('   - Verifica que la API Key tenga permisos para crear instancias');
      console.log('   - Revisa la configuración de permisos en Evolution API');
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

// Ejecutar
runAllTests().catch((error) => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});

