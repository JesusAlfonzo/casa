import { commonSchemas } from './schemas/common.schema.js';
import { authRbacSchemas } from './schemas/auth-rbac.schema.js';
import { catalogSchemas } from './schemas/catalog.schema.js';
import { inventorySchemas } from './schemas/inventory.schema.js';
import { financeSchemas } from './schemas/finance.schema.js';
import { streamingSchemas } from './schemas/streaming.schema.js';
import { salesSchemas } from './schemas/sales.schema.js';
import { openApiPaths } from './paths/index.js';

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ERP Híbrido - API REST',
    version: '1.0.0',
    description:
      'API Backend del ERP Híbrido para la gestión integral de comercio físico (inventario, Kardex, compras, proveedores y ventas) y servicios digitales (cuentas maestras y pantallas de streaming, suscripciones periódicas y cobros multimoneda).',
    contact: {
      name: 'Soporte Técnico ERP Híbrido',
      email: 'soporte@erphibrido.com',
    },
  },
  servers: [
    {
      url: '/',
      description: 'Servidor Actual (Relativo)',
    },
    {
      url: 'http://localhost:3000',
      description: 'Entorno de Desarrollo Local',
    },
  ],
  tags: [
    {
      name: 'Health',
      description: 'Monitoreo de estado y conectividad a base de datos',
    },
    { name: 'Auth', description: 'Autenticación y sesiones (Better Auth)' },
    {
      name: 'RBAC - Usuarios',
      description: 'Gestión de cuentas y asignación de roles/permisos',
    },
    {
      name: 'RBAC - Roles',
      description: 'Administración de roles del sistema',
    },
    {
      name: 'RBAC - Permisos',
      description: 'Catálogo de permisos por módulo',
    },
    {
      name: 'Catálogo - Marcas',
      description: 'Marcas comerciales de productos',
    },
    {
      name: 'Catálogo - Categorías',
      description: 'Categorías y subcategorías jerárquicas',
    },
    {
      name: 'Catálogo - Unidades de Medida',
      description: 'Unidades de medida para inventario',
    },
    {
      name: 'Catálogo - Productos',
      description: 'Catálogo maestro de productos físicos',
    },
    {
      name: 'Catálogo - Proveedores',
      description: 'Proveedores y datos fiscales/contacto',
    },
    {
      name: 'Catálogo - Proveedor / Producto',
      description: 'Costos pactados y códigos de proveedor',
    },
    {
      name: 'Inventario - Ubicaciones',
      description: 'Almacenes, sucursales y estanterías',
    },
    {
      name: 'Inventario - Stock & Kardex',
      description: 'Existencias, auditoría y movimientos de inventario',
    },
    {
      name: 'Finanzas - Monedas',
      description: 'Monedas manejadas en el sistema (USD, VES, EUR)',
    },
    {
      name: 'Finanzas - Tasas de Cambio',
      description: 'Tasas de cambio oficiales y paralelas',
    },
    {
      name: 'Finanzas - Métodos de Pago',
      description: 'Métodos de pago admitidos (Pago Móvil, Zelle, etc.)',
    },
    {
      name: 'Finanzas - Cuentas Bancarias y Cajas',
      description: 'Cuentas bancarias, cajas chicas y billeteras',
    },
    {
      name: 'Finanzas - Transacciones',
      description: 'Cobros, pagos y movimientos financieros',
    },
    {
      name: 'Compras - Proveedores',
      description: 'Órdenes de compra y recepción de existencias',
    },
    {
      name: 'Servicios - Tipos de Servicio',
      description: 'Clasificación de servicios digitales',
    },
    {
      name: 'Servicios - Catálogo de Servicios',
      description: 'Servicios comercializados (Netflix, Spotify)',
    },
    {
      name: 'Servicios - Cuentas Maestras de Streaming',
      description: 'Cuentas principales y administración de pantallas',
    },
    {
      name: 'Servicios - Perfiles de Streaming',
      description: 'Perfiles individuales, PINs y asignación',
    },
    {
      name: 'Clientes',
      description: 'Gestión de clientes y datos de contacto',
    },
    {
      name: 'Suscripciones de Clientes',
      description: 'Suscripciones periódicas, vencimientos y renovaciones',
    },
    {
      name: 'Ventas & Facturación',
      description:
        'Punto de venta, facturación multimoneda, Kardex y anulación',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT / SessionToken',
        description:
          'Ingrese el Bearer Token obtenido en /api/auth/signin o mediante la cookie de sesión',
      },
    },
    schemas: {
      ...commonSchemas,
      ...authRbacSchemas,
      ...catalogSchemas,
      ...inventorySchemas,
      ...financeSchemas,
      ...streamingSchemas,
      ...salesSchemas,
    },
  },
  paths: openApiPaths,
};

export const swaggerUiOptions = {
  customSiteTitle: 'ERP Híbrido - Documentación de API REST',
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .info .title { color: #2563eb }
  `,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    tryItOutEnabled: true,
  },
};
