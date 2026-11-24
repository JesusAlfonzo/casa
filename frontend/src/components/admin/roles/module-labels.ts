const MODULE_LABELS: Record<string, string> = {
  SALES: "Ventas",
  INVENTORY: "Inventario",
  PURCHASES: "Compras",
  STREAMING: "Streaming",
  CATALOG: "Productos y Catálogo",
  CUSTOMERS: "Clientes y Suscripciones",
  FINANCE: "Dinero y Cuentas",
  SYSTEM: "Usuarios y Sistema",
};

export function getModuleLabel(moduleKey: string): string {
  const normalized = moduleKey.toUpperCase().trim();
  if (MODULE_LABELS[normalized]) {
    return MODULE_LABELS[normalized];
  }
  return moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1).toLowerCase();
}
