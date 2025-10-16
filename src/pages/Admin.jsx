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
    service_category_id: '',
    imagen: '',
    image_file: null,
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
    image_file: null,
    contenido: ''
  });
  
  const [showAlert, setShowAlert] = useState({ show: false, variant: '', message: '' });

  // Cargar datos iniciales (proteger contra doble invocación en StrictMode)
  const didLoadRef = useRef(false);
  useEffect(() => {
    if (didLoadRef.current) return; // ya cargado
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
      setCategoriasServicios(categoriasServiciosResponse);
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
      setError('Error al cargar los datos. Usando datos locales como respaldo.');
      
      // Fallback a datos locales
      try {
        const usuariosGuardados = JSON.parse(localStorage.getItem('ambienteFestUsers') || '[]');
        setUsuarios(usuariosGuardados);
        
        const blogsGuardados = JSON.parse(localStorage.getItem('blogs') || '[]');
        setBlogs(blogsGuardados);
        
    // Fallback mínimo si no hay datos locales
    setServicios([]);
    setCategoriasServicios([]);
    setCategoriasBlog(['Todos']);
      } catch (localError) {
        console.error('Error al cargar datos locales:', localError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleServiceChange = (e) => {
    const { name, value, files, type } = e.target;
    // File input
    if (type === 'file') {
      const file = files && files[0] ? files[0] : null;
      setFormServicio(prev => ({ ...prev, image_file: file }));
      return;
    }
    // Si el campo es service_category_id, guardar también el nombre de la categoría
    if (name === 'service_category_id') {
      const selected = categoriasServicios.find(cat => String(cat.id) === String(value));
      setFormServicio(prev => ({ ...prev, service_category_id: value, categoria: selected ? selected.name : prev.categoria }));
    } else {
      setFormServicio(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCreateService = () => {
    setServicioEditando(null);
    setFormServicio({
      nombre: '',
      descripcion: '',
      precio: '',
      categoria: 'Matrimonios',
      service_category_id: '',
      imagen: '',
      disponibilidad: '',
      proveedor: ''
    });
    setShowModalServicio(true);
  };

  const handleEditService = (servicio) => {
    setServicioEditando(servicio);
    // intentar determinar el service_category_id a partir de la categoría (si existe en las categorías cargadas)
    const matched = categoriasServicios.find(cat => String(cat.name) === String(servicio.categoria) || String(cat.name) === String(servicio.categoria));
    setFormServicio({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      precio: servicio.precio.toString(),
      categoria: servicio.categoria,
      service_category_id: matched ? String(matched.id) : '',
      imagen: servicio.imagen,
      disponibilidad: servicio.disponibilidad,
      proveedor: servicio.proveedor
    });
    setShowModalServicio(true);
  };

  const handleDeleteService = (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este servicio?')) {
      setServicios(prev => prev.filter(s => s.id !== id));
      setShowAlert({
        show: true,
        variant: 'success',
        message: 'Servicio eliminado exitosamente'
      });
    }
  };

  const handleSaveService = (e) => {
    e.preventDefault();

    if (!formServicio.nombre || !formServicio.descripcion || !formServicio.precio) {
      setShowAlert({ show: true, variant: 'danger', message: 'Por favor completa todos los campos obligatorios' });
      return;
    }

    (async () => {
      try {
        setLoading(true);

        // Construir FormData
        const fd = new FormData();
        fd.append('name', formServicio.nombre);
        fd.append('description', formServicio.descripcion);
        fd.append('price', formServicio.precio);
        fd.append('provider', formServicio.proveedor);
        fd.append('availability', formServicio.disponibilidad);
        fd.append('rating', formServicio.valoracion || 5);
        fd.append('num_ratings', formServicio.numValoraciones || 0);
        fd.append('available', true);
        fd.append('status', 'active');
        fd.append('user_id', formServicio.user_id || '1');
        fd.append('service_category_id', formServicio.service_category_id || '');

        if (formServicio.image_file) {
          fd.append('image_file', formServicio.image_file);
        }

        // Llamar al helper API (acepta FormData ahora)
        const created = await serviciosAPI.create(fd);

        // created viene mapeado por mapServiceFromXano
        setServicios(prev => servicioEditando ? prev.map(s => s.id === servicioEditando.id ? created : s) : [...prev, created]);
        setShowAlert({ show: true, variant: 'success', message: `Servicio creado exitosamente${created.imagen ? ' (imagen subida)' : ''}` });
        setShowModalServicio(false);
      } catch (err) {
        console.error('Error guardando servicio:', err);
        setShowAlert({ show: true, variant: 'danger', message: 'Error al guardar servicio' });
      } finally {
        setLoading(false);
      }
    })();
  };

  // Funciones para blogs
  const handleBlogChange = (e) => {
    const { name, value, files, type } = e.target;
    if (type === 'file') {
      const file = files && files[0] ? files[0] : null;
      setFormBlog(prev => ({ ...prev, image_file: file }));
      return;
    }
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
      imagen: blog.imagen,
      contenido: blog.contenido
    });
    setShowModalBlog(true);
  };

  const handleDeleteBlog = (blogId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este blog?')) {
      const nuevosBlogs = blogs.filter(b => b.id !== blogId);
      setBlogs(nuevosBlogs);
      localStorage.setItem('blogs', JSON.stringify(nuevosBlogs));
      setShowAlert({
        show: true,
        variant: 'success',
        message: 'Blog eliminado exitosamente'
      });
    }
  };

  const handleApproveBlog = (blogId) => {
    const nuevosBlogs = blogs.map(blog => 
      blog.id === blogId ? { ...blog, estado: 'aprobado' } : blog
    );
    setBlogs(nuevosBlogs);
    localStorage.setItem('blogs', JSON.stringify(nuevosBlogs));
    setShowAlert({
      show: true,
      variant: 'success',
      message: 'Blog aprobado exitosamente'
    });
  };

  const handleRejectBlog = (blogId) => {
    const nuevosBlogs = blogs.map(blog => 
      blog.id === blogId ? { ...blog, estado: 'rechazado' } : blog
    );
    setBlogs(nuevosBlogs);
    localStorage.setItem('blogs', JSON.stringify(nuevosBlogs));
    setShowAlert({
      show: true,
      variant: 'success',
      message: 'Blog rechazado'
    });
  };

  const handleSaveBlog = (e) => {
    e.preventDefault();

    if (!formBlog.titulo || !formBlog.contenido) {
      setShowAlert({ show: true, variant: 'danger', message: 'Por favor completa título y contenido' });
      return;
    }

    (async () => {
      try {
        setLoading(true);

        const fd = new FormData();
        fd.append('title', formBlog.titulo);
        fd.append('content', formBlog.contenido);
        fd.append('publication_date', new Date().toISOString());
        fd.append('status', 'published');
        fd.append('user_id', user?.id || '1');
        fd.append('blog_category_id', formBlog.blog_category_id || '');

        if (formBlog.image_file) {
          fd.append('image_file', formBlog.image_file);
        }

        const created = await blogsAPI.create(fd);

        setBlogs(prev => blogEditando ? prev.map(b => b.id === blogEditando.id ? created : b) : [...prev, created]);
        setShowAlert({ show: true, variant: 'success', message: `Blog creado exitosamente${created.imagen ? ' (imagen subida)' : ''}` });
        setShowModalBlog(false);
      } catch (err) {
        console.error('Error al crear blog:', err);
        setShowAlert({ show: true, variant: 'danger', message: 'Error al crear el blog' });
      } finally {
        setLoading(false);
      }
    })();
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      const nuevosUsuarios = usuarios.filter(u => u.id !== userId);
      setUsuarios(nuevosUsuarios);
      localStorage.setItem('ambienteFestUsers', JSON.stringify(nuevosUsuarios));
      setShowAlert({
        show: true,
        variant: 'success',
        message: 'Usuario eliminado exitosamente'
      });
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
        {showAlert.show && (
          <Alert 
            variant={showAlert.variant}
            onClose={() => setShowAlert({ ...showAlert, show: false })}
            dismissible
          >
            {showAlert.message}
          </Alert>
        )}

        {/* Mensaje de bienvenida */}
        <Alert variant="success" className="mb-4">
          <div className="d-flex align-items-center">
            <i className="bi bi-shield-lock-fill me-2 fs-4"></i>
            <div>
              <h5 className="mb-1">¡Bienvenido al Panel de Administración!</h5>
              <p className="mb-0">
                Hola <strong>{user?.nombre}</strong>, desde aquí puedes gestionar servicios, usuarios y ver reportes del sistema.
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
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {servicios.map((servicio) => (
                    <tr key={servicio.id}>
                      <td>
                        <img 
                          src={servicio.imagen} 
                          alt={servicio.nombre}
                          className="img-servicio-admin"
                          onError={(e) => {
                            e.target.src = 'https://picsum.photos/60x60?text=Sin+Img';
                          }}
                        />
                      </td>
                      <td>
                        <strong>{servicio.nombre}</strong>
                        <div className="proveedor-info-admin">
                          {servicio.descripcion.substring(0, 50)}...
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-secondary">{servicio.categoria}</span>
                      </td>
                      <td>{formatPrice(servicio.precio)}</td>
                      <td>{servicio.disponibilidad}</td>
                      <td>{servicio.proveedor}</td>
                      <td>
                        <span className="badge badge-aprobado">Activo</span>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => handleEditService(servicio)}
                          >
                            <i className="bi bi-pencil"></i>
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => handleDeleteService(servicio.id)}
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id}>
                      <td>{usuario.id}</td>
                      <td>{usuario.nombre} {usuario.apellidos}</td>
                      <td>{usuario.email}</td>
                      <td>
                        <span className={`badge ${usuario.rol === 'admin' ? 'bg-danger' : 'bg-primary'}`}>
                          {usuario.rol}
                        </span>
                      </td>
                      <td>{new Date(usuario.fechaRegistro).toLocaleDateString()}</td>
                      <td>
                        {usuario.rol !== 'admin' && (
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => handleDeleteUser(usuario.id)}
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
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
                          src={blog.imagen || blog.image_url || 'https://picsum.photos/60x40?text=Sin+Img'} 
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
                      <td>{blog.fecha}</td>
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
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Descripción *</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="descripcion"
                value={formServicio.descripcion}
                onChange={handleServiceChange}
                required
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
              />
            </Form.Group>

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
              <Form.Label>Categoría *</Form.Label>
              <Form.Select
                name="categoria"
                value={formServicio.categoria}
                onChange={handleServiceChange}
                required
              >
                {/* Si categoriasServicios son objetos {id, name} mapear por name y usar id en el select oculto */}
                {categoriasServicios.filter(cat => cat && (cat.name || cat)).map(cat => (
                  <option key={cat.id || cat} value={cat.name || cat}>{cat.name || cat}</option>
                ))}
              </Form.Select>
            </Form.Group>

            {/* Campo oculto para almacenar el service_category_id (enviarlo al backend) */}
            <Form.Control type="hidden" name="service_category_id" value={formServicio.service_category_id} onChange={handleServiceChange} />

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
              <Form.Label>Imagen (subir desde equipo)</Form.Label>
              <Form.Control
                type="file"
                name="image_file"
                accept=".jpg,.jpeg,.png"
                onChange={handleServiceChange}
              />
              {formServicio.imagen && (
                <div className="mt-2">
                  <img src={formServicio.imagen} alt="Preview" style={{ width: '100px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                </div>
              )}
            </Form.Group>

            <Button type="submit" variant="primary" className="w-100 btn-admin">
              {servicioEditando ? 'Actualizar Servicio' : 'Guardar Servicio'}
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
                {categoriasBlog.map(categoria => (
                  <option key={categoria} value={categoria}>{categoria}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Imagen (subir desde equipo)</Form.Label>
              <Form.Control
                type="file"
                name="image_file"
                accept=".jpg,.jpeg,.png"
                onChange={handleBlogChange}
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

            <Button type="submit" variant="primary" className="w-100 btn-admin">
              {blogEditando ? 'Actualizar Blog' : 'Guardar Blog'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Admin;
