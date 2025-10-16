import React, { useEffect, useState } from 'react';
import { getServiceCategories } from '../services/api';

const ServiceCategorySelect = ({ value, onChange }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getServiceCategories()
      .then((data) => {
        setCategories(data);
        setLoading(false);
      })
      .catch((err) => {
        setError('Error al cargar categorías');
        setLoading(false);
      });
  }, []);

  if (loading) return <span>Cargando categorías...</span>;
  if (error) return <span>{error}</span>;

  return (
    <select value={value} onChange={onChange}>
      <option value="">Selecciona una categoría</option>
      {categories.map((cat) => (
        <option key={cat.id} value={cat.id}>
          {cat.nombre}
        </option>
      ))}
    </select>
  );
};

export default ServiceCategorySelect;
