import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Table, Button, Modal, Form, Alert, Nav, Card, Badge, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { serviciosAPI, usuariosAPI, blogsAPI, categoriasAPI } from '../services/api';

const Admin = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('servicios');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados para servicios
  const [servicios, setServicios] = useState([]);
  const [categoriasServicios, setCategoriasServicios] = useState([]);
  const [showModalServicio, setShowModalServicio] = useState(false);
  const [servicioEditando, setServicioEditando] = useState(null);
  const [formServicio, setFormServicio] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    categoria: 'Animación y Entretenimiento',
    imagen: '',
    disponibilidad: '',
    proveedor: ''
  });
  
  // Estados para usuarios
  const [usuarios, setUsuarios] = useState([]);
  
  // Estados para blogs
  const [blogs, setBlogs] = useState([]);
  const [categoriasBlog, setCategoriasBlog] = useState([]);
  const [showModalBlog, setShowModalBlog] = useState(false);
  const [blogEditando, setBlogEditando] = useState(null);
  const [formBlog, setFormBlog] = useState({
    titulo: '',
    categoria: 'Tendencias',
    imagen: '',
    contenido: ''
  });
  
  const [showAlert, setShowAlert] = useState({ show: false, variant: '', message: '' });

  // Cargar datos iniciales
  const didLoadRef = useRef(false);
  useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar todos los datos en paralelo
      const [
        serviciosResponse,
        usuariosResponse,
        blogsResponse,
        categoriasServiciosResponse,
        categoriasBlogResponse
      ] = await Promise.all([
  serviciosAPI.getAll({ includeAll: true }),
        usuariosAPI.getAll(),
        blogsAPI.getAll(true), // Incluir todos los blogs para admin
        categoriasAPI.getServicios(),
        categoriasAPI.getBlogs()
      ]);
      
      setServicios(serviciosResponse);
      setUsuarios(usuariosResponse);
      setBlogs(blogsResponse);
  // Normalizar: si la API devuelve strings convertir a objetos {id,name}
  setCategoriasServicios(categoriasServiciosResponse.map((c, idx) => (typeof c === 'string' ? { id: idx + 1, name: c } : c)));
      const normalizeCat = (c) => {
        if (c === null || c === undefined) return '';
        if (typeof c === 'string') return c;
        if (typeof c === 'number' || typeof c === 'boolean') return String(c);
        if (typeof c === 'object') return c.name || c.nombre || c.category || (c.id !== undefined ? String(c.id) : JSON.stringify(c));
        return String(c);
      };

      const categoriasBlogNormalized = Array.isArray(categoriasBlogResponse)
        ? categoriasBlogResponse.map(normalizeCat).filter(Boolean)
        : [];

      setCategoriasBlog(categoriasBlogNormalized);
      
    } catch (err) {
      console.error('Error al cargar datos del admin:', err);
      setError('Error al cargar los datos. Algunos datos pueden no estar actualizados.');
      
      // Fallback a datos locales mínimos
      try {
        const usuariosGuardados = JSON.parse(localStorage.getItem('ambienteFestUsers') || '[]');
        setUsuarios(usuariosGuardados);
        
        const blogsGuardados = JSON.parse(localStorage.getItem('blogs') || '[]');
        setBlogs(blogsGuardados);
      } catch (localError) {
        console.error('Error al cargar datos locales:', localError);
      }
    } finally {
      setLoading(false);
    }
  };


  const handleCreateService = () => {
    setServicioEditando(null);
    setFormServicio({
      nombre: '',
      descripcion: '',
      precio: '',
  categoria: (categoriasServicios.filter(cat => cat && (cat.name || cat))[0]?.name) || 'Animación y Entretenimiento',
  service_category_id: (categoriasServicios.filter(cat => cat && (cat.id || cat))[0]?.id) || '',
      imagen: '',
      disponibilidad: '',
      proveedor: ''
    });
    setShowModalServicio(true);
  };

  const handleEditService = (servicio) => {
    setServicioEditando(servicio);
    const matched = categoriasServicios.find(cat => String(cat.name) === String(servicio.categoria) || String(cat.id) === String(servicio.service_category_id));
    setFormServicio({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      precio: servicio.precio.toString(),
      categoria: servicio.categoria,
      service_category_id: matched ? String(matched.id) : (servicio.service_category_id || ''),
      imagen: servicio.imagen_url || servicio.imagen || '',
      disponibilidad: servicio.disponibilidad,
      proveedor: servicio.proveedor
    });
    setShowModalServicio(true);
  };

  const handleDeleteService = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este servicio?')) {
      try {
        setLoading(true);
        await serviciosAPI.delete(id);
        
        // Actualizar la lista local
        setServicios(prev => prev.filter(s => s.id !== id));
        
        setShowAlert({
          show: true,
          variant: 'success',
          message: 'Servicio eliminado exitosamente'
        });
      } catch (error) {
        console.error('Error al eliminar servicio:', error);
        setShowAlert({
          show: true,
          variant: 'danger',
          message: 'Error al eliminar el servicio'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    
    if (!formServicio.nombre || !formServicio.descripcion || !formServicio.precio) {
      setShowAlert({
        show: true,
        variant: 'danger',
        message: 'Por favor completa todos los campos obligatorios'
      });
      return;
    }

    try {
      setLoading(true);
      
      const servicioData = {
        nombre: formServicio.nombre,
        descripcion: formServicio.descripcion,
        precio: parseFloat(formServicio.precio),
        categoria: formServicio.categoria,
        service_category_id: formServicio.service_category_id || null,
        imagen_url: formServicio.imagen || 'https://picsum.photos/300x200?text=Sin+Imagen',
        disponibilidad: formServicio.disponibilidad,
        proveedor: formServicio.proveedor,
        creado_por: user.id
      };

      let response;
      if (servicioEditando) {
        response = await serviciosAPI.update(servicioEditando.id, servicioData);
        
        // Actualizar en la lista local
        setServicios(prev => prev.map(s => 
          s.id === servicioEditando.id ? { ...response, id: servicioEditando.id } : s
        ));
        
        setShowAlert({
          show: true,
          variant: 'success',
          message: 'Servicio actualizado exitosamente'
        });
      } else {
        response = await serviciosAPI.create(servicioData);
        
        // Agregar a la lista local
        setServicios(prev => [...prev, response]);
        
        setShowAlert({
          show: true,
          variant: 'success',
          message: 'Servicio creado exitosamente'
        });
      }

      setShowModalServicio(false);
    } catch (error) {
      console.error('Error al guardar servicio:', error);
      setShowAlert({
        show: true,
        variant: 'danger',
        message: 'Error al guardar el servicio'
      });
    } finally {
      setLoading(false);
    }
  };

  // FUNCIONES PARA BLOGS
  const handleBlogChange = (e) => {
    const { name, value } = e.target;
    setFormBlog(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateBlog = () => {
    setBlogEditando(null);
    setFormBlog({
      titulo: '',
      categoria: 'Tendencias',
      imagen: '',
      contenido: ''
    });
    setShowModalBlog(true);
  };

  const handleEditBlog = (blog) => {
    setBlogEditando(blog);
    setFormBlog({
      titulo: blog.titulo,
      categoria: blog.categoria,
      imagen: blog.imagen_url || blog.imagen || '',
      contenido: blog.contenido
    });
    setShowModalBlog(true);
  };

  const handleDeleteBlog = async (blogId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este blog?')) {
      try {
        setLoading(true);
        await blogsAPI.delete(blogId);
        
        // Actualizar la lista local
        setBlogs(prev => prev.filter(b => b.id !== blogId));
        
        setShowAlert({
          show: true,
          variant: 'success',
          message: 'Blog eliminado exitosamente'
        });
      } catch (error) {
        console.error('Error al eliminar blog:', error);
        setShowAlert({
          show: true,
          variant: 'danger',
          message: 'Error al eliminar el blog'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleApproveBlog = async (blogId) => {
    try {
      setLoading(true);
      await blogsAPI.updateStatus(blogId, 'aprobado');
      
      // Actualizar en la lista local
      setBlogs(prev => prev.map(blog => 
        blog.id === blogId ? { ...blog, estado: 'aprobado' } : blog
      ));
      
      setShowAlert({
        show: true,
        variant: 'success',
        message: 'Blog aprobado exitosamente'
      });
    } catch (error) {
      console.error('Error al aprobar blog:', error);
      setShowAlert({
        show: true,
        variant: 'danger',
        message: 'Error al aprobar el blog'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectBlog = async (blogId) => {
    try {
      setLoading(true);
      await blogsAPI.updateStatus(blogId, 'rechazado');
      
      // Actualizar en la lista local
      setBlogs(prev => prev.map(blog => 
        blog.id === blogId ? { ...blog, estado: 'rechazado' } : blog
      ));
      
      setShowAlert({
        show: true,
        variant: 'success',
        message: 'Blog rechazado'
      });
    } catch (error) {
      console.error('Error al rechazar blog:', error);
      setShowAlert({
        show: true,
        variant: 'danger',
        message: 'Error al rechazar el blog'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBlog = async (e) => {
    e.preventDefault();
    
    if (!formBlog.titulo || !formBlog.contenido) {
      setShowAlert({
        show: true,
        variant: 'danger',
        message: 'Por favor completa título y contenido'
      });
      return;
    }

    try {
      setLoading(true);
      
      const blogData = {
        titulo: formBlog.titulo,
        categoria: formBlog.categoria,
        imagen_url: formBlog.imagen || 'https://picsum.photos/400x250?text=Sin+Imagen',
        contenido: formBlog.contenido,
        autor_id: user.id
      };

      let response;
      if (blogEditando) {
        response = await blogsAPI.update(blogEditando.id, blogData);
        
        // Actualizar en la lista local
        setBlogs(prev => prev.map(b => 
          b.id === blogEditando.id ? { ...response, id: blogEditando.id } : b
        ));
        
        setShowAlert({
          show: true,
          variant: 'success',
          message: 'Blog actualizado exitosamente'
        });
      } else {
        response = await blogsAPI.create(blogData);
        
        // Agregar a la lista local
        setBlogs(prev => [...prev, response]);
        
        setShowAlert({
          show: true,
          variant: 'success',
          message: 'Blog creado exitosamente'
        });
      }

      setShowModalBlog(false);
    } catch (error) {
      console.error('Error al guardar blog:', error);
      setShowAlert({
        show: true,
        variant: 'danger',
        message: 'Error al guardar el blog'
      });
    } finally {
      setLoading(false);
    }
  };

  // FUNCIONES PARA USUARIOS
  const handleDeleteUser = async (userId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      try {
        setLoading(true);
        await usuariosAPI.delete(userId);
        
        // Actualizar la lista local
        setUsuarios(prev => prev.filter(u => u.id !== userId));
        
        setShowAlert({
          show: true,
          variant: 'success',
          message: 'Usuario eliminado exitosamente'
        });
      } catch (error) {
        console.error('Error al eliminar usuario:', error);
        setShowAlert({
          show: true,
          variant: 'danger',
          message: 'Error al eliminar el usuario'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="admin-panel" style={{ minHeight: '100vh', paddingTop: '120px' }}>
      {/* Navbar Admin */}
      <nav className="navbar navbar-expand-lg admin-navbar mb-4 fixed-top" style={{ top: '0' }}>
        <Container>
          <span className="navbar-brand">
            <i className="bi bi-shield-lock-fill"></i> Panel Administrador 
            <span className="fw-bold ambiente-nombre"> | AmbienteFest</span>
          </span>
          <button 
            className="navbar-toggler" 
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#adminNav"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="adminNav">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <span className="nav-link">Hola, {user?.nombre}</span>
              </li>
              <li className="nav-item">
                <button 
                  className="nav-link btn btn-link"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                >
                  Cerrar Sesión
                </button>
              </li>
            </ul>
          </div>
        </Container>
      </nav>

      <Container fluid style={{ paddingTop: '80px' }}>
        {loading && (
          <div className="text-center mb-4">
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Cargando...</span>
            </Spinner>
          </div>
        )}

        {showAlert.show && (
          <Alert 
            variant={showAlert.variant}
            onClose={() => setShowAlert({ ...showAlert, show: false })}
            dismissible
          >
            {showAlert.message}
          </Alert>
        )}

        {error && (
          <Alert variant="warning" className="mb-4">
            <Alert.Heading>Advertencia</Alert.Heading>
            <p>{error}</p>
            <Button variant="outline-warning" onClick={cargarDatos}>
              Reintentar carga de datos
            </Button>
          </Alert>
        )}

        {/* Mensaje de bienvenida */}
        <Alert variant="success" className="mb-4">
          <div className="d-flex align-items-center">
            <i className="bi bi-shield-lock-fill me-2 fs-4"></i>
            <div>
              <h5 className="mb-1">¡Bienvenido al Panel de Administración!</h5>
              <p className="mb-0">
                Hola <strong>{user?.nombre}</strong>, desde aquí puedes gestionar servicios, usuarios y blogs del sistema.
              </p>
            </div>
          </div>
        </Alert>

        {/* Navegación de pestañas */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <Nav variant="tabs">
            <Nav.Item>
              <Nav.Link 
                active={activeTab === 'servicios'}
                onClick={() => setActiveTab('servicios')}
              >
                Gestión de Servicios
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                active={activeTab === 'usuarios'}
                onClick={() => setActiveTab('usuarios')}
              >
                Gestión de Usuarios
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                active={activeTab === 'blogs'}
                onClick={() => setActiveTab('blogs')}
              >
                Gestión de Blogs
              </Nav.Link>
            </Nav.Item>
          </Nav>
          
          <div className="text-end">
            <small className="text-muted">Panel de Administración</small>
            <br />
            <small className="text-success">
              <i className="bi bi-check-circle"></i> Conectado como {user?.nombre}
            </small>
          </div>
        </div>

        {/* Gestión de Servicios */}
        {activeTab === 'servicios' && (
          <section className="admin-section">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="h4">Gestión de Servicios</h2>
              <Button variant="primary" className="btn-admin" onClick={handleCreateService}>
                <i className="bi bi-plus-circle"></i> Nuevo Servicio
              </Button>
            </div>
            
            <div className="table-responsive">
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Imagen</th>
                    <th>Nombre</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Disponibilidad</th>
                    <th>Proveedor</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {servicios.length > 0 ? servicios.map(servicio => (
                    <tr key={servicio.id}>
                      <td>
                        <img 
                          src={servicio.imagen_url || servicio.imagen} 
                          alt={servicio.nombre}
                          style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                      </td>
                      <td>
                        <strong>{servicio.nombre}</strong>
                        <br />
                        <small className="text-muted">
                          {servicio.descripcion.substring(0, 50)}...
                        </small>
                      </td>
                      <td>{servicio.categoria}</td>
                      <td>{formatPrice(servicio.precio)}</td>
                      <td>{servicio.disponibilidad}</td>
                      <td>{servicio.proveedor}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline-primary"
                            onClick={() => handleEditService(servicio)}
                          >
                            <i className="bi bi-pencil"></i>
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline-danger"
                            onClick={() => handleDeleteService(servicio.id)}
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="7" className="text-center text-muted py-4">
                        No hay servicios registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </section>
        )}

        {/* Gestión de Usuarios */}
        {activeTab === 'usuarios' && (
          <section className="admin-section">
            <h2 className="h4 mb-4">Gestión de Usuarios</h2>
            
            <div className="table-responsive">
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Fecha Registro</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.length > 0 ? usuarios.map(usuario => (
                    <tr key={usuario.id}>
                      <td>{usuario.id}</td>
                      <td>
                        <strong>{usuario.nombre} {usuario.apellidos}</strong>
                        <br />
                        <small className="text-muted">RUN: {usuario.run}</small>
                      </td>
                      <td>{usuario.email}</td>
                      <td>
                        <Badge bg={usuario.rol === 'admin' || usuario.rol_id === 1 ? 'danger' : 'primary'}>
                          {usuario.rol === 'admin' || usuario.rol_id === 1 ? 'Admin' : 'Cliente'}
                        </Badge>
                      </td>
                      <td>{usuario.creado_en || usuario.fechaRegistro}</td>
                      <td>
                        {usuario.id !== user.id && (
                          <Button 
                            size="sm" 
                            variant="outline-danger"
                            onClick={() => handleDeleteUser(usuario.id)}
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" className="text-center text-muted py-4">
                        No hay usuarios registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </section>
        )}

        {/* Gestión de Blogs */}
        {activeTab === 'blogs' && (
          <section className="admin-section">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="h4">Gestión de Blogs</h2>
              <Button variant="primary" className="btn-admin" onClick={handleCreateBlog}>
                <i className="bi bi-plus-circle"></i> Nuevo Blog
              </Button>
            </div>
            
            <div className="table-responsive">
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Imagen</th>
                    <th>Título</th>
                    <th>Categoría</th>
                    <th>Autor</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {blogs.length > 0 ? blogs.map(blog => (
                    <tr key={blog.id}>
                      <td>
                        <img 
                          src={blog.imagen_url || blog.imagen} 
                          alt={blog.titulo}
                          style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                      </td>
                      <td>
                        <strong>{blog.titulo}</strong>
                        <br />
                        <small className="text-muted">
                          {blog.contenido.substring(0, 100)}...
                        </small>
                      </td>
                      <td>
                        <Badge bg="info">{blog.categoria}</Badge>
                      </td>
                      <td>{blog.autor}</td>
                      <td>{blog.fecha_publicacion || blog.fecha}</td>
                      <td>
                        <Badge 
                          bg={
                            blog.estado === 'aprobado' ? 'success' : 
                            blog.estado === 'rechazado' ? 'danger' : 'warning'
                          }
                        >
                          {blog.estado === 'aprobado' ? 'Aprobado' : 
                           blog.estado === 'rechazado' ? 'Rechazado' : 'Pendiente'}
                        </Badge>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline-primary"
                            onClick={() => handleEditBlog(blog)}
                          >
                            <i className="bi bi-pencil"></i>
                          </Button>
                          {blog.estado !== 'aprobado' && (
                            <Button 
                              size="sm" 
                              variant="outline-success"
                              onClick={() => handleApproveBlog(blog.id)}
                            >
                              <i className="bi bi-check"></i>
                            </Button>
                          )}
                          {blog.estado !== 'rechazado' && (
                            <Button 
                              size="sm" 
                              variant="outline-warning"
                              onClick={() => handleRejectBlog(blog.id)}
                            >
                              <i className="bi bi-x"></i>
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline-danger"
                            onClick={() => handleDeleteBlog(blog.id)}
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="7" className="text-center text-muted py-4">
                        No hay blogs registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </section>
        )}
      </Container>

      {/* Modal para Nuevo/Editar Servicio */}
      <Modal show={showModalServicio} onHide={() => setShowModalServicio(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {servicioEditando ? 'Editar Servicio' : 'Nuevo Servicio'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSaveService}>
            <Form.Group className="mb-2">
              <Form.Label>Nombre *</Form.Label>
              <Form.Control
                type="text"
                name="nombre"
                value={formServicio.nombre}
                onChange={handleServiceChange}
                required
                placeholder="Nombre del servicio"
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Descripción *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="descripcion"
                value={formServicio.descripcion}
                onChange={handleServiceChange}
                required
                placeholder="Descripción del servicio"
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Precio *</Form.Label>
              <Form.Control
                type="number"
                name="precio"
                value={formServicio.precio}
                onChange={handleServiceChange}
                required
                placeholder="Precio en CLP"
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Categoría *</Form.Label>
              <Form.Select
                name="categoria"
                value={formServicio.categoria}
                onChange={handleServiceChange}
                required
              >
                {categoriasServicios.filter(cat => cat && (cat.name || cat)).map(cat => (
                  <option key={cat.id || cat} value={cat.name || cat}>{cat.name || cat}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Control type="hidden" name="service_category_id" value={formServicio.service_category_id} onChange={handleServiceChange} />

            <Form.Group className="mb-2">
              <Form.Label>Disponibilidad *</Form.Label>
              <Form.Control
                type="text"
                name="disponibilidad"
                value={formServicio.disponibilidad}
                onChange={handleServiceChange}
                required
                placeholder="Ej: Lunes a Viernes"
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Proveedor *</Form.Label>
              <Form.Control
                type="text"
                name="proveedor"
                value={formServicio.proveedor}
                onChange={handleServiceChange}
                required
                placeholder="Nombre del proveedor"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Imagen (URL libre de derechos)</Form.Label>
              <Form.Control
                type="url"
                name="imagen"
                value={formServicio.imagen}
                onChange={handleServiceChange}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
            </Form.Group>

            <Button type="submit" variant="primary" className="w-100 btn-admin" disabled={loading}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Guardando...
                </>
              ) : (
                servicioEditando ? 'Actualizar Servicio' : 'Guardar Servicio'
              )}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Modal para Nuevo/Editar Blog */}
      <Modal show={showModalBlog} onHide={() => setShowModalBlog(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {blogEditando ? 'Editar Blog' : 'Nuevo Blog'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSaveBlog}>
            <Form.Group className="mb-3">
              <Form.Label>Título *</Form.Label>
              <Form.Control
                type="text"
                name="titulo"
                value={formBlog.titulo}
                onChange={handleBlogChange}
                required
                placeholder="Título del blog"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Categoría *</Form.Label>
              <Form.Select
                name="categoria"
                value={formBlog.categoria}
                onChange={handleBlogChange}
                required
              >
                {categoriasBlog.filter(cat => cat !== 'Todos').map(categoria => (
                  <option key={categoria} value={categoria}>{categoria}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Imagen (URL libre de derechos)</Form.Label>
              <Form.Control
                type="url"
                name="imagen"
                value={formBlog.imagen}
                onChange={handleBlogChange}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
              {formBlog.imagen && (
                <div className="mt-2">
                  <img 
                    src={formBlog.imagen} 
                    alt="Preview" 
                    style={{ width: '100px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                  />
                </div>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Contenido *</Form.Label>
              <Form.Control
                as="textarea"
                rows={8}
                name="contenido"
                value={formBlog.contenido}
                onChange={handleBlogChange}
                required
                placeholder="Contenido del blog..."
              />
            </Form.Group>

            <Button type="submit" variant="primary" className="w-100 btn-admin" disabled={loading}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Guardando...
                </>
              ) : (
                blogEditando ? 'Actualizar Blog' : 'Guardar Blog'
              )}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Admin;
