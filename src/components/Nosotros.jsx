import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';

const Nosotros = () => {
  return (
    <section id="nosotros" className="py-5 bg-white border-bottom">
      <Container>
        <h2 className="h3 fw-bold mb-5 text-fucsia text-center">Nosotros</h2>
        <Row className="justify-content-center">
          <Col lg={10}>
            <div className="bg-light rounded-4 p-4 shadow-sm">
              <h4 className="fw-bold mb-2 text-fucsia">
                <i className="bi bi-globe2"></i> Nuestra Plataforma
              </h4>
              <p className="mb-2">
                En <strong>AmbienteFest</strong> conectamos a quienes buscan servicios para sus 
                eventos con una red de proveedores, emprendedores y empresarios que desean 
                expandir su trabajo y llegar a más personas.
              </p>
              <p className="mb-2">
                Nuestra misión es ofrecer oportunidades a nuevos emprendimientos y negocios 
                consolidados, permitiendo que cada proveedor pueda mostrar su talento y 
                profesionalismo. Así, facilitamos el acceso a soluciones confiables, 
                accesibles y de calidad para todo tipo de fiestas y celebraciones.
              </p>
              <p className="mb-2">
                Valoramos la cercanía, la empatía y la colaboración, para que cada usuario 
                encuentre la mejor opción para su evento y cada proveedor pueda crecer junto a nosotros.
              </p>
              <p className="mb-0 text-muted" style={{ fontSize: '1em' }}>
                Fundado por Antonella Aedo y Karen Fuentealba.
              </p>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default Nosotros;
