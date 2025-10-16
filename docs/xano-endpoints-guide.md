# Guía de Endpoints para React + Xano

## 📋 Configuración de Endpoints

### Endpoints Fijos (Independientes del idioma de Xano)

Aunque las tablas están en español en Xano, los endpoints se traducen automáticamente al inglés:

```javascript
const ENDPOINTS = {
  USERS: '/user',           // Tabla: usuarios
  SERVICES: '/service',     // Tabla: servicios  
  BLOGS: '/blog',          // Tabla: blogs
  ROLES: '/role',          // Tabla: roles
  CART: '/cart',           // Tabla: carrito
  CART_DETAILS: '/cart_detail',     // Tabla: detalle_carrito
  BLOG_COMMENTS: '/blog_comment',   // Tabla: comentarios_blog
  PAYMENTS: '/payment'     // Tabla: pagos
};
```

## 🗃️ Campos de Base de Datos (en español)

### Tabla usuarios:
- `id` (integer, auto-increment)
- `nombre` (text)
- `apellidos` (text)
- `email` (email)
- `run` (text, único)
- `clave_hash` (password - Xano hashea automáticamente)
- `telefono` (text, opcional)
- `rol_id` (integer: 1=admin, 2=cliente)
- `creado_en` (timestamp)

## 🚀 Ejemplos de Uso en React

### 1. Configuración Base

```javascript
// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://x8ki-letl-twmt.n7.xano.io/api:3Xncgo9I',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
});

const ENDPOINTS = {
  USERS: '/user',
  SERVICES: '/service',
  BLOGS: '/blog'
};
```

### 2. Crear Usuario (Registro)

```javascript
// ✅ CORRECTO: Campos en español
const crearUsuario = async (userData) => {
  try {
    const nuevoUsuario = {
      nombre: userData.nombre,          // En español
      apellidos: userData.apellidos,    // En español
      email: userData.email,
      run: userData.run,
      clave_hash: userData.password,    // Xano hasheará automáticamente
      telefono: userData.telefono || '',
      rol_id: 2 // Cliente por defecto
    };

    const response = await api.post('/user', nuevoUsuario);
    console.log('Usuario creado:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data);
    throw error;
  }
};

// Uso en componente React
const handleRegistro = async () => {
  try {
    const usuario = await crearUsuario({
      nombre: "Juan",
      apellidos: "Pérez",
      email: "juan@email.com",
      run: "12345678-9",
      password: "password123",
      telefono: "+56912345678"
    });
    console.log('Registro exitoso:', usuario);
  } catch (error) {
    console.error('Error en registro:', error);
  }
};
```

### 3. Obtener Todos los Usuarios

```javascript
const obtenerUsuarios = async () => {
  try {
    const response = await api.get('/user');
    console.log('Usuarios obtenidos:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data);
    throw error;
  }
};

// Uso en React con useEffect
const [usuarios, setUsuarios] = useState([]);

useEffect(() => {
  const cargarUsuarios = async () => {
    try {
      const data = await obtenerUsuarios();
      setUsuarios(data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  };

  cargarUsuarios();
}, []);
```

### 4. Obtener Usuario por ID

```javascript
const obtenerUsuarioPorId = async (id) => {
  try {
    const response = await api.get(`/user/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data);
    throw error;
  }
};
```

### 5. Actualizar Usuario

```javascript
const actualizarUsuario = async (id, datosActualizados) => {
  try {
    const datosEnEspanol = {
      nombre: datosActualizados.nombre,
      apellidos: datosActualizados.apellidos,
      email: datosActualizados.email,
      telefono: datosActualizados.telefono,
      rol_id: datosActualizados.rol_id
    };

    const response = await api.patch(`/user/${id}`, datosEnEspanol);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data);
    throw error;
  }
};
```

### 6. Eliminar Usuario

```javascript
const eliminarUsuario = async (id) => {
  try {
    const response = await api.delete(`/user/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data);
    throw error;
  }
};
```

### 7. Ejemplo Completo de Hook Personalizado

```javascript
// src/hooks/useUsuarios.js
import { useState, useEffect } from 'react';
import { usuariosAPI } from '../services/api';

export const useUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await usuariosAPI.getAll();
      setUsuarios(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const crearUsuario = async (userData) => {
    try {
      setLoading(true);
      const nuevoUsuario = await usuariosAPI.create(userData);
      setUsuarios(prev => [...prev, nuevoUsuario]);
      return nuevoUsuario;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const eliminarUsuario = async (id) => {
    try {
      setLoading(true);
      await usuariosAPI.delete(id);
      setUsuarios(prev => prev.filter(user => user.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  return {
    usuarios,
    loading,
    error,
    cargarUsuarios,
    crearUsuario,
    eliminarUsuario
  };
};
```

### 8. Uso del Hook en Componente

```javascript
// src/components/UsuariosManagement.jsx
import React from 'react';
import { useUsuarios } from '../hooks/useUsuarios';

const UsuariosManagement = () => {
  const { usuarios, loading, error, crearUsuario, eliminarUsuario } = useUsuarios();

  const handleCrearUsuario = async () => {
    try {
      await crearUsuario({
        nombre: "Nuevo Usuario",
        apellidos: "Apellido Test",
        email: "nuevo@test.com",
        run: "87654321-0",
        password: "password123"
      });
      alert('Usuario creado exitosamente');
    } catch (error) {
      alert('Error al crear usuario: ' + error.message);
    }
  };

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Gestión de Usuarios</h2>
      <button onClick={handleCrearUsuario}>Crear Usuario</button>
      
      <ul>
        {usuarios.map(usuario => (
          <li key={usuario.id}>
            {usuario.nombre} {usuario.apellidos} - {usuario.email}
            <button onClick={() => eliminarUsuario(usuario.id)}>
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UsuariosManagement;
```

## 🔄 Mapeo de Datos

El sistema maneja automáticamente el mapeo entre los formatos de Xano y React:

```javascript
// Datos que envía React (campos en español)
const datosReact = {
  nombre: "Juan",
  apellidos: "Pérez", 
  email: "juan@test.com",
  clave_hash: "password123",
  rol_id: 2
};

// Xano puede devolver campos en inglés o español
const respuestaXano = {
  id: 1,
  nombre: "Juan",        // o name: "Juan"
  apellidos: "Pérez",    // o last_name: "Pérez"
  email: "juan@test.com",
  rol_id: 2,             // o role_id: 2
  creado_en: "2024-01-01T00:00:00Z"
};
```

## ⚠️ Puntos Importantes

1. **Endpoints en inglés**: Siempre usar `/user`, `/service`, `/blog` etc.
2. **Campos en español**: Enviar siempre `nombre`, `apellidos`, `clave_hash`, `rol_id`
3. **Consistencia**: Los helpers manejan automáticamente las diferencias
4. **Error handling**: Siempre manejar errores con try/catch
5. **Validación**: Xano validará automáticamente tipos y campos requeridos

## 🧪 Testing

```javascript
// Probar conectividad
testAPI.testConnection()

// Verificar endpoints
testAPI.checkEndpoints()

// Probar creación de usuario
testAPI.testUserCreation()
```