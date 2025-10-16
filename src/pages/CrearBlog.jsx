import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { blogsAPI, categoriasAPI } from '../services/api';
import UploadImage from '../components/UploadImage';

const CrearBlog = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [formData, setFormData] = useState({
    titulo: '',
    imagen: '',
    image_files: [],
    contenido: '',
    categoria: 'Tendencias'
  });
  const [categorias, setCategorias] = useState([]);
  const [validated, setValidated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState({ show: false, variant: '', message: '' });

  // Redirigir si no está autenticado
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Si el usuario no es admin, impedir creación de blogs desde esta ruta
  // (Los administradores siguen pudiendo crear desde el panel de admin)
  useEffect(() => {
    if (isAuthenticated() && !isAdmin()) {
      // No redirigimos automáticamente; simplemente mostramos una UI informativa
      // y evitamos que el formulario se renderice.
      console.warn('Acceso a CrearBlog denegado: usuario no es administrador');
    }
  }, [isAuthenticated, isAdmin]);

  // Cargar categorías
  useEffect(() => {
    cargarCategorias();
  }, []);

  const cargarCategorias = async () => {
    const normalize = (c) => {
      if (c === null || c === undefined) return '';
      if (typeof c === 'string') return c;
      if (typeof c === 'number' || typeof c === 'boolean') return String(c);
      if (typeof c === 'object') {
        return c.name || c.nombre || c.category || (c.id !== undefined ? String(c.id) : JSON.stringify(c));
      }
      return String(c);
    };

    try {
      const categoriasResponse = await categoriasAPI.getBlogs();
      const categoriasFiltered = Array.isArray(categoriasResponse)
        ? categoriasResponse.map(normalize).filter(cat => cat && cat !== 'Todos')
        : [];
      setCategorias(categoriasFiltered);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      // Fallback a categorías estáticas
      const categoriasBlogFallback = ['Tendencias', 'Consejos', 'Experiencias'];
      const categoriasFiltered = Array.isArray(categoriasBlogFallback)
        ? categoriasBlogFallback.map(normalize).filter(cat => cat && cat !== 'Todos')
        : [];
      setCategorias(categoriasFiltered);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    try {
      setLoading(true);
      
      // Si el usuario seleccionó un archivo, enviar multipart/form-data y dejar que Xano procese image_file
      // Nota: ahora solo consideramos UNA imagen por blog (la primera seleccionada)
      if (formData.image_files && formData.image_files.length) {
        const fd = new FormData();
        fd.append('title', formData.titulo);
        fd.append('content', formData.contenido);
        fd.append('publication_date', new Date().toISOString());
        fd.append('status', 'activo');
        fd.append('user_id', user.id);
        fd.append('blog_category_id', formData.categoria);

        // Adjuntar solo el primer archivo (una imagen por blog)
        const firstFile = formData.image_files[0];
        if (firstFile) fd.append('image_file', firstFile);

        // Enviar FormData (multipart) — blogsAPI.create detecta FormData y lo envía correctamente
        const response = await blogsAPI.create(fd);

        if (response) {
          setShowAlert({
            show: true,
            variant: 'success',
            message: user.rol === 'admin'
              ? '¡Blog creado y publicado exitosamente!'
              : '¡Blog enviado exitosamente! Está pendiente de aprobación por el administrador.'
          });
          setTimeout(() => { navigate('/blog'); }, 2000);
        }
        setLoading(false);
        return;
      }

      // Si no hay archivos, enviar JSON simple (incluye image_url si el usuario pegó una URL)
      let firstImage = formData.imagen || null;
      // Si UploadImage devolvió un array o un objeto, intentar resolver una URL string
      if (Array.isArray(firstImage) && firstImage.length) {
        firstImage = typeof firstImage[0] === 'string' ? firstImage[0] : (firstImage[0]?.url || null);
      }
      if (firstImage && typeof firstImage === 'object') {
        firstImage = firstImage.url || firstImage.file?.url || null;
      }
      const blogData = {
        titulo: formData.titulo,
        contenido: formData.contenido,
        image_url: firstImage || 'https://picsum.photos/600x250?text=Blog+Sin+Imagen',
        imagen: firstImage || 'https://picsum.photos/600x250?text=Blog+Sin+Imagen',
        categoria: formData.categoria,
        autor_id: user.id // ID del usuario actual
      };

      // Llamar a la API para crear el blog
      const response = await blogsAPI.create(blogData);
      
      if (response) {
        setShowAlert({
          show: true,
          variant: 'success',
          message: user.rol === 'admin' 
            ? '¡Blog creado y publicado exitosamente!'
            : '¡Blog enviado exitosamente! Está pendiente de aprobación por el administrador.'
        });

        // Redirigir después de 2 segundos
        setTimeout(() => {
          navigate('/blog');
        }, 2000);
      }

    } catch (error) {
      console.error('Error al crear blog:', error);
      
      // Fallback a sistema local si la API falla
      try {
        const nuevoBlog = {
          id: Date.now(),
          titulo: formData.titulo,
          contenido: formData.contenido,
          imagen: formData.imagen || 'https://picsum.photos/600x250?text=Blog+Sin+Imagen',
          autor: user.rol === 'admin' ? 'Administrador' : `${user.nombre} ${user.apellidos}`,
          fecha: new Date().toISOString().split('T')[0],
          categoria: formData.categoria,
          estado: user.rol === 'admin' ? 'aprobado' : 'pendiente'
        };

        const blogs = JSON.parse(localStorage.getItem('blogs') || '[]');
        blogs.push(nuevoBlog);
        localStorage.setItem('blogs', JSON.stringify(blogs));
        
        setShowAlert({
          show: true,
          variant: 'success',
          message: '¡Blog creado exitosamente! Serás redirigido al blog principal.'
        });

        setTimeout(() => {
          navigate('/blog');
        }, 2000);
        
      } catch (localError) {
        setShowAlert({
          show: true,
          variant: 'danger',
          message: 'Error al crear el blog. Intenta nuevamente.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated()) {
    return null; // El useEffect se encargará de la redirección
  }

  // Mostrar mensaje para usuarios autenticados pero no administradores
  if (isAuthenticated() && !isAdmin()) {
    return (
      <div style={{ paddingTop: '120px' }}>
        <Container>
          <Row className="justify-content-center">
            <Col lg={8}>
              <div className="bg-light rounded p-4 shadow-sm text-center">
                <h4>Acceso denegado</h4>
                <p>No tienes permisos para crear blogs desde aquí. Si necesitas publicar contenido, solicita a un administrador que lo apruebe o utiliza el panel de administración si tienes acceso.</p>
                <div className="d-flex justify-content-center gap-2">
                  <Button variant="primary" onClick={() => navigate('/blog')}>Volver al Blog</Button>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '120px' }}>
      <Container>
        <Row className="justify-content-center">
          <Col lg={8}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="h4">Crear Nuevo Blog</h2>
              <Button variant="outline-secondary" onClick={() => navigate('/blog')}>
                <i className="bi bi-arrow-left"></i> Volver al Blog
              </Button>
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

            <div className="bg-light rounded p-4 shadow-sm">
              <Form noValidate validated={validated} onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Título *</Form.Label>
                  <Form.Control
                    type="text"
                    name="titulo"
                    value={formData.titulo}
                    onChange={handleChange}
                    required
                    maxLength={200}
                    placeholder="Ingresa un título atractivo para tu blog"
                  />
                  <Form.Control.Feedback type="invalid">
                    El título es requerido y debe tener máximo 200 caracteres.
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Categoría *</Form.Label>
                  <Form.Select
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleChange}
                    required
                  >
                    {categorias.map(categoria => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Selecciona la categoría que mejor describa tu blog.
                  </Form.Text>
                  <Form.Control.Feedback type="invalid">
                    Selecciona una categoría para tu blog.
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Imagen</Form.Label>
                  {/* Defer file selection to the parent: UploadImage will return File objects when defer=true */}
                  <UploadImage multiple={true} defer={true} onUploaded={(files) => {
                    const arr = Array.isArray(files) ? files : (files ? [files] : []);
                    setFormData(prev => ({ ...prev, image_files: arr }));
                  }} />
                  <Form.Control
                    type="url"
                    name="imagen"
                    value={formData.imagen}
                    onChange={handleChange}
                    placeholder="https://ejemplo.com/imagen.jpg (opcional)"
                  />
                  <Form.Text className="text-muted">
                    Puedes subir una imagen (o varias) desde tu computador o pegar la URL manualmente. Si no proporcionas imagen se usará una por defecto.
                  </Form.Text>
                  <Form.Control.Feedback type="invalid">
                    Ingresa una URL válida para la imagen.
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Contenido *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={8}
                    name="contenido"
                    value={formData.contenido}
                    onChange={handleChange}
                    required
                    minLength={50}
                    maxLength={5000}
                    placeholder="Escribe el contenido completo de tu blog aquí..."
                  />
                  <Form.Text className="text-muted">
                    Mínimo 50 caracteres, máximo 5000. Caracteres actuales: {formData.contenido.length}
                  </Form.Text>
                  <Form.Control.Feedback type="invalid">
                    El contenido es requerido y debe tener entre 50 y 5000 caracteres.
                  </Form.Control.Feedback>
                </Form.Group>

                <div className="d-flex gap-2">
                  <Button 
                    type="submit" 
                    variant="success" 
                    className="flex-grow-1"
                    disabled={loading || (showAlert.show && showAlert.variant === 'success')}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle"></i> Publicar Blog
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline-secondary"
                    onClick={() => {
                      setFormData({ titulo: '', imagen: '', contenido: '', categoria: 'Tendencias' });
                      setValidated(false);
                    }}
                  >
                    <i className="bi bi-arrow-clockwise"></i> Limpiar
                  </Button>
                </div>
              </Form>
            </div>

            <div className="mt-4 p-3 bg-info bg-opacity-10 rounded">
              <h6><i className="bi bi-info-circle"></i> Consejos para crear un buen blog:</h6>
              <ul className="mb-0">
                <li>Usa un título descriptivo y atractivo</li>
                <li>Selecciona la categoría que mejor se adapte a tu contenido</li>
                <li>Incluye información útil y relevante para eventos</li>
                <li>Estructura el contenido con párrafos claros</li>
                <li>Comparte tu experiencia y conocimientos</li>
                <li>Usa imágenes de alta calidad y libres de derechos</li>
              </ul>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default CrearBlog;
