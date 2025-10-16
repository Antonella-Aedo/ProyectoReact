import React from 'react';
import { Modal, Button, Row, Col } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

const ModalDetalleServicio = ({ show, onHide, servicio, onAddToCart }) => {
  const { isAuthenticated } = useAuth();

  if (!servicio) return null;

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
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Detalle del Servicio</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row>
          <Col md={6}>
            <img 
              src={servicio.imagen} 
              className="img-fluid rounded" 
              alt={servicio.nombre}
              onError={(e) => {
                e.target.src = 'https://picsum.photos/400x300?text=Imagen+No+Disponible';
              }}
            />
          </Col>
          <Col md={6}>
            <h4>{servicio.nombre}</h4>
            <p>{servicio.descripcion}</p>
            
            <ul>
              {servicio.detalles && servicio.detalles.map((detalle, index) => (
                <li key={index}>{detalle}</li>
              ))}
            </ul>
            
            <div className="mb-3">
              <span className="badge bg-success me-2">
                {formatPrice(servicio.precio)}
              </span>
              <span className="text-warning">
                {renderStars(servicio.valoracion)} ({servicio.numValoraciones})
              </span>
            </div>

            {/* Información del proveedor */}
            <div className="proveedor-info">
              <strong>Proveedor:</strong> {servicio.proveedor}<br/>
              <strong>Disponibilidad:</strong> {servicio.disponibilidad}<br/>
              <strong>Categoría:</strong> {servicio.categoria}
            </div>
            
            <div className="mt-3">
              {isAuthenticated() ? (
                <Button 
                  variant="success"
                  onClick={() => {
                    onAddToCart && onAddToCart(servicio);
                    onHide();
                  }}
                >
                  Agregar al Carrito
                </Button>
              ) : (
                <div className="alert alert-info">
                  <small>Inicia sesión para agregar servicios al carrito</small>
                </div>
              )}
            </div>
          </Col>
        </Row>
      </Modal.Body>
    </Modal>
  );
};

export default ModalDetalleServicio;
