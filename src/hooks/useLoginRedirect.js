import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const useLoginRedirect = () => {
  const { getRedirectPath } = useAuth();
  const navigate = useNavigate();

  const loginAndRedirect = async (loginFunction, email, password) => {
    try {
      const result = await loginFunction(email, password);
      
      if (result.success && result.user) {
        console.log('🔐 Login exitoso:', result.user);
        
        // Obtener ruta de redirección basada en el rol
        const redirectPath = getRedirectPath(result.user);
        
        console.log(`🚀 Redirección automática: Usuario con role_id ${result.user.role_id || result.user.rol_id} → ${redirectPath}`);
        
        // Redirigir según el rol
        setTimeout(() => {
          navigate(redirectPath, { replace: true });
        }, 100); // Pequeño delay para asegurar que el estado se actualice
        
        return result;
      }
      
      return result;
    } catch (error) {
      console.error('Error en loginAndRedirect:', error);
      return { success: false, error: error.message };
    }
  };

  return { loginAndRedirect };
};