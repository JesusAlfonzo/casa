import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando sembrado de roles y permisos base...');

  const roles = [
    {
      name: 'ADMIN',
      description: 'Administrador con acceso total al sistema',
      isSystem: true,
    },
    {
      name: 'SELLER',
      description: 'Vendedor con permisos de ventas, clientes y suscripciones',
      isSystem: true,
    },
    {
      name: 'WAREHOUSE',
      description: 'Encargado de almacén con permisos sobre inventario y compras',
      isSystem: true,
    },
    {
      name: 'SUPPORT',
      description: 'Soporte y atención para cuentas de streaming',
      isSystem: true,
    },
  ];

  for (const roleData of roles) {
    await prisma.role.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description },
      create: roleData,
    });
  }

  const permissions = [
    // Módulo Ventas
    { code: 'sales.create', name: 'Crear Ventas', module: 'SALES' },
    { code: 'sales.view', name: 'Ver Ventas', module: 'SALES' },
    { code: 'sales.void', name: 'Anular Ventas', module: 'SALES' },
    // Módulo Inventario
    { code: 'inventory.view', name: 'Ver Inventario', module: 'INVENTORY' },
    { code: 'inventory.edit', name: 'Modificar Inventario', module: 'INVENTORY' },
    // Módulo Streaming
    { code: 'streaming.view', name: 'Ver Cuentas Streaming', module: 'STREAMING' },
    { code: 'streaming.manage', name: 'Gestionar Cuentas Streaming', module: 'STREAMING' },
    // Módulo Catálogo (Marcas y Categorías)
    { code: 'brands.view', name: 'Ver Marcas', module: 'CATALOG' },
    { code: 'brands.manage', name: 'Gestionar Marcas', module: 'CATALOG' },
    { code: 'categories.view', name: 'Ver Categorías', module: 'CATALOG' },
    { code: 'categories.manage', name: 'Gestionar Categorías', module: 'CATALOG' },
    // Módulo Usuarios y Sistema
    { code: 'users.manage', name: 'Gestionar Usuarios y Roles', module: 'SYSTEM' },
  ];

  for (const permData of permissions) {
    await prisma.permission.upsert({
      where: { code: permData.code },
      update: { name: permData.name, module: permData.module },
      create: permData,
    });
  }

  // Asignar todos los permisos al rol ADMIN
  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  if (adminRole) {
    const allPermissions = await prisma.permission.findMany();
    for (const perm of allPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: perm.id,
          },
        },
        create: {
          roleId: adminRole.id,
          permissionId: perm.id,
        },
        update: {},
      });
    }
  }

  console.log('Sembrado completado exitosamente.');
}

main()
  .catch((e) => {
    console.error('Error durante el sembrado:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
