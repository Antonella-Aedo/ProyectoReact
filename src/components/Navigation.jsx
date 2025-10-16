import React, { useState } from 'react';
import { Navbar, Nav, Container, Badge } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useAuth } from '../context/AuthContext';

const Navigation = ({ cartCount = 0 }) => {
  const { user, logout, isAdmin } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const handleLogout = () => {
    logout();
    setExpanded(false);
  };

  const handleNavClick = () => {
    setExpanded(false);
  };

  return (
    <Navbar 
      expand="lg" 
      className="navbar-light bg-light shadow-sm fixed-top" 
      expanded={expanded}
      onToggle={setExpanded}
    >
      <Container>
        <LinkContainer to="/">
          <Navbar.Brand onClick={handleNavClick}>
            <img 
              src="/img/logo.jpeg" 
              alt="Logo AmbienteFest" 
              className="logo-navbar"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'inline';
              }}
            />
            <span style={{ display: 'none', fontWeight: 'bold', color: 'var(--fucsia)' }}>
              AmbienteFest
            </span>
          </Navbar.Brand>
        </LinkContainer>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            <LinkContainer to="/">
              <Nav.Link onClick={handleNavClick}>Inicio</Nav.Link>
            </LinkContainer>
            
            <LinkContainer to="/servicios">
              <Nav.Link onClick={handleNavClick}>Servicios</Nav.Link>
            </LinkContainer>
            
            <LinkContainer to="/blog">
              <Nav.Link onClick={handleNavClick}>Blog</Nav.Link>
            </LinkContainer>
            
            <LinkContainer to="/carrito">
              <Nav.Link onClick={handleNavClick} className="position-relative">
                <i className="bi bi-cart-fill"></i> Carrito
                {cartCount > 0 && (
                  <Badge 
                    id="carritoBadge"
                    className="position-absolute top-0 start-100 translate-middle rounded-pill"
                    style={{ 
                      background: 'var(--fucsia-oscuro)',
                      fontSize: '0.8em'
                    }}
                  >
                    {cartCount}
                  </Badge>
                )}
              </Nav.Link>
            </LinkContainer>

            {user ? (
              <>
                <Nav.Link disabled className="text-muted">
                  Hola, {user.nombre} {isAdmin() && <Badge bg="warning" text="dark">Admin</Badge>}
                </Nav.Link>
                
                {isAdmin() && (
                  <LinkContainer to="/admin">
                    <Nav.Link onClick={handleNavClick} className="text-primary fw-bold">
                      <i className="bi bi-shield-lock"></i> Panel Admin
                    </Nav.Link>
                  </LinkContainer>
                )}
                
                <Nav.Link onClick={handleLogout} style={{ cursor: 'pointer' }}>
                  <i className="bi bi-box-arrow-right"></i> Cerrar Sesión
                </Nav.Link>
              </>
            ) : (
              <LinkContainer to="/login">
                <Nav.Link onClick={handleNavClick}>
                  <i className="bi bi-person"></i> Iniciar Sesión
                </Nav.Link>
              </LinkContainer>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Navigation;
