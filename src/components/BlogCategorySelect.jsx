import React, { useEffect, useState } from 'react';
import { getBlogCategories } from '../services/api';

const BlogCategorySelect = ({ value, onChange }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getBlogCategories()
      .then((data) => {
        setCategories(data);
        setLoading(false);
      })
      .catch(() => {
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
          {cat.name}
        </option>
      ))}
    </select>
  );
};

export default BlogCategorySelect;
