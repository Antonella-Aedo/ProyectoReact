# AmbienteFest - Plataforma de Servicios para Eventos

## Descripción

AmbienteFest es una aplicación web React que conecta a usuarios con proveedores de servicios para eventos. La plataforma permite navegar servicios, crear blogs informativos, gestionar un carrito de compras y administrar el contenido.

## Características Principales

### Para Usuarios No Registrados
-  Navegar por servicios y blog
-  Ver detalles de servicios
-  Leer artículos del blog
-  No pueden comentar ni comprar

### Para Usuarios Registrados (Clientes)
- Todas las funciones de usuarios no registrados
- Agregar servicios al carrito
-  Realizar compras (simulado)
- Comentar en blogs
-  Crear nuevos blogs informativos

### Para Administradores
-  Todas las funciones de clientes
-  Crear, editar y eliminar servicios
-  Gestionar usuarios y blogs
-  Panel de administración completo

## Tecnologías Utilizadas

- **React** 19.1.1 - Framework principal
- **React Router DOM** - Navegación
- **React Bootstrap** - Componentes UI
- **Bootstrap** 5.3+ - Estilos y diseño responsive
- **Bootstrap Icons** - Iconografía
- **Vite** - Herramienta de desarrollo
- **localStorage** - Persistencia de datos (simulando base de datos)

## Instalación y Configuración

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Ejecutar en modo desarrollo**
   ```bash
   npm run dev
   ```

3. **Compilar para producción**
   ```bash
   npm run build
   ```

## Usuarios de Prueba

### Administrador
- **Email:** admin@ambientefest.cl
- **Contraseña:** admin123
- **Permisos:** Acceso completo al panel de administración

### Cliente de Prueba
Puedes registrarte como nuevo usuario usando:
- Emails válidos: @duoc.cl, @profesor.duoc.cl, @gmail.com
- RUN: Formato chileno sin puntos ni guion (ej: 19011022K)

## Funcionalidades Implementadas

###  Página Home
- Hero con llamado a la acción
- Servicios destacados
- Sección "Nosotros"
- Formulario de contacto
- Efectos de cotillón animado

###  Catálogo de Servicios
- Filtros por categoría, precio y valoración
- Cards con información detallada
- Modal de detalle de servicio
- Botón "Agregar al carrito" (solo usuarios logueados)

###  Sistema de Blog
- Visualización de artículos informativos
- Creación de nuevos blogs (usuarios logueados)
- Sistema de comentarios
- Modal de detalle de blog

###  Carrito de Compras
- Gestión de servicios agregados
- Cálculo de totales con IVA
- Simulación de proceso de pago
- Solo accesible para usuarios logueados

###  Autenticación
- Login con validación
- Registro de nuevos usuarios
- Validación de emails (.duoc.cl, .profesor.duoc.cl, .gmail.com)
- Validación de RUN chileno
- Persistencia de sesión

###  Panel de Administración
- CRUD completo de servicios
- Gestión de usuarios
- Reportes y estadísticas
- Interfaz con tema azul diferenciado
- Solo accesible para administradores

## Diseño y UX

### Responsive Design
-  Diseño completamente responsive
- Bootstrap Grid System
-  Menú colapsable en móviles
- Cards que se adaptan automáticamente

### Paleta de Colores
- **Principal:** Fucsia (#e10098) - Para el sitio público
- **Admin:** Azul (#2566a6) - Para el panel de administración
- **Pasteles:** Rosa pastel (#ffe0ef) - Fondos suaves

**Desarrollado para:** Evaluación AmbienteFest  
**Fundadoras:** Antonella Aedo y Karen Fuentealba  
**Tecnología:** React + Bootstrap  
**Año:** 2025

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
