import axios from 'axios';

/*
  Servicio central de acceso a APIs (Xano) y utilidades de red

  Contenido principal:
  - ENDPOINTS: mapeo de rutas lógicas usadas por la app
  - axios instances: `api` para datos y `authApiInstance`/`authAxios` para endpoints de autenticación
  - interceptores: logging global y retry para 429 en GETs
  - cachedGet: caché en memoria con deduplicación de peticiones en vuelo
  - testAPI: conjunto de funciones de prueba / debug para facilitar validaciones manuales

  Notas:
  - No añadimos aquí lógica de negocio; este módulo centraliza requests y helpers relacionados con la comunicación externa.
  - Los comentarios en cada sección explican propósito, comportamiento y consideraciones de seguridad/rate-limits.
*/

// ===== CONFIGURACIÓN DE ENDPOINTS =====
// Endpoints fijos independientes del idioma de Xano
const ENDPOINTS = {
  // Usuarios (Xano traduce automáticamente tabla 'usuarios' a endpoint '/user')
  USERS: '/user',
  // Servicios (Xano traduce automáticamente tabla 'servicios' a endpoint '/service')  
  SERVICES: '/service',
  // Blogs (Xano traduce automáticamente tabla 'blogs' a endpoint '/blog')
  BLOGS: '/blog',
  // Roles (Xano traduce automáticamente tabla 'roles' a endpoint '/role')
  ROLES: '/role',
  // Carrito (Xano traduce automáticamente tabla 'carrito' a endpoint '/cart')
  CART: '/cart',
  // Detalles del carrito
  CART_DETAILS: '/cart_detail',
  // Comentarios de blogs
  BLOG_COMMENTS: '/blog_comment',
  // Pagos
  PAYMENTS: '/payment'
};

// Configuración base de Axios para datos principales
const api = axios.create({
  baseURL: import.meta.env.VITE_XANO_STORE_BASE || 'https://x8ki-letl-twmt.n7.xano.io/api:OdHOEeXs',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Configuración base de Axios para autenticación
const authApiInstance = axios.create({
  baseURL: import.meta.env.VITE_XANO_AUTH_BASE || 'https://x8ki-letl-twmt.n7.xano.io/api:KBcldO_7',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Mostrar URL actual en consola para debugging
console.log(' URL Base de la API:', api.defaults.baseURL);
console.log('Variables de entorno:', {
  VITE_XANO_STORE_BASE: import.meta.env.VITE_XANO_STORE_BASE,
  VITE_XANO_AUTH_BASE: import.meta.env.VITE_XANO_AUTH_BASE
});
console.log(' Endpoints configurados:', ENDPOINTS);

// API para autenticación (si es diferente del store)
const authAxios = axios.create({
  baseURL: import.meta.env.VITE_XANO_AUTH_BASE || import.meta.env.VITE_XANO_STORE_BASE || 'https://x8ki-letl-twmt.n7.xano.io/api:PDQSRKQT',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptores para manejar errores globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si Xano devuelve 429, registrar un mensaje informativo. Los reintentos se manejan
    // mediante un interceptor separado más abajo.
    const resp = error.response?.data;
    const headers = error.response?.headers || {};
    const contentType = headers['content-type'] || headers['Content-Type'] || '';
    console.error('API Error:', resp ? JSON.stringify(resp, null, 2) : error.message, 'status:', error.response?.status, 'content-type:', contentType);
    return Promise.reject(error);
  }
);

authAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    const resp = error.response?.data;
    console.error('Auth API Error:', resp ? JSON.stringify(resp, null, 2) : error.message, 'status:', error.response?.status);
    return Promise.reject(error);
  }
);

// Interceptor de reintento para 429 Too Many Requests en peticiones GET.
// Solo reintenta peticiones GET (idempotentes) hasta 2 veces, usando un backoff exponencial.
api.interceptors.response.use(undefined, async (error) => {
  const config = error.config || {};
  const method = (config.method || '').toUpperCase();
  const status = error.response?.status;

  if (status === 429 && method === 'GET') {
    config.__retryCount = config.__retryCount || 0;
    const MAX_RETRIES = 2;
    if (config.__retryCount < MAX_RETRIES) {
      config.__retryCount += 1;
      const delay = Math.pow(2, config.__retryCount) * 250; // 500ms, 1000ms
      console.warn(`Recibiendo 429 - reintentando GET ${config.url} en ${delay}ms (intento ${config.__retryCount})`);
      await new Promise(res => setTimeout(res, delay));
      return api.request(config);
    }
  }

  return Promise.reject(error);
});

// ===== CACHÉ SIMPLE EN MEMORIA =====
// Reduce peticiones repetidas y ayuda a evitar límites de tasa (rate limits) en Xano durante
// el desarrollo. La caché almacena objetos { t, value, promise } para que llamadas
// concurrentes reutilicen la misma promesa en vuelo en lugar de emitir solicitudes HTTP duplicadas.
const simpleCache = new Map();

/**
 * cachedGet: GET with TTL-based in-memory cache and in-flight request dedup.
 * @param {string} url - endpoint path
 * @param {number} ttl - milliseconds to keep cache (default 120s)
 */
async function cachedGet(url, ttl = 120000) {
  const now = Date.now();
  const key = String(api.defaults.baseURL) + '::' + url;
  const entry = simpleCache.get(key);

  // Devolver valor cacheado cuando aún esté fresco
  if (entry && entry.value && (now - entry.t) < ttl) {
    return entry.value;
  }

  // Si hay una petición en vuelo, esperar su promesa y luego devolver su valor
  if (entry && entry.promise) {
    try {
      await entry.promise;
      const latest = simpleCache.get(key);
      return latest ? latest.value : null;
    } catch (err) {
      // Si la petición en vuelo falló, eliminar la entrada de caché y relanzar el error
      simpleCache.delete(key);
      throw err;
    }
  }

  // De lo contrario, iniciar una nueva petición y almacenar la promesa para que otros
  // llamantes la reutilicen
  const p = api.get(url)
    .then(response => {
      simpleCache.set(key, { t: Date.now(), value: response.data });
      return response.data;
    })
    .catch(err => {
      // En caso de error, limpiar la caché para permitir reintentos posteriores
      simpleCache.delete(key);
      throw err;
    });

  // Save the promise so concurrent callers wait on it
  simpleCache.set(key, { t: now, promise: p });

  const data = await p;
  return data;
}

/*
  cachedGet notes:
  - Usa una cache TTL (por defecto 120s) para respuestas GET.
  - Si otra llamada idéntica ya está en curso, reutiliza la misma promesa para evitar duplicados.
  - En caso de error limpia la entrada para permitir reintentos posteriores.
  - Útil para listas y endpoints que no requieren datos en tiempo real, reduce latencia y uso de cuota.
*/

// ===== UTILIDADES DE DEBUGGING =====

export const testAPI = {
  /*
    Colección de funciones destinadas a probar conectividad y endpoints durante desarrollo.
    Estos métodos hacen llamadas reales a Xano y registran en consola resultados detallados.
    Úsalos para validar entornos, detectar endpoints rotos o comprobar mapeos de campos.
  */
  // Probar conectividad con Xano
  testConnection: async () => {
    try {
      console.log('🔍 Probando conexión con:', api.defaults.baseURL);
      
      // Primero, probar un endpoint simple
      console.log('📡 Intentando GET /usuarios...');
      const response = await api.get('/usuarios');
      console.log(' Conexión exitosa:', response.status, response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(' Error de conexión:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        baseURL: api.defaults.baseURL,
        fullURL: error.config?.url
      });
      return { success: false, error };
    }
  },
  
  // Verificar endpoints disponibles
  checkEndpoints: async () => {
    const endpoints = Object.values(ENDPOINTS);
    const results = {};
    
    console.log(' Verificando endpoints disponibles...');
    console.log(' Endpoints a probar:', endpoints);
    
    for (const endpoint of endpoints) {
      try {
        console.log(`📡 Probando GET ${endpoint}...`);
        const response = await api.get(endpoint);
        results[endpoint] = { 
          success: true, 
          status: response.status,
          count: Array.isArray(response.data) ? response.data.length : 'N/A'
        };
        console.log(` ${endpoint}: OK (${response.status}) - ${results[endpoint].count} registros`);
      } catch (error) {
        results[endpoint] = { 
          success: false, 
          status: error.response?.status,
          error: error.response?.data || error.message
        };
        console.log(` ${endpoint}: FAIL (${error.response?.status || 'No response'})`);
      }
    }
    
    console.log('📊 Resultados completos:', results);
    return results;
  },

  // Probar específicamente el POST a usuarios con campos en español
  testUserCreation: async () => {
    // Nota: el test usa nombres de campos en español (`nombre`, `apellidos`, `clave_hash`) porque
    // algunos proyectos Xano pueden mapear la API en español. Ajusta según tu schema real.
    const testUser = {
      nombre: "Usuario Test",
      apellidos: "Prueba Sistema", 
      email: "test@example.com",
      run: "12345678-9",
      clave_hash: "test123", // Xano hasheará automáticamente
      telefono: "+56912345678",
      rol_id: 2 // Cliente
    };

    try {
      console.log('Probando creación de usuario de prueba...');
      console.log('Datos a enviar (campos en español):', testUser);
      console.log('URL completa:', `${api.defaults.baseURL}${ENDPOINTS.USERS}`);
      
      const response = await api.post(ENDPOINTS.USERS, testUser);
      console.log(' Usuario creado exitosamente:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(' Error al crear usuario de prueba:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url,
        method: error.config?.method
      });
      return { success: false, error };
    }
  },

  // Test end-to-end usando los endpoints de auth (signup -> login)
  testSignupAuth: async () => {
    // Test E2E que usa `authAPI.signup` y `authAPI.login`.
    // Importante: `authAPI` es una abstracción que puede devolver diferentes formas de token
    // (authToken, token, access_token, etc.). Las funciones consumidoras deben ser tolerantes con esto.
    try {
      const random = Math.floor(Math.random() * 100000);
      const email = `test.user.${Date.now()}.${random}@example.com`;
      const password = `TestPass!${random}`;

      const signupPayload = {
        name: 'Test User',
        last_name: 'Automated',
        email,
        password,
        role_id: 1
      };

      console.log('🔬 Test signup (auth API) - payload:', { email, name: signupPayload.name });

      // Intentar signup vía authAPI
      const signupResult = await authAPI.signup(signupPayload);
      console.log('✅ Resultado signup:', signupResult);

      // Intentar login con las mismas credenciales
      const loginResult = await authAPI.login(email, password);
      console.log('✅ Resultado login:', loginResult);

      return { success: true, signup: signupResult, login: loginResult };
    } catch (err) {
      console.error('❌ testSignupAuth falló:', err.response?.data || err.message || err);
      return { success: false, error: err.response?.data || err.message || err };
    }
  },

  // Test directo con datos mínimos (sin mapeo)
  testMinimalUser: async () => {
    try {
      console.log('🧪 Probando usuario con datos mínimos directos...');
      
      const testUser = {
        name: "Test User",
        last_name: "Test Lastname", 
        email: "minimal" + Date.now() + "@test.com",
        password: "123456",
        run: "12345678-9", // ⚠️ Agregado: campo run obligatorio
        role_id: 2
      };
      
      console.log('📤 Datos enviados:', JSON.stringify(testUser, null, 2));
      
      const response = await api.post('/user', testUser);
      console.log('✅ Usuario mínimo creado:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Error con usuario mínimo:', {
        status: error.response?.status,
        data: JSON.stringify(error.response?.data, null, 2),
        message: error.message
      });
      return { success: false, error: error.response?.data };
    }
  },

  // Test sin campo run (por si es opcional)
  testUserWithoutRun: async () => {
    try {
      console.log('🧪 Probando sin campo RUN...');
      
      const testUser = {
        name: "No RUN User",
        last_name: "No RUN Lastname", 
        email: "norun" + Date.now() + "@test.com",
        password: "123456",
        role_id: 2
        // ⚠️ SIN campo run
      };
      
      console.log('📤 Datos sin RUN:', JSON.stringify(testUser, null, 2));
      
      const response = await api.post('/user', testUser);
      console.log('✅ Usuario sin RUN creado:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Error sin RUN:', {
        status: error.response?.status,
        data: JSON.stringify(error.response?.data, null, 2),
        message: error.message
      });
      return { success: false, error: error.response?.data };
    }
  },

  // Test con diferentes APIs
  testBothAPIs: async () => {
    const apis = [
      'https://x8ki-letl-twmt.n7.xano.io/api:OdHOEeXs',
      'https://x8ki-letl-twmt.n7.xano.io/api:KBcldO_7'
    ];

    console.log('🔄 Probando ambas APIs...');
    const results = [];

    for (let i = 0; i < apis.length; i++) {
      const apiUrl = apis[i];
      console.log(`🔌 Probando API ${i + 1}: ${apiUrl}`);
      
      try {
        // Crear instancia temporal de axios
        const tempApi = axios.create({
          baseURL: apiUrl,
          timeout: 15000,
          headers: { 'Content-Type': 'application/json' }
        });

        // Probar GET /user
        const getUsersResponse = await tempApi.get('/user');
        console.log(`✅ API ${i + 1} - GET /user: OK (${getUsersResponse.data?.length || 0} usuarios)`);
        
        // Probar POST /user
        const testUser = {
          name: "Test API " + (i + 1),
          last_name: "Test Lastname", 
          email: "apitest" + Date.now() + i + "@test.com",
          password: "123456",
          run: "12345678-9",
          role_id: 2
        };
        
        const createUserResponse = await tempApi.post('/user', testUser);
        console.log(`✅ API ${i + 1} - POST /user: OK - Usuario creado`);
        
        results.push({
          api: apiUrl,
          success: true,
          getUsers: getUsersResponse.data?.length || 0,
          userCreated: createUserResponse.data
        });
        
        // Si funciona, usar esta API
        return { success: true, workingAPI: apiUrl, results };
        
      } catch (error) {
        console.log(`❌ API ${i + 1} - Error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
        results.push({
          api: apiUrl,
          success: false,
          error: error.response?.data || error.message
        });
      }
    }

    return { success: false, results };
  },

  // Test con diferentes formatos de RUN
  testRunFormats: async () => {
    const runFormats = [
      "", // String vacío
      "12345678-9", // Formato chileno
      "12345678K", // Sin guión
      "123456789", // Solo números
      null, // Valor null
      undefined // Valor undefined
    ];

    console.log('🧪 Probando diferentes formatos de RUN...');
    const results = [];

    for (let i = 0; i < runFormats.length; i++) {
      const runValue = runFormats[i];
      try {
        console.log(`📤 Probando RUN: ${JSON.stringify(runValue)}`);
        
        const testUser = {
          name: "Test RUN " + i,
          last_name: "Format Test", 
          email: "runtest" + Date.now() + i + "@test.com",
          password: "123456",
          role_id: 2
        };

        // Solo agregar run si no es undefined
        if (runValue !== undefined) {
          testUser.run = runValue;
        }
        
        const response = await api.post('/user', testUser);
        console.log(`✅ RUN ${JSON.stringify(runValue)}: ÉXITO`);
        results.push({ run: runValue, success: true, data: response.data });
        
        // Si uno funciona, salir del loop
        break;
        
      } catch (error) {
        console.log(`❌ RUN ${JSON.stringify(runValue)}: FALLO - ${error.response?.data?.message}`);
        results.push({ run: runValue, success: false, error: error.response?.data });
      }
    }

    return results;
  },

  // Test con las APIs correctas según su propósito
  testCorrectAPIs: async () => {
    console.log('🔄 Probando APIs con sus funciones correctas...');
    const results = {
      dataAPI: { success: false, error: null },
      authAPI: { success: false, error: null }
    };

    try {
      // 1. Probar API de datos (usuarios CRUD)
      console.log('📊 Probando API de datos (CRUD usuarios)...');
      const testUser = {
        name: "Test Data API",
        last_name: "Test", 
        email: "dataapi" + Date.now() + "@test.com",
        password: "123456",
        run: "12345678-9",
        role_id: 2
      };
      
      const userResponse = await api.post('/user', testUser);
      console.log('✅ API de datos: Usuario creado exitosamente');
      results.dataAPI = { success: true, data: userResponse.data };

      // 2. Probar API de autenticación (signup)
      console.log('🔐 Probando API de autenticación (signup)...');
      const authUser = {
        name: "Test Auth API",
        email: "authapi" + Date.now() + "@test.com",
        password: "123456"
      };
      
      const authResponse = await authApiInstance.post('/auth/signup', authUser);
      console.log('✅ API de autenticación: Signup exitoso');
      results.authAPI = { success: true, data: authResponse.data };

      return { success: true, results };

    } catch (error) {
      console.error('❌ Error en las pruebas:', error.response?.data || error.message);
      
      if (error.config?.baseURL?.includes('OdHOEeXs')) {
        results.dataAPI = { success: false, error: error.response?.data || error.message };
      } else if (error.config?.baseURL?.includes('KBcldO_7')) {
        results.authAPI = { success: false, error: error.response?.data || error.message };
      }
      
      return { success: false, results };
    }
  }
};

// Exponer funciones de prueba globalmente para debugging
if (typeof window !== 'undefined') {
  window.testAPI = testAPI;
  console.log('🔧 Funciones de debug disponibles:');
  console.log('- testAPI.testConnection() // Probar conectividad');
  console.log('- testAPI.checkEndpoints() // Verificar endpoints');
  console.log('- testAPI.testUserCreation() // Probar creación de usuario');
  console.log('- testAPI.testMinimalUser() // Probar con datos mínimos');
  console.log('- testAPI.testUserWithoutRun() // Probar sin campo RUN');
}

/**
 * uploadImageToXano: helper para subir un archivo a Xano File Storage
 * Recibe un File (Browser) y devuelve la URL pública (string) o lanza error.
 */
export async function uploadImageToXano(file) {
  if (!file) throw new Error('No se proporcionó archivo');

  // Construir form-data
  const formData = new FormData();
  // Xano espera normalmente un campo 'file' o 'image' según la configuración del endpoint
  formData.append('file', file);

  try {
    // Si tienes un endpoint específico para uploads en Xano, úsalo aquí. Por defecto usamos '/file' como ejemplo
    const uploadEndpoint = '/file';

    // Do NOT set Content-Type manually for FormData; the browser will assign the proper
    // multipart boundary. Setting it manually can cause 400 errors due to missing boundary.
    const response = await api.post(uploadEndpoint, formData, {
      timeout: 30000
    });

    // Xano normalmente devuelve metadata con url o file.url
    const data = response.data;
    // Busca propiedades comunes
    const possibleUrl = data?.url || data?.file?.url || data?.file_url || data?.fileUrl;
    if (!possibleUrl) {
      // Si el endpoint devuelve un objeto array u otra estructura, intenta inspeccionar
      if (Array.isArray(data) && data.length && data[0].url) return data[0].url;
      throw new Error('La respuesta del servidor no contiene URL pública de la imagen');
    }

    return possibleUrl;
  } catch (error) {
    const resp = error.response?.data;
    console.error('Error subiendo imagen a Xano:', resp ? JSON.stringify(resp, null, 2) : error.message, 'status:', error.response?.status);
    throw error;
  }
}

// ===== ROLES =====

export const rolesAPI = {
  // Obtener todos los roles - Endpoint: GET /role
  getAll: async () => {
    try {
      const response = await api.get('/role');
      return response.data;
    } catch (error) {
      console.error('Error al obtener roles:', error);
      // Fallback a roles estáticos
      return [
        { id: 1, nombre: 'admin' },
        { id: 2, nombre: 'cliente' }
      ];
    }
  }
};

// ===== USUARIOS =====

// Helper function para mapear datos de usuario de Xano al frontend
const mapUserFromXano = (xanoUser) => {
  if (!xanoUser) return null;
  
  return {
    id: xanoUser.id,
    // Campos exactos de la tabla 'user' en Xano (SIN campo run)
    nombre: xanoUser.name,           // name (text)
    apellidos: xanoUser.last_name,   // last_name (text)
    email: xanoUser.email,           // email (email)
    telefono: xanoUser.phone || '',  // Si existe campo phone
    role_id: xanoUser.role_id,       // role_id (integer) - CAMPO PRINCIPAL
    rol_id: xanoUser.role_id,        // Alias para compatibilidad
    rol: xanoUser.role_id === 2 ? 'admin' : 'cliente', // ← CORREGIDO: 2 = admin, 1 = cliente
  password_hash: xanoUser.password_hash, // password_hash (password)
  // If the project stores plaintext passwords (not recommended), include it here
  password: xanoUser.password,
    creado_en: xanoUser.created_at,  // created_at (timestamp)
    fechaRegistro: xanoUser.created_at
  };
};

// Helper function para mapear datos de usuario del frontend a Xano
// Usar campos exactos como están definidos en la tabla 'user' (SIN campo run)
const mapUserToXano = (frontendUser) => {
  // Crear objeto con todos los campos requeridos
  const xanoData = {
    // Campos obligatorios con valores predeterminados seguros
    name: "",
    last_name: "",
    email: "",
    password: "",
    role_id: 1  // Por defecto cliente (1), admin sería (2)
  };
  
  // Mapear campos obligatorios
  if (frontendUser.nombre && typeof frontendUser.nombre === 'string') {
    xanoData.name = frontendUser.nombre.trim();
  }
  
  if (frontendUser.apellidos && typeof frontendUser.apellidos === 'string') {
    xanoData.last_name = frontendUser.apellidos.trim();
  }
  
  if (frontendUser.email && typeof frontendUser.email === 'string') {
    xanoData.email = frontendUser.email.trim();
  }
  
  if (frontendUser.password && typeof frontendUser.password === 'string') {
    xanoData.password = frontendUser.password;
  }
  
  // role_id como integer
  if (frontendUser.rol) {
    xanoData.role_id = frontendUser.rol === 'admin' ? 2 : 1; // Corregido: admin = 2, cliente = 1
  }
  
  // Campos opcionales (si existen)
  if (frontendUser.telefono && typeof frontendUser.telefono === 'string') {
    xanoData.phone = frontendUser.telefono.trim();
  }
  
  return xanoData;
};

// Note: password hashing must be handled server-side (bcrypt). Do not compute hashes client-side here.

// Helper para mapear servicios de Xano al frontend
// Normaliza el campo de imagen que Xano puede devolver como:
// - string URL
// - object { url } o { file: { url } }
// - array [{ url }] (ej. múltiples archivos)
// Devolvemos siempre una cadena en `imagen_url` y `imagen` para no romper la UI.
const mapServiceFromXano = (xanoService) => {
  if (!xanoService) return null;

  const extractImageUrl = (field) => {
    if (!field) return null;
    // caso simple: ya es string
    if (typeof field === 'string') return field;
    // array de objetos/strings
    if (Array.isArray(field) && field.length) {
      const first = field[0];
      if (!first) return null;
      if (typeof first === 'string') return first;
      return first.url || first.file?.url || first.file_url || first.fileUrl || null;
    }
    // objeto con posibles propiedades
    if (typeof field === 'object') {
      return field.url || field.file?.url || field.file_url || field.fileUrl || null;
    }
    return null;
  };

  // Buscar en varios nombres posibles que Xano podría devolver
  const rawImage = xanoService.image_url ?? xanoService.image ?? xanoService.image_file ?? xanoService.file ?? null;
  const normalizedImage = extractImageUrl(rawImage) || '';

  return {
    id: xanoService.id,
    // Campos exactos de la tabla 'service' en Xano
    nombre: xanoService.name,                    // name (text)
    descripcion: xanoService.description,        // description (text)
    precio: xanoService.price,                   // price (decimal)
    categoria: xanoService.category,             // category (text)
    proveedor: xanoService.provider,             // provider (text)
    disponibilidad: xanoService.availability,    // availability (text)
    // Normalizamos siempre a string (puede ser '' si no hay imagen)
    imagen_url: normalizedImage,
    // Alias compatibilidad con frontend
    imagen: normalizedImage,
    valoracion: xanoService.rating,              // rating (decimal)
    num_valoraciones: xanoService.num_ratings,   // num_ratings (integer)
    numValoraciones: xanoService.num_ratings,
    disponible: xanoService.available,           // available (bool)
    estado: xanoService.status,                  // status (text)
    creado_por: xanoService.user_id,            // user_id (integer)
    service_category_id: xanoService.service_category_id || xanoService.service_category || null,
    creado_en: xanoService.created_at           // created_at (timestamp)
  };
};

// Helper para mapear servicios del frontend a Xano
// Aceptamos que `frontendService.imagen`/`imagen_url` pueda ser:
// - string (URL)
// - objeto { url } (por ejemplo resultado de un upload)
// Si el cliente está enviando un archivo (File) se debe usar el flujo de upload
// que adjunta `image_file` como multipart/form-data (ese caso lo manejamos en las páginas).
const mapServiceToXano = (frontendService) => {
  const resolveFrontendImage = (field) => {
    if (!field) return null;
    if (typeof field === 'string') return field;
    if (Array.isArray(field) && field.length) {
      const first = field[0];
      if (typeof first === 'string') return first;
      return first?.url || first?.file?.url || first?.file_url || first?.fileUrl || null;
    }
    if (typeof field === 'object') {
      return field.url || field.file?.url || field.file_url || field.fileUrl || null;
    }
    return null;
  };

  const imageUrl = resolveFrontendImage(frontendService.imagen_url ?? frontendService.imagen) || null;

  return {
    // Campos exactos de la tabla 'service' en Xano
    name: frontendService.nombre,
    description: frontendService.descripcion,
    price: frontendService.precio,
    category: frontendService.categoria,
    provider: frontendService.proveedor,
    availability: frontendService.disponibilidad,
    // En envíos normales usamos la URL (si existe). Para subir archivos, las páginas usan FormData con image_file.
    image_url: imageUrl,
    rating: frontendService.valoracion || 0,
    num_ratings: frontendService.num_valoraciones || 0,
    available: frontendService.disponible !== false,
    status: frontendService.estado || 'active',
    user_id: frontendService.creado_por || frontendService.user_id,
    // Enviar el id de categoría si está disponible
    service_category_id: frontendService.service_category_id || frontendService.service_category || null
  };
};

// Helper para mapear blogs de Xano al frontend
// Normaliza image_url (string | object | array) para que la UI reciba siempre una URL string
const mapBlogFromXano = (xanoBlog) => {
  if (!xanoBlog) return null;

  const extractImageUrl = (field) => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    if (Array.isArray(field) && field.length) {
      const first = field[0];
      if (!first) return '';
      if (typeof first === 'string') return first;
      return first.url || first.file?.url || first.file_url || first.fileUrl || '';
    }
    if (typeof field === 'object') {
      return field.url || field.file?.url || field.file_url || field.fileUrl || '';
    }
    return '';
  };

  const rawImage = xanoBlog.image_url ?? xanoBlog.image ?? xanoBlog.image_file ?? null;
  const normalizedImage = extractImageUrl(rawImage) || '';

  return {
    id: xanoBlog.id,
    // Campos exactos de la tabla 'blog' en Xano
    titulo: xanoBlog.title,                     // title (text)
    contenido: xanoBlog.content,                // content (text)
    categoria: xanoBlog.category,               // category (text)
  // Exponer la URL normalizada en varios nombres para compatibilidad con la UI
  imagen_url: normalizedImage,                // nombre en español (mantener compatibilidad)
  image_url: normalizedImage,                 // nombre en inglés usado en componentes
  imagen: normalizedImage,                    // alias corto usado en varias vistas
    fecha_publicacion: xanoBlog.publication_date, // publication_date (timestamp)
    estado: xanoBlog.status,                    // status (text)
    autor_id: xanoBlog.user_id,                 // user_id (integer)
    creado_en: xanoBlog.created_at,             // created_at (timestamp)
    // Campos adicionales para compatibilidad con frontend
    fecha: xanoBlog.publication_date,
    autor: `Usuario ${xanoBlog.user_id}` // Placeholder, se puede mejorar con join
  };
};

// Helper para mapear blogs del frontend a Xano
const mapBlogToXano = (frontendBlog) => {
  const resolveFrontendImage = (field) => {
    if (!field) return null;
    if (typeof field === 'string') return field;
    if (Array.isArray(field) && field.length) {
      const first = field[0];
      if (typeof first === 'string') return first;
      return first?.url || first?.file?.url || first?.file_url || first?.fileUrl || null;
    }
    if (typeof field === 'object') {
      return field.url || field.file?.url || field.file_url || field.fileUrl || null;
    }
    return null;
  };

  const imageUrl = resolveFrontendImage(frontendBlog.imagen_url ?? frontendBlog.imagen) || null;

  return {
    // Campos exactos de la tabla 'blog' en Xano
    title: frontendBlog.titulo,
    content: frontendBlog.contenido,
    category: frontendBlog.categoria,
    image_url: imageUrl,
    publication_date: frontendBlog.fecha_publicacion || new Date().toISOString(),
    status: frontendBlog.estado || 'pending',
    user_id: frontendBlog.autor_id || frontendBlog.user_id
  };
};

export const usuariosAPI = {
  // Obtener todos los usuarios (solo admin) 
  // Endpoint: GET /user (Xano traduce automáticamente 'usuarios' → 'user')
  getAll: async () => {
    try {
      console.log(`GET ${ENDPOINTS.USERS}`);
      const data = await cachedGet(ENDPOINTS.USERS);
      console.log('Usuarios obtenidos (cache):', data?.length || 0);
      return (data || []).map(mapUserFromXano);
    } catch (error) {
      console.error('Error al obtener usuarios:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener usuario por ID
  // Endpoint: GET /user/{user_id}
  getById: async (id) => {
    try {
      console.log(`GET ${ENDPOINTS.USERS}/${id}`);
      const response = await api.get(`${ENDPOINTS.USERS}/${id}`);
      console.log('Usuario obtenido:', response.data);
      return mapUserFromXano(response.data);
    } catch (error) {
      console.error('Error al obtener usuario:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener datos crudos del usuario por ID (sin mapear) - útil para verificaciones
  getRawById: async (id) => {
    try {
      console.log(`GET RAW ${ENDPOINTS.USERS}/${id}`);
      const response = await api.get(`${ENDPOINTS.USERS}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener usuario (raw):', error.response?.data || error.message);
      throw error;
    }
  },

  // Crear nuevo usuario (registro)
  // Endpoint: POST /user
  // IMPORTANTE: Enviar campos en español como están en la BD
  create: async (userData) => {
    try {
      // NO imprimir userData completo para evitar exponer contraseñas en logs
      console.log('📝 Registro: iniciando creación de usuario (campos visibles):', {
        nombre: userData.nombre,
        apellidos: userData.apellidos,
        email: userData.email
      });
      
      // Validar datos obligatorios (SIN campo run)
      if (!userData.nombre || !userData.apellidos || !userData.email || !userData.password) {
        throw new Error('Faltan campos obligatorios: nombre, apellidos, email, password');
      }
      
  // Usar el helper para mapear datos (campos en español)
  const dataToSend = mapUserToXano(userData);
  // Incluir password en texto plano si existe (NO recomendado para producción)
  if (userData.password) dataToSend.password = userData.password;
      console.log('📤 Datos mapeados para Xano (password oculto) - enviando al backend para hashing seguro');
      console.log('🔍 Tipos de datos:');
      console.log('  - name:', typeof dataToSend.name, '=', dataToSend.name);
      console.log('  - last_name:', typeof dataToSend.last_name, '=', dataToSend.last_name);
      console.log('  - email:', typeof dataToSend.email, '=', dataToSend.email);
      console.log('  - role_id:', typeof dataToSend.role_id, '=', dataToSend.role_id);
      console.log('  - password:', typeof dataToSend.password, '= [hidden]');
      console.log(`📡 POST ${ENDPOINTS.USERS}`);

      const response = await api.post(ENDPOINTS.USERS, dataToSend);
      console.log('✅ Usuario creado exitosamente:', response.data);
      
      // Mapear respuesta de vuelta al formato del frontend
  return mapUserFromXano(response.data);
    } catch (error) {
      console.error('❌ Error detallado al crear usuario:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        endpoint: ENDPOINTS.USERS,
        fullError: JSON.stringify(error.response?.data, null, 2)
      });
      throw error;
    }
  },

  // Actualizar usuario
  // Endpoint: PATCH /user/{user_id}
  update: async (id, userData) => {
    try {
      console.log(`Actualizando usuario ${id}:`, userData);
      const dataToSend = mapUserToXano(userData);
      console.log(`PATCH ${ENDPOINTS.USERS}/${id}`);
      
      const response = await api.patch(`${ENDPOINTS.USERS}/${id}`, dataToSend);
      console.log('Usuario actualizado:', response.data);
      return mapUserFromXano(response.data);
    } catch (error) {
      console.error('Error al actualizar usuario:', error.response?.data || error.message);
      throw error;
    }
  },

  // Eliminar usuario (solo admin)
  // Endpoint: DELETE /user/{user_id}
  delete: async (id) => {
    try {
      console.log(`DELETE ${ENDPOINTS.USERS}/${id}`);
      const response = await api.delete(`${ENDPOINTS.USERS}/${id}`);
      console.log('Usuario eliminado');
      return response.data;
    } catch (error) {
      console.error('Error al eliminar usuario:', error.response?.data || error.message);
      throw error;
    }
  },

  // Buscar usuario por email (para login)
  findByEmail: async (email) => {
    try {
      console.log(`Buscando usuario por email: ${email}`);
      // Como no hay endpoint específico, obtenemos todos y filtramos
      const response = await api.get(ENDPOINTS.USERS);
      const users = response.data.map(mapUserFromXano);
      const user = users.find(user => user.email === email);
      console.log('Usuario encontrado:', user ? 'Sí' : 'No');
      return user;
    } catch (error) {
      // If the data API fails (500) we return null and log details so the caller can handle gracefully
      console.error('Error al buscar usuario por email:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      return null;
    }
  }
};

// ===== AUTENTICACIÓN =====

export const authAPI = {
  // Login usando la API de autenticación
  login: async (email, password) => {
    try {
      console.log('🔐 Intentando login con API de autenticación...');
      
      // Limpiar cualquier token previo
      delete authApiInstance.defaults.headers.common['Authorization'];
      const response = await authApiInstance.post('/auth/login', { 
        email, 
        password
      });

      console.log('✅ Login exitoso:', response.data);
      // Attempt to locate token in multiple possible shapes returned by Xano
      const raw = response.data;
      console.log('🔍 Estructura de respuesta (top-level):', Array.isArray(raw) ? `Array(${raw.length})` : Object.keys(raw || {}));

      // Common places for tokens: { authToken }, { token }, { accessToken }, or inside an array [ { authToken } ]
      const token = raw?.authToken || raw?.token || raw?.accessToken || raw?.data?.authToken || raw?.data?.token || (Array.isArray(raw) && raw[0] && (raw[0].authToken || raw[0].token || raw[0].accessToken));

      if (token) {
        // Configure both axios instances so subsequent requests include the token
        authApiInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('🔑 Token configurado automáticamente en axios (auth & data)');
      } else {
        console.warn('⚠️ Login respondido sin token detectable. Revisa la configuración del endpoint /auth/login en Xano.');
        // Show some useful debugging info without exposing secrets
        try {
          console.log('📋 Response preview keys/top-level:', Array.isArray(raw) ? `Array(${raw.length})` : Object.keys(raw || {}));
        } catch (e) {
          console.log('📋 Response raw:', raw);
        }
      }

      return response.data;
    } catch (error) {
      console.error('❌ Error en login:', error.response?.data || error.message);
      console.error('📊 Status:', error.response?.status);
      console.error('📋 Response data:', error.response?.data);
      
      // Si es error 403 con credenciales válidas, podría ser rate limiting de auth
      if (error.response?.status === 403) {
        console.log('⚠️ Error 403 detectado - posible rate limiting o acceso denegado en auth API');
      }
      
      throw error;
    }
  },

  // Registro usando la API de autenticación
  signup: async (userData) => {
    try {
      console.log('📝 Intentando registro con API de autenticación...');
      // Enviar la estructura completa que Xano espera para crear el usuario
      // Incluimos last_name y role_id para que el Function Stack pueda usarlos
      const payload = {
        name: userData.nombre || userData.name || '',
        last_name: userData.apellidos || userData.last_name || '',
        email: userData.email || userData.email_address || '',
        password: userData.password || userData.password_plain || '',
        role_id: userData.rol_id || userData.role_id || 1 // default: cliente = 1
      };

      const response = await authApiInstance.post('/auth/signup', payload);
      console.log('✅ Registro exitoso (auth):', response.data);

      // Verificación post-signup: asegurar que el record en /user existe y contiene password_hash
      try {
        const MAX_ATTEMPTS = 3;
        let created = null;
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          // Intentar obtener el usuario por email (usuariosAPI.findByEmail retorna el user mapeado)
          created = await usuariosAPI.findByEmail(payload.email);
          if (created) break;
          // Esperar un poco antes del siguiente intento para permitir la propagación en Xano
          await new Promise(res => setTimeout(res, 300));
        }

        if (!created) {
          const err = new Error('Registro creado en auth, pero no existe record en /user (verifica Function Stack).');
          err.serverData = response.data;
          throw err;
        }

        if (!created.password_hash) {
          const err = new Error('La contraseña NO fue hasheada en el servidor: campo password_hash vacío. Revisar Hash Password en /auth/signup.');
          err.serverData = created;
          throw err;
        }

        // Todo OK
        return response.data; // Ya viene con el token
      } catch (verifyErr) {
        console.error('❌ Verificación post-signup falló:', verifyErr.serverData || verifyErr.message || verifyErr);
        throw verifyErr;
      }
    } catch (error) {
        // Log básico
        console.error('❌ Error en registro (authAPI.signup):', error.response?.data || error.message);
        // Si es 403, imprimir detalle completo para debugging (temporal)
        if (error.response?.status === 403) {
          try {
            console.error('🔍 Detalle 403 (server response):', JSON.stringify(error.response?.data, null, 2));
          } catch (e) {
            console.error('🔍 Detalle 403 (server response) RAW:', error.response?.data);
          }
        }
        // Xano a veces retorna 403 con message "This account is already in use." and code ERROR_CODE_ACCESS_DENIED
        // Tratar ese caso como 'duplicate account' para mostrar mensaje amigable al usuario
        const respBody = error.response?.data || {};
        const respMessage = (respBody.message || '').toString().toLowerCase();
        const respCode = respBody.code || '';
        if (error.response?.status === 403 && (respMessage.includes('already in use') || respCode === 'ERROR_CODE_ACCESS_DENIED')) {
          const dupErr = new Error('El email ya está registrado en el sistema');
          dupErr.status = 409;
          dupErr.serverData = respBody;
          throw dupErr;
        }
        const serverMessage = (error.response?.data?.message || error.message || '').toString();
        const status = error.response?.status;

        // Si el error viene de nuestra verificación post-signup (registro creado pero sin hash o sin record),
        // re-lanzarlo para que el caller (AuthContext) lo maneje y muestre un mensaje amigable.
        const verificationErrors = [
          'registro creado en auth, pero no existe record en /user',
          'la contraseña no fue hasheada en el servidor',
          'no fue hasheada',
          'no se encontró'
        ];

        for (const ve of verificationErrors) {
          if (serverMessage.toLowerCase().includes(ve)) {
            // Re-throw original error to be handled upstream
            throw error;
          }
        }

        // Detectar errores de registro duplicado o validación y no intentar fallback para evitar doble creación
        const isDuplicate = (typeof serverMessage === 'string' && serverMessage.toLowerCase().includes('duplicate')) || status === 409 || status === 422;
        if (isDuplicate) {
          const err = new Error('El email ya está registrado en el sistema');
          err.status = status || 500;
          err.serverData = error.response?.data;
          throw err;
        }

        // No realizaremos fallback automático a /user porque provoca intentos duplicados y 500.
        console.error('No se realizará fallback a /user. Revisa la configuración de /auth/signup en Xano y el Function Stack.');
        const errFinal = new Error(error.response?.data?.message || error.message || 'Error en auth signup');
        errFinal.serverData = error.response?.data || error;
        throw errFinal;
    }
  },

  // Obtener perfil del usuario autenticado
  me: async (token) => {
    try {
      console.log('👤 Obteniendo perfil de usuario...');
      const response = await authApiInstance.get('/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Perfil obtenido:', response.data);
      return mapUserFromXano(response.data);
    } catch (error) {
      console.error('❌ Error al obtener perfil:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener perfil del usuario actual - Endpoint: GET /user/{user_id}
  getProfile: async (userId) => {
    try {
      const response = await api.get(`/user/${userId}`);
      return mapUserFromXano(response.data);
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      throw error;
    }
  }
};

// ===== SERVICIOS =====

export const serviciosAPI = {
  // Obtener todos los servicios - Endpoint: GET /service
  // getAll accepts an options object:
  // { includeAll: boolean, limit: number, ttl: number }
  // - includeAll: when true, request all records (admin). When false, filter active only.
  // - limit: optional numeric limit for featured lists.
  // - ttl: cache ttl in ms to pass to cachedGet
  getAll: async (options = {}) => {
    try {
      const { includeAll = false, limit = null, ttl = 120000 } = options;
      // Build query params: only request active services when not includeAll
      const params = [];
      if (!includeAll) {
        params.push('available=true');
        params.push('status=active');
      }
      if (limit && Number.isInteger(limit) && limit > 0) {
        params.push(`limit=${limit}`);
      }

      const url = params.length ? `${ENDPOINTS.SERVICES}?${params.join('&')}` : ENDPOINTS.SERVICES;
      console.log(`📡 GET ${url}`);
      const data = await cachedGet(url, ttl);
      console.log('✅ Servicios obtenidos:', data?.length || 0);
      return (data || []).map(mapServiceFromXano);
    } catch (error) {
      console.error('❌ Error al obtener servicios:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener servicio por ID - Endpoint: GET /service/{service_id}
  getById: async (id) => {
    try {
      console.log(`📡 GET ${ENDPOINTS.SERVICES}/${id}`);
      const response = await api.get(`${ENDPOINTS.SERVICES}/${id}`);
      console.log('✅ Servicio obtenido:', response.data);
      return mapServiceFromXano(response.data);
    } catch (error) {
      console.error('❌ Error al obtener servicio:', error.response?.data || error.message);
      throw error;
    }
  },

  // Crear nuevo servicio (solo admin) - Endpoint: POST /service
  create: async (servicioData) => {
    try {
      console.log('📤 Datos originales del servicio:', servicioData);
      // Si recibimos FormData (multipart) enviarlo directamente (para soportar image_file)
      if (servicioData instanceof FormData) {
        console.log('📡 POST multipart (service)');
        const response = await api.post(ENDPOINTS.SERVICES, servicioData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log('✅ Servicio creado (multipart):', response.data);
        return mapServiceFromXano(response.data);
      }

      // Usar el helper para mapear campos exactos de la tabla 'service'
      const dataToSend = mapServiceToXano(servicioData);
      console.log('📤 Datos a enviar a Xano (campos de tabla service):', dataToSend);
      console.log(`📡 POST ${ENDPOINTS.SERVICES}`);

      const response = await api.post(ENDPOINTS.SERVICES, dataToSend);
      console.log('✅ Servicio creado exitosamente:', response.data);
      return mapServiceFromXano(response.data);
    } catch (error) {
      console.error('❌ Error al crear servicio:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  },

  // Actualizar servicio (solo admin) - Endpoint: PATCH /service/{service_id}
  update: async (id, servicioData) => {
    try {
      console.log(`📤 Actualizando servicio ${id}:`, servicioData);
      const dataToSend = mapServiceToXano(servicioData);
      console.log(`📡 PATCH ${ENDPOINTS.SERVICES}/${id}`);
      
      const response = await api.patch(`${ENDPOINTS.SERVICES}/${id}`, dataToSend);
      console.log('✅ Servicio actualizado:', response.data);
      return mapServiceFromXano(response.data);
    } catch (error) {
      console.error('❌ Error al actualizar servicio:', error.response?.data || error.message);
      throw error;
    }
  },

  // Eliminar servicio (solo admin) - Endpoint: DELETE /service/{service_id}
  delete: async (id) => {
    try {
      console.log(`📡 DELETE ${ENDPOINTS.SERVICES}/${id}`);
      const response = await api.delete(`${ENDPOINTS.SERVICES}/${id}`);
      console.log('✅ Servicio eliminado');
      return response.data;
    } catch (error) {
      console.error('❌ Error al eliminar servicio:', error.response?.data || error.message);
      throw error;
    }
  }
};

// ===== BLOGS =====

export const blogsAPI = {
  // Obtener todos los blogs - Endpoint: GET /blog
  getAll: async (includeAll = false) => {
    try {
      console.log(`📡 GET ${ENDPOINTS.BLOGS}`);
      const data = await cachedGet(ENDPOINTS.BLOGS);
      console.log('✅ Blogs obtenidos:', data);
      return (data || []).map(mapBlogFromXano);
    } catch (error) {
      console.error('❌ Error al obtener blogs:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener blog por ID - Endpoint: GET /blog/{blog_id}
  getById: async (id) => {
    try {
      console.log(`📡 GET ${ENDPOINTS.BLOGS}/${id}`);
      const response = await api.get(`${ENDPOINTS.BLOGS}/${id}`);
      console.log('✅ Blog obtenido:', response.data);
      return mapBlogFromXano(response.data);
    } catch (error) {
      console.error('❌ Error al obtener blog:', error.response?.data || error.message);
      throw error;
    }
  },

  // Crear nuevo blog - Endpoint: POST /blog
  create: async (blogData) => {
    try {
      console.log('📤 Creando blog:', blogData instanceof FormData ? '[FormData]' : blogData);

      // Si recibimos FormData, inspeccionar su contenido para debugging y validar campos
      if (blogData instanceof FormData) {
        console.log('📡 POST multipart (blog) - inspeccionando FormData antes de enviar');
        const fdPreview = {};
        for (const pair of blogData.entries()) {
          const [k, v] = pair;
          // Si es File, indicar su nombre y tipo en la vista previa
          if (v instanceof File) {
            fdPreview[k] = { fileName: v.name, fileType: v.type, size: v.size };
          } else if (Array.isArray(v)) {
            fdPreview[k] = v.map(i => (typeof i === 'string' ? i : (i?.name || 'object')));
          } else {
            fdPreview[k] = v;
          }
        }
        console.log('🔎 FormData preview:', fdPreview);

        // Validación cliente: campos obligatorios mínimos
        const title = blogData.get('title') || '';
        const content = blogData.get('content') || '';
        if (!title.toString().trim() || !content.toString().trim()) {
          throw new Error('Validación: title y content son requeridos antes de enviar el formulario. Revisa tu formulario.');
        }

        // Enviar FormData (no setear Content-Type)
        const response = await api.post(ENDPOINTS.BLOGS, blogData);
        console.log('✅ Blog creado (multipart):', response.data);
        return mapBlogFromXano(response.data);
      }

      // Si recibimos JSON/objeto, normalizar image_url si viene como array
      let dataToSend = mapBlogToXano(blogData);
      // Si por alguna razón image_url es un array, intentar extraer una URL o convertir a string
      if (Array.isArray(dataToSend.image_url)) {
        const imgArr = dataToSend.image_url;
        let resolved = null;
        if (imgArr.length && typeof imgArr[0] === 'string') resolved = imgArr[0];
        else if (imgArr.length && typeof imgArr[0] === 'object') resolved = imgArr[0].url || imgArr[0].file?.url || null;
        dataToSend.image_url = resolved;
      }

      console.log(`📡 POST ${ENDPOINTS.BLOGS} - payload:`, dataToSend);
      const response = await api.post(ENDPOINTS.BLOGS, dataToSend);
      console.log('✅ Blog creado:', response.data);
      return mapBlogFromXano(response.data);
    } catch (error) {
      const resp = error.response?.data;
      console.error('❌ Error al crear blog:', resp ? JSON.stringify(resp, null, 2) : error.message, 'status:', error.response?.status);
      throw error;
    }
  },

  // Actualizar blog - Endpoint: PATCH /blog/{blog_id}
  update: async (id, blogData) => {
    try {
      console.log(`📤 Actualizando blog ${id}:`, blogData);
      const dataToSend = mapBlogToXano(blogData);
      console.log(`📡 PATCH ${ENDPOINTS.BLOGS}/${id}`);
      
      const response = await api.patch(`${ENDPOINTS.BLOGS}/${id}`, dataToSend);
      console.log('✅ Blog actualizado:', response.data);
      return mapBlogFromXano(response.data);
    } catch (error) {
      console.error('❌ Error al actualizar blog:', error.response?.data || error.message);
      throw error;
    }
  },

  // Eliminar blog - Endpoint: DELETE /blog/{blog_id}
  delete: async (id) => {
    try {
      console.log(`📡 DELETE ${ENDPOINTS.BLOGS}/${id}`);
      const response = await api.delete(`${ENDPOINTS.BLOGS}/${id}`);
      console.log('✅ Blog eliminado');
      return response.data;
    } catch (error) {
      console.error('❌ Error al eliminar blog:', error.response?.data || error.message);
      throw error;
    }
  },

  // Cambiar estado del blog (solo admin)
  updateStatus: async (id, estado) => {
    try {
      console.log(`📤 Cambiando estado del blog ${id} a: ${estado}`);
      const response = await api.put(`${ENDPOINTS.BLOGS}/${id}/estado`, { estado });
      console.log('✅ Estado del blog actualizado');
      return response.data;
    } catch (error) {
      console.error('❌ Error al cambiar estado del blog:', error.response?.data || error.message);
      throw error;
    }
  }
};

// ===== COMENTARIOS =====

export const comentariosAPI = {
  // Obtener comentarios de un blog
  getByBlogId: async (blogId) => {
    try {
      const response = await api.get(`/blogs/${blogId}/comentarios`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener comentarios:', error);
      throw error;
    }
  },

  // Crear nuevo comentario
  create: async (blogId, comentarioData) => {
    try {
      const dataToSend = {
        ...comentarioData,
        blog_id: blogId,
        fecha: new Date().toISOString()
      };

      const response = await api.post(`/blogs/${blogId}/comentarios`, dataToSend);
      return response.data;
    } catch (error) {
      console.error('Error al crear comentario:', error);
      throw error;
    }
  },

  // Eliminar comentario
  delete: async (id) => {
    try {
      const response = await api.delete(`/comentarios/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error al eliminar comentario:', error);
      throw error;
    }
  }
};

// ===== CARRITO =====

export const carritoAPI = {
  // Obtener carrito del usuario
  getByUserId: async (userId) => {
    try {
      const response = await api.get(`/carrito/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener carrito:', error);
      throw error;
    }
  },

  // Crear carrito para usuario (si no existe)
  create: async (userId) => {
    try {
      const response = await api.post('/carrito', {
        usuario_id: userId,
        activo: true
      });
      return response.data;
    } catch (error) {
      console.error('Error al crear carrito:', error);
      throw error;
    }
  },

  // Agregar item al carrito
  addItem: async (userId, itemData) => {
    try {
      const response = await api.post(`/carrito/${userId}/item`, {
        servicio_id: itemData.servicio_id,
        cantidad: itemData.cantidad || 1,
        subtotal: itemData.subtotal
      });
      return response.data;
    } catch (error) {
      console.error('Error al agregar item al carrito:', error);
      throw error;
    }
  },

  // Actualizar cantidad de item en carrito
  updateItem: async (userId, itemId, cantidad) => {
    try {
      const response = await api.put(`/carrito/${userId}/item/${itemId}`, { cantidad });
      return response.data;
    } catch (error) {
      console.error('Error al actualizar item del carrito:', error);
      throw error;
    }
  },

  // Eliminar item del carrito
  removeItem: async (userId, itemId) => {
    try {
      const response = await api.delete(`/carrito/${userId}/item/${itemId}`);
      return response.data;
    } catch (error) {
      console.error('Error al eliminar item del carrito:', error);
      throw error;
    }
  },

  // Limpiar carrito
  clear: async (userId) => {
    try {
      const response = await api.delete(`/carrito/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error al limpiar carrito:', error);
      throw error;
    }
  }
};

// ===== PAGOS =====

export const pagosAPI = {
  // Crear nuevo pago
  create: async (pagoData) => {
    try {
      const dataToSend = {
        ...pagoData,
        fecha_pago: new Date().toISOString(),
        estado: pagoData.estado || 'pendiente'
      };

      const response = await api.post('/pagos', dataToSend);
      return response.data;
    } catch (error) {
      console.error('Error al crear pago:', error);
      throw error;
    }
  },

  // Obtener pagos del usuario
  getByUserId: async (userId) => {
    try {
      const response = await api.get(`/pagos/usuario/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener pagos:', error);
      throw error;
    }
  },

  // Obtener todos los pagos (solo admin)
  getAll: async () => {
    try {
      const response = await api.get('/pagos');
      return response.data;
    } catch (error) {
      console.error('Error al obtener todos los pagos:', error);
      throw error;
    }
  },

  // Actualizar estado del pago
  updateStatus: async (id, estado) => {
    try {
      const response = await api.put(`/pagos/${id}/estado`, { estado });
      return response.data;
    } catch (error) {
      console.error('Error al actualizar estado del pago:', error);
      throw error;
    }
  }
};

// ===== CATEGORÍAS =====
// Obtener categorías de blogs (formato objeto)
export const getBlogCategories = async () => {
  try {
    // Use cachedGet to avoid repeated requests and rate-limits (TTL: 5min)
    const data = await cachedGet('/blog_category', 300000);
    return data;
  } catch (error) {
    console.error('Error al obtener categorías de blogs:', error);
    // Fallback: devolver las 3 categorías básicas si el endpoint no existe
    return [
      'Tendencia',
      'Consejos',
      'Experiencias'
    ];
  }
};

export const getServiceCategories = async () => {
  try {
    // Use cachedGet to avoid repeated requests and rate-limits (TTL: 5min)
    const data = await cachedGet('/service_category', 300000);
    return data;
  } catch (error) {
    console.error('Error al obtener categorías de servicios:', error);
    // Fallback: devolver categorías estáticas de la tabla service_category
    return [
      "Animacion y Entretenimiento",
      "Musica y Sonido",
      "Decoracion y Ambientacion",
      "Catering y Banquetería",
      "Fotografia y Video",
      "Logistica y Produccion",
      "Estilo y Belleza",
      "Eventos Infantiles",
      "Eventos Especiales"
    ];
  }
};

// Compatibilidad: exportar un objeto categoriasAPI con los métodos esperados por la app
export const categoriasAPI = {
  getServicios: getServiceCategories,
  getBlogs: getBlogCategories,
};

// ===== FUNCIONES AUXILIARES =====

export const utils = {
  // Validar si la API está disponible
  checkApiHealth: async () => {
    try {
      const response = await api.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  },

  // 🔑 Funciones de token (alias para compatibilidad)
  setAuthToken: (token) => tokenUtils.setAuthToken(token),
  clearAuthToken: () => tokenUtils.clearAuthToken(),
  hasToken: () => tokenUtils.hasToken(),
  getCurrentToken: () => tokenUtils.getCurrentToken(),

  // Inicializar datos por defecto (fallback)
  initializeDefaultData: async () => {
    try {
      // Crear usuario admin por defecto sin RUN para evitar errores de validación
      const adminUser = {
        nombre: "Admin",
        apellidos: "Sistema", 
        email: "admin@ambientefest.cl",
        password: "admin123",
        rol: "admin"
        // Sin campo 'run' para evitar problemas de validación
      };

      await usuariosAPI.create(adminUser);
      console.log('Usuario admin creado por defecto');
    } catch (error) {
      console.log('Usuario admin ya existe o error al crear:', error.message);
    }
  }
};

// 🔑 Utilidades para manejo de tokens
export const tokenUtils = {
  // Configurar token para todas las requests
  setAuthToken: (token) => {
    if (token) {
      // Configurar en ambas instancias de axios
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      authApiInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('🔑 Token configurado en axios');
    }
  },
  
  // Limpiar token
  clearAuthToken: () => {
    delete api.defaults.headers.common['Authorization'];
    delete authApiInstance.defaults.headers.common['Authorization'];
    console.log('🔓 Token eliminado de axios');
  },
  
  // Verificar si hay token configurado
  hasToken: () => {
    return !!api.defaults.headers.common['Authorization'];
  },
  
  // Obtener token actual
  getCurrentToken: () => {
    const authHeader = api.defaults.headers.common['Authorization'];
    return authHeader ? authHeader.replace('Bearer ', '') : null;
  }
};

// Interceptor para manejar tokens expirados automáticamente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si recibimos 401 y tenemos token, significa que expiró
    if (error.response?.status === 401 && tokenUtils.hasToken()) {
      console.warn('🔓 Token expirado - limpiando...');
      tokenUtils.clearAuthToken();
      localStorage.removeItem('ambienteFestToken');
      localStorage.removeItem('ambienteFestUser');
      
      // Opcional: redirigir a login
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// 🧪 Función para explorar endpoints disponibles
export const exploreAvailableEndpoints = async () => {
  console.log('🔍 Explorando endpoints disponibles...');
  
  const commonEndpoints = [
    '/user', '/users', '/usuario', '/usuarios',
    '/service', '/services', '/servicio', '/servicios',
    '/blog', '/blogs',
    '/role', '/roles', '/rol',
    '/cart', '/carrito',
    '/auth/login', '/auth/signup', '/auth/me'
  ];
  
  const results = {
    dataAPI: {},
    authAPI: {}
  };
  
  // Test Data API endpoints
  console.log('📡 Testing Data API endpoints...');
  for (const endpoint of commonEndpoints.slice(0, -3)) { // Excluir auth endpoints
    try {
      const response = await api.get(endpoint);
      results.dataAPI[endpoint] = { success: true, status: response.status };
      console.log(`✅ ${endpoint}: OK (${response.status})`);
    } catch (error) {
      results.dataAPI[endpoint] = { 
        success: false, 
        status: error.response?.status || 'ERROR',
        message: error.response?.data?.message || error.message
      };
      console.log(`❌ ${endpoint}: ${error.response?.status || 'ERROR'}`);
    }
  }
  
  // Test Auth API endpoints
  console.log('🔐 Testing Auth API endpoints...');
  const authEndpoints = ['/auth/login', '/auth/signup', '/auth/me'];
  for (const endpoint of authEndpoints) {
    try {
      // Para auth endpoints, intentar POST con datos de prueba
      const testData = endpoint === '/auth/me' ? {} : { email: 'test@test.com', password: 'test' };
      const response = endpoint === '/auth/me' 
        ? await authApiInstance.get(endpoint)
        : await authApiInstance.post(endpoint, testData);
      
      results.authAPI[endpoint] = { success: true, status: response.status };
      console.log(`✅ ${endpoint}: OK (${response.status})`);
    } catch (error) {
      results.authAPI[endpoint] = { 
        success: false, 
        status: error.response?.status || 'ERROR',
        message: error.response?.data?.message || error.message
      };
      
      // 401/400 son respuestas esperadas para auth endpoints
      const expectedStatuses = [400, 401, 422];
      const isExpected = expectedStatuses.includes(error.response?.status);
      console.log(`${isExpected ? '⚠️' : '❌'} ${endpoint}: ${error.response?.status || 'ERROR'} ${isExpected ? '(esperado)' : ''}`);
    }
  }
  
  return results;
};

// 🛠️ Función para corregir el rol del admin
export const fixAdminRole = async () => {
  console.log('🔧 Corrigiendo rol del usuario admin...');
  
  try {
    // 1. Encontrar el usuario admin
    console.log('🔍 Buscando usuario admin...');
    const usuarios = await usuariosAPI.getAll();
    const admin = usuarios.find(u => u.email === 'admin@ambientefest.cl');
    
    if (!admin) {
      return {
        success: false,
        message: 'Usuario admin no encontrado',
        error: 'Admin no existe en la base de datos'
      };
    }
    
    console.log('👤 Usuario admin encontrado:', admin);
    
    // 2. Verificar si ya tiene el rol correcto
    if (admin.role_id === 2 || admin.rol_id === 2) {
      return {
        success: true,
        message: 'Usuario admin ya tiene el rol correcto',
        user: admin,
        action: 'no_change_needed'
      };
    }
    
    // 3. Actualizar el rol del admin
    console.log('🔧 Actualizando rol del admin a role_id: 2...');
    const updateData = {
      role_id: 2  // Establecer como admin
    };
    
    const updatedUser = await usuariosAPI.update(admin.id, updateData);
    
    console.log('✅ Rol del admin actualizado exitosamente!');
    return {
      success: true,
      message: 'Rol del admin corregido exitosamente',
      user: updatedUser,
      action: 'updated',
      previous_role: admin.role_id || admin.rol_id || admin.rol,
      new_role: 2
    };
    
  } catch (error) {
    console.error('❌ Error corrigiendo rol del admin:', error);
    
    const errorDetails = {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      code: error.response?.data?.code,
      payload: error.response?.data?.payload,
      fullResponse: error.response?.data
    };
    
    return {
      success: false,
      message: 'Error corrigiendo rol del admin',
      error: errorDetails
    };
  }
};

// 🛠️ Función para crear usuario admin manualmente
export const createAdminUser = async () => {
  console.log('👑 Creando usuario admin...');
  
  try {
    // Primero verificar si ya existe
    console.log('🔍 Verificando si admin ya existe...');
    const usuarios = await usuariosAPI.getAll();
    const existingAdmin = usuarios.find(u => u.email === 'admin@ambientefest.cl');
    
    if (existingAdmin) {
      return {
        success: true,
        message: 'Usuario admin ya existe',
        user: existingAdmin,
        action: 'found'
      };
    }
    
    // Crear usuario admin SIN campo RUN
    console.log('👑 Creando nuevo usuario admin...');
    const adminData = {
      name: "Admin",           // Campo requerido
      last_name: "Sistema",    // Campo requerido  
      email: "admin@ambientefest.cl", // Campo requerido - dominio válido
      password: "admin123",    // Campo requerido
      role_id: 2              // Campo requerido (2 = admin, 1 = cliente)
      // NO incluir 'run' para evitar el error
    };
    
    console.log('📤 Datos a enviar:', JSON.stringify(adminData, null, 2));
    
    // Enviar directamente a la API sin el mapeo que incluye RUN
    const response = await api.post(ENDPOINTS.USERS, adminData);
    
    console.log('✅ Usuario admin creado exitosamente!');
    return {
      success: true,
      message: 'Usuario admin creado exitosamente',
      user: response.data,
      action: 'created'
    };
    
  } catch (error) {
    console.error('❌ Error creando usuario admin:', error);
    
    const errorDetails = {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      code: error.response?.data?.code,
      payload: error.response?.data?.payload,
      fullResponse: error.response?.data
    };
    
    return {
      success: false,
      message: 'Error creando usuario admin',
      error: errorDetails
    };
  }
};

// 🧪 Test específico para el workflow de Xano
export const testXanoWorkflow = async (email = "admin@ambientefest.cl", password = "admin123") => {
  console.log('🔧 Testing Xano Workflow específico...');
  
  const results = {
    steps: [],
    tokens: {},
    workflow: {}
  };
  
  try {
    // Paso 1: Verificar si el usuario existe (simular paso 1-2 del workflow)
    console.log('👤 Paso 1-2: Verificando usuario...');
    try {
      const usuarios = await usuariosAPI.getAll();
      const foundUser = usuarios.find(u => u.email === email);
      
      results.steps.push({
        step: 'Get Record From user',
        success: !!foundUser,
        user: foundUser ? { id: foundUser.id, email: foundUser.email } : null
      });
      
      results.workflow.userExists = !!foundUser;
      
      if (!foundUser) {
        results.steps.push({
          step: 'Precondition user != null',
          success: false,
          reason: 'Usuario no encontrado'
        });
      } else {
        results.steps.push({
          step: 'Precondition user != null',
          success: true
        });
      }
    } catch (error) {
      results.steps.push({
        step: 'Get Record From user',
        success: false,
        error: error.message
      });
    }
    
    // Paso 2: Intentar login completo (pasos 3-5 del workflow)
    console.log('🔐 Paso 3-5: Login con validación y token...');
    try {
      const loginResponse = await authAPI.login(email, password);
      
      // Analizar la respuesta según tu workflow
      const hasUser = !!(loginResponse.user || loginResponse.id);
      const hasToken = !!loginResponse.authToken;
      
      results.steps.push({
        step: 'Validate Password + Create Authentication Token',
        success: true,
        responseStructure: Object.keys(loginResponse),
        hasUser: hasUser,
        hasAuthToken: hasToken,
        authTokenPreview: hasToken ? loginResponse.authToken.substring(0, 30) + '...' : 'No token'
      });
      
      results.tokens.authToken = loginResponse.authToken;
      results.workflow.passwordValid = true;
      results.workflow.tokenCreated = hasToken;
      
      if (hasToken) {
        // Paso 3: Probar el token con endpoint /auth/me
        console.log('🔍 Probando token con /auth/me...');
        try {
          const meResponse = await authAPI.me(loginResponse.authToken);
          
          results.steps.push({
            step: 'Usar token en /auth/me',
            success: true,
            profile: meResponse ? { id: meResponse.id, email: meResponse.email } : null
          });
          
          results.workflow.tokenWorks = true;
        } catch (error) {
          results.steps.push({
            step: 'Usar token en /auth/me',
            success: false,
            error: error.response?.status + ': ' + (error.response?.data?.message || error.message)
          });
          
          results.workflow.tokenWorks = false;
        }
      }
      
    } catch (loginError) {
      const status = loginError.response?.status;
      const message = loginError.response?.data?.message || loginError.message;
      
      results.steps.push({
        step: 'Validate Password',
        success: false,
        status: status,
        error: message
      });
      
      results.workflow.passwordValid = false;
      
      if (status === 403) {
        results.steps.push({
          step: 'Precondition pass_result = true',
          success: false,
          reason: 'Credenciales inválidas o rate limiting'
        });
      }
    }
    
    return {
      success: true,
      results: results,
      summary: `Workflow Xano - ${results.steps.filter(s => s.success).length}/${results.steps.length} pasos exitosos`,
      workflowStatus: {
        userExists: results.workflow.userExists,
        passwordValid: results.workflow.passwordValid,
        tokenCreated: results.workflow.tokenCreated,
        tokenWorks: results.workflow.tokenWorks
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      results: results
    };
  }
};

// 🧪 Test completo del sistema de tokens
export const testTokenSystem = async (email = "admin@ambientefest.cl", password = "admin123") => {
  console.log('🔑 Testing sistema completo de tokens...');
  
  const results = [];
  
  try {
    // Paso 1: Limpiar tokens previos
    console.log('🧹 Limpiando tokens previos...');
    tokenUtils.clearAuthToken();
    results.push({
      step: 'Limpiar tokens',
      success: true,
      hasToken: tokenUtils.hasToken()
    });
    
    // Paso 2: Intentar login y obtener token
    console.log('🔐 Intentando login...');
    try {
      const loginResponse = await authAPI.login(email, password);
      
      const token = loginResponse.authToken || loginResponse.token || loginResponse.access_token;
      const user = loginResponse.user || loginResponse;
      
      results.push({
        step: 'Login',
        success: true,
        hasToken: !!token,
        hasUser: !!user,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'No token',
        user: user ? { id: user.id, email: user.email } : null
      });
      
      if (token) {
        // Paso 3: Configurar token
        console.log('🔧 Configurando token...');
        tokenUtils.setAuthToken(token);
        
        results.push({
          step: 'Configurar token',
          success: true,
          tokenConfigured: tokenUtils.hasToken(),
          currentToken: tokenUtils.getCurrentToken()?.substring(0, 20) + '...'
        });
        
        // Paso 4: Probar request con token
        console.log('📡 Probando request con token...');
        try {
          // Intentar obtener perfil de usuario
          const profileResponse = await authAPI.me(token);
          
          results.push({
            step: 'Request con token',
            success: true,
            profile: profileResponse ? { id: profileResponse.id, email: profileResponse.email } : null
          });
        } catch (error) {
          results.push({
            step: 'Request con token',
            success: false,
            error: error.response?.status + ': ' + (error.response?.data?.message || error.message)
          });
        }
      }
      
    } catch (loginError) {
      results.push({
        step: 'Login',
        success: false,
        error: loginError.response?.status + ': ' + (loginError.response?.data?.message || loginError.message)
      });
    }
    
    return {
      success: true,
      results: results,
      summary: `Sistema de tokens - ${results.filter(r => r.success).length}/${results.length} pasos exitosos`
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      results: results
    };
  }
};

// 🧪 Test específico de login
export const testLogin = async (email = "admin@ambientefest.cl", password = "admin123") => {
  console.log('🔐 Testing login...');
  
  const results = [];
  
  try {
    // Test 1: Login directo con auth API
    console.log('🧪 Test 1: Login directo...');
    try {
      const response = await authAPI.login(email, password);
      results.push({
        test: 'Login directo',
        success: true,
        data: response
      });
      console.log('✅ Login directo: OK');
    } catch (error) {
      results.push({
        test: 'Login directo',
        success: false,
        status: error.response?.status,
        error: error.response?.data?.message || error.message
      });
      console.log('❌ Login directo: FAIL');
    }
    
    // Test 2: Verificar si el usuario existe en data API
    console.log('🧪 Test 2: Buscar usuario en data API...');
    try {
      const usuarios = await usuariosAPI.getAll();
      const foundUser = usuarios.find(u => u.email === email);
      
      results.push({
        test: 'Usuario en data API',
        success: !!foundUser,
        data: foundUser ? { id: foundUser.id, email: foundUser.email, rol: foundUser.rol } : null
      });
      
      if (foundUser) {
        console.log('✅ Usuario encontrado en data API');
      } else {
        console.log('❌ Usuario NO encontrado en data API');
      }
    } catch (error) {
      results.push({
        test: 'Usuario en data API',
        success: false,
        error: error.message
      });
      console.log('❌ Error buscando usuario en data API');
    }
    
    return {
      success: true,
      results: results,
      summary: `${results.filter(r => r.success).length}/${results.length} tests pasaron`
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      results: results
    };
  }
};

// 🧪 Test gentil sin rate limiting
export const gentleAPITest = async () => {
  console.log('🕊️ Test gentil de API...');
  
  try {
    // Solo probar un endpoint para no activar rate limiting
    console.log('📡 Probando endpoint /service...');
    const response = await api.get('/service');
    
    console.log('✅ API funciona correctamente!');
    console.log('📊 Respuesta:', response.data);
    
    return {
      success: true,
      message: 'API responde correctamente',
      data: response.data,
      endpoint: '/service'
    };
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    
    if (status === 429) {
      return {
        success: false,
        message: 'Rate limit activo - espera 1-2 minutos',
        status: 429
      };
    }
    
    console.error('❌ Error en API:', error);
    return {
      success: false,
      message: `Error ${status}: ${message}`,
      status: status
    };
  }
};

// 🧪 Test de creación de usuario sin RUN
export const testUserCreationNoRun = async () => {
  console.log('👤 Probando creación de usuario sin RUN...');
  
  try {
    const testUser = {
      nombre: "Test",
      apellidos: "Usuario",
      email: `test${Date.now()}@example.com`, // Email único
      password: "test123",
      rol: "cliente"
      // Sin campo 'run'
    };
    
    const response = await usuariosAPI.create(testUser);
    
    console.log('✅ Usuario creado exitosamente!');
    return {
      success: true,
      message: 'Usuario creado sin problemas',
      data: response
    };
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    
    console.error('❌ Error creando usuario:', error);
    return {
      success: false,
      message: `Error ${status}: ${message}`,
      status: status,
      details: error.response?.data
    };
  }
};

// 🧪 Función de test para la API principal (data)
export const testMainDataAPI = async () => {
  console.log('🧪 Testing Main Data API...');
  try {
    // Test simple: obtener servicios
    const response = await api.get(ENDPOINTS.SERVICES);
    console.log('✅ Data API funciona correctamente:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Error en Data API:', error);
    return { success: false, error: error.message };
  }
};

// 🧪 Función de test para la API de autenticación
export const testAuthAPI = async () => {
  console.log('🧪 Testing Auth API...');
  try {
    // Test simple: intentar login con credenciales de prueba
    const testCredentials = {
      email: "test@test.com",
      password: "test123"
    };
    
    const response = await authApiInstance.post('/auth/login', testCredentials);
    console.log('✅ Auth API responde correctamente');
    return { success: true, data: 'Auth API conectada' };
  } catch (error) {
    // Error 401 es esperado con credenciales de prueba
    if (error.response?.status === 401) {
      console.log('✅ Auth API funciona (401 esperado con credenciales de prueba)');
      return { success: true, data: 'Auth API conectada' };
    }
    console.error('❌ Error en Auth API:', error);
    return { success: false, error: error.message };
  }
};

// 🧪 Test completo de ambas APIs
export const testBothAPIs = async () => {
  console.log('🔄 Probando ambas APIs...');
  
  const results = {
    dataAPI: await testMainDataAPI(),
    authAPI: await testAuthAPI()
  };
  
  console.log('📊 Resultados de tests:', results);
  return results;
};