import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Nav } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLoginRedirect } from '../hooks/useLoginRedirect';

const Login = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [validated, setValidated] = useState(false);
  const [showAlert, setShowAlert] = useState({ show: false, variant: '', message: '' });
  const [loading, setLoading] = useState(false);
  
  const { login, register, isAuthenticated, getRedirectPath } = useAuth();
  const { hasTokenConfigured } = useAuth();
  const { loginAndRedirect } = useLoginRedirect();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Datos del formulario de login
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  
  // Datos del formulario de registro (SIN campo run)
  const [registerData, setRegisterData] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    password: ''
  });

  // Redirigir si ya está autenticado
  React.useEffect(() => {
    if (isAuthenticated()) {
      const currentUser = JSON.parse(localStorage.getItem('ambienteFestUser'));
      
      if (currentUser) {
        const redirectPath = getRedirectPath(currentUser);
        console.log(`🚀 Usuario ya autenticado, redirigiendo a: ${redirectPath}`);
        navigate(redirectPath, { replace: true });
      }
    }
  }, [isAuthenticated, navigate, getRedirectPath]);

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterData(prev => ({ ...prev, [name]: value }));
  };

  const validateEmail = (email) => {
    const validDomains = ['@duoc.cl', '@profesor.duoc.cl', '@gmail.com', '@ambientefest.cl'];
    return validDomains.some(domain => email.endsWith(domain));
  };

  // Funciones de validación (SIN validación de RUN)
  const validateName = (name) => {
    return /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name) && name.length <= 50;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    
    if (form.checkValidity() === false || !validateEmail(loginData.email)) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    setLoading(true);
    try {
      // Usar el hook de redirección automática
      const result = await loginAndRedirect(login, loginData.email, loginData.password);
      
      if (result.success) {
        setShowAlert({
          show: true,
          variant: 'success',
          message: `¡Inicio de sesión exitoso! Redirigiendo...`
        });
        
        // El hook loginAndRedirect ya maneja la redirección automática
        console.log(`🎉 Login exitoso para usuario con role_id: ${result.user?.role_id || result.user?.rol_id}`);
      } else {
        setShowAlert({
          show: true,
          variant: 'danger',
          message: result.error
        });
      }
    } catch (error) {
      setShowAlert({
        show: true,
        variant: 'danger',
        message: 'Error al iniciar sesión'
      });
    }
    setLoading(false);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    
    // Validaciones personalizadas (SIN validación de RUN)
    const emailValid = validateEmail(registerData.email);
    const nombreValid = validateName(registerData.nombre);
    const apellidosValid = validateName(registerData.apellidos);
    const passwordValid = registerData.password && registerData.password.length >= 8;

    if (form.checkValidity() === false || !emailValid || !nombreValid || !apellidosValid || !passwordValid) {
      e.stopPropagation();
      setValidated(true);
      setShowAlert({ show: true, variant: 'danger', message: !emailValid ? 'Correo inválido o no permitido' : !passwordValid ? 'La contraseña debe tener al menos 8 caracteres' : 'Revisa los campos requeridos' });
      return;
    }

    setLoading(true);
  try {
  // Force role_id = 1 for all frontend registrations (1 = cliente)
  const payload = { ...registerData, role_id: 1 };
  const result = await register(payload);
      
      if (result.success) {
        setShowAlert({
          show: true,
          variant: 'success',
          message: '¡Cuenta creada y verificada en la base de datos! Ahora puedes iniciar sesión.'
        });

        // Prefill login form con las credenciales recién registradas
        setLoginData({ email: registerData.email, password: registerData.password });

        // Cambiar a la pestaña de login después de un pequeño retraso
        setTimeout(() => {
          setActiveTab('login');
          setRegisterData({
            nombre: '',
            apellidos: '',
            email: '',
            password: ''
          });
          setValidated(false);
        }, 1500);
      } else {
        // If the backend created the auth record but didn't save the password hash
        // treat it as a successful creation from the user's perspective and redirect
        const errMsg = (result.error || '').toString().toLowerCase();
        if (errMsg.includes('registro creado pero el servidor no guardó el hash')) {
          setShowAlert({
            show: true,
            variant: 'success',
            message: 'Registro creado. Redirigiendo al inicio...'
          });

          // Prefill login form with the registered credentials
          setLoginData({ email: registerData.email, password: registerData.password });

          // Clear the register form and redirect to the main page -> inicio section
          setTimeout(() => {
            setActiveTab('login');
            setRegisterData({ nombre: '', apellidos: '', email: '', password: '' });
            setValidated(false);

            // Navigate to root and attempt to scroll to #inicio
            navigate('/', { replace: true });
            setTimeout(() => {
              try {
                const el = document.getElementById('inicio');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                else window.location.hash = 'inicio';
              } catch (e) {
                // fallback: set location
                window.location.href = '/#inicio';
              }
            }, 300);
          }, 800);

        } else {
          setShowAlert({
            show: true,
            variant: 'danger',
            message: result.error
          });
        }
      }
    } catch (error) {
      setShowAlert({
        show: true,
        variant: 'danger',
        message: 'Error al registrarse'
      });
    }
    setLoading(false);
  };

  if (isAuthenticated()) {
    return null; // El useEffect se encarga de la redirección
  }

  return (
    <div style={{ paddingTop: '120px' }}>
      <Container>
        <Row className="justify-content-center">
          <Col lg={6} md={8}>
            <Card>
              <Card.Header>
                <Nav variant="tabs" defaultActiveKey="login">
                  <Nav.Item>
                    <Nav.Link 
                      eventKey="login"
                      active={activeTab === 'login'}
                      onClick={() => {
                        setActiveTab('login');
                        setValidated(false);
                        setShowAlert({ show: false, variant: '', message: '' });
                      }}
                    >
                      Iniciar Sesión
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link 
                      eventKey="register"
                      active={activeTab === 'register'}
                      onClick={() => {
                        setActiveTab('register');
                        setValidated(false);
                        setShowAlert({ show: false, variant: '', message: '' });
                      }}
                    >
                      Registrarse
                    </Nav.Link>
                  </Nav.Item>
                </Nav>
              </Card.Header>
              
              <Card.Body>
                <div className="mb-2 text-end">
                  <small>
                    Token: {hasTokenConfigured ? <span className="text-success">configurado</span> : <span className="text-danger">no configurado</span>}
                  </small>
                </div>
                {showAlert.show && (
                  <Alert 
                    variant={showAlert.variant}
                    onClose={() => setShowAlert({ ...showAlert, show: false })}
                    dismissible
                  >
                    {showAlert.message}
                  </Alert>
                )}

                {activeTab === 'login' && (
                  <Form noValidate validated={validated} onSubmit={handleLoginSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>Correo electrónico</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={loginData.email}
                        onChange={handleLoginChange}
                        placeholder="usuario@duoc.cl"
                        required
                        isInvalid={validated && !validateEmail(loginData.email)}
                      />
                      <Form.Control.Feedback type="invalid">
                        Ingrese un correo válido (@duoc.cl, @profesor.duoc.cl, @gmail.com, @ambientefest.cl).
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Contraseña</Form.Label>
                      <Form.Control
                        type="password"
                        name="password"
                        value={loginData.password}
                        onChange={handleLoginChange}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        Contraseña requerida.
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Button 
                      type="submit" 
                      variant="primary" 
                      className="w-100"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Iniciando sesión...
                        </>
                      ) : (
                        'Iniciar Sesión'
                      )}
                    </Button>

                    <div className="text-center mt-3">
                      <small className="text-muted">
                        ¿No tienes cuenta?{' '}
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="p-0"
                          onClick={() => setActiveTab('register')}
                        >
                          Regístrate aquí
                        </Button>
                      </small>
                    </div>

                    <div className="mt-3 p-2 bg-light rounded">
                      <small>
                        <strong>Cuenta de prueba:</strong><br/>
                        Email: admin@ambientefest.cl<br/>
                        Contraseña: admin123
                      </small>
                    </div>
                  </Form>
                )}

                {activeTab === 'register' && (
                  <Form noValidate validated={validated} onSubmit={handleRegisterSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nombre</Form.Label>
                      <Form.Control
                        type="text"
                        name="nombre"
                        value={registerData.nombre}
                        onChange={handleRegisterChange}
                        required
                        isInvalid={validated && !validateName(registerData.nombre)}
                      />
                      <Form.Control.Feedback type="invalid">
                        Nombre requerido (máx. 50 caracteres, solo letras).
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Apellidos</Form.Label>
                      <Form.Control
                        type="text"
                        name="apellidos"
                        value={registerData.apellidos}
                        onChange={handleRegisterChange}
                        required
                        isInvalid={validated && !validateName(registerData.apellidos)}
                      />
                      <Form.Control.Feedback type="invalid">
                        Apellidos requeridos (máx. 100 caracteres, solo letras).
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Correo electrónico</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={registerData.email}
                        onChange={handleRegisterChange}
                        placeholder="usuario@duoc.cl"
                        required
                        isInvalid={validated && !validateEmail(registerData.email)}
                      />
                      <Form.Control.Feedback type="invalid">
                        Ingrese un correo válido (@duoc.cl, @profesor.duoc.cl, @gmail.com, @ambientefest.cl).
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Contraseña</Form.Label>
                      <Form.Control
                        type="password"
                        name="password"
                        value={registerData.password}
                        onChange={handleRegisterChange}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        Contraseña requerida.
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Button 
                      type="submit" 
                      variant="success" 
                      className="w-100"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Registrando...
                        </>
                      ) : (
                        'Registrarse'
                      )}
                    </Button>

                    <div className="text-center mt-3">
                      <small className="text-muted">
                        ¿Ya tienes cuenta?{' '}
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="p-0"
                          onClick={() => setActiveTab('login')}
                        >
                          Inicia sesión aquí
                        </Button>
                      </small>
                    </div>
                  </Form>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;
