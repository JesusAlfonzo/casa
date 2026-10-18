import { PrismaClient, Prisma } from '@prisma/client';
import { auth } from '../src/utils/auth.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando sembrado integral del ERP Híbrido...\n');

  // ============================================================================
  // 1. ROLES Y PERMISOS DEL SISTEMA (RBAC)
  // ============================================================================
  console.log('📌 1. Sembrando Roles y Permisos RBAC...');

  const roles = [
    {
      name: 'ADMIN',
      description: 'Administrador con acceso total a todos los módulos',
      isSystem: true,
    },
    {
      name: 'SELLER',
      description: 'Vendedor con acceso a ventas, clientes y catálogo',
      isSystem: true,
    },
    {
      name: 'WAREHOUSE',
      description: 'Encargado de almacén, compras, stock e inventario',
      isSystem: true,
    },
    {
      name: 'SUPPORT',
      description: 'Atención al cliente y soporte de cuentas de streaming',
      isSystem: true,
    },
  ];

  for (const roleData of roles) {
    await prisma.role.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description, isSystem: roleData.isSystem },
      create: roleData,
    });
  }

  const permissions = [
    // Ventas
    { code: 'sales.view', name: 'Ver Ventas', module: 'SALES', description: 'Consultar historial y detalle de ventas' },
    { code: 'sales.create', name: 'Crear Ventas', module: 'SALES', description: 'Emitir comprobantes de venta y cobro' },
    { code: 'sales.void', name: 'Anular Ventas', module: 'SALES', description: 'Reversar ventas y reintegrar stock' },
    { code: 'sales.payments', name: 'Registrar Cobros', module: 'SALES', description: 'Abonar pagos a ventas pendientes' },
    // Inventario y Almacenes
    { code: 'inventory.view', name: 'Ver Inventario', module: 'INVENTORY', description: 'Consultar existencias y almacenes' },
    { code: 'inventory.edit', name: 'Modificar Inventario', module: 'INVENTORY', description: 'Ajustes manuales y transferencias' },
    { code: 'inventory.kardex', name: 'Auditar Kardex', module: 'INVENTORY', description: 'Ver libro de movimientos de stock' },
    // Compras
    { code: 'purchases.view', name: 'Ver Compras', module: 'PURCHASES', description: 'Consultar órdenes de compra' },
    { code: 'purchases.create', name: 'Crear Compras', module: 'PURCHASES', description: 'Registrar compras a proveedores' },
    { code: 'purchases.receive', name: 'Recepción de Mercancía', module: 'PURCHASES', description: 'Ingresar stock de compras a almacén' },
    // Streaming y Servicios
    { code: 'streaming.view', name: 'Ver Cuentas Streaming', module: 'STREAMING', description: 'Consultar parque de cuentas' },
    { code: 'streaming.manage', name: 'Gestionar Cuentas Streaming', module: 'STREAMING', description: 'Crear y editar cuentas maestras' },
    { code: 'streaming.credentials', name: 'Ver Credenciales Maestras', module: 'STREAMING', description: 'Acceso a correos y contraseñas' },
    // Catálogo
    { code: 'products.view', name: 'Ver Productos', module: 'CATALOG', description: 'Ver catálogo de productos y precios' },
    { code: 'products.manage', name: 'Gestionar Productos', module: 'CATALOG', description: 'Crear y editar productos' },
    { code: 'brands.manage', name: 'Gestionar Marcas', module: 'CATALOG', description: 'CRUD de marcas' },
    { code: 'categories.manage', name: 'Gestionar Categorías', module: 'CATALOG', description: 'CRUD de categorías' },
    // Clientes y Suscripciones
    { code: 'customers.view', name: 'Ver Clientes', module: 'CUSTOMERS', description: 'Consultar base de clientes' },
    { code: 'customers.manage', name: 'Gestionar Clientes', module: 'CUSTOMERS', description: 'Crear y editar clientes' },
    { code: 'subscriptions.manage', name: 'Gestionar Suscripciones', module: 'CUSTOMERS', description: 'Altas y renovaciones de suscripción' },
    // Finanzas
    { code: 'finance.view', name: 'Ver Finanzas', module: 'FINANCE', description: 'Consultar saldos y transacciones' },
    { code: 'finance.manage', name: 'Gestionar Tesorería', module: 'FINANCE', description: 'Administrar cuentas y tasas de cambio' },
    // Sistema
    { code: 'users.manage', name: 'Gestionar Usuarios', module: 'SYSTEM', description: 'Administrar empleados y acceso' },
    { code: 'roles.manage', name: 'Gestionar Roles', module: 'SYSTEM', description: 'Configurar permisos de roles' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name, module: perm.module, description: perm.description },
      create: perm,
    });
  }

  // Asignar todos los permisos al rol ADMIN
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'ADMIN' } });
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      create: { roleId: adminRole.id, permissionId: perm.id },
      update: {},
    });
  }

  // ============================================================================
  // 2. USUARIO ADMINISTRADOR PREDETERMINADO
  // ============================================================================
  console.log('📌 2. Sembrando Usuario Administrador...');
  const adminEmail = 'admin@erphibrido.com';
  let adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!adminUser) {
    try {
      await auth.api.signUpEmail({
        body: {
          email: adminEmail,
          password: 'AdminPassword123!',
          name: 'Administrador',
          lastName: 'General',
          username: 'admin',
          phone: '+584120000000',
        },
      });
      adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    } catch (e) {
      console.log('   ⚠️ Nota: El usuario admin se configurará directamente en BD');
      adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          name: 'Administrador',
          lastName: 'General',
          username: 'admin',
          phone: '+584120000000',
          isActive: true,
          emailVerified: true,
        },
      });
    }
  }

  if (adminUser) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
      create: { userId: adminUser.id, roleId: adminRole.id },
      update: {},
    });
  }

  // ============================================================================
  // 3. MONEDAS Y TASAS DE CAMBIO
  // ============================================================================
  console.log('📌 3. Sembrando Monedas y Tasas de Cambio...');

  const usdCurrency = await prisma.currency.upsert({
    where: { code: 'USD' },
    update: { isBase: true, isActive: true },
    create: {
      code: 'USD',
      name: 'Dólar Estadounidense',
      symbol: '$',
      isBase: true,
      decimals: 2,
      isActive: true,
    },
  });

  const vesCurrency = await prisma.currency.upsert({
    where: { code: 'VES' },
    update: { isBase: false, isActive: true },
    create: {
      code: 'VES',
      name: 'Bolívar Venezolano',
      symbol: 'Bs.',
      isBase: false,
      decimals: 2,
      isActive: true,
    },
  });

  const usdtCurrency = await prisma.currency.upsert({
    where: { code: 'USDT' },
    update: { isBase: false, isActive: true },
    create: {
      code: 'USDT',
      name: 'Tether USD',
      symbol: '₮',
      isBase: false,
      decimals: 2,
      isActive: true,
    },
  });

  // Tasa de cambio USD -> VES
  const existingRate = await prisma.exchangeRate.findFirst({
    where: {
      sourceCurrencyId: usdCurrency.id,
      targetCurrencyId: vesCurrency.id,
      isActive: true,
    },
  });

  if (!existingRate) {
    await prisma.exchangeRate.create({
      data: {
        sourceCurrencyId: usdCurrency.id,
        targetCurrencyId: vesCurrency.id,
        rate: new Prisma.Decimal(45.5),
        source: 'BCV Oficial',
        isActive: true,
      },
    });
  }

  // ============================================================================
  // 4. MÉTODOS DE PAGO Y CUENTAS FINANCIERAS
  // ============================================================================
  console.log('📌 4. Sembrando Métodos de Pago y Cuentas Financieras...');

  const pmCash = await prisma.paymentMethod.upsert({
    where: { name: 'Efectivo USD' },
    update: {},
    create: { name: 'Efectivo USD', requiresReference: false, isActive: true },
  });

  const pmPagoMovil = await prisma.paymentMethod.upsert({
    where: { name: 'Pago Móvil' },
    update: {},
    create: { name: 'Pago Móvil', requiresReference: true, isActive: true },
  });

  const pmZelle = await prisma.paymentMethod.upsert({
    where: { name: 'Zelle' },
    update: {},
    create: { name: 'Zelle', requiresReference: true, isActive: true },
  });

  const pmTransfer = await prisma.paymentMethod.upsert({
    where: { name: 'Transferencia Bancaria' },
    update: {},
    create: { name: 'Transferencia Bancaria', requiresReference: true, isActive: true },
  });

  const pmBinance = await prisma.paymentMethod.upsert({
    where: { name: 'Binance Pay (USDT)' },
    update: {},
    create: { name: 'Binance Pay (USDT)', requiresReference: true, isActive: true },
  });

  // Cuentas financieras
  let pettyCash = await prisma.financialAccount.findFirst({
    where: { name: 'Caja Principal USD' },
  });
  if (!pettyCash) {
    pettyCash = await prisma.financialAccount.create({
      data: {
        name: 'Caja Principal USD',
        type: 'CASH_REGISTER',
        currencyId: usdCurrency.id,
        currentBalance: new Prisma.Decimal(500.0),
        isActive: true,
        paymentMethods: {
          create: [{ paymentMethodId: pmCash.id }],
        },
      },
    });
  }

  let bankAccount = await prisma.financialAccount.findFirst({
    where: { name: 'Banesco Corriente VES' },
  });
  if (!bankAccount) {
    bankAccount = await prisma.financialAccount.create({
      data: {
        name: 'Banesco Corriente VES',
        type: 'DOMESTIC_BANK',
        bankName: 'Banesco Banco Universal',
        accountNumber: '0134-0000-00-0000000000',
        holderName: 'Inversiones Hybrid ERP C.A.',
        identifier: 'J-501928374',
        currencyId: vesCurrency.id,
        currentBalance: new Prisma.Decimal(15000.0),
        isActive: true,
        paymentMethods: {
          create: [
            { paymentMethodId: pmPagoMovil.id },
            { paymentMethodId: pmTransfer.id },
          ],
        },
      },
    });
  }

  let zelleAccount = await prisma.financialAccount.findFirst({
    where: { name: 'Zelle Corporativo' },
  });
  if (!zelleAccount) {
    zelleAccount = await prisma.financialAccount.create({
      data: {
        name: 'Zelle Corporativo',
        type: 'DIGITAL_WALLET',
        holderName: 'Hybrid ERP Services LLC',
        identifier: 'pagos@erphibrido.com',
        currencyId: usdCurrency.id,
        currentBalance: new Prisma.Decimal(2500.0),
        isActive: true,
        paymentMethods: {
          create: [{ paymentMethodId: pmZelle.id }],
        },
      },
    });
  }

  // ============================================================================
  // 5. UBICACIONES Y ALMACENES
  // ============================================================================
  console.log('📌 5. Sembrando Ubicaciones de Almacén...');

  let mainBranch = await prisma.location.findFirst({ where: { name: 'Sede Principal' } });
  if (!mainBranch) {
    mainBranch = await prisma.location.create({
      data: {
        name: 'Sede Principal',
        code: 'SEDE-01',
        address: 'Av. Libertador, Edif. Torre Centro, Piso 1',
        isActive: true,
      },
    });
  }

  let warehouse = await prisma.location.findFirst({ where: { name: 'Almacén Central' } });
  if (!warehouse) {
    warehouse = await prisma.location.create({
      data: {
        name: 'Almacén Central',
        code: 'ALM-CENTRAL',
        address: 'Nivel Sótano, Área de Depósito A-1',
        parentLocationId: mainBranch.id,
        isActive: true,
      },
    });
  }

  let storeFloor = await prisma.location.findFirst({ where: { name: 'Piso de Venta / Mostrador' } });
  if (!storeFloor) {
    storeFloor = await prisma.location.create({
      data: {
        name: 'Piso de Venta / Mostrador',
        code: 'TIENDA-01',
        address: 'Planta Baja Mostrador Principal',
        parentLocationId: mainBranch.id,
        isActive: true,
      },
    });
  }

  // ============================================================================
  // 6. UNIDADES DE MEDIDA, MARCAS Y CATEGORÍAS
  // ============================================================================
  console.log('📌 6. Sembrando Catálogo Base (Unidades, Marcas, Categorías)...');

  const unitPcs = await prisma.measurementUnit.upsert({
    where: { abbreviation: 'UNT' },
    update: {},
    create: { name: 'Unidad', abbreviation: 'UNT', allowsDecimals: false, isActive: true },
  });

  const unitKg = await prisma.measurementUnit.upsert({
    where: { abbreviation: 'KG' },
    update: {},
    create: { name: 'Kilogramo', abbreviation: 'KG', allowsDecimals: true, isActive: true },
  });

  const unitBox = await prisma.measurementUnit.upsert({
    where: { abbreviation: 'CAJ' },
    update: {},
    create: { name: 'Caja', abbreviation: 'CAJ', allowsDecimals: false, isActive: true },
  });

  // Marcas
  const brandXiaomi = await prisma.brand.upsert({
    where: { name: 'Xiaomi' },
    update: {},
    create: { name: 'Xiaomi', description: 'Tecnología y accesorios inteligentes', isActive: true },
  });

  const brandAnker = await prisma.brand.upsert({
    where: { name: 'Anker' },
    update: {},
    create: { name: 'Anker', description: 'Cargadores, baterías y cables certificados', isActive: true },
  });

  const brandApple = await prisma.brand.upsert({
    where: { name: 'Apple' },
    update: {},
    create: { name: 'Apple', description: 'Dispositivos y accesorios premium', isActive: true },
  });

  // Categorías
  const catAudio = await prisma.category.upsert({
    where: { slug: 'audio-y-sonido' },
    update: {},
    create: {
      name: 'Audio y Sonido',
      slug: 'audio-y-sonido',
      description: 'Audífonos bluetooth, cornetas y micrófonos',
      isActive: true,
    },
  });

  const catCables = await prisma.category.upsert({
    where: { slug: 'carga-y-conectividad' },
    update: {},
    create: {
      name: 'Carga y Conectividad',
      slug: 'carga-y-conectividad',
      description: 'Cables, cargadores rápidos y adaptadores',
      isActive: true,
    },
  });

  // ============================================================================
  // 7. PROVEEDORES
  // ============================================================================
  console.log('📌 7. Sembrando Proveedores...');

  const supplierTech = await prisma.supplier.upsert({
    where: { taxId: 'J-401928374' },
    update: {},
    create: {
      legalName: 'Distribuidora Tech Global C.A.',
      tradeName: 'Tech Global',
      taxId: 'J-401928374',
      contactName: 'Alejandro Bastidas',
      email: 'ventas@techglobal.com',
      phone: '+584141112233',
      address: 'Zona Industrial Boleíta Norte, Galpón 4',
      isActive: true,
    },
  });

  const supplierStreaming = await prisma.supplier.upsert({
    where: { taxId: 'V-19827364' },
    update: {},
    create: {
      legalName: 'Proveedor Digital Streaming Latam',
      tradeName: 'Streaming Latam',
      taxId: 'V-19827364',
      contactName: 'Gabriel Mendoza',
      email: 'cuentas@streaminglatam.net',
      phone: '+584249998877',
      address: 'Servicios Digitales Online',
      isActive: true,
    },
  });

  // ============================================================================
  // 8. PRODUCTOS FÍSICOS E INVENTARIO INICIAL
  // ============================================================================
  console.log('📌 8. Sembrando Productos Físicos e Inventario...');

  const productBuds = await prisma.product.upsert({
    where: { sku: 'PRD-XIAOMI-BUDS4' },
    update: {},
    create: {
      sku: 'PRD-XIAOMI-BUDS4',
      barcode: '6934177789012',
      name: 'Audífonos Xiaomi Redmi Buds 4 Active',
      description: 'Audífonos inalámbricos Bluetooth 5.3 con cancelación de ruido ambiental',
      measurementUnitId: unitPcs.id,
      brandId: brandXiaomi.id,
      categoryId: catAudio.id,
      averageCost: new Prisma.Decimal(14.5),
      baseSalePrice: new Prisma.Decimal(24.99),
      wholesalePrice: new Prisma.Decimal(20.0),
      minStockAlert: new Prisma.Decimal(5),
      isActive: true,
    },
  });

  const productAnker = await prisma.product.upsert({
    where: { sku: 'PRD-ANKER-20W' },
    update: {},
    create: {
      sku: 'PRD-ANKER-20W',
      barcode: '7935123456789',
      name: 'Cargador de Pared Anker PowerPort III 20W',
      description: 'Cubo de carga rápida USB-C PowerIQ 3.0 para iPhone y Android',
      measurementUnitId: unitPcs.id,
      brandId: brandAnker.id,
      categoryId: catCables.id,
      averageCost: new Prisma.Decimal(9.0),
      baseSalePrice: new Prisma.Decimal(17.99),
      wholesalePrice: new Prisma.Decimal(14.5),
      minStockAlert: new Prisma.Decimal(8),
      isActive: true,
    },
  });

  // Vincular catálogo proveedor-producto
  await prisma.supplierProduct.upsert({
    where: { supplierId_productId: { supplierId: supplierTech.id, productId: productBuds.id } },
    update: {},
    create: {
      supplierId: supplierTech.id,
      productId: productBuds.id,
      supplierSku: 'TG-XIAOMI-BUDS4',
      lastCost: new Prisma.Decimal(14.5),
      isPrimarySupplier: true,
    },
  });

  await prisma.supplierProduct.upsert({
    where: { supplierId_productId: { supplierId: supplierTech.id, productId: productAnker.id } },
    update: {},
    create: {
      supplierId: supplierTech.id,
      productId: productAnker.id,
      supplierSku: 'TG-ANK-20W-W',
      lastCost: new Prisma.Decimal(9.0),
      isPrimarySupplier: true,
    },
  });

  // Crear stock inicial en Almacén Central si no existe
  const invBuds = await prisma.inventory.upsert({
    where: { productId_locationId: { productId: productBuds.id, locationId: warehouse.id } },
    update: {},
    create: {
      productId: productBuds.id,
      locationId: warehouse.id,
      currentQuantity: new Prisma.Decimal(30),
      reservedQuantity: new Prisma.Decimal(0),
      specificLocation: 'Estante A - Nivel 2',
    },
  });

  const invAnker = await prisma.inventory.upsert({
    where: { productId_locationId: { productId: productAnker.id, locationId: warehouse.id } },
    update: {},
    create: {
      productId: productAnker.id,
      locationId: warehouse.id,
      currentQuantity: new Prisma.Decimal(45),
      reservedQuantity: new Prisma.Decimal(0),
      specificLocation: 'Estante B - Nivel 1',
    },
  });

  // Asentar apertura de inventario en Kardex
  const existingKardex = await prisma.inventoryMovement.findFirst({
    where: { inventoryId: invBuds.id },
  });
  if (!existingKardex) {
    await prisma.inventoryMovement.create({
      data: {
        inventoryId: invBuds.id,
        productId: productBuds.id,
        movementType: 'POSITIVE_ADJUSTMENT',
        quantity: new Prisma.Decimal(30),
        previousStock: new Prisma.Decimal(0),
        resultingStock: new Prisma.Decimal(30),
        unitCost: new Prisma.Decimal(14.5),
        reason: 'Inventario inicial de apertura de sistema',
      },
    });

    await prisma.inventoryMovement.create({
      data: {
        inventoryId: invAnker.id,
        productId: productAnker.id,
        movementType: 'POSITIVE_ADJUSTMENT',
        quantity: new Prisma.Decimal(45),
        previousStock: new Prisma.Decimal(0),
        resultingStock: new Prisma.Decimal(45),
        unitCost: new Prisma.Decimal(9.0),
        reason: 'Inventario inicial de apertura de sistema',
      },
    });
  }

  // ============================================================================
  // 9. SERVICIOS Y CUENTAS DE STREAMING
  // ============================================================================
  console.log('📌 9. Sembrando Servicios y Cuentas de Streaming...');

  const stVideo = await prisma.serviceType.upsert({
    where: { name: 'Streaming de Video' },
    update: {},
    create: {
      name: 'Streaming de Video',
      description: 'Plataformas de series, películas y eventos en vivo',
      isActive: true,
    },
  });

  const stMusic = await prisma.serviceType.upsert({
    where: { name: 'Streaming de Música' },
    update: {},
    create: {
      name: 'Streaming de Música',
      description: 'Plataformas de música y podcasts sin anuncios',
      isActive: true,
    },
  });

  const srvNetflixScreen = await prisma.service.upsert({
    where: { code: 'SRV-NFLX-1S' },
    update: {},
    create: {
      code: 'SRV-NFLX-1S',
      name: 'Netflix 1 Pantalla Ultra HD',
      description: 'Perfil individual en cuenta compartida con PIN privado',
      serviceTypeId: stVideo.id,
      basePrice: new Prisma.Decimal(4.5),
      defaultDurationDays: 30,
      requiresStreamingAccount: true,
      isFullAccountSale: false,
      isActive: true,
    },
  });

  const srvNetflixFull = await prisma.service.upsert({
    where: { code: 'SRV-NFLX-FULL' },
    update: {},
    create: {
      code: 'SRV-NFLX-FULL',
      name: 'Netflix Cuenta Completa (5 Pantallas)',
      description: 'Cuenta maestra completa para uso familiar exclusivo',
      serviceTypeId: stVideo.id,
      basePrice: new Prisma.Decimal(18.0),
      defaultDurationDays: 30,
      requiresStreamingAccount: true,
      isFullAccountSale: true,
      isActive: true,
    },
  });

  const srvSpotify = await prisma.service.upsert({
    where: { code: 'SRV-SPOT-1M' },
    update: {},
    create: {
      code: 'SRV-SPOT-1M',
      name: 'Spotify Premium Individual',
      description: 'Renovación mensual individual de cuenta de música',
      serviceTypeId: stMusic.id,
      basePrice: new Prisma.Decimal(3.0),
      defaultDurationDays: 30,
      requiresStreamingAccount: true,
      isFullAccountSale: false,
      isActive: true,
    },
  });

  // Cuenta maestra de Netflix de prueba
  let netflixAccount = await prisma.streamingAccount.findFirst({
    where: { accessEmail: 'netflix.premium.ve1@gmail.com' },
  });

  if (!netflixAccount) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + 30);

    netflixAccount = await prisma.streamingAccount.create({
      data: {
        serviceId: srvNetflixScreen.id,
        supplierId: supplierStreaming.id,
        accessEmail: 'netflix.premium.ve1@gmail.com',
        accessPassword: 'PasswordSeguro2026!',
        securityPin: '4411',
        profileCapacity: 5,
        occupiedProfiles: 1, // 1 perfil asignado a cliente en el seed
        accountCost: new Prisma.Decimal(10.0),
        supplierStartDate: new Date(),
        supplierCutoffDate: cutoffDate,
        status: 'AVAILABLE',
        notes: 'Cuenta comprada a Proveedor Digital Streaming Latam',
        profiles: {
          create: [
            { slotNumber: 1, profileName: 'Carlos M.', profilePin: '1234', isOccupied: true },
            { slotNumber: 2, profileName: 'Pantalla 2', isOccupied: false },
            { slotNumber: 3, profileName: 'Pantalla 3', isOccupied: false },
            { slotNumber: 4, profileName: 'Pantalla 4', isOccupied: false },
            { slotNumber: 5, profileName: 'Pantalla 5', isOccupied: false },
          ],
        },
      },
    });
  }

  // ============================================================================
  // 10. CLIENTES Y SUSCRIPCIÓN DE PRUEBA
  // ============================================================================
  console.log('📌 10. Sembrando Clientes y Suscripción...');

  const customerCarlos = await prisma.customer.upsert({
    where: { documentId: 'V-18492019' },
    update: {},
    create: {
      name: 'Carlos',
      lastName: 'Mendoza',
      documentId: 'V-18492019',
      phone: '+584121234567',
      email: 'carlos.mendoza@gmail.com',
      address: 'Urb. Los Palos Grandes, Residencias El Ávila, Apto 4-B',
      isActive: true,
    },
  });

  await prisma.customer.upsert({
    where: { documentId: 'V-22910283' },
    update: {},
    create: {
      name: 'Mariana',
      lastName: 'Rivas',
      documentId: 'V-22910283',
      phone: '+584149876543',
      email: 'mariana.rivas@gmail.com',
      address: 'Chacao, Av. Francisco de Miranda',
      isActive: true,
    },
  });

  // Perfil 1 asignado a Carlos
  const profile1 = await prisma.streamingProfile.findFirst({
    where: {
      streamingAccountId: netflixAccount.id,
      slotNumber: 1,
    },
  });

  const subExpiration = new Date();
  subExpiration.setDate(subExpiration.getDate() + 30);

  let subCarlos = await prisma.subscription.findUnique({
    where: { code: 'SUB-202610-DEMO1' },
  });

  if (!subCarlos && profile1) {
    subCarlos = await prisma.subscription.create({
      data: {
        code: 'SUB-202610-DEMO1',
        customerId: customerCarlos.id,
        serviceId: srvNetflixScreen.id,
        streamingAccountId: netflixAccount.id,
        streamingProfileId: profile1.id,
        agreedPrice: new Prisma.Decimal(4.5),
        startDate: new Date(),
        expirationDate: subExpiration,
        autoRenew: true,
        status: 'ACTIVE',
        notes: 'Suscripción inicial demo sembrada',
      },
    });
  }

  // ============================================================================
  // 11. VENTA DE MUESTRA HISTÓRICA CON PAGO
  // ============================================================================
  console.log('📌 11. Sembrando Venta de Muestra con Pago y Kardex...');

  const saleDocNumber = 'VTA-202610-DEMO01';
  const existingSale = await prisma.sale.findUnique({
    where: { documentNumber: saleDocNumber },
  });

  if (!existingSale) {
    // Venta combinada: 1 audífono ($24.99) + 1 suscripción Netflix ($4.50) = $29.49
    const sale = await prisma.sale.create({
      data: {
        documentNumber: saleDocNumber,
        outputType: 'SALE',
        status: 'COMPLETED',
        customerId: customerCarlos.id,
        userId: adminUser?.id || null,
        currencyId: usdCurrency.id,
        exchangeRateValue: new Prisma.Decimal(1),
        subtotal: new Prisma.Decimal(29.49),
        taxAmount: new Prisma.Decimal(0),
        discountAmount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(29.49),
        totalCollected: new Prisma.Decimal(29.49),
        soldAt: new Date(),
        notes: 'Venta inicial de prueba completada con Zelle',
        items: {
          create: [
            {
              itemType: 'PRODUCT',
              productId: productBuds.id,
              inventoryId: invBuds.id,
              description: productBuds.name,
              quantity: new Prisma.Decimal(1),
              unitPrice: new Prisma.Decimal(24.99),
              historicalUnitCost: new Prisma.Decimal(14.5),
              subtotal: new Prisma.Decimal(24.99),
            },
            {
              itemType: 'SUBSCRIPTION',
              serviceId: srvNetflixScreen.id,
              subscriptionId: subCarlos?.id || null,
              description: 'Netflix 1 Pantalla Ultra HD (Suscripción Demo)',
              quantity: new Prisma.Decimal(1),
              unitPrice: new Prisma.Decimal(4.5),
              subtotal: new Prisma.Decimal(4.5),
            },
          ],
        },
        payments: {
          create: [
            {
              flowType: 'INFLOW',
              status: 'VERIFIED',
              financialAccountId: zelleAccount.id,
              paymentMethodId: pmZelle.id,
              currencyId: usdCurrency.id,
              amount: new Prisma.Decimal(29.49),
              baseCurrencyAmount: new Prisma.Decimal(29.49),
              reference: 'ZLL-9823741',
              notes: 'Pago recibido por Zelle',
            },
          ],
        },
      },
    });

    // Descontar 1 unidad del inventario de audífonos y registrar en Kardex
    await prisma.inventory.update({
      where: { id: invBuds.id },
      data: {
        currentQuantity: { decrement: 1 },
      },
    });

    await prisma.inventoryMovement.create({
      data: {
        inventoryId: invBuds.id,
        productId: productBuds.id,
        movementType: 'SALE_OUT',
        quantity: new Prisma.Decimal(1),
        previousStock: new Prisma.Decimal(30),
        resultingStock: new Prisma.Decimal(29),
        unitCost: new Prisma.Decimal(14.5),
        reason: `Venta ${saleDocNumber} a ${customerCarlos.name} ${customerCarlos.lastName}`,
      },
    });

    // Incrementar saldo de la cuenta Zelle
    await prisma.financialAccount.update({
      where: { id: zelleAccount.id },
      data: {
        currentBalance: { increment: 29.49 },
      },
    });
  }

  console.log('\n✅ ¡Sembrado integral completado con éxito!');
  console.log('────────────────────────────────────────────────────────────');
  console.log('👤 Usuario Administrador : admin@erphibrido.com');
  console.log('🔑 Contraseña            : AdminPassword123!');
  console.log('💵 Monedas configuradas  : USD ($), VES (Bs.), USDT (₮)');
  console.log('🏦 Cuentas financieras   : Caja Principal, Banesco, Zelle');
  console.log('📦 Productos en stock    : Xiaomi Buds 4 (29 uds), Anker 20W (45 uds)');
  console.log('📺 Cuenta Streaming Demo : netflix.premium.ve1@gmail.com (5 pantallas)');
  console.log('────────────────────────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el sembrado:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
