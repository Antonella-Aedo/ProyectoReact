// Datos simulados para la aplicación
export const serviciosData = [
  {
    id: 1,
    nombre: "DJ para Matrimonios",
    descripcion: "Animación musical profesional para bodas. Incluye equipo de sonido, luces y repertorio personalizado.",
    precio: 250000,
    categoria: "Música y Sonido",
    imagen: "/img/servicio1.jpg",
    valoracion: 4,
    numValoraciones: 24,
    disponibilidad: "Sábados y Domingos",
    proveedor: "DJ Profesional Music",
    detalles: [
      "Duración: 5 horas",
      "Equipo necesario: Espacio para DJ y toma de corriente",
      "Disponibilidad: Sábados y Domingos"
    ]
  },
  {
    id: 2,
    nombre: "Decoración Baby Shower",
    descripcion: "Decoración completa para baby shower con globos, centros de mesa y ambientación temática.",
    precio: 180000,
    categoria: "Decoración y Ambientación",
    imagen: "/img/servicio2.jpg",
    valoracion: 5,
    numValoraciones: 18,
    disponibilidad: "Todos los días",
    proveedor: "Decoraciones Mágicas",
    detalles: [
      "Incluye globos, manteles y centros de mesa",
      "Montaje y desmontaje incluido",
      "Disponible en colores rosa, azul o neutro"
    ]
  },
  {
    id: 3,
    nombre: "Banquetería Gourmet",
    descripcion: "Servicio de banquetería gourmet para eventos corporativos y familiares.",
    precio: 450000,
    categoria: "Catering y Banquetería",
    imagen: "/img/servicio3.jpg",
    valoracion: 4,
    numValoraciones: 32,
    disponibilidad: "Lunes a Viernes",
    proveedor: "Catering Elite",
    detalles: [
      "Menú personalizado para 50 personas",
      "Servicio de meseros incluido",
      "Vajilla y mantelería incluida"
    ]
  },
  {
    id: 4,
    nombre: "Animación Infantil",
    descripcion: "Animación profesional para fiestas infantiles con juegos, música y sorpresas.",
    precio: 120000,
    categoria: "Eventos Infantiles",
    imagen: "/img/servicio4.jpg",
    valoracion: 5,
    numValoraciones: 45,
    disponibilidad: "Fines de semana",
    proveedor: "Animaciones Alegría",
    detalles: [
      "Duración: 3 horas",
      "Incluye juegos y música",
      "Animador profesional con experiencia"
    ]
  },
  {
    id: 5,
    nombre: "Fotografía Profesional",
    descripcion: "Sesión fotográfica profesional para capturar los mejores momentos de tu evento.",
    precio: 300000,
    categoria: "Fotografía y Video",
    imagen: "/img/servicio5.jpg",
    valoracion: 4,
    numValoraciones: 28,
    disponibilidad: "Todos los días",
    proveedor: "Momentos Únicos Fotografía",
    detalles: [
      "Sesión de 6 horas",
      "200+ fotos editadas digitalmente",
      "Entrega en galería online"
    ]
  },
  {
    id: 6,
    nombre: "Show de Magia",
    descripcion: "Espectáculo de magia profesional para sorprender a todos los invitados.",
    precio: 150000,
    categoria: "Animación y Entretenimiento",
    imagen: "/img/servicio6.jpg",
    valoracion: 5,
    numValoraciones: 22,
    disponibilidad: "Fines de semana",
    proveedor: "Magia y Sonrisas",
    detalles: [
      "Duración: 1 hora",
      "Show interactivo con la audiencia",
      "Mago profesional certificado"
    ]
  }
];

export const categoriasBlog = [
  "Todos",
  "Animación y Entretenimiento",
  "Música y Sonido",
  "Decoración y Ambientación",
  "Catering y Banquetería",
  "Fotografía y Video",
  "Logística y Producción",
  "Estilo y Belleza",
  "Eventos Infantiles",
  "Eventos Especiales",
  "Tendencias",
  "Consejos",
  "Experiencias"
];

export const blogsData = [
  {
    id: 1,
    titulo: "Tendencias en Decoración para Eventos 2025",
    contenido: "Descubre las últimas tendencias en decoración para que tu evento sea inolvidable. Este año, los colores pasteles y los elementos naturales dominan la escena...",
    imagen: "/img/BlogTendencias.png",
    autor: "Administrador",
    fecha: "2025-01-10",
    categoria: "Decoración y Ambientación",
    resumen: "Descubre las últimas tendencias en decoración para que tu evento sea inolvidable.",
    comentarios: [
      {
        id: 1,
        autor: "María González",
        comentario: "Excelentes ideas, me ayudaron mucho para mi boda",
        fecha: "2025-01-11"
      }
    ]
  },
  {
    id: 2,
    titulo: "Banquetería: Sabores que Sorprenden",
    contenido: "Ideas y consejos para elegir el mejor catering para tu evento. La gastronomía es uno de los aspectos más importantes de cualquier celebración...",
    imagen: "/img/BlogBanquetería.png",
    autor: "Proveedor - Banquetería Gourmet Spa",
    fecha: "2025-01-08",
    categoria: "Catering y Banquetería",
    resumen: "Ideas y consejos para elegir el mejor catering para tu evento.",
    comentarios: []
  },
  {
    id: 3,
    titulo: "Animación Infantil: Diversión Garantizada",
    contenido: "Cómo elegir animadores y juegos para cumpleaños y fiestas infantiles. La diversión de los más pequeños es fundamental...",
    imagen: "/img/BlogAnimaciónInfantil.png",
    autor: "Proveedor - Animaciones Infantiles Alegría",
    fecha: "2025-01-05",
    categoria: "Eventos Infantiles",
    resumen: "Cómo elegir animadores y juegos para cumpleaños y fiestas infantiles.",
    comentarios: [
      {
        id: 1,
        autor: "Carlos Ruiz",
        comentario: "Muy buenos consejos, los seguiré para el cumpleaños de mi hijo",
        fecha: "2025-01-06"
      }
    ]
  },
  {
    id: 4,
    titulo: "Fiestas de Año Nuevo: Ideas para Celebrar",
    contenido: "Tips para organizar una fiesta de año nuevo inolvidable. Desde la decoración hasta el menú, todo debe estar perfectamente coordinado...",
    imagen: "/img/BlogAñoNuevo.png",
    autor: "Administrador",
    fecha: "2024-12-28",
    categoria: "Eventos Especiales",
    resumen: "Tips para organizar una fiesta de año nuevo inolvidable.",
    comentarios: []
  },
  {
    id: 5,
    titulo: "Magos y Shows: Sorpresa para tus Invitados",
    contenido: "El valor de la magia y el espectáculo en eventos familiares y corporativos. Un buen show puede transformar completamente la atmósfera...",
    imagen: "/img/BlogMago.png",
    autor: "Proveedor - Magia y Sonrisas",
    fecha: "2024-12-25",
    categoria: "Animación y Entretenimiento",
    resumen: "El valor de la magia y el espectáculo en eventos familiares y corporativos.",
    comentarios: []
  },
  {
    id: 6,
    titulo: "Eventos Corporativos: Claves del Éxito",
    contenido: "Cómo planificar eventos empresariales exitosos y memorables. La planificación detallada es esencial para el éxito...",
    imagen: "/img/BlogEventoCorp.png",
    autor: "Administrador",
    fecha: "2024-12-20",
    categoria: "Logística y Producción",
    resumen: "Cómo planificar eventos empresariales exitosos y memorables.",
    comentarios: []
  }
];

export const categoriasServicios = [
  "Todos",
  "Animación y Entretenimiento",
  "Música y Sonido",
  "Decoración y Ambientación",
  "Catering y Banquetería",
  "Fotografía y Video",
  "Logística y Producción",
  "Estilo y Belleza",
  "Eventos Infantiles",
  "Eventos Especiales"
];

// Inicializar usuarios con un admin por defecto
export const initializeDefaultUsers = () => {
  const existingUsers = localStorage.getItem('ambienteFestUsers');
  if (!existingUsers) {
    const defaultUsers = [
      {
        id: 1,
        run: "12345678K",
        nombre: "Admin",
        apellidos: "Sistema",
        email: "admin@ambientefest.cl",
        password: "admin123",
        rol: "admin",
        fechaRegistro: new Date().toISOString()
      }
    ];
    localStorage.setItem('ambienteFestUsers', JSON.stringify(defaultUsers));
  }
};

// Inicializar blogs por defecto
export const initializeDefaultBlogs = () => {
  const existingBlogs = localStorage.getItem('blogs');
  if (!existingBlogs) {
    // Convertir blogsData para localStorage (agregar estado y ajustar formato)
    const defaultBlogs = blogsData.map(blog => ({
      id: blog.id,
      titulo: blog.titulo,
      contenido: blog.contenido,
      imagen: blog.imagen,
      autor: blog.autor,
      fecha: blog.fecha,
      categoria: blog.categoria,
      estado: 'aprobado' // Todos los blogs por defecto están aprobados
    }));
    localStorage.setItem('blogs', JSON.stringify(defaultBlogs));
  }
};