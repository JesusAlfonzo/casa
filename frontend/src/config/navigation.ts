import {
  LayoutDashboard,
  BarChart3,
  ShoppingCart,
  Users,
  Package,
  Layers,
  Warehouse,
  Building2,
  Truck,
  Tv,
  MonitorPlay,
  CreditCard,
  Landmark,
  Receipt,
  BadgeDollarSign,
  UserCog,
  ShieldCheck,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  module?: string;
  keywords?: string[];
}

export interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

export const navigationConfig: NavGroup[] = [
  {
    groupTitle: "General",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        keywords: ["inicio", "resumen", "kpis", "graficas", "panel"],
      },
      {
        title: "Reportes & Exportación",
        href: "/reports",
        icon: BarChart3,
        keywords: ["reportes", "estadisticas", "excel", "pdf", "auditoria"],
      },
    ],
  },
  {
    groupTitle: "Ventas y Clientes",
    items: [
      {
        title: "Ventas",
        href: "/sales",
        icon: ShoppingCart,
        module: "SALES",
        keywords: ["pos", "caja", "facturas", "cobro", "comprobante", "ticket"],
      },
      {
        title: "Clientes",
        href: "/customers",
        icon: Users,
        module: "CUSTOMERS",
        keywords: ["deudores", "credito", "contacto", "directorio"],
      },
    ],
  },
  {
    groupTitle: "Inventario y Catálogo",
    items: [
      {
        title: "Productos",
        href: "/products",
        icon: Package,
        module: "INVENTORY",
        keywords: ["articulos", "catalogo", "precios", "costos", "items"],
      },
      {
        title: "Categorías y Marcas",
        href: "/categories",
        icon: Layers,
        module: "INVENTORY",
        keywords: ["lineas", "familias", "clasificacion"],
      },
      {
        title: "Almacenes y Stock",
        href: "/inventory",
        icon: Warehouse,
        module: "INVENTORY",
        keywords: ["existencias", "stock", "deposito", "transferencias"],
      },
      {
        title: "Proveedores",
        href: "/suppliers",
        icon: Building2,
        module: "PURCHASES",
        keywords: ["vendedores", "distribuidores", "abastecimiento"],
      },
      {
        title: "Compras a Proveedores",
        href: "/purchases",
        icon: Truck,
        module: "PURCHASES",
        keywords: ["ordenes", "abastecimiento", "adquisicion", "facturas compra"],
      },
    ],
  },
  {
    groupTitle: "Streaming y Servicios",
    items: [
      {
        title: "Cuentas Streaming",
        href: "/streaming",
        icon: Tv,
        module: "STREAMING",
        keywords: ["netflix", "disney", "max", "cuentas", "vencimientos"],
      },
      {
        title: "Pantallas y Perfiles",
        href: "/streaming/profiles",
        icon: MonitorPlay,
        module: "STREAMING",
        keywords: ["perfil", "pin", "pantallas", "asignacion"],
      },
      {
        title: "Suscripciones Clientes",
        href: "/subscriptions",
        icon: CreditCard,
        module: "SUBSCRIPTIONS",
        keywords: ["renovaciones", "planes", "clientes", "cortes"],
      },
    ],
  },
  {
    groupTitle: "Finanzas y Tesorería",
    items: [
      {
        title: "Cuentas y Cajas",
        href: "/finances/accounts",
        icon: Landmark,
        module: "FINANCE",
        keywords: ["bancos", "efectivo", "cajas", "liquidez", "dolares", "bolivares"],
      },
      {
        title: "Pagos y Cobros",
        href: "/finances/transactions",
        icon: Receipt,
        module: "FINANCE",
        keywords: ["movimientos", "transacciones", "ingresos", "egresos", "comprobantes"],
      },
      {
        title: "Tasas de Cambio",
        href: "/finances/exchange-rates",
        icon: BadgeDollarSign,
        module: "FINANCE",
        keywords: ["bcv", "dolar", "tasa", "paralelo", "monedas"],
      },
    ],
  },
  {
    groupTitle: "Administración",
    items: [
      {
        title: "Usuarios",
        href: "/admin/users",
        icon: UserCog,
        module: "USERS",
        keywords: ["usuarios", "empleados", "cuentas", "acceso"],
      },
      {
        title: "Roles y Permisos",
        href: "/admin/roles",
        icon: ShieldCheck,
        module: "RBAC",
        keywords: ["permisos", "seguridad", "rbac", "reglas"],
      },
      {
        title: "Configuración",
        href: "/settings",
        icon: Settings,
        module: "SETTINGS",
        keywords: ["configuracion", "ajustes", "sistema", "whatsapp", "bcv", "parametros"],
      },
    ],
  },
];
