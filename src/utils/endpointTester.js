// Utilidad para probar diferentes endpoints posibles
import axios from 'axios';

const baseURL = 'https://x8ki-letl-twmt.n7.xano.io/api:3Xncgo9I';

// Posibles endpoints para usuarios
const possibleUserEndpoints = [
  '/user',
  '/users', 
  '/usuario',
  '/usuarios',
  '/auth/user',
  '/auth/users',
  '/api/user',
  '/api/users',
  '/User',
  '/Users'
];

// Posibles métodos HTTP
const methods = ['GET', 'POST'];

export const findUserEndpoint = async () => {
  console.log('🔍 Buscando endpoint correcto para usuarios...');
  console.log('🌐 Base URL:', baseURL);
  
  const results = [];
  
  for (const endpoint of possibleUserEndpoints) {
    for (const method of methods) {
      try {
        const config = {
          method: method.toLowerCase(),
          url: `${baseURL}${endpoint}`,
          timeout: 5000
        };
        
        // Para POST, agregar datos de prueba
        if (method === 'POST') {
          config.data = {
            name: "Test",
            email: "test@test.com"
          };
          config.headers = {
            'Content-Type': 'application/json'
          };
        }
        
        console.log(`📡 Probando ${method} ${endpoint}...`);
        const response = await axios(config);
        
        results.push({
          endpoint,
          method,
          status: response.status,
          success: true,
          data: response.data
        });
        
        console.log(`✅ ${method} ${endpoint}: ${response.status}`);
        
      } catch (error) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        
        results.push({
          endpoint,
          method,
          status,
          success: false,
          error: message
        });
        
        if (status === 404) {
          console.log(`❌ ${method} ${endpoint}: No encontrado`);
        } else if (status === 405) {
          console.log(`⚠️ ${method} ${endpoint}: Método no permitido (endpoint existe pero método incorrecto)`);
        } else if (status === 422) {
          console.log(`⚠️ ${method} ${endpoint}: Error de validación (endpoint existe!)`);
        } else {
          console.log(`❓ ${method} ${endpoint}: ${status} - ${message}`);
        }
      }
    }
  }
  
  console.log('📊 Resultados completos:', results);
  
  // Encontrar endpoints exitosos
  const successful = results.filter(r => r.success || r.status === 422 || r.status === 405);
  
  if (successful.length > 0) {
    console.log('🎉 Endpoints encontrados:');
    successful.forEach(r => {
      console.log(`✅ ${r.method} ${r.endpoint} - Status: ${r.status}`);
    });
  } else {
    console.log('😞 No se encontraron endpoints válidos');
  }
  
  return results;
};

// Función para probar un endpoint específico
export const testSpecificEndpoint = async (endpoint, method = 'GET', data = null) => {
  try {
    const config = {
      method: method.toLowerCase(),
      url: `${baseURL}${endpoint}`,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }
    
    console.log(`🧪 Probando ${method} ${endpoint}...`);
    console.log('📤 Datos:', data);
    
    const response = await axios(config);
    
    console.log(`✅ Éxito: ${response.status}`);
    console.log('📥 Respuesta:', response.data);
    
    return {
      success: true,
      status: response.status,
      data: response.data
    };
    
  } catch (error) {
    console.log(`❌ Error: ${error.response?.status || 'Sin respuesta'}`);
    console.log('📥 Error:', error.response?.data || error.message);
    
    return {
      success: false,
      status: error.response?.status,
      error: error.response?.data || error.message
    };
  }
};

// Exponer globalmente para usar en consola
if (typeof window !== 'undefined') {
  window.findUserEndpoint = findUserEndpoint;
  window.testSpecificEndpoint = testSpecificEndpoint;
  console.log('🔧 Funciones de endpoint testing disponibles:');
  console.log('- findUserEndpoint() // Buscar endpoint correcto');
  console.log('- testSpecificEndpoint("/endpoint", "POST", {data}) // Probar endpoint específico');
}