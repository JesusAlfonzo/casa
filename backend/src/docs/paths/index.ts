/**
 * OpenAPI 3.0.3 Paths Definitions
 * Agrupadas por módulos funcionales del ERP Híbrido
 */

// Respuestas comunes reutilizables
const jsonContent = (schemaRef: string) => ({
  'application/json': { schema: { $ref: `#/components/schemas/${schemaRef}` } },
});

const okResponse = (description: string, schemaRef?: string) => ({
  description,
  content: schemaRef ? jsonContent(schemaRef) : undefined,
});

const createdResponse = (description: string, schemaRef?: string) => ({
  description,
  content: schemaRef ? jsonContent(schemaRef) : undefined,
});

const errorResponse = (description: string) => ({
  description,
  content: jsonContent('ApiErrorResponse'),
});

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
};

const paginationQueries = [
  { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
  { name: 'search', in: 'query', schema: { type: 'string' } },
  { name: 'sortBy', in: 'query', schema: { type: 'string' } },
  {
    name: 'sortOrder',
    in: 'query',
    schema: { type: 'string', enum: ['asc', 'desc'] },
  },
];

export const openApiPaths: Record<string, any> = {
  // ==========================================
  // SALUD Y ESTADO DEL SERVIDOR
  // ==========================================
  '/health': {
    get: {
      tags: ['Health'],
      summary: 'Verificar salud del servidor y conectividad a base de datos',
      responses: {
        200: okResponse(
          'Servidor y base de datos PostgreSQL en funcionamiento'
        ),
        503: errorResponse('Fallo de conexión con la base de datos'),
      },
    },
  },

  // ==========================================
  // AUTENTICACIÓN Y SESIONES (Better Auth)
  // ==========================================
  '/api/auth/signup': {
    post: {
      tags: ['Auth'],
      summary: 'Registro de nuevo usuario',
      requestBody: { required: true, content: jsonContent('SignUpDTO') },
      responses: {
        201: createdResponse('Usuario registrado exitosamente', 'User'),
        400: errorResponse('Datos inválidos o correo ya registrado'),
      },
    },
  },
  '/api/auth/signin': {
    post: {
      tags: ['Auth'],
      summary: 'Iniciar sesión (obtener Bearer Token)',
      requestBody: { required: true, content: jsonContent('SignInDTO') },
      responses: {
        200: okResponse('Inicio de sesión exitoso con token'),
        401: errorResponse('Credenciales inválidas'),
      },
    },
  },
  '/api/auth/session': {
    get: {
      tags: ['Auth'],
      summary: 'Consultar estado de la sesión activa',
      responses: {
        200: okResponse('Datos de la sesión activa'),
      },
    },
  },
  '/api/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Obtener perfil del usuario autenticado, roles y permisos',
      security: [{ bearerAuth: [] }],
      responses: {
        200: okResponse('Perfil completo del usuario con roles y permisos'),
        401: errorResponse('No autenticado'),
      },
    },
  },
  '/api/auth/signout': {
    post: {
      tags: ['Auth'],
      summary: 'Cerrar sesión activa',
      security: [{ bearerAuth: [] }],
      responses: {
        200: okResponse('Sesión finalizada exitosamente'),
        401: errorResponse('No autenticado'),
      },
    },
  },
  '/api/auth/change-password': {
    post: {
      tags: ['Auth'],
      summary: 'Cambiar contraseña de usuario',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: jsonContent('ChangePasswordDTO'),
      },
      responses: {
        200: okResponse('Contraseña actualizada correctamente'),
        400: errorResponse('Contraseña actual incorrecta'),
      },
    },
  },
  '/api/auth/profile': {
    patch: {
      tags: ['Auth'],
      summary: 'Actualizar perfil del usuario autenticado',
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: jsonContent('UpdateProfileDTO') },
      responses: {
        200: okResponse('Perfil actualizado exitosamente', 'User'),
      },
    },
  },

  // ==========================================
  // RBAC: USUARIOS, ROLES Y PERMISOS
  // ==========================================
  '/api/users': {
    get: {
      tags: ['RBAC - Usuarios'],
      summary: 'Listar usuarios del sistema (solo ADMIN)',
      security: [{ bearerAuth: [] }],
      parameters: paginationQueries,
      responses: {
        200: okResponse('Lista paginada de usuarios'),
        403: errorResponse('Requiere rol ADMIN'),
      },
    },
  },
  '/api/users/{id}': {
    get: {
      tags: ['RBAC - Usuarios'],
      summary: 'Obtener detalle de usuario con roles y permisos (solo ADMIN)',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: {
        200: okResponse('Detalle de usuario'),
        404: errorResponse('Usuario no encontrado'),
      },
    },
  },
  '/api/users/{id}/roles': {
    post: {
      tags: ['RBAC - Usuarios'],
      summary: 'Asignar roles a un usuario (solo ADMIN)',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: { required: true, content: jsonContent('AssignRolesDTO') },
      responses: {
        200: okResponse('Roles asignados exitosamente'),
      },
    },
  },
  '/api/users/{id}/permissions': {
    post: {
      tags: ['RBAC - Usuarios'],
      summary: 'Establecer excepciones de permisos por usuario (solo ADMIN)',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: {
        required: true,
        content: jsonContent('SetPermissionsDTO'),
      },
      responses: {
        200: okResponse('Permisos de usuario actualizados'),
      },
    },
  },
  '/api/roles': {
    get: {
      tags: ['RBAC - Roles'],
      summary: 'Listar roles del sistema (solo ADMIN)',
      security: [{ bearerAuth: [] }],
      responses: {
        200: okResponse('Lista de roles del sistema'),
      },
    },
    post: {
      tags: ['RBAC - Roles'],
      summary: 'Crear nuevo rol (solo ADMIN)',
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: jsonContent('CreateRoleDTO') },
      responses: {
        201: createdResponse('Rol creado exitosamente', 'Role'),
      },
    },
  },
  '/api/roles/{id}': {
    get: {
      tags: ['RBAC - Roles'],
      summary: 'Obtener detalle de rol con permisos asignados (solo ADMIN)',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: {
        200: okResponse('Detalle de rol y sus permisos'),
      },
    },
    put: {
      tags: ['RBAC - Roles'],
      summary: 'Actualizar rol y permisos (solo ADMIN)',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: { required: true, content: jsonContent('UpdateRoleDTO') },
      responses: {
        200: okResponse('Rol actualizado'),
      },
    },
    delete: {
      tags: ['RBAC - Roles'],
      summary: 'Eliminar rol (solo ADMIN, roles no del sistema)',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: {
        200: okResponse('Rol eliminado exitosamente'),
      },
    },
  },
  '/api/permissions': {
    get: {
      tags: ['RBAC - Permisos'],
      summary: 'Listar catálogo completo de permisos del sistema',
      security: [{ bearerAuth: [] }],
      responses: {
        200: okResponse('Catálogo de permisos'),
      },
    },
  },
  '/api/permissions/by-module': {
    get: {
      tags: ['RBAC - Permisos'],
      summary: 'Obtener permisos agrupados por módulo funcional',
      security: [{ bearerAuth: [] }],
      responses: {
        200: okResponse('Permisos agrupados por módulo'),
      },
    },
  },

  // ==========================================
  // CATÁLOGO: MARCAS, CATEGORÍAS, UNIDADES, PRODUCTOS, PROVEEDORES
  // ==========================================
  '/api/brands': {
    get: {
      tags: ['Catálogo - Marcas'],
      summary: 'Listar marcas con paginación y búsqueda',
      security: [{ bearerAuth: [] }],
      parameters: paginationQueries,
      responses: { 200: okResponse('Lista de marcas') },
    },
    post: {
      tags: ['Catálogo - Marcas'],
      summary: 'Registrar nueva marca',
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: jsonContent('CreateBrandDTO') },
      responses: { 201: createdResponse('Marca creada', 'Brand') },
    },
  },
  '/api/brands/{id}': {
    get: {
      tags: ['Catálogo - Marcas'],
      summary: 'Obtener marca por ID',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Detalle de marca', 'Brand') },
    },
    put: {
      tags: ['Catálogo - Marcas'],
      summary: 'Actualizar marca',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: { required: true, content: jsonContent('UpdateBrandDTO') },
      responses: { 200: okResponse('Marca actualizada', 'Brand') },
    },
    delete: {
      tags: ['Catálogo - Marcas'],
      summary: 'Eliminar marca (soft-delete)',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Marca eliminada') },
    },
  },
  '/api/brands/{id}/status': {
    patch: {
      tags: ['Catálogo - Marcas'],
      summary: 'Alternar estado activo/inactivo de marca',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Estado alternado') },
    },
  },

  '/api/categories': {
    get: {
      tags: ['Catálogo - Categorías'],
      summary: 'Listar categorías con paginación',
      security: [{ bearerAuth: [] }],
      parameters: paginationQueries,
      responses: { 200: okResponse('Lista de categorías') },
    },
    post: {
      tags: ['Catálogo - Categorías'],
      summary: 'Crear categoría o subcategoría',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: jsonContent('CreateCategoryDTO'),
      },
      responses: { 201: createdResponse('Categoría creada', 'Category') },
    },
  },
  '/api/categories/tree': {
    get: {
      tags: ['Catálogo - Categorías'],
      summary: 'Obtener árbol jerárquico de categorías y subcategorías',
      security: [{ bearerAuth: [] }],
      responses: { 200: okResponse('Árbol de categorías') },
    },
  },
  '/api/categories/{id}': {
    get: {
      tags: ['Catálogo - Categorías'],
      summary: 'Obtener categoría por ID',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Detalle de categoría', 'Category') },
    },
    put: {
      tags: ['Catálogo - Categorías'],
      summary: 'Actualizar categoría',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: {
        required: true,
        content: jsonContent('UpdateCategoryDTO'),
      },
      responses: { 200: okResponse('Categoría actualizada', 'Category') },
    },
    delete: {
      tags: ['Catálogo - Categorías'],
      summary: 'Eliminar categoría',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Categoría eliminada') },
    },
  },

  '/api/measurement-units': {
    get: {
      tags: ['Catálogo - Unidades de Medida'],
      summary: 'Listar unidades de medida',
      security: [{ bearerAuth: [] }],
      parameters: paginationQueries,
      responses: { 200: okResponse('Lista de unidades de medida') },
    },
    post: {
      tags: ['Catálogo - Unidades de Medida'],
      summary: 'Crear unidad de medida',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: jsonContent('CreateMeasurementUnitDTO'),
      },
      responses: { 201: createdResponse('Unidad creada', 'MeasurementUnit') },
    },
  },
  '/api/measurement-units/{id}': {
    get: {
      tags: ['Catálogo - Unidades de Medida'],
      summary: 'Obtener unidad de medida por ID',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Detalle de unidad', 'MeasurementUnit') },
    },
    put: {
      tags: ['Catálogo - Unidades de Medida'],
      summary: 'Actualizar unidad de medida',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: {
        required: true,
        content: jsonContent('UpdateMeasurementUnitDTO'),
      },
      responses: { 200: okResponse('Unidad actualizada', 'MeasurementUnit') },
    },
    delete: {
      tags: ['Catálogo - Unidades de Medida'],
      summary: 'Eliminar unidad de medida',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Unidad eliminada') },
    },
  },

  '/api/products': {
    get: {
      tags: ['Catálogo - Productos'],
      summary: 'Listar productos físicos con filtros y paginación',
      security: [{ bearerAuth: [] }],
      parameters: [
        ...paginationQueries,
        {
          name: 'categoryId',
          in: 'query',
          schema: { type: 'string', format: 'uuid' },
        },
        {
          name: 'brandId',
          in: 'query',
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: { 200: okResponse('Lista paginada de productos') },
    },
    post: {
      tags: ['Catálogo - Productos'],
      summary: 'Crear nuevo producto en catálogo',
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: jsonContent('CreateProductDTO') },
      responses: { 201: createdResponse('Producto creado', 'Product') },
    },
  },
  '/api/products/{id}': {
    get: {
      tags: ['Catálogo - Productos'],
      summary: 'Obtener detalle de producto',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Detalle del producto', 'Product') },
    },
    put: {
      tags: ['Catálogo - Productos'],
      summary: 'Actualizar producto',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: { required: true, content: jsonContent('UpdateProductDTO') },
      responses: { 200: okResponse('Producto actualizado', 'Product') },
    },
    delete: {
      tags: ['Catálogo - Productos'],
      summary: 'Eliminar producto (soft-delete)',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Producto eliminado') },
    },
  },

  '/api/suppliers': {
    get: {
      tags: ['Catálogo - Proveedores'],
      summary: 'Listar proveedores con búsqueda por RIF/NIT o razón social',
      security: [{ bearerAuth: [] }],
      parameters: paginationQueries,
      responses: { 200: okResponse('Lista de proveedores') },
    },
    post: {
      tags: ['Catálogo - Proveedores'],
      summary: 'Registrar nuevo proveedor',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: jsonContent('CreateSupplierDTO'),
      },
      responses: { 201: createdResponse('Proveedor registrado', 'Supplier') },
    },
  },
  '/api/suppliers/{id}': {
    get: {
      tags: ['Catálogo - Proveedores'],
      summary: 'Obtener proveedor por ID',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Detalle de proveedor', 'Supplier') },
    },
    put: {
      tags: ['Catálogo - Proveedores'],
      summary: 'Actualizar proveedor',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: {
        required: true,
        content: jsonContent('UpdateSupplierDTO'),
      },
      responses: { 200: okResponse('Proveedor actualizado', 'Supplier') },
    },
    delete: {
      tags: ['Catálogo - Proveedores'],
      summary: 'Eliminar proveedor',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Proveedor eliminado') },
    },
  },

  '/api/supplier-products': {
    get: {
      tags: ['Catálogo - Proveedor / Producto'],
      summary: 'Listar asociaciones entre proveedores y productos',
      security: [{ bearerAuth: [] }],
      parameters: paginationQueries,
      responses: { 200: okResponse('Lista de relaciones proveedor-producto') },
    },
    post: {
      tags: ['Catálogo - Proveedor / Producto'],
      summary: 'Asociar producto a un proveedor con costo pactado',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: jsonContent('AssignSupplierProductDTO'),
      },
      responses: {
        201: createdResponse('Asociación creada', 'SupplierProduct'),
      },
    },
  },
  '/api/supplier-products/{id}/primary': {
    patch: {
      tags: ['Catálogo - Proveedor / Producto'],
      summary: 'Establecer proveedor principal para el producto',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Proveedor principal actualizado') },
    },
  },

  // ==========================================
  // INVENTARIO, ALMACENES Y KARDEX
  // ==========================================
  '/api/locations': {
    get: {
      tags: ['Inventario - Ubicaciones'],
      summary: 'Listar almacenes y ubicaciones',
      security: [{ bearerAuth: [] }],
      parameters: paginationQueries,
      responses: { 200: okResponse('Lista de ubicaciones') },
    },
    post: {
      tags: ['Inventario - Ubicaciones'],
      summary: 'Crear almacén, pasillo o estante',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: jsonContent('CreateLocationDTO'),
      },
      responses: { 201: createdResponse('Ubicación creada', 'Location') },
    },
  },
  '/api/locations/tree': {
    get: {
      tags: ['Inventario - Ubicaciones'],
      summary: 'Obtener árbol jerárquico de almacenes y sub-ubicaciones',
      security: [{ bearerAuth: [] }],
      responses: { 200: okResponse('Estructura jerárquica de ubicaciones') },
    },
  },
  '/api/locations/{id}': {
    get: {
      tags: ['Inventario - Ubicaciones'],
      summary: 'Obtener ubicación por ID',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Detalle de ubicación', 'Location') },
    },
    put: {
      tags: ['Inventario - Ubicaciones'],
      summary: 'Actualizar ubicación',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: {
        required: true,
        content: jsonContent('UpdateLocationDTO'),
      },
      responses: { 200: okResponse('Ubicación actualizada', 'Location') },
    },
    delete: {
      tags: ['Inventario - Ubicaciones'],
      summary: 'Eliminar ubicación',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Ubicación eliminada') },
    },
  },

  '/api/inventories': {
    get: {
      tags: ['Inventario - Stock & Kardex'],
      summary: 'Consultar existencias de productos por almacén',
      security: [{ bearerAuth: [] }],
      parameters: [
        ...paginationQueries,
        {
          name: 'locationId',
          in: 'query',
          schema: { type: 'string', format: 'uuid' },
        },
        {
          name: 'productId',
          in: 'query',
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: {
        200: okResponse('Lista de stock con datos de producto y almacén'),
      },
    },
  },
  '/api/inventories/movements': {
    get: {
      tags: ['Inventario - Stock & Kardex'],
      summary: 'Consultar movimientos del Kardex (auditoría de inventario)',
      security: [{ bearerAuth: [] }],
      parameters: [
        ...paginationQueries,
        {
          name: 'productId',
          in: 'query',
          schema: { type: 'string', format: 'uuid' },
        },
        { name: 'movementType', in: 'query', schema: { type: 'string' } },
      ],
      responses: { 200: okResponse('Historial de movimientos Kardex') },
    },
  },
  '/api/inventories/{id}': {
    get: {
      tags: ['Inventario - Stock & Kardex'],
      summary: 'Obtener registro de inventario por ID',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Detalle de inventario', 'Inventory') },
    },
    patch: {
      tags: ['Inventario - Stock & Kardex'],
      summary: 'Actualizar umbrales de alerta de stock',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: {
        required: true,
        content: jsonContent('UpdateInventoryDetailsDTO'),
      },
      responses: { 200: okResponse('Umbrales actualizados') },
    },
  },
  '/api/inventories/adjust': {
    post: {
      tags: ['Inventario - Stock & Kardex'],
      summary:
        'Realizar ajuste de stock (positivo, negativo o merma) con asiento en Kardex',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: jsonContent('StockAdjustmentDTO'),
      },
      responses: { 200: okResponse('Ajuste procesado con Kardex actualizado') },
    },
  },
  '/api/inventories/transfer': {
    post: {
      tags: ['Inventario - Stock & Kardex'],
      summary:
        'Transferir stock entre almacenes/ubicaciones con doble asiento Kardex',
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: jsonContent('StockTransferDTO') },
      responses: { 200: okResponse('Transferencia completada') },
    },
  },

  // ==========================================
  // FINANZAS, MONEDAS, TASAS, CUENTAS Y PAGOS
  // ==========================================
  '/api/currencies': {
    get: {
      tags: ['Finanzas - Monedas'],
      summary: 'Listar monedas manejadas en el sistema',
      security: [{ bearerAuth: [] }],
      parameters: paginationQueries,
      responses: { 200: okResponse('Lista de monedas') },
    },
    post: {
      tags: ['Finanzas - Monedas'],
      summary: 'Registrar nueva moneda',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: jsonContent('CreateCurrencyDTO'),
      },
      responses: { 201: createdResponse('Moneda creada', 'Currency') },
    },
  },
  '/api/currencies/base': {
    get: {
      tags: ['Finanzas - Monedas'],
      summary: 'Obtener la moneda base configurada en el sistema',
      security: [{ bearerAuth: [] }],
      responses: { 200: okResponse('Moneda base', 'Currency') },
    },
  },
  '/api/currencies/{id}': {
    get: {
      tags: ['Finanzas - Monedas'],
      summary: 'Obtener moneda por ID',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Detalle de moneda', 'Currency') },
    },
    put: {
      tags: ['Finanzas - Monedas'],
      summary: 'Actualizar moneda',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: {
        required: true,
        content: jsonContent('UpdateCurrencyDTO'),
      },
      responses: { 200: okResponse('Moneda actualizada', 'Currency') },
    },
    delete: {
      tags: ['Finanzas - Monedas'],
      summary: 'Eliminar moneda',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Moneda eliminada') },
    },
  },
  '/api/currencies/{id}/base': {
    patch: {
      tags: ['Finanzas - Monedas'],
      summary: 'Establecer esta moneda como moneda base del sistema',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Moneda base establecida') },
    },
  },

  '/api/exchange-rates': {
    get: {
      tags: ['Finanzas - Tasas de Cambio'],
      summary: 'Listar historial de tasas de cambio',
      security: [{ bearerAuth: [] }],
      parameters: paginationQueries,
      responses: { 200: okResponse('Lista de tasas de cambio') },
    },
    post: {
      tags: ['Finanzas - Tasas de Cambio'],
      summary: 'Registrar nueva tasa de cambio',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: jsonContent('CreateExchangeRateDTO'),
      },
      responses: {
        201: createdResponse('Tasa de cambio registrada', 'ExchangeRate'),
      },
    },
  },
  '/api/exchange-rates/current': {
    get: {
      tags: ['Finanzas - Tasas de Cambio'],
      summary: 'Obtener la tasa de cambio vigente entre dos monedas',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'sourceCurrencyId',
          in: 'query',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
        {
          name: 'targetCurrencyId',
          in: 'query',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: { 200: okResponse('Tasa de cambio vigente', 'ExchangeRate') },
    },
  },

  '/api/payment-methods': {
    get: {
      tags: ['Finanzas - Métodos de Pago'],
      summary: 'Listar métodos de pago admitidos',
      security: [{ bearerAuth: [] }],
      parameters: paginationQueries,
      responses: { 200: okResponse('Lista de métodos de pago') },
    },
    post: {
      tags: ['Finanzas - Métodos de Pago'],
      summary: 'Crear método de pago',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: jsonContent('CreatePaymentMethodDTO'),
      },
      responses: {
        201: createdResponse('Método de pago creado', 'PaymentMethod'),
      },
    },
  },
  '/api/payment-methods/{id}': {
    get: {
      tags: ['Finanzas - Métodos de Pago'],
      summary: 'Obtener método de pago por ID',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: {
        200: okResponse('Detalle de método de pago', 'PaymentMethod'),
      },
    },
    put: {
      tags: ['Finanzas - Métodos de Pago'],
      summary: 'Actualizar método de pago',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: {
        required: true,
        content: jsonContent('UpdatePaymentMethodDTO'),
      },
      responses: { 200: okResponse('Método actualizado', 'PaymentMethod') },
    },
    delete: {
      tags: ['Finanzas - Métodos de Pago'],
      summary: 'Eliminar método de pago',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Método eliminado') },
    },
  },

  '/api/financial-accounts': {
    get: {
      tags: ['Finanzas - Cuentas Bancarias y Cajas'],
      summary: 'Listar cuentas bancarias, cajas chicas y billeteras digitales',
      security: [{ bearerAuth: [] }],
      parameters: paginationQueries,
      responses: {
        200: okResponse('Lista de cuentas financieras con saldos actuales'),
      },
    },
    post: {
      tags: ['Finanzas - Cuentas Bancarias y Cajas'],
      summary: 'Crear cuenta financiera o caja',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: jsonContent('CreateFinancialAccountDTO'),
      },
      responses: { 201: createdResponse('Cuenta creada', 'FinancialAccount') },
    },
  },
  '/api/financial-accounts/{id}': {
    get: {
      tags: ['Finanzas - Cuentas Bancarias y Cajas'],
      summary: 'Obtener cuenta financiera por ID',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: {
        200: okResponse('Detalle de cuenta financiera', 'FinancialAccount'),
      },
    },
  },
  '/api/financial-accounts/{id}/adjust-balance': {
    post: {
      tags: ['Finanzas - Cuentas Bancarias y Cajas'],
      summary: 'Ajustar saldo o registrar depósito/retiro manual en cuenta',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: { required: true, content: jsonContent('AdjustBalanceDTO') },
      responses: { 200: okResponse('Saldo ajustado exitosamente') },
    },
  },

  '/api/payment-transactions': {
    get: {
      tags: ['Finanzas - Transacciones'],
      summary: 'Listar transacciones financieras de cobro y pago',
      security: [{ bearerAuth: [] }],
      parameters: paginationQueries,
      responses: { 200: okResponse('Lista de transacciones') },
    },
  },
  '/api/payment-transactions/{id}/void': {
    post: {
      tags: ['Finanzas - Transacciones'],
      summary: 'Anular transacción de pago y revertir impacto en saldo',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Transacción anulada') },
    },
  },

  // ==========================================
  // COMPRAS Y CUENTAS POR PAGAR
  // ==========================================
  '/api/purchases': {
    get: {
      tags: ['Compras - Proveedores'],
      summary: 'Listar órdenes de compra',
      security: [{ bearerAuth: [] }],
      parameters: paginationQueries,
      responses: { 200: okResponse('Lista de compras') },
    },
    post: {
      tags: ['Compras - Proveedores'],
      summary: 'Crear orden de compra a proveedor',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: jsonContent('CreatePurchaseDTO'),
      },
      responses: { 201: createdResponse('Compra creada', 'Purchase') },
    },
  },
  '/api/purchases/{id}': {
    get: {
      tags: ['Compras - Proveedores'],
      summary: 'Obtener detalle de compra y líneas de producto',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Detalle de compra', 'Purchase') },
    },
  },
  '/api/purchases/{id}/receive': {
    post: {
      tags: ['Compras - Proveedores'],
      summary: 'Recibir mercancía de la compra, incrementando stock y Kardex',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: {
        200: okResponse('Mercancía recibida e inventario actualizado'),
      },
    },
  },
  '/api/purchases/{id}/cancel': {
    post: {
      tags: ['Compras - Proveedores'],
      summary: 'Cancelar orden de compra pendiente',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Compra cancelada') },
    },
  },

  // ==========================================
  // SERVICIOS Y STREAMING
  // ==========================================
  '/api/service-types': {
    get: {
      tags: ['Servicios - Tipos de Servicio'],
      summary: 'Listar clasificaciones de servicio (video, música, licencias)',
      security: [{ bearerAuth: [] }],
      responses: { 200: okResponse('Lista de tipos de servicio') },
    },
    post: {
      tags: ['Servicios - Tipos de Servicio'],
      summary: 'Crear tipo de servicio',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: jsonContent('CreateServiceTypeDTO'),
      },
      responses: { 201: createdResponse('Tipo creado', 'ServiceType') },
    },
  },
  '/api/services': {
    get: {
      tags: ['Servicios - Catálogo de Servicios'],
      summary: 'Listar servicios comercializados (Netflix, Spotify, etc.)',
      security: [{ bearerAuth: [] }],
      parameters: paginationQueries,
      responses: { 200: okResponse('Lista de servicios') },
    },
    post: {
      tags: ['Servicios - Catálogo de Servicios'],
      summary: 'Registrar nuevo servicio',
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: jsonContent('CreateServiceDTO') },
      responses: { 201: createdResponse('Servicio registrado', 'Service') },
    },
  },
  '/api/services/{id}': {
    get: {
      tags: ['Servicios - Catálogo de Servicios'],
      summary: 'Obtener detalle de servicio',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Detalle del servicio', 'Service') },
    },
  },

  '/api/streaming-accounts': {
    get: {
      tags: ['Servicios - Cuentas Maestras de Streaming'],
      summary: 'Listar cuentas maestras de streaming y estado de pantallas',
      security: [{ bearerAuth: [] }],
      parameters: paginationQueries,
      responses: { 200: okResponse('Lista de cuentas con perfiles') },
    },
    post: {
      tags: ['Servicios - Cuentas Maestras de Streaming'],
      summary:
        'Crear cuenta maestra (genera automáticamente sus perfiles según maxScreens)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: jsonContent('CreateStreamingAccountDTO'),
      },
      responses: {
        201: createdResponse('Cuenta y perfiles creados', 'StreamingAccount'),
      },
    },
  },
  '/api/streaming-accounts/stats': {
    get: {
      tags: ['Servicios - Cuentas Maestras de Streaming'],
      summary:
        'Métricas consolidadas del parque de streaming (pantallas libres vs ocupadas)',
      security: [{ bearerAuth: [] }],
      responses: { 200: okResponse('Métricas del parque de streaming') },
    },
  },
  '/api/streaming-accounts/{id}': {
    get: {
      tags: ['Servicios - Cuentas Maestras de Streaming'],
      summary: 'Obtener cuenta de streaming por ID con sus perfiles',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Detalle de cuenta', 'StreamingAccount') },
    },
  },
  '/api/streaming-accounts/{id}/profiles': {
    get: {
      tags: ['Servicios - Cuentas Maestras de Streaming'],
      summary: 'Listar los perfiles/pantallas de una cuenta maestra',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Perfiles de la cuenta') },
    },
  },

  '/api/streaming-profiles/{id}': {
    get: {
      tags: ['Servicios - Perfiles de Streaming'],
      summary: 'Obtener perfil por ID',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Detalle del perfil', 'StreamingProfile') },
    },
    put: {
      tags: ['Servicios - Perfiles de Streaming'],
      summary: 'Actualizar perfil (nombre, PIN, ocupación)',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: {
        required: true,
        content: jsonContent('UpdateStreamingProfileDTO'),
      },
      responses: { 200: okResponse('Perfil actualizado', 'StreamingProfile') },
    },
  },
  '/api/streaming-profiles/{id}/toggle-occupied': {
    patch: {
      tags: ['Servicios - Perfiles de Streaming'],
      summary: 'Alternar estado ocupado/disponible de una pantalla',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Estado de perfil actualizado') },
    },
  },

  // ==========================================
  // CLIENTES Y SUSCRIPCIONES
  // ==========================================
  '/api/customers': {
    get: {
      tags: ['Clientes'],
      summary:
        'Listar clientes con filtros y búsqueda por cédula/teléfono/correo',
      security: [{ bearerAuth: [] }],
      parameters: paginationQueries,
      responses: { 200: okResponse('Lista de clientes') },
    },
    post: {
      tags: ['Clientes'],
      summary: 'Registrar nuevo cliente',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: jsonContent('CreateCustomerDTO'),
      },
      responses: { 201: createdResponse('Cliente registrado', 'Customer') },
    },
  },
  '/api/customers/{id}': {
    get: {
      tags: ['Clientes'],
      summary: 'Obtener cliente por ID',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Detalle del cliente', 'Customer') },
    },
    put: {
      tags: ['Clientes'],
      summary: 'Actualizar cliente',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: {
        required: true,
        content: jsonContent('CreateCustomerDTO'),
      },
      responses: { 200: okResponse('Cliente actualizado', 'Customer') },
    },
    delete: {
      tags: ['Clientes'],
      summary: 'Eliminar cliente',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Cliente eliminado') },
    },
  },

  '/api/subscriptions': {
    get: {
      tags: ['Suscripciones de Clientes'],
      summary: 'Listar suscripciones de clientes con vencimientos y estados',
      security: [{ bearerAuth: [] }],
      parameters: paginationQueries,
      responses: { 200: okResponse('Lista de suscripciones') },
    },
    post: {
      tags: ['Suscripciones de Clientes'],
      summary: 'Crear suscripción de cliente a un servicio/perfil',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: jsonContent('CreateSubscriptionDTO'),
      },
      responses: { 201: createdResponse('Suscripción creada', 'Subscription') },
    },
  },
  '/api/subscriptions/stats': {
    get: {
      tags: ['Suscripciones de Clientes'],
      summary: 'Métricas de suscripciones (MRR, activas, por vencer, vencidas)',
      security: [{ bearerAuth: [] }],
      responses: { 200: okResponse('Estadísticas y MRR de suscripciones') },
    },
  },
  '/api/subscriptions/{id}': {
    get: {
      tags: ['Suscripciones de Clientes'],
      summary: 'Obtener suscripción por ID',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Detalle de suscripción', 'Subscription') },
    },
  },
  '/api/subscriptions/{id}/renew': {
    post: {
      tags: ['Suscripciones de Clientes'],
      summary: 'Renovar suscripción de cliente por N días',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: {
        required: true,
        content: jsonContent('RenewSubscriptionDTO'),
      },
      responses: { 200: okResponse('Suscripción renovada') },
    },
  },

  // ==========================================
  // VENTAS, FACTURACIÓN Y COBROS
  // ==========================================
  '/api/sales': {
    get: {
      tags: ['Ventas & Facturación'],
      summary:
        'Listar ventas emitidas con paginación y filtros de estatus/fecha',
      security: [{ bearerAuth: [] }],
      parameters: paginationQueries,
      responses: { 200: okResponse('Lista de ventas con totales e ítems') },
    },
    post: {
      tags: ['Ventas & Facturación'],
      summary:
        'Emitir venta híbrida (productos físicos + servicios) con descuento de Kardex y registro de cobro',
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: jsonContent('CreateSaleDTO') },
      responses: { 201: createdResponse('Venta completada', 'Sale') },
    },
  },
  '/api/sales/stats': {
    get: {
      tags: ['Ventas & Facturación'],
      summary:
        'Consultar métricas consolidadas de ventas (facturado, cobrado, pendiente)',
      security: [{ bearerAuth: [] }],
      responses: {
        200: okResponse('Métricas consolidadas de ventas', 'SaleStats'),
      },
    },
  },
  '/api/sales/{id}': {
    get: {
      tags: ['Ventas & Facturación'],
      summary:
        'Obtener detalle completo de venta con ítems, Kardex y transacciones de cobro',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: { 200: okResponse('Detalle de venta', 'Sale') },
    },
  },
  '/api/sales/{id}/payments': {
    post: {
      tags: ['Ventas & Facturación'],
      summary: 'Añadir abono o pago a una venta con saldo pendiente',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: {
        required: true,
        content: jsonContent('AddSalePaymentDTO'),
      },
      responses: { 200: okResponse('Pago registrado') },
    },
  },
  '/api/sales/{id}/void': {
    post: {
      tags: ['Ventas & Facturación'],
      summary:
        'Anular venta: restituye stock en Kardex y devuelve fondos de cuenta financiera',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: { required: true, content: jsonContent('VoidSaleDTO') },
      responses: { 200: okResponse('Venta anulada y reversión completada') },
    },
  },
};
