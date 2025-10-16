import React from 'react';
import { Container, Row, Col, Table, Button, Alert, Card } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useAuth } from '../context/AuthContext';

const Carrito = ({ carrito, onRemoveFromCart, onClearCart }) => {
  const { isAuthenticated } = useAuth();

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  const calcularSubtotal = () => {
    return carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0);
  };

  const calcularImpuestos = () => {
    const subtotal = calcularSubtotal();
    return subtotal * 0.19; // IVA 19%
  };

  const calcularTotal = () => {
    return calcularSubtotal() + calcularImpuestos();
  };

  if (!isAuthenticated()) {
    return (
      <div style={{ paddingTop: '120px' }}>
        <Container>
          <Alert variant="warning" className="text-center">
            <h4><i className="bi bi-exclamation-triangle"></i> Acceso Restringido</h4>
            <p>Debes iniciar sesión para ver tu carrito de compras.</p>
            <LinkContainer to="/login">
              <Button variant="primary">Iniciar Sesión</Button>
            </LinkContainer>
          </Alert>
        </Container>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '120px' }}>
      <Container>
        <Row>
          <Col>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="h4">
                <i className="bi bi-cart-fill"></i> Carrito de Compras
              </h2>
              {carrito.length > 0 && (
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  onClick={onClearCart}
                >
                  <i className="bi bi-trash"></i> Vaciar Carrito
                </Button>
              )}
            </div>

            {carrito.length === 0 ? (
              <Card className="text-center py-5">
                <Card.Body>
                  <i className="bi bi-cart-x display-1 text-muted"></i>
                  <h4 className="mt-3">Tu carrito está vacío</h4>
                  <p className="text-muted">
                    Explora nuestros servicios y agrega los que más te gusten
                  </p>
                  <LinkContainer to="/servicios">
                    <Button variant="primary" size="lg">
                      Ver Servicios
                    </Button>
                  </LinkContainer>
                </Card.Body>
              </Card>
            ) : (
              <>
                {/* Lista de servicios en el carrito */}
                <div className="table-responsive">
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>Servicio</th>
                        <th>Proveedor</th>
                        <th>Precio Unitario</th>
                        <th>Cantidad</th>
                        <th>Subtotal</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {carrito.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <img 
                                src={item.imagen} 
                                alt={item.nombre}
                                style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                                className="rounded me-3"
                                onError={(e) => {
                                  e.target.src = 'https://picsum.photos/50x50?text=Sin+Img';
                                }}
                              />
                              <div>
                                <strong>{item.nombre}</strong>
                                <br />
                                <small className="text-muted">{item.categoria}</small>
                              </div>
                            </div>
                          </td>
                          <td>{item.proveedor}</td>
                          <td>{formatPrice(item.precio)}</td>
                          <td>
                            <span className="badge bg-primary">{item.cantidad}</span>
                          </td>
                          <td>
                            <strong>{formatPrice(item.precio * item.cantidad)}</strong>
                          </td>
                          <td>
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => onRemoveFromCart(item.id)}
                            >
                              <i className="bi bi-trash"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                {/* Resumen de compra */}
                <Row className="mt-4">
                  <Col lg={8}>
                    <Alert variant="info">
                      <h6><i className="bi bi-info-circle"></i> Información importante:</h6>
                      <ul className="mb-0">
                        <li>Los precios incluyen IVA (19%)</li>
                        <li>Una vez realizado el pago, recibirás los datos de contacto del proveedor</li>
                        <li>La coordinación de fecha y horario es directamente con el proveedor</li>
                      </ul>
                    </Alert>
                  </Col>
                  <Col lg={4}>
                    <Card>
                      <Card.Header>
                        <h5 className="mb-0">Resumen de Compra</h5>
                      </Card.Header>
                      <Card.Body>
                        <div className="d-flex justify-content-between mb-2">
                          <span>Subtotal:</span>
                          <span>{formatPrice(calcularSubtotal())}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span>IVA (19%):</span>
                          <span>{formatPrice(calcularImpuestos())}</span>
                        </div>
                        <hr />
                        <div className="d-flex justify-content-between mb-3">
                          <strong>Total:</strong>
                          <strong className="text-success">
                            {formatPrice(calcularTotal())}
                          </strong>
                        </div>
                        <Button 
                          variant="success" 
                          size="lg" 
                          className="w-100"
                          onClick={() => {
                            // En una aplicación real, esto redirigiría a un procesador de pagos
                            alert('Funcionalidad de pago en desarrollo. Los datos del proveedor serían enviados a tu correo.');
                          }}
                        >
                          <i className="bi bi-credit-card"></i> Proceder al Pago
                        </Button>
                        <small className="text-muted d-block text-center mt-2">
                          Pago seguro con múltiples métodos
                        </small>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </>
            )}
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Carrito;
