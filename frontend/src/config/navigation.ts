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
      },
      {
        title: "Reportes & Exportación",
        href: "/reports",
        icon: BarChart3,
      },
    ],
  },
  {
    groupTitle: "Ventas y Clientes",
    items: [
      {
        title: "Ventas / POS",
        href: "/sales",
        icon: ShoppingCart,
        module: "SALES",
      },
      {
        title: "Clientes",
        href: "/customers",
        icon: Users,
        module: "CUSTOMERS",
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
      },
      {
        title: "Categorías y Marcas",
        href: "/categories",
        icon: Layers,
        module: "INVENTORY",
      },
      {
        title: "Almacenes y Stock",
        href: "/inventory",
        icon: Warehouse,
        module: "INVENTORY",
      },
      {
        title: "Proveedores",
        href: "/suppliers",
        icon: Building2,
        module: "PURCHASES",
      },
      {
        title: "Compras a Proveedores",
        href: "/purchases",
        icon: Truck,
        module: "PURCHASES",
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
      },
      {
        title: "Pantallas y Perfiles",
        href: "/streaming/profiles",
        icon: MonitorPlay,
        module: "STREAMING",
      },
      {
        title: "Suscripciones Clientes",
        href: "/subscriptions",
        icon: CreditCard,
        module: "SUBSCRIPTIONS",
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
      },
      {
        title: "Pagos y Cobros",
        href: "/finances/transactions",
        icon: Receipt,
        module: "FINANCE",
      },
      {
        title: "Tasas de Cambio",
        href: "/finances/exchange-rates",
        icon: BadgeDollarSign,
        module: "FINANCE",
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
      },
      {
        title: "Roles y Permisos",
        href: "/admin/roles",
        icon: ShieldCheck,
        module: "RBAC",
      },
      {
        title: "Configuración",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
];
