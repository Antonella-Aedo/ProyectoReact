# 🔄 Guía de Integración Completa con Xano para AmbienteFest

## ✅ Ya Completado:

1. **Archivo API centralizado** (`src/services/api.js`) - ✅
2. **AuthContext modificado** para usar API - ✅  
3. **Página Servicios** modificada para usar API - ✅
4. **Página Blog** modificada para usar API - ✅
5. **Página CrearBlog** modificada para usar API - ✅
6. **Página Admin** (parcialmente modificada) - ⚠️

## 🛠️ Modificaciones Restantes Requeridas:

### 1. Completar página Admin (`src/pages/Admin.jsx`)

**Funciones a actualizar para usar API:**

```jsx
// Servicios
const handleCreateService = async () => {
  // Usar serviciosAPI.create()
};

const handleSaveService = async (e) => {
  // Usar serviciosAPI.create() o serviciosAPI.update()
};

const handleDeleteService = async (id) => {
  // Usar serviciosAPI.delete()
};

// Blogs
const handleSaveBlog = async (e) => {
  // Usar blogsAPI.create() o blogsAPI.update()
};

const handleDeleteBlog = async (id) => {
  // Usar blogsAPI.delete()
};

const handleApproveBlog = async (blogId) => {
  // Usar blogsAPI.updateStatus(id, 'aprobado')
};

const handleRejectBlog = async (blogId) => {
  // Usar blogsAPI.updateStatus(id, 'rechazado')
};

// Usuarios
const handleDeleteUser = async (userId) => {
  // Usar usuariosAPI.delete()
};
```

### 2. Modificar App.jsx

**Remover inicialización de datos mock:**

```jsx
// REMOVER estas líneas:
import { initializeDefaultUsers, initializeDefaultBlogs } from './data/mockData';

// REMOVER del useEffect:
initializeDefaultUsers();
initializeDefaultBlogs();
```

### 3. Modificar página Home (`src/pages/Home.jsx`)

**Si la página Home muestra servicios destacados:**

```jsx
import { serviciosAPI } from '../services/api';

// En useEffect:
const cargarServiciosDestacados = async () => {
  try {
    const servicios = await serviciosAPI.getAll();
    setServiciosDestacados(servicios.slice(0, 3));
  } catch (error) {
    // Fallback a datos mock
    const { serviciosData } = await import('../data/mockData');
    setServiciosDestacados(serviciosData.slice(0, 3));
  }
};
```

### 4. Modificar componente Carrito (`src/pages/Carrito.jsx`)

**Integrar con API de carrito:**

```jsx
import { carritoAPI } from '../services/api';

// Cargar carrito del usuario
const cargarCarrito = async () => {
  try {
    const carritoData = await carritoAPI.getByUserId(user.id);
    setCarrito(carritoData.items || []);
  } catch (error) {
    // Fallback a localStorage
    const carritoGuardado = localStorage.getItem('ambienteFestCarrito');
    if (carritoGuardado) {
      setCarrito(JSON.parse(carritoGuardado));
    }
  }
};

// Actualizar funciones addToCart, removeFromCart, clearCart
```

### 5. Actualizar App.jsx - Funciones de Carrito

**Modificar funciones de carrito para usar API:**

```jsx
const addToCart = async (servicio) => {
  if (user) {
    try {
      await carritoAPI.addItem(user.id, {
        servicio_id: servicio.id,
        cantidad: 1,
        subtotal: servicio.precio
      });
      // Actualizar estado local
    } catch (error) {
      // Fallback a localStorage
    }
  } else {
    // Usuario no logueado - usar localStorage
  }
};
```

## 🗄️ Configuración de Base de Datos en Xano

### Endpoints Necesarios:

1. **AUTH**
   - `POST /auth/login`
   - `POST /auth/register`
   - `GET /auth/me`

2. **SERVICIOS**
   - `GET /servicios`
   - `POST /servicios`
   - `PUT /servicios/{id}`
   - `DELETE /servicios/{id}`

3. **USUARIOS**
   - `GET /usuarios`
   - `GET /usuarios/{id}`
   - `POST /usuarios`
   - `PUT /usuarios/{id}`
   - `DELETE /usuarios/{id}`

4. **BLOGS**
   - `GET /blogs` (query: include_all=true para admin)
   - `GET /blogs/{id}`
   - `POST /blogs`
   - `PUT /blogs/{id}`
   - `DELETE /blogs/{id}`
   - `PUT /blogs/{id}/estado`

5. **COMENTARIOS**
   - `GET /blogs/{id}/comentarios`
   - `POST /blogs/{id}/comentarios`
   - `DELETE /comentarios/{id}`

6. **CARRITO**
   - `GET /carrito/{userId}`
   - `POST /carrito/{userId}/item`
   - `PUT /carrito/{userId}/item/{itemId}`
   - `DELETE /carrito/{userId}/item/{itemId}`
   - `DELETE /carrito/{userId}`

7. **CATEGORÍAS**
   - `GET /categorias/servicios`
   - `GET /categorias/blogs`

## 🔧 Configuración en Xano

### Variables de Entorno (opcional):
```env
REACT_APP_API_BASE_URL=https://x8ki-letl-twmt.n7.xano.io/api:OdHOEeXs
```

### Manejo de Errores:
- Todas las funciones API incluyen fallback a datos mock/localStorage
- Interceptores configurados para logging de errores
- Timeouts configurados (10 segundos)

## 🚀 Para Completar la Migración:

1. **Instalar Axios:** `npm install axios`
2. **Configurar endpoints en Xano** según la estructura de base de datos proporcionada
3. **Completar las modificaciones restantes** en Admin.jsx
4. **Probar cada funcionalidad** con la API
5. **Verificar fallbacks** cuando la API no está disponible

## 📊 Orden de Implementación Recomendado:

1. Configurar usuarios y autenticación
2. Configurar servicios (lectura primero)
3. Configurar blogs (lectura primero)  
4. Implementar funciones de escritura (CREATE, UPDATE, DELETE)
5. Configurar carrito y pagos
6. Pruebas finales

El sistema está diseñado para funcionar tanto con API como con fallback a datos locales, garantizando que la aplicación siempre funcione.