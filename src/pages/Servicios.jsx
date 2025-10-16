import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { serviciosAPI, categoriasAPI } from '../services/api';
import ModalDetalleServicio from '../components/ModalDetalleServicio';
import { useAuth } from '../context/AuthContext';

const Servicios = ({ onAddToCart }) => {
  const [servicios, setServicios] = useState([]);
  const [serviciosOriginales, setServiciosOriginales] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({
    categoria: '',
    precioMaximo: 1000000,
    valoracion: ''
  });
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { isAuthenticated } = useAuth();

  // Cargar datos iniciales
  const didLoadRef = useRef(false);
  useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;
    cargarDatos();
  }, []);

  // Aplicar filtros cuando cambien
  useEffect(() => {
    aplicarFiltros();
  }, [filtros, serviciosOriginales]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar servicios y categorías en paralelo
      const [serviciosResponse, categoriasResponse] = await Promise.all([
        serviciosAPI.getAll({ includeAll: false, ttl: 300000 }),
        categoriasAPI.getServicios()
      ]);
      
      const normalize = (c) => {
        if (c === null || c === undefined) return '';
        if (typeof c === 'string') return c;
        if (typeof c === 'number' || typeof c === 'boolean') return String(c);
        if (typeof c === 'object') return c.name || c.nombre || c.category || (c.id !== undefined ? String(c.id) : JSON.stringify(c));
        return String(c);
      };

      const categoriasNormalized = Array.isArray(categoriasResponse)
        ? categoriasResponse.map(normalize).filter(Boolean)
        : [];

      setServiciosOriginales(serviciosResponse);
      setServicios(serviciosResponse);
      setCategorias(categoriasNormalized);
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar los servicios. Intenta recargar la página.');
      
  // Fallback a datos por defecto si la API falla
  const serviciosDataFallback = [];
  const categoriasServiciosFallback = ['Todos'];
  setServiciosOriginales(serviciosDataFallback);
  setServicios(serviciosDataFallback);
  setCategorias(categoriasServiciosFallback);
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let serviciosFiltrados = [...serviciosOriginales];

    // Filtrar por categoría
    if (filtros.categoria && filtros.categoria !== 'Todos') {
      serviciosFiltrados = serviciosFiltrados.filter(
        servicio => servicio.categoria === filtros.categoria
      );
    }

    // Filtrar por precio máximo
    serviciosFiltrados = serviciosFiltrados.filter(
      servicio => servicio.precio <= filtros.precioMaximo
    );

    // Filtrar por valoración
    if (filtros.valoracion) {
      serviciosFiltrados = serviciosFiltrados.filter(
        servicio => servicio.valoracion >= parseInt(filtros.valoracion)
      );
    }

    setServicios(serviciosFiltrados);
  };

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleVerDetalle = (servicio) => {
    setServicioSeleccionado(servicio);
    setShowModal(true);
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= rating ? 'text-warning' : 'text-muted'}>
          ★
        </span>
      );
    }
    return stars;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  return (
    <div style={{ paddingTop: '120px' }}>
      <Container>
        {/* Mostrar loading */}
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Cargando servicios...</span>
            </Spinner>
            <p className="mt-2">Cargando servicios...</p>
          </div>
        )}

        {/* Mostrar error */}
        {error && (
          <Alert variant="danger" className="mb-4">
            <Alert.Heading>Error al cargar servicios</Alert.Heading>
            <p>{error}</p>
            <Button variant="outline-danger" onClick={cargarDatos}>
              Reintentar
            </Button>
          </Alert>
        )}

        {/* Contenido principal */}
        {!loading && !error && (
          <>
            <Row className="mb-4">
          {/* Filtros */}
          <Col md={3}>
            <h2 className="h4">Filtrar Servicios</h2>
            <Form>
              <div className="mb-2">
                <Form.Label>Categorías</Form.Label>
                <Form.Select 
                  name="categoria" 
                  value={filtros.categoria}
                  onChange={handleFiltroChange}
                >
                  {categorias.map(categoria => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
                </Form.Select>
              </div>
              
              <div className="mb-2">
                <Form.Label>
                  Precio Máximo: {formatPrice(filtros.precioMaximo)}
                </Form.Label>
                <Form.Range
                  min="0"
                  max="1000000"
                  step="10000"
                  name="precioMaximo"
                  value={filtros.precioMaximo}
                  onChange={handleFiltroChange}
                />
              </div>
              
              <div className="mb-2">
                <Form.Label>Valoración</Form.Label>
                <Form.Select 
                  name="valoracion"
                  value={filtros.valoracion}
                  onChange={handleFiltroChange}
                >
                  <option value="">Todas</option>
                  <option value="5">★★★★★</option>
                  <option value="4">★★★★☆ o más</option>
                  <option value="3">★★★☆☆ o más</option>
                </Form.Select>
              </div>
              
              <Button 
                variant="outline-primary" 
                className="w-100"
                onClick={aplicarFiltros}
              >
                Aplicar Filtros
              </Button>
            </Form>
          </Col>

          {/* Lista de servicios */}
          <Col md={9}>
            <h2 className="h4 mb-3">
              Catálogo de Servicios ({servicios.length} encontrados)
            </h2>
            <Row>
              {servicios.map((servicio) => (
                <Col md={4} key={servicio.id} className="mb-4">
                  <Card className="h-100">
                    <Card.Img 
                      variant="top" 
                      src={servicio.imagen}
                      alt={servicio.nombre}
                      onError={(e) => {
                        e.target.src = 'https://picsum.photos/300x200?text=Imagen+No+Disponible';
                      }}
                    />
                    <Card.Body className="d-flex flex-column">
                      <Card.Title>{servicio.nombre}</Card.Title>
                      <Card.Text className="flex-grow-1">
                        {servicio.descripcion}
                      </Card.Text>
                      <div className="mb-2">
                        <span className="badge bg-success me-2">
                          {formatPrice(servicio.precio)}
                        </span>
                        <span className="text-warning">
                          {renderStars(servicio.valoracion)} ({servicio.numValoraciones})
                        </span>
                      </div>
                      <div className="d-flex gap-2">
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={() => handleVerDetalle(servicio)}
                        >
                          Ver Detalle
                        </Button>
                        {isAuthenticated() ? (
                          <Button 
                            variant="outline-success" 
                            size="sm"
                            onClick={() => onAddToCart && onAddToCart(servicio)}
                          >
                            Agregar al Carrito
                          </Button>
                        ) : (
                          <Button 
                            variant="outline-secondary" 
                            size="sm"
                            disabled
                            title="Inicia sesión para agregar al carrito"
                          >
                            Inicia Sesión
                          </Button>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
            
            {servicios.length === 0 && (
              <div className="text-center py-5">
                <h4>No se encontraron servicios</h4>
                <p>Intenta ajustar los filtros para ver más resultados.</p>
              </div>
            )}
          </Col>
        </Row>
        </>
        )}
      </Container>

      {/* Modal de detalle */}
      <ModalDetalleServicio
        show={showModal}
        onHide={() => setShowModal(false)}
        servicio={servicioSeleccionado}
        onAddToCart={onAddToCart}
      />
    </div>
  );
};

export default Servicios;
