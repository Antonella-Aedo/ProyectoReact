import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Importar Bootstrap CSS y JS
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles.css';

// Importar componentes
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Importar páginas
import Home from './pages/Home';
import Servicios from './pages/Servicios';
import Blog from './pages/Blog';
import CrearBlog from './pages/CrearBlog';
import Carrito from './pages/Carrito';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Nosotros from './components/Nosotros';
import Terminos from './pages/Terminos';
import Politicas from './pages/Politicas';

function ScrollToHash({ children }) {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      // try immediate find
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      // fallback: try after a short delay (component may not be mounted yet)
      const t = setTimeout(() => {
        const el2 = document.getElementById(id);
        if (el2) el2.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);

      return () => clearTimeout(t);
    } else {
      // when there's no hash, optionally scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location]);

  return children;
}

function App() {
  const [carrito, setCarrito] = useState([]);

  // Inicializar carrito desde localStorage
  useEffect(() => {
    // Cargar carrito del localStorage
    const carritoGuardado = localStorage.getItem('ambienteFestCarrito');
    if (carritoGuardado) {
      setCarrito(JSON.parse(carritoGuardado));
    }
  }, []);

  // Guardar carrito en localStorage cada vez que cambie
  useEffect(() => {
    localStorage.setItem('ambienteFestCarrito', JSON.stringify(carrito));
  }, [carrito]);

  const addToCart = (servicio) => {
    setCarrito(prevCarrito => {
      const servicioExistente = prevCarrito.find(item => item.id === servicio.id);
      
      if (servicioExistente) {
        // Si ya existe, incrementar cantidad
        return prevCarrito.map(item =>
          item.id === servicio.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      } else {
        // Si no existe, agregarlo con cantidad 1
        return [...prevCarrito, { ...servicio, cantidad: 1 }];
      }
    });
  };

  const removeFromCart = (servicioId) => {
    setCarrito(prevCarrito => prevCarrito.filter(item => item.id !== servicioId));
  };

  const clearCart = () => {
    setCarrito([]);
  };

  const getTotalItems = () => {
    return carrito.reduce((total, item) => total + item.cantidad, 0);
  };

  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navigation cartCount={getTotalItems()} />
          
          <main>
            <ScrollToHash>
              <Routes>
              <Route 
                path="/" 
                element={<Home onAddToCart={addToCart} />} 
              />
              <Route 
                path="/servicios" 
                element={<Servicios onAddToCart={addToCart} />} 
              />
              <Route path="/nosotros" element={<Nosotros />} />
              <Route path="/terminos" element={<Terminos />} />
              <Route path="/politicas" element={<Politicas />} />
              <Route 
                path="/blog" 
                element={<Blog />} 
              />
              <Route 
                path="/blog/crear" 
                element={
                  <ProtectedRoute>
                    <CrearBlog />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/carrito" 
                element={
                  <ProtectedRoute>
                    <Carrito 
                      carrito={carrito}
                      onRemoveFromCart={removeFromCart}
                      onClearCart={clearCart}
                    />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/login" 
                element={<Login />} 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute adminOnly={true}>
                    <Admin />
                  </ProtectedRoute>
                } 
              />
            </Routes>
        </ScrollToHash>
          </main>
          
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
