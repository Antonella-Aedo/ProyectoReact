import React, { useState } from 'react';
import { Button, Spinner, Image, Alert } from 'react-bootstrap';
import { uploadImageToXano } from '../services/api';

const UploadImage = ({ onUploaded, accept = 'image/*', maxSizeMB = 5, multiple = false, defer = false, name = 'image_file' }) => {
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState(null);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleSelect = (e) => {
    setError(null);
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    const maxBytes = maxSizeMB * 1024 * 1024;
    const tooLarge = selected.find(f => f.size > maxBytes);
    if (tooLarge) {
      setError(`Al menos un archivo supera el límite de ${maxSizeMB} MB`);
      return;
    }

    if (multiple) {
      setFiles(selected);
      try {
        const urls = selected.map(f => URL.createObjectURL(f));
        setPreviews(urls);
      } catch (_) {
        setPreviews([]);
      }
      // If defer mode, immediately return the File objects to parent
      if (defer && onUploaded) {
        onUploaded(selected);
      }
    } else {
      const f = selected[0];
      setFile(f);
      try {
        const url = URL.createObjectURL(f);
        setPreview(url);
      } catch (_) {
        setPreview(null);
      }
      if (defer && onUploaded) {
        onUploaded(f);
      }
    }
  };

  const handleUpload = async () => {
    setError(null);
    setUploading(true);
    try {
      if (defer) {
        // In defer mode we don't upload here; just notify parent with Files
        if (multiple) {
          if (onUploaded) onUploaded(files);
        } else {
          if (onUploaded) onUploaded(file);
        }
        return;
      }

      // Normal upload behavior (compatible with existing usage)
      if (multiple) {
        const uploadedUrls = [];
        for (const f of files) {
          const url = await uploadImageToXano(f);
          uploadedUrls.push(url);
        }
        if (onUploaded) onUploaded(multiple ? uploadedUrls : (uploadedUrls[0] || ''));
      } else {
        if (!file) return setError('Selecciona una imagen primero');
        const url = await uploadImageToXano(file);
        if (onUploaded) onUploaded(url);
      }
    } catch (err) {
      console.error('Error subiendo imagen:', err);
      setError(err?.message || 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  // Generar un id único para el input para accesibilidad
  const inputIdRef = React.useRef(`upload-image-${Date.now().toString(36)}-${Math.floor(Math.random() * 10000)}`);

  return (
    <div className="mb-3">
      {error && <Alert variant="danger">{error}</Alert>}
      <div className="d-flex align-items-center gap-2 flex-wrap">
        <input
          id={inputIdRef.current}
          name={name}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleSelect}
          aria-label="Seleccionar imagen(es)"
        />
        <Button variant="outline-primary" size="sm" onClick={handleUpload} disabled={uploading || (!(multiple ? files.length : file))}>
          {uploading ? (
            <><Spinner animation="border" size="sm" className="me-2" />Subiendo...</>
          ) : 'Subir imagen'}
        </Button>
        {multiple && previews && previews.length > 0 && (
          <div className="d-flex gap-2 align-items-center">
            {previews.map((p, i) => (
              <div key={i} style={{ width: 80, height: 60 }}>
                <Image src={p} thumbnail style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        )}
        {!multiple && preview && (
          <div style={{ width: 80, height: 60 }}>
            <Image src={preview} thumbnail style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadImage;
