import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginRedirect = ({ children }) => {
  const { user, getRedirectPath, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated() && user) {
      const redirectPath = getRedirectPath(user);
      console.log(`🚀 Redirección automática: Usuario con role_id ${user.role_id || user.rol_id} → ${redirectPath}`);
      
      // Redirigir según el rol
      if (redirectPath !== window.location.pathname) {
        navigate(redirectPath, { replace: true });
      }
    }
  }, [user, navigate, isAuthenticated, getRedirectPath]);

  return children;
};

export default LoginRedirect;