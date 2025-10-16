import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
// Removed mockData import - using live API or inline fallbacks
import { serviciosAPI } from '../services/api';
import Nosotros from '../components/Nosotros';

const Home = ({ onAddToCart }) => {
  const [serviciosDestacados, setServiciosDestacados] = useState([]);

  

  useEffect(() => {
    // Cargar servicios destacados reales (hasta 4)
    const loadDestacados = async () => {
      try {
        const destacados = await serviciosAPI.getAll({ includeAll: false, limit: 4, ttl: 300000 });
        setServiciosDestacados(Array.isArray(destacados) ? destacados.slice(0, 4) : []);
      } catch (error) {
        console.error('Error cargando servicios destacados:', error);
    // Fallback a datos por defecto (solo en dev)
    setServiciosDestacados([]);
      }
    };

    loadDestacados();

    // Crear elementos de cotillón animado
    createCotillon();
  }, []);

  const createCotillon = () => {
    const cotillon = document.getElementById('cotillon');
    if (cotillon) {
      cotillon.innerHTML = ''; // Limpiar cotillón existente
      
      for (let i = 0; i < 30; i++) {
        const piece = document.createElement('div');
        piece.className = 'cotillon-piece';
        
        // Colores aleatorios del tema
        const colors = ['#e10098', '#ff4fcf', '#b8006e', '#ffe0ef'];
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Posición y animación aleatoria
        piece.style.left = Math.random() * 100 + 'vw';
        piece.style.animationDelay = Math.random() * 3 + 's';
        piece.style.animationDuration = (Math.random() * 3 + 2) + 's';
        
        cotillon.appendChild(piece);
        
        // Animación de caída
        animatePiece(piece);
      }
    }
  };

  const animatePiece = (piece) => {
    let top = -20;
    const speed = Math.random() * 2 + 1;
    
    const fall = () => {
      top += speed;
      piece.style.top = top + 'px';
      
      if (top < window.innerHeight + 20) {
        requestAnimationFrame(fall);
      } else {
        // Reiniciar desde arriba
        piece.style.top = '-20px';
        piece.style.left = Math.random() * 100 + 'vw';
        setTimeout(() => animatePiece(piece), Math.random() * 1000);
      }
    };
    
    fall();
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
      {/* Cotillón animado */}
      <div className="cotillon" id="cotillon"></div>

      {/* Hero/Banner */}
      <section className="bg-dark text-white text-center py-5 banner-principal">
        <Container>
          <h1 className="display-4 fw-bold">Organiza tu Evento Perfecto</h1>
          <p className="lead">
            Encuentra y cotiza servicios para todo tipo de eventos: matrimonios, cumpleaños, 
            baby showers, graduaciones, fiestas temáticas y más.
          </p>
          <LinkContainer to="/servicios">
            <Button variant="primary" size="lg" className="mt-3">
              Ver Servicios
            </Button>
          </LinkContainer>
        </Container>
      </section>

      

      {/* Servicios Destacados */}
      <section id="servicios" className="py-5">
        <Container>
          <h2 className="h4 mb-4 text-center">Servicios Destacados</h2>
          <Row>
            {serviciosDestacados.map((servicio) => (
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
                      <LinkContainer to={`/servicios`}>
                        <Button variant="primary" size="sm">
                          Ver Detalle
                        </Button>
                      </LinkContainer>
                      <Button 
                        variant="outline-success" 
                        size="sm"
                        onClick={() => onAddToCart && onAddToCart(servicio)}
                      >
                        Agregar al Carrito
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
          <Row className="mt-4">
            <Col className="text-center">
              <LinkContainer to="/servicios">
                <Button variant="outline-primary" size="lg">
                  Ver Todos los Servicios
                </Button>
              </LinkContainer>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Sección Nosotros (componente reutilizable) */}
      <Nosotros />

  {/* Formulario de Contacto */}
  <section id="contactanos" className="py-5">
        <Container>
          <h2 className="h4 mb-4">Contáctanos</h2>
          <Form>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Control 
                  type="text" 
                  placeholder="Nombre" 
                  required 
                />
              </Col>
              <Col md={6}>
                <Form.Control 
                  type="email" 
                  placeholder="Correo electrónico" 
                  required 
                />
              </Col>
            </Row>
            <div className="mb-3">
              <Form.Control 
                as="textarea" 
                rows={4} 
                placeholder="Mensaje" 
                required 
              />
            </div>
            <Button type="submit" variant="primary">
              Enviar Mensaje
            </Button>
          </Form>
        </Container>
      </section>
    </div>
  );
};

export default Home;
