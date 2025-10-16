import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer-ambiente bg-dark text-white pt-5 pb-3 mt-5">
      <Container>
        <Row>
          {/* Servicios */}
          <Col md={4} className="mb-4 mb-md-0">
            <h5 className="fw-bold mb-3">
              <i className="bi bi-briefcase-fill"></i> Servicios
            </h5>
            <ul className="list-unstyled">
              <li>
                <Link to="/servicios" className="text-white-50 text-decoration-none">
                  Catálogo de Servicios
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-white-50 text-decoration-none">
                  Blog y Tendencias
                </Link>
              </li>
            </ul>
          </Col>

          {/* Empresa */}
          <Col md={4} className="mb-4 mb-md-0">
            <h5 className="fw-bold mb-3">
              <i className="bi bi-building"></i> Empresa
            </h5>
            <ul className="list-unstyled">
              <li>
                <Link to="/nosotros" className="text-white-50 text-decoration-none">
                  Sobre Nosotros
                </Link>
              </li>
              <li>
                <a
                  className="text-white-50 text-decoration-none"
                  data-bs-toggle="collapse"
                  href="#faqFooter"
                  role="button"
                  aria-expanded="false"
                  aria-controls="faqFooter"
                >
                  FAQ
                </a>
                <div className="collapse" id="faqFooter">
                  <div className="card card-body bg-light text-dark mt-2">
                    <strong>¿Quiénes pueden ofrecer servicios?</strong>
                    <p className="mb-2">Cualquier emprendedor, empresa o profesional del rubro de eventos puede registrarse y publicar sus servicios en nuestra plataforma.</p>
                    <strong>¿Cómo se contacta a los proveedores?</strong>
                    <p className="mb-2">Una vez aceptado los términos y condiciones de la compra del servicio se enviará a su correo los datos del proveedor.</p>
                    <strong>¿Qué beneficios tiene publicar aquí?</strong>
                    <p className="mb-2">Mayor visibilidad, acceso a nuevos clientes y una vitrina profesional para tu emprendimiento o empresa.</p>
                    <strong>¿Qué beneficios tienes al comprar aquí?</strong>
                    <p className="mb-0">En esta página encontrarás todos los servicios necesarios para que tu evento o fiesta sea un éxito. Nos especializamos en ofrecer soluciones completas, confiables y de alta calidad, con la experiencia y profesionalismo que tu celebración merece.</p>
                  </div>
                </div>
              </li>
              <li>
                <Link to="/terminos" className="text-white-50 text-decoration-none">
                  Términos y Condiciones
                </Link>
              </li>
              <li>
                <Link to="/politicas" className="text-white-50 text-decoration-none">
                  Política de Privacidad
                </Link>
              </li>
            </ul>
          </Col>

          {/* Contacto */}
          <Col md={4}>
            <h5 className="fw-bold mb-3">
              <i className="bi bi-envelope-fill"></i> Contacto
            </h5>
            <ul className="list-unstyled">
              <li>
                <i className="bi bi-geo-alt-fill"></i> Santiago, Chile
              </li>
              <li>
                <i className="bi bi-envelope-open-fill"></i>{' '}
                <span className="text-white-50">contacto@ambientefest.cl</span>
              </li>
              <li>
                <i className="bi bi-phone-fill"></i> +56 9 1234 5678
              </li>
              <li className="mt-2">
                <Link to="/#contactanos" className="btn btn-outline-primary btn-sm">
                  Formulario de Contacto
                </Link>
              </li>
            </ul>
          </Col>
        </Row>

        <hr className="border-secondary my-4" />
        
        <Row>
          <Col className="text-center">
            <small className="text-white-50">
              &copy; 2025 AmbienteFest. Todos los derechos reservados.
            </small>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
