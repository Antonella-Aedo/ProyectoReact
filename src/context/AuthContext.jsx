import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, usuariosAPI, utils } from '../services/api';

/*
  AuthContext:
  - Gestiona el estado de autenticación de la app (usuario, token, flags de carga).
  - Proporciona helpers: login, register, logout, isAdmin, getRedirectPath.
  - Notas de diseño:
    * La app actualmente soporta un modo temporal con contraseñas en texto plano (inseguro)
      porque el backend (Xano) no estaba completamente configurado. Las funciones intentan
      obtener un token desde el auth API cuando es posible (best-effort).
    * Todas las funciones documentadas abajo manejan errores y devuelven objetos { success, ... }
      para que los componentes UI puedan mostrar mensajes amigables.
*/

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null); // 🔑 Estado del token
  const [loading, setLoading] = useState(true);
  const [hasTokenConfigured, setHasTokenConfigured] = useState(false);

  // Cargar usuario y token del localStorage al iniciar
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // ⚠️ Temporalmente deshabilitado para evitar errores de validación
        // await utils.initializeDefaultData();
        
        // Cargar usuario y token guardados
        const savedUser = localStorage.getItem('ambienteFestUser');
        const savedToken = localStorage.getItem('ambienteFestToken');
        
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
        
        if (savedToken) {
          setToken(savedToken);
          // Configurar token en axios para requests futuros
          await utils.setAuthToken(savedToken);
          setHasTokenConfigured(true);
        }
      } catch (error) {
        console.error('Error al inicializar autenticación:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Función de login mejorada con tokens
  const login = async (email, password) => {
    /*
      login flow:
      1. Busca el usuario en la API de datos (usuariosAPI.findByEmail).
      2. Comprueba password en texto plano (modo temporal). Si coincide, guarda user en contexto/localStorage.
      3. Best-effort: intenta pedir token al auth API (authAPI.login). Si obtiene token, lo guarda y configura axios.

      Retorna: { success: true, user } o { success: false, error }
      Consideraciones:
      - Este handler es tolerante a fallos en el auth API: si falla, el usuario sigue logeado localmente.
      - En producción, reemplazar la comparación plaintext por verificación de hash en servidor.
    */
    try {
      // For this project we authenticate using the data API (plaintext password field).
      try {
        const foundUser = await usuariosAPI.findByEmail(email);
        if (!foundUser) return { success: false, error: 'Credenciales incorrectas' };

        // Accept plaintext password comparison (insecure, but requested)
        if (foundUser.password === password) {
          const userWithoutPassword = { ...foundUser };
          delete userWithoutPassword.password;
          delete userWithoutPassword.clave_hash;
          delete userWithoutPassword.password_hash;

          setUser(userWithoutPassword);
          localStorage.setItem('ambienteFestUser', JSON.stringify(userWithoutPassword));

          // After plaintext verification, try to obtain an auth token from auth API
          try {
            const authResp = await authAPI.login(email, password);
            // authAPI.login already attempts to set tokens on axios instances when it finds one,
            // but ensure we persist token in localStorage as well
            const possibleToken = authResp?.authToken || authResp?.token || authResp?.access_token || authResp?.data?.authToken || authResp?.data?.token || (Array.isArray(authResp) && authResp[0] && (authResp[0].authToken || authResp[0].token));
            if (possibleToken) {
              try {
                await utils.setAuthToken(possibleToken);
                localStorage.setItem('ambienteFestToken', possibleToken);
                console.log('🔑 Token obtenido y guardado tras login (data API)');
              } catch (e) {
                console.warn('No se pudo guardar token tras login:', e);
              }
            }
          } catch (e) {
            // It's OK if auth API login fails; user is still considered logged in locally
            console.warn('No se obtuvo token desde auth API tras login (puede ser normal):', e?.message || e);
          }

          console.log('✅ Login exitoso (data API) con usuario:', userWithoutPassword.email);
          return { success: true, user: userWithoutPassword };
        }

        return { success: false, error: 'Credenciales incorrectas' };
      } catch (err) {
        console.error('Error en login (data API):', err);
        return { success: false, error: 'Error al iniciar sesión' };
      }
    } catch (error) {
      console.error('Error general en login:', error);
      return { success: false, error: 'Error al iniciar sesión' };
    }
  };

  // Función de registro
  const register = async (userData) => {
    /*
      register flow:
      - Crea usuario mediante `usuariosAPI.create` (data API).
      - Fuerza `role_id = 1` por defecto (clientes).
      - Elimina campos sensibles antes de persistir en localStorage/context.
      - Best-effort: intenta obtener un token desde auth API.

      Retorna: { success: true, user, id, role_id } o { success: false, error }
      Notas:
      - Maneja errores comunes (409, 422, timeout) y los transforma en mensajes amigables.
    */
    try {
      console.log('Iniciando registro con datos:', userData);
      // For plaintext workflow: create the user directly via data API
      try {
        // Force role_id to 1 (cliente) unless explicitly set to admin
        const payload = { ...userData, role_id: userData.role_id || 1 };
        const created = await usuariosAPI.create(payload);

        // Mapear y limpiar antes de guardar en localStorage/context
        const userWithoutPassword = { ...created };
        delete userWithoutPassword.password;
        delete userWithoutPassword.clave_hash;
        delete userWithoutPassword.password_hash;

        setUser(userWithoutPassword);
        localStorage.setItem('ambienteFestUser', JSON.stringify(userWithoutPassword));

        // Try to obtain an auth token from the auth API (best-effort)
        try {
          const authResp = await authAPI.login(payload.email || payload.email_address || payload.email, payload.password);
          const possibleToken = authResp?.authToken || authResp?.token || authResp?.access_token || authResp?.data?.authToken || authResp?.data?.token || (Array.isArray(authResp) && authResp[0] && (authResp[0].authToken || authResp[0].token));
          if (possibleToken) {
            setToken(possibleToken);
            try {
              await utils.setAuthToken(possibleToken);
              localStorage.setItem('ambienteFestToken', possibleToken);
              console.log('🔑 Token obtenido y guardado tras registro');
            } catch (e) {
              console.warn('No se pudo configurar token tras registro:', e);
            }
          }
        } catch (e) {
          console.warn('No se pudo obtener token desde auth API tras registro (ok):', e?.message || e);
        }

        return { success: true, user: userWithoutPassword, id: created.id, role_id: created.role_id || created.rol_id };
      } catch (err) {
        console.error('Error creando usuario (data API):', err);
        // Detección de duplicados por status
        const status = err.response?.status;
        if (status === 409 || status === 422) {
          return { success: false, error: 'El email o RUN ya está registrado' };
        }
        return { success: false, error: err.response?.data?.message || err.message || 'Error al registrarse' };
      }
    } catch (error) {
      console.error('Error completo en registro:', {
        error,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      // Verificar si es error de usuario duplicado
      if (error.response?.status === 409 || 
          error.response?.status === 400 ||
          error.message.includes('duplicado') ||
          error.response?.data?.message?.includes('duplicate')) {
        return { success: false, error: 'El email o RUN ya está registrado' };
      }
      
      // Si es error de validación de Xano
      if (error.response?.status === 422 || error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || 'Datos inválidos';
        return { success: false, error: `Error de validación: ${errorMessage}` };
      }
      
      // Error de conexión
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return { success: false, error: 'Timeout de conexión. Verifica tu internet.' };
      }
      
      // Error general con más detalles
      const errorDetail = error.response?.data?.message || error.message || 'Error desconocido';
      return { success: false, error: `Error al registrarse: ${errorDetail}` };
    }
  };

  // Función de logout mejorada
  const logout = async () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('ambienteFestUser');
    localStorage.removeItem('ambienteFestToken');
    
    // Limpiar token de axios
    await utils.clearAuthToken();
    setHasTokenConfigured(false);
    console.log('🔐 Logout completo - usuario y token limpiados');
  };

  // Verificar si el usuario es admin
  const isAdmin = () => {
    return user && (user.rol === 'admin' || user.role_id === 2 || user.rol_id === 2);
  };

  // Obtener ruta de redirección basada en el rol del usuario
  const getRedirectPath = (userData = user) => {
    if (!userData) return '/';
    
    // Si es admin (role_id = 2), ir al panel de administración
    if (userData.role_id === 2 || userData.rol_id === 2 || userData.rol === 'admin') {
      return '/admin';
    }
    
    // Para cualquier otro rol, ir al inicio
    return '/';
  };

  // Verificar si el usuario está autenticado
  const isAuthenticated = () => {
    return user !== null;
  };

  const value = {
    user,
    token, // 🔑 Exponer token en el contexto
    hasTokenConfigured,
    login,
    register,
    logout,
    isAdmin,
    isAuthenticated,
    getRedirectPath, // 🚀 Nueva función de redirección
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
