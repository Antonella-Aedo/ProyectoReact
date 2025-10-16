import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Badge, Spinner } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { blogsAPI, categoriasAPI } from '../services/api';
import ModalBlog from '../components/ModalBlog';
import { useAuth } from '../context/AuthContext';

const Blog = () => {
  const placeholderImg = 'https://picsum.photos/300x250?text=Imagen+No+Disponible';

  const safeImageSrc = (item) => {
    if (!item) return placeholderImg;

    const field = item.imagen ?? item.image_url ?? null;
    if (!field) return placeholderImg;

    // Si es string simple
    if (typeof field === 'string') {
      const s = field.trim();
      return s.length ? s : placeholderImg;
    }

    // Si viene como array, tratar de resolver la primera URL válida
    if (Array.isArray(field) && field.length) {
      const first = field[0];
      if (typeof first === 'string') return first;
      if (typeof first === 'object') return first.url || first.file?.url || placeholderImg;
      return placeholderImg;
    }

    // Si es objeto, intentar propiedades comunes
    if (typeof field === 'object') {
      return field.url || field.file?.url || field.file_url || placeholderImg;
    }

    return placeholderImg;
  };
  const [blogs, setBlogs] = useState([]);
  const [blogsFiltrados, setBlogsFiltrados] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blogSeleccionado, setBlogSeleccionado] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todos');
  const { isAuthenticated, user, isAdmin } = useAuth();

  // Cargar blogs desde la API al iniciar (evitar doble invocación en StrictMode)
  const didLoadRef = useRef(false);
  useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;
    cargarBlogs();
  }, []);

  const cargarBlogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar blogs y categorías en paralelo
      const [blogsResponse, categoriasResponse] = await Promise.all([
        blogsAPI.getAll(false), // Solo blogs aprobados para la vista pública
        categoriasAPI.getBlogs()
      ]);
      
      setBlogs(blogsResponse);
      setBlogsFiltrados(blogsResponse);
      // Normalizar categorías a strings para evitar pasar objetos como children/keys
      const normalize = (c) => {
        if (c === null || c === undefined) return '';
        if (typeof c === 'string') return c;
        if (typeof c === 'number' || typeof c === 'boolean') return String(c);
        if (typeof c === 'object') {
          // Preferir campos comunes, fallback a id o JSON compacto
          if (c.name) return c.name;
          if (c.nombre) return c.nombre;
          if (c.category) return c.category;
          if (c.id !== undefined) return String(c.id);
          try { return JSON.stringify(c); } catch (e) { return String(c); }
        }
        return String(c);
      };

      // Asegurar que tanto las categorias como la propiedad blog.categoria sean strings
      const normalized = Array.isArray(categoriasResponse)
        ? [...new Set(categoriasResponse.map(normalize))]
        : [];

      // Also normalize blogs' categoria field to avoid objects used as children later
      const normalizedBlogs = Array.isArray(blogsResponse)
        ? blogsResponse.map(b => ({ ...b, categoria: normalize(b.categoria) }))
        : [];

      // Debug: mostrar las primeras entradas y sus campos de imagen para verificar normalización
      try {
        console.log('🔍 Normalized blogs sample (first 6):', normalizedBlogs.slice(0, 6).map(b => ({
          id: b.id,
          titulo: b.titulo || b.title,
          imagen: (b.imagen || b.imagen_url || b.image_url || null),
          tipo_imagen: typeof (b.imagen || b.imagen_url || b.image_url)
        })));
      } catch (logErr) {
        console.warn('No fue posible imprimir muestra de blogs:', logErr);
      }

      setCategorias(normalized);
      setBlogs(normalizedBlogs);
      setBlogsFiltrados(normalizedBlogs);
    } catch (err) {
      console.error('Error al cargar blogs:', err);
      setError('Error al cargar los blogs. Intenta recargar la página.');
      
      // Fallback a datos locales si la API falla
      try {
        const blogsGuardados = JSON.parse(localStorage.getItem('blogs') || '[]');
        const blogsAprobados = blogsGuardados.filter(blog => blog.estado === 'aprobado');
        setBlogs(blogsAprobados);
        setBlogsFiltrados(blogsAprobados);
        
        // Fallback categories
        setCategorias(['Todos']);
      } catch (localError) {
        console.error('Error al cargar datos locales:', localError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalle = (blog) => {
    setBlogSeleccionado(blog);
    setShowModal(true);
  };

  const handleFiltroCategoria = (categoria) => {
    setCategoriaFiltro(categoria);
    if (categoria === 'Todos') {
      setBlogsFiltrados(blogs);
    } else {
      setBlogsFiltrados(blogs.filter(blog => blog.categoria === categoria));
    }
  };

  const handleAddComment = (blogId, nuevoComentario) => {
    const nuevosBlogs = blogs.map(blog => 
      blog.id === blogId 
        ? { 
            ...blog, 
            comentarios: [...(blog.comentarios || []), nuevoComentario] 
          }
        : blog
    );
    
    setBlogs(nuevosBlogs);
    
    // Actualizar también los blogs filtrados
    if (categoriaFiltro === 'Todos') {
      setBlogsFiltrados(nuevosBlogs);
    } else {
      setBlogsFiltrados(nuevosBlogs.filter(blog => blog.categoria === categoriaFiltro));
    }
    
    // Actualizar también el blog seleccionado si es el mismo
    if (blogSeleccionado && blogSeleccionado.id === blogId) {
      setBlogSeleccionado(prev => ({
        ...prev,
        comentarios: [...(prev.comentarios || []), nuevoComentario]
      }));
    }
  };

  return (
    <div style={{ paddingTop: '120px' }}>
      <Container>
        {/* Mostrar loading */}
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Cargando blogs...</span>
            </Spinner>
            <p className="mt-2">Cargando blogs...</p>
          </div>
        )}

        {/* Mostrar error */}
        {error && (
          <Alert variant="danger" className="mb-4">
            <Alert.Heading>Error al cargar blogs</Alert.Heading>
            <p>{error}</p>
            <Button variant="outline-danger" onClick={cargarBlogs}>
              Reintentar
            </Button>
          </Alert>
        )}

        {/* Contenido principal */}
        {!loading && !error && (
          <>
            {/* Header con título y botón crear blog */}
            <Row className="mb-4">
              <Col md={8}>
                <h2 className="h4 mb-0">Blog Informativo</h2>
                <p className="text-muted">Descubre consejos, tendencias y experiencias de expertos en eventos</p>
              </Col>
              <Col md={4} className="text-end">
                {isAuthenticated() && isAdmin() && (
                  <LinkContainer to="/blog/crear">
                    <Button variant="success" size="lg" className="shadow">
                      <i className="bi bi-plus-circle me-2"></i>
                      Crear Blog
                    </Button>
                  </LinkContainer>
                )}
              </Col>
            </Row>

        {/* Filtros por categoría */}
        <Row className="mb-4">
          <Col>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <span className="fw-bold me-2">Filtrar por categoría:</span>
              {categorias.map((categoria) => {
                const key = typeof categoria === 'string' ? categoria : String(categoria);
                return (
                  <Badge
                    key={key}
                    pill
                    bg={categoriaFiltro === categoria ? 'primary' : 'outline-secondary'}
                    text={categoriaFiltro === categoria ? 'white' : 'dark'}
                    style={{ 
                      cursor: 'pointer',
                      border: categoriaFiltro !== categoria ? '1px solid #6c757d' : 'none'
                    }}
                    onClick={() => handleFiltroCategoria(categoria)}
                    className={categoriaFiltro !== categoria ? 'text-dark' : ''}
                  >
                    {categoria}
                  </Badge>
                );
              })}
            </div>
          </Col>
        </Row>

        {!isAuthenticated() && (
          <Alert variant="info" className="mb-4">
            <i className="bi bi-info-circle me-2"></i>
            <strong>¡Únete a nuestra comunidad!</strong> Inicia sesión para comentar en los blogs o crear tus propios artículos informativos.
          </Alert>
        )}

        {/* Mostrar resultados del filtro */}
        {categoriaFiltro !== 'Todos' && (
          <Row className="mb-3">
            <Col>
              <Alert variant="light" className="d-flex justify-content-between align-items-center">
                <span>
                  <i className="bi bi-funnel me-2"></i>
                  Mostrando blogs de la categoría: <strong>{categoriaFiltro}</strong>
                  ({blogsFiltrados.length} resultado{blogsFiltrados.length !== 1 ? 's' : ''})
                </span>
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={() => handleFiltroCategoria('Todos')}
                >
                  <i className="bi bi-x"></i> Limpiar filtro
                </Button>
              </Alert>
            </Col>
          </Row>
        )}

        <Row>
          {blogsFiltrados.map((blog) => (
            <Col md={4} key={blog.id} className="mb-4">
              <Card className="h-100">
                <Card.Img 
                  variant="top" 
                  src={safeImageSrc(blog)}
                  alt={blog.titulo}
                  className="blog-img-fixed"
                  onError={(e) => {
                    // Prevent recursive onerror loops
                    try { e.target.onerror = null; } catch (_) {}
                    e.target.src = 'https://picsum.photos/300x250?text=Imagen+No+Disponible';
                  }}
                />
                <Card.Body className="d-flex flex-column">
                  <div className="mb-2">
                    <Badge bg="secondary" className="me-2">
                      {blog.categoria}
                    </Badge>
                    <small className="text-muted">{blog.fecha}</small>
                  </div>
                  <Card.Title>{blog.titulo}</Card.Title>
                  <Card.Text className="flex-grow-1">
                    {blog.resumen}
                  </Card.Text>
                  <p className="mb-1">
                    <small className="text-muted">
                      <i className="bi bi-person me-1"></i>
                      Por: {blog.autor}
                    </small>
                  </p>
                  
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={() => handleVerDetalle(blog)}
                    className="mb-2"
                  >
                    Leer más
                  </Button>
                  
                  <div className="mt-2">
                    <Form.Control 
                      type="text" 
                      className="form-control-sm" 
                      placeholder={isAuthenticated() ? "Escribe un comentario..." : "Inicia sesión para comentar"}
                      disabled={!isAuthenticated()}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && isAuthenticated() && e.target.value.trim()) {
                          const nuevoComentario = {
                            id: Date.now(),
                            autor: `${user.nombre} ${user.apellidos}`,
                            comentario: e.target.value.trim(),
                            fecha: new Date().toISOString().split('T')[0]
                          };
                          handleAddComment(blog.id, nuevoComentario);
                          e.target.value = '';
                        }
                      }}
                    />
                    <div className="d-flex justify-content-between align-items-center mt-1">
                      <Button 
                        variant="primary" 
                        size="sm"
                        disabled={!isAuthenticated()}
                        onClick={(e) => {
                          const input = e.target.parentElement.parentElement.querySelector('input');
                          if (input && input.value.trim()) {
                            const nuevoComentario = {
                              id: Date.now(),
                              autor: `${user.nombre} ${user.apellidos}`,
                              comentario: input.value.trim(),
                              fecha: new Date().toISOString().split('T')[0]
                            };
                            handleAddComment(blog.id, nuevoComentario);
                            input.value = '';
                          }
                        }}
                      >
                        <i className="bi bi-chat me-1"></i>
                        Comentar
                      </Button>
                      
                      {blog.comentarios && blog.comentarios.length > 0 && (
                        <small className="text-muted">
                          <i className="bi bi-chat-dots me-1"></i>
                          {blog.comentarios.length} comentario{blog.comentarios.length !== 1 ? 's' : ''}
                        </small>
                      )}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {blogsFiltrados.length === 0 && (
          <div className="text-center py-5">
            <i className="bi bi-journal-x display-1 text-muted"></i>
            <h4 className="mt-3">No hay blogs en esta categoría</h4>
            <p className="text-muted">
              {categoriaFiltro !== 'Todos' 
                ? `No se encontraron blogs en la categoría "${categoriaFiltro}"`
                : 'No hay blogs disponibles'
              }
            </p>
            {categoriaFiltro !== 'Todos' && (
              <Button 
                variant="outline-primary"
                onClick={() => handleFiltroCategoria('Todos')}
              >
                Ver todos los blogs
              </Button>
            )}
            {isAuthenticated() && isAdmin() && (
              <div className="mt-3">
                <LinkContainer to="/blog/crear">
                  <Button variant="success">
                    <i className="bi bi-plus-circle me-2"></i>
                    ¡Sé el primero en crear un blog en esta categoría!
                  </Button>
                </LinkContainer>
              </div>
            )}
          </div>
        )}
        </>
        )}
      </Container>

      {/* Modal de detalle del blog */}
      <ModalBlog
        show={showModal}
        onHide={() => setShowModal(false)}
        blog={blogSeleccionado}
        onAddComment={handleAddComment}
      />
    </div>
  );
};

export default Blog;
