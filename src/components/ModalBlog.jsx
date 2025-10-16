import React from 'react';
import { Modal, Button, Form, InputGroup } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

const ModalBlog = ({ show, onHide, blog, onAddComment }) => {
  const { isAuthenticated, user } = useAuth();
  const [comentario, setComentario] = React.useState('');

  const placeholderImg = 'https://picsum.photos/600x250?text=Imagen+No+Disponible';
  const safeImageSrc = (b) => {
    if (!b) return placeholderImg;
    const cand = (b.imagen || b.image_url || '').toString().trim();
    return cand && cand.length ? cand : placeholderImg;
  };

  if (!blog) return null;

  const handleAddComment = () => {
    if (comentario.trim() && isAuthenticated()) {
      const nuevoComentario = {
        id: Date.now(),
        autor: `${user.nombre} ${user.apellidos}`,
        comentario: comentario.trim(),
        fecha: new Date().toISOString().split('T')[0]
      };
      
      onAddComment(blog.id, nuevoComentario);
      setComentario('');
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Detalle del Blog</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <img
          src={safeImageSrc(blog)}
          className="img-fluid mb-3 blog-img-fixed"
          alt={blog.titulo}
          onError={(e) => {
            // Prevent potential recursive error loops by removing the handler first
            try { e.target.onerror = null; } catch (_) {}
            e.target.src = 'https://picsum.photos/600x250?text=Imagen+No+Disponible';
          }}
        />
        <h4>{blog.titulo}</h4>
        <p className="text-muted">Por: {blog.autor} - {blog.fecha}</p>
        
        <div className="mb-3">
          <strong>Descripción detallada:</strong>
          <p className="mb-0">{blog.contenido}</p>
        </div>
        
        <hr />
        
        <h6>Comentarios ({blog.comentarios ? blog.comentarios.length : 0})</h6>
        
        <ul className="list-group mb-2">
          {blog.comentarios && blog.comentarios.map((comentario) => (
            <li key={comentario.id} className="list-group-item">
              <strong>{comentario.autor}</strong>
              <small className="text-muted ms-2">- {comentario.fecha}</small>
              <p className="mb-0 mt-1">{comentario.comentario}</p>
            </li>
          ))}
          {(!blog.comentarios || blog.comentarios.length === 0) && (
            <li className="list-group-item text-muted">
              No hay comentarios aún. ¡Sé el primero en comentar!
            </li>
          )}
        </ul>
        
        <InputGroup>
          <Form.Control 
            type="text" 
            placeholder={isAuthenticated() ? "Escribe un comentario..." : "Inicia sesión para comentar"}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            disabled={!isAuthenticated()}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddComment();
              }
            }}
          />
          <Button 
            variant="primary"
            onClick={handleAddComment}
            disabled={!isAuthenticated() || !comentario.trim()}
          >
            Comentar
          </Button>
        </InputGroup>
        
        {!isAuthenticated() && (
          <small className="text-muted d-block mt-2">
            Inicia sesión para poder comentar en los blogs
          </small>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default ModalBlog;
