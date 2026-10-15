-- CreateEnum
CREATE TYPE "EstadoCompra" AS ENUM ('BORRADOR', 'PENDIENTE', 'PARCIALMENTE_PAGADA', 'PAGADA', 'RECIBIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoSalida" AS ENUM ('VENTA', 'CONSUMO_INTERNO', 'MERMA', 'AJUSTE_SALIDA');

-- CreateEnum
CREATE TYPE "EstadoVenta" AS ENUM ('COTIZACION', 'PENDIENTE_PAGO', 'PARCIALMENTE_PAGADA', 'COMPLETADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "TipoItemVenta" AS ENUM ('PRODUCTO', 'SERVICIO', 'SUSCRIPCION');

-- CreateEnum
CREATE TYPE "TipoMovimientoInventario" AS ENUM ('ENTRADA_COMPRA', 'SALIDA_VENTA', 'SALIDA_MERMA', 'TRANSFERENCIA_ENTRADA', 'TRANSFERENCIA_SALIDA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'DEVOLUCION_CLIENTE', 'DEVOLUCION_PROVEEDOR');

-- CreateEnum
CREATE TYPE "TipoFlujoPago" AS ENUM ('INGRESO', 'EGRESO');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'VERIFICADO', 'RECHAZADO', 'REEMBOLSADO');

-- CreateEnum
CREATE TYPE "EstadoCuentaStreaming" AS ENUM ('DISPONIBLE', 'COMPLETA', 'VENCIDA', 'CAIDA_SOPORTE', 'SUSPENDIDA');

-- CreateEnum
CREATE TYPE "EstadoSuscripcion" AS ENUM ('ACTIVA', 'POR_VENCER', 'VENCIDA', 'SUSPENDIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoCuentaFinanciera" AS ENUM ('BANCO_NACIONAL', 'BANCO_INTERNACIONAL', 'BILLETERA_DIGITAL', 'EFECTIVO_CAJA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "passwordHash" TEXT NOT NULL,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcceso" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "esSistema" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permisos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_roles" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "rolId" TEXT NOT NULL,
    "asignadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rol_permisos" (
    "id" TEXT NOT NULL,
    "rolId" TEXT NOT NULL,
    "permisoId" TEXT NOT NULL,
    "asignadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rol_permisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_permisos" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "permisoId" TEXT NOT NULL,
    "concedido" BOOLEAN NOT NULL DEFAULT true,
    "asignadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_permisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monedas" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "simbolo" TEXT NOT NULL,
    "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "decimales" INTEGER NOT NULL DEFAULT 2,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monedas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasas_cambio" (
    "id" TEXT NOT NULL,
    "monedaOrigenId" TEXT NOT NULL,
    "monedaDestinoId" TEXT NOT NULL,
    "tasa" DECIMAL(18,6) NOT NULL,
    "fuente" TEXT,
    "fechaVigencia" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3),
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasas_cambio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metodos_pago" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "requiereReferencia" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metodos_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuentas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoCuentaFinanciera" NOT NULL DEFAULT 'BANCO_NACIONAL',
    "bancoEntidad" TEXT,
    "numeroCuenta" TEXT,
    "titular" TEXT,
    "identificador" TEXT,
    "monedaId" TEXT NOT NULL,
    "saldoActual" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuentas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuenta_metodos_pago" (
    "id" TEXT NOT NULL,
    "cuentaId" TEXT NOT NULL,
    "metodoPagoId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cuenta_metodos_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transacciones_pago" (
    "id" TEXT NOT NULL,
    "tipoFlujo" "TipoFlujoPago" NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'VERIFICADO',
    "compraId" TEXT,
    "ventaId" TEXT,
    "cuentaId" TEXT NOT NULL,
    "metodoPagoId" TEXT NOT NULL,
    "monedaId" TEXT NOT NULL,
    "tasaCambioId" TEXT,
    "usuarioId" TEXT,
    "monto" DECIMAL(18,2) NOT NULL,
    "montoMonedaBase" DECIMAL(18,2) NOT NULL,
    "referencia" TEXT,
    "comprobanteUrl" TEXT,
    "notas" TEXT,
    "fechaPago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transacciones_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades_medida" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "abreviatura" TEXT NOT NULL,
    "permiteDecimales" BOOLEAN NOT NULL DEFAULT false,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unidades_medida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marcas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "logoUrl" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marcas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoriaPadreId" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "codigoBarras" TEXT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "unidadMedidaId" TEXT NOT NULL,
    "marcaId" TEXT,
    "categoriaId" TEXT NOT NULL,
    "costoPromedio" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "precioVentaBase" DECIMAL(18,2) NOT NULL,
    "precioMayorista" DECIMAL(18,2),
    "stockMinimoAlerta" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "imagenUrl" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "nombreComercial" TEXT,
    "identificacionFiscal" TEXT,
    "nombreContacto" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedor_productos" (
    "id" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "skuProveedor" TEXT,
    "ultimoCosto" DECIMAL(18,4),
    "esProveedorPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proveedor_productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ubicaciones" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "direccion" TEXT,
    "ubicacionPadreId" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ubicaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventario" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "ubicacionId" TEXT NOT NULL,
    "cantidadActual" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "cantidadReservada" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "ubicacionEspecifica" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_inventario" (
    "id" TEXT NOT NULL,
    "inventarioId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "tipoMovimiento" "TipoMovimientoInventario" NOT NULL,
    "cantidad" DECIMAL(18,3) NOT NULL,
    "stockAnterior" DECIMAL(18,3) NOT NULL,
    "stockResultante" DECIMAL(18,3) NOT NULL,
    "costoUnitario" DECIMAL(18,4),
    "detalleCompraId" TEXT,
    "detalleVentaId" TEXT,
    "usuarioId" TEXT,
    "motivo" TEXT,
    "fechaMovimiento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compras" (
    "id" TEXT NOT NULL,
    "numeroOrden" TEXT NOT NULL,
    "numeroFacturaProv" TEXT,
    "proveedorId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "monedaId" TEXT NOT NULL,
    "tasaCambioId" TEXT,
    "tasaCambioValor" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "estado" "EstadoCompra" NOT NULL DEFAULT 'PENDIENTE',
    "subtotal" DECIMAL(18,2) NOT NULL,
    "impuestos" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "descuento" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL,
    "totalPagado" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "fechaCompra" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" TIMESTAMP(3),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalles_compra" (
    "id" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,
    "productoId" TEXT,
    "servicioId" TEXT,
    "ubicacionDestinoId" TEXT,
    "descripcion" TEXT,
    "cantidad" DECIMAL(18,3) NOT NULL,
    "cantidadRecibida" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "costoUnitario" DECIMAL(18,4) NOT NULL,
    "impuestoPorcentaje" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "descuento" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "detalles_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipo_servicios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipo_servicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicios" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipoServicioId" TEXT NOT NULL,
    "precioBase" DECIMAL(18,2) NOT NULL,
    "duracionDiasPorDefecto" INTEGER DEFAULT 30,
    "requiereCuentaStreaming" BOOLEAN NOT NULL DEFAULT false,
    "esVentaCuentaCompleta" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuenta_streaming" (
    "id" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "proveedorId" TEXT,
    "compraId" TEXT,
    "emailAcceso" TEXT NOT NULL,
    "passwordAcceso" TEXT NOT NULL,
    "pinSeguridadCuenta" TEXT,
    "capacidadPerfiles" INTEGER NOT NULL DEFAULT 1,
    "perfilesOcupados" INTEGER NOT NULL DEFAULT 0,
    "costoCuenta" DECIMAL(18,2),
    "fechaInicioProveedor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCorteProveedor" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoCuentaStreaming" NOT NULL DEFAULT 'DISPONIBLE',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuenta_streaming_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfiles_streaming" (
    "id" TEXT NOT NULL,
    "cuentaStreamingId" TEXT NOT NULL,
    "numeroSlot" INTEGER NOT NULL,
    "nombrePerfil" TEXT,
    "pinPerfil" TEXT,
    "ocupado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfiles_streaming_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT,
    "documentoId" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suscripciones" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "cuentaStreamingId" TEXT,
    "perfilStreamingId" TEXT,
    "precioAcordado" DECIMAL(18,2) NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "renovacionAuto" BOOLEAN NOT NULL DEFAULT true,
    "estado" "EstadoSuscripcion" NOT NULL DEFAULT 'ACTIVA',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salidas_ventas" (
    "id" TEXT NOT NULL,
    "numeroDocumento" TEXT NOT NULL,
    "tipoSalida" "TipoSalida" NOT NULL DEFAULT 'VENTA',
    "estado" "EstadoVenta" NOT NULL DEFAULT 'COMPLETADA',
    "clienteId" TEXT,
    "usuarioId" TEXT,
    "monedaId" TEXT NOT NULL,
    "tasaCambioId" TEXT,
    "tasaCambioValor" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "impuestos" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "descuento" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL,
    "totalCobrado" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "fechaSalida" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salidas_ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalles_venta" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "tipoItem" "TipoItemVenta" NOT NULL,
    "inventarioId" TEXT,
    "productoId" TEXT,
    "servicioId" TEXT,
    "suscripcionId" TEXT,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(18,3) NOT NULL DEFAULT 1,
    "precioUnitario" DECIMAL(18,2) NOT NULL,
    "costoUnitarioHist" DECIMAL(18,4),
    "descuento" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "impuestoPorcentaje" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "detalles_venta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_key" ON "roles"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "permisos_codigo_key" ON "permisos"("codigo");

-- CreateIndex
CREATE INDEX "permisos_modulo_idx" ON "permisos"("modulo");

-- CreateIndex
CREATE INDEX "usuario_roles_rolId_idx" ON "usuario_roles"("rolId");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_roles_usuarioId_rolId_key" ON "usuario_roles"("usuarioId", "rolId");

-- CreateIndex
CREATE INDEX "rol_permisos_permisoId_idx" ON "rol_permisos"("permisoId");

-- CreateIndex
CREATE UNIQUE INDEX "rol_permisos_rolId_permisoId_key" ON "rol_permisos"("rolId", "permisoId");

-- CreateIndex
CREATE INDEX "usuario_permisos_permisoId_idx" ON "usuario_permisos"("permisoId");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_permisos_usuarioId_permisoId_key" ON "usuario_permisos"("usuarioId", "permisoId");

-- CreateIndex
CREATE UNIQUE INDEX "monedas_codigo_key" ON "monedas"("codigo");

-- CreateIndex
CREATE INDEX "tasas_cambio_monedaOrigenId_monedaDestinoId_activa_idx" ON "tasas_cambio"("monedaOrigenId", "monedaDestinoId", "activa");

-- CreateIndex
CREATE INDEX "tasas_cambio_fechaVigencia_idx" ON "tasas_cambio"("fechaVigencia");

-- CreateIndex
CREATE UNIQUE INDEX "metodos_pago_nombre_key" ON "metodos_pago"("nombre");

-- CreateIndex
CREATE INDEX "cuentas_monedaId_idx" ON "cuentas"("monedaId");

-- CreateIndex
CREATE UNIQUE INDEX "cuenta_metodos_pago_cuentaId_metodoPagoId_key" ON "cuenta_metodos_pago"("cuentaId", "metodoPagoId");

-- CreateIndex
CREATE INDEX "transacciones_pago_compraId_idx" ON "transacciones_pago"("compraId");

-- CreateIndex
CREATE INDEX "transacciones_pago_ventaId_idx" ON "transacciones_pago"("ventaId");

-- CreateIndex
CREATE INDEX "transacciones_pago_cuentaId_idx" ON "transacciones_pago"("cuentaId");

-- CreateIndex
CREATE INDEX "transacciones_pago_fechaPago_idx" ON "transacciones_pago"("fechaPago");

-- CreateIndex
CREATE UNIQUE INDEX "unidades_medida_nombre_key" ON "unidades_medida"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "unidades_medida_abreviatura_key" ON "unidades_medida"("abreviatura");

-- CreateIndex
CREATE UNIQUE INDEX "marcas_nombre_key" ON "marcas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_slug_key" ON "categorias"("slug");

-- CreateIndex
CREATE INDEX "categorias_categoriaPadreId_idx" ON "categorias"("categoriaPadreId");

-- CreateIndex
CREATE UNIQUE INDEX "productos_sku_key" ON "productos"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "productos_codigoBarras_key" ON "productos"("codigoBarras");

-- CreateIndex
CREATE INDEX "productos_nombre_idx" ON "productos"("nombre");

-- CreateIndex
CREATE INDEX "productos_categoriaId_idx" ON "productos"("categoriaId");

-- CreateIndex
CREATE INDEX "productos_marcaId_idx" ON "productos"("marcaId");

-- CreateIndex
CREATE UNIQUE INDEX "proveedores_identificacionFiscal_key" ON "proveedores"("identificacionFiscal");

-- CreateIndex
CREATE INDEX "proveedor_productos_productoId_idx" ON "proveedor_productos"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "proveedor_productos_proveedorId_productoId_key" ON "proveedor_productos"("proveedorId", "productoId");

-- CreateIndex
CREATE UNIQUE INDEX "ubicaciones_codigo_key" ON "ubicaciones"("codigo");

-- CreateIndex
CREATE INDEX "inventario_ubicacionId_idx" ON "inventario"("ubicacionId");

-- CreateIndex
CREATE UNIQUE INDEX "inventario_productoId_ubicacionId_key" ON "inventario"("productoId", "ubicacionId");

-- CreateIndex
CREATE INDEX "movimientos_inventario_inventarioId_fechaMovimiento_idx" ON "movimientos_inventario"("inventarioId", "fechaMovimiento");

-- CreateIndex
CREATE INDEX "movimientos_inventario_productoId_idx" ON "movimientos_inventario"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "compras_numeroOrden_key" ON "compras"("numeroOrden");

-- CreateIndex
CREATE INDEX "compras_proveedorId_idx" ON "compras"("proveedorId");

-- CreateIndex
CREATE INDEX "compras_fechaCompra_idx" ON "compras"("fechaCompra");

-- CreateIndex
CREATE INDEX "compras_estado_idx" ON "compras"("estado");

-- CreateIndex
CREATE INDEX "detalles_compra_compraId_idx" ON "detalles_compra"("compraId");

-- CreateIndex
CREATE INDEX "detalles_compra_productoId_idx" ON "detalles_compra"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_servicios_nombre_key" ON "tipo_servicios"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "servicios_codigo_key" ON "servicios"("codigo");

-- CreateIndex
CREATE INDEX "servicios_tipoServicioId_idx" ON "servicios"("tipoServicioId");

-- CreateIndex
CREATE INDEX "cuenta_streaming_servicioId_estado_idx" ON "cuenta_streaming"("servicioId", "estado");

-- CreateIndex
CREATE INDEX "cuenta_streaming_fechaCorteProveedor_idx" ON "cuenta_streaming"("fechaCorteProveedor");

-- CreateIndex
CREATE UNIQUE INDEX "perfiles_streaming_cuentaStreamingId_numeroSlot_key" ON "perfiles_streaming"("cuentaStreamingId", "numeroSlot");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_documentoId_key" ON "clientes"("documentoId");

-- CreateIndex
CREATE INDEX "clientes_telefono_idx" ON "clientes"("telefono");

-- CreateIndex
CREATE INDEX "clientes_nombre_idx" ON "clientes"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "suscripciones_codigo_key" ON "suscripciones"("codigo");

-- CreateIndex
CREATE INDEX "suscripciones_clienteId_idx" ON "suscripciones"("clienteId");

-- CreateIndex
CREATE INDEX "suscripciones_estado_fechaVencimiento_idx" ON "suscripciones"("estado", "fechaVencimiento");

-- CreateIndex
CREATE INDEX "suscripciones_cuentaStreamingId_idx" ON "suscripciones"("cuentaStreamingId");

-- CreateIndex
CREATE UNIQUE INDEX "salidas_ventas_numeroDocumento_key" ON "salidas_ventas"("numeroDocumento");

-- CreateIndex
CREATE INDEX "salidas_ventas_clienteId_idx" ON "salidas_ventas"("clienteId");

-- CreateIndex
CREATE INDEX "salidas_ventas_fechaSalida_idx" ON "salidas_ventas"("fechaSalida");

-- CreateIndex
CREATE INDEX "salidas_ventas_estado_idx" ON "salidas_ventas"("estado");

-- CreateIndex
CREATE INDEX "detalles_venta_ventaId_idx" ON "detalles_venta"("ventaId");

-- CreateIndex
CREATE INDEX "detalles_venta_productoId_idx" ON "detalles_venta"("productoId");

-- CreateIndex
CREATE INDEX "detalles_venta_servicioId_idx" ON "detalles_venta"("servicioId");

-- CreateIndex
CREATE INDEX "detalles_venta_suscripcionId_idx" ON "detalles_venta"("suscripcionId");

-- AddForeignKey
ALTER TABLE "usuario_roles" ADD CONSTRAINT "usuario_roles_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_roles" ADD CONSTRAINT "usuario_roles_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_permisos" ADD CONSTRAINT "rol_permisos_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_permisos" ADD CONSTRAINT "rol_permisos_permisoId_fkey" FOREIGN KEY ("permisoId") REFERENCES "permisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_permisos" ADD CONSTRAINT "usuario_permisos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_permisos" ADD CONSTRAINT "usuario_permisos_permisoId_fkey" FOREIGN KEY ("permisoId") REFERENCES "permisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasas_cambio" ADD CONSTRAINT "tasas_cambio_monedaOrigenId_fkey" FOREIGN KEY ("monedaOrigenId") REFERENCES "monedas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasas_cambio" ADD CONSTRAINT "tasas_cambio_monedaDestinoId_fkey" FOREIGN KEY ("monedaDestinoId") REFERENCES "monedas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas" ADD CONSTRAINT "cuentas_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "monedas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuenta_metodos_pago" ADD CONSTRAINT "cuenta_metodos_pago_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "cuentas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuenta_metodos_pago" ADD CONSTRAINT "cuenta_metodos_pago_metodoPagoId_fkey" FOREIGN KEY ("metodoPagoId") REFERENCES "metodos_pago"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacciones_pago" ADD CONSTRAINT "transacciones_pago_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacciones_pago" ADD CONSTRAINT "transacciones_pago_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "salidas_ventas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacciones_pago" ADD CONSTRAINT "transacciones_pago_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "cuentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacciones_pago" ADD CONSTRAINT "transacciones_pago_metodoPagoId_fkey" FOREIGN KEY ("metodoPagoId") REFERENCES "metodos_pago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacciones_pago" ADD CONSTRAINT "transacciones_pago_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "monedas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacciones_pago" ADD CONSTRAINT "transacciones_pago_tasaCambioId_fkey" FOREIGN KEY ("tasaCambioId") REFERENCES "tasas_cambio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacciones_pago" ADD CONSTRAINT "transacciones_pago_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_categoriaPadreId_fkey" FOREIGN KEY ("categoriaPadreId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_unidadMedidaId_fkey" FOREIGN KEY ("unidadMedidaId") REFERENCES "unidades_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "marcas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor_productos" ADD CONSTRAINT "proveedor_productos_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor_productos" ADD CONSTRAINT "proveedor_productos_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ubicaciones" ADD CONSTRAINT "ubicaciones_ubicacionPadreId_fkey" FOREIGN KEY ("ubicacionPadreId") REFERENCES "ubicaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario" ADD CONSTRAINT "inventario_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario" ADD CONSTRAINT "inventario_ubicacionId_fkey" FOREIGN KEY ("ubicacionId") REFERENCES "ubicaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "inventario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_detalleCompraId_fkey" FOREIGN KEY ("detalleCompraId") REFERENCES "detalles_compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_detalleVentaId_fkey" FOREIGN KEY ("detalleVentaId") REFERENCES "detalles_venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "monedas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_tasaCambioId_fkey" FOREIGN KEY ("tasaCambioId") REFERENCES "tasas_cambio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_compra" ADD CONSTRAINT "detalles_compra_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_compra" ADD CONSTRAINT "detalles_compra_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_compra" ADD CONSTRAINT "detalles_compra_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_compra" ADD CONSTRAINT "detalles_compra_ubicacionDestinoId_fkey" FOREIGN KEY ("ubicacionDestinoId") REFERENCES "ubicaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_tipoServicioId_fkey" FOREIGN KEY ("tipoServicioId") REFERENCES "tipo_servicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuenta_streaming" ADD CONSTRAINT "cuenta_streaming_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuenta_streaming" ADD CONSTRAINT "cuenta_streaming_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuenta_streaming" ADD CONSTRAINT "cuenta_streaming_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfiles_streaming" ADD CONSTRAINT "perfiles_streaming_cuentaStreamingId_fkey" FOREIGN KEY ("cuentaStreamingId") REFERENCES "cuenta_streaming"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_cuentaStreamingId_fkey" FOREIGN KEY ("cuentaStreamingId") REFERENCES "cuenta_streaming"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_perfilStreamingId_fkey" FOREIGN KEY ("perfilStreamingId") REFERENCES "perfiles_streaming"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salidas_ventas" ADD CONSTRAINT "salidas_ventas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salidas_ventas" ADD CONSTRAINT "salidas_ventas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salidas_ventas" ADD CONSTRAINT "salidas_ventas_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "monedas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salidas_ventas" ADD CONSTRAINT "salidas_ventas_tasaCambioId_fkey" FOREIGN KEY ("tasaCambioId") REFERENCES "tasas_cambio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_venta" ADD CONSTRAINT "detalles_venta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "salidas_ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_venta" ADD CONSTRAINT "detalles_venta_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "inventario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_venta" ADD CONSTRAINT "detalles_venta_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_venta" ADD CONSTRAINT "detalles_venta_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_venta" ADD CONSTRAINT "detalles_venta_suscripcionId_fkey" FOREIGN KEY ("suscripcionId") REFERENCES "suscripciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
