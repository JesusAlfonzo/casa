import { prisma } from '#config/prisma.js';

export interface SystemSettingsPayload {
  // 3. Streaming & WhatsApp
  streaming_whatsapp_template?: string;
  streaming_days_alert_cutoff?: number;
  streaming_grace_period_days?: number;
  streaming_auto_notifications?: boolean;

  // 4. Finanzas & Monedas
  finance_bcv_auto_sync?: boolean;
  finance_exchange_margin_percent?: number;
  finance_default_cash_account_id?: string;
  finance_cash_alert_limit_usd?: number;
  finance_cash_alert_limit_ves?: number;

  // 5. Inventario & Almacenes
  inventory_global_min_stock_alert?: number;
  inventory_default_profit_margin?: number;
  inventory_default_location_id?: string;
  inventory_allow_zero_stock_sales?: boolean;

  // 6. Sistema & Seguridad
  system_session_timeout_minutes?: number;
  system_system_name?: string;
  system_business_phone?: string;
  system_enable_audit_logs?: boolean;
}

const DEFAULT_SETTINGS: SystemSettingsPayload = {
  // 3. Streaming
  streaming_whatsapp_template:
    'Hola {cliente}, aquí tienes los accesos a tu cuenta de {servicio}:\n\n📧 Correo: {email}\n🔑 Clave: {password}\n👤 Perfil: {perfil}\n🔒 PIN: {pin}\n📅 Vence el: {fecha_corte}\n\n¡Gracias por tu compra!',
  streaming_days_alert_cutoff: 5,
  streaming_grace_period_days: 2,
  streaming_auto_notifications: true,

  // 4. Finanzas
  finance_bcv_auto_sync: true,
  finance_exchange_margin_percent: 0,
  finance_default_cash_account_id: '',
  finance_cash_alert_limit_usd: 500,
  finance_cash_alert_limit_ves: 25000,

  // 5. Inventario
  inventory_global_min_stock_alert: 5,
  inventory_default_profit_margin: 30,
  inventory_default_location_id: '',
  inventory_allow_zero_stock_sales: false,

  // 6. Sistema
  system_session_timeout_minutes: 60,
  system_system_name: 'CASA ERP',
  system_business_phone: '',
  system_enable_audit_logs: true,
};

function determineCategory(key: string): string {
  if (key.startsWith('streaming_')) return 'STREAMING';
  if (key.startsWith('finance_')) return 'FINANCE';
  if (key.startsWith('inventory_')) return 'INVENTORY';
  return 'SYSTEM';
}

export class SettingService {
  /**
   * Obtener todas las configuraciones combinadas con sus valores predeterminados.
   */
  async getAllSettings(): Promise<SystemSettingsPayload> {
    try {
      const rows = await prisma.$queryRawUnsafe<
        Array<{ key: string; value: string; category: string }>
      >('SELECT key, value, category FROM system_settings');

      const settingsMap: Record<string, any> = { ...DEFAULT_SETTINGS };

      for (const row of rows) {
        try {
          settingsMap[row.key] = JSON.parse(row.value);
        } catch {
          settingsMap[row.key] = row.value;
        }
      }

      return settingsMap as SystemSettingsPayload;
    } catch (error) {
      console.warn('Advertencia al consultar configuraciones de BD:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Guardar o actualizar múltiples configuraciones.
   */
  async updateSettings(
    payload: Partial<SystemSettingsPayload>
  ): Promise<SystemSettingsPayload> {
    const entries = Object.entries(payload);

    for (const [key, value] of entries) {
      if (value === undefined) continue;
      const category = determineCategory(key);
      const valStr = JSON.stringify(value);

      await prisma.$executeRawUnsafe(
        `INSERT INTO system_settings (id, key, value, category, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, category = $3, "updatedAt" = NOW()`,
        key,
        valStr,
        category
      );
    }

    return this.getAllSettings();
  }

  /**
   * Generar respaldo estructurado de datos esenciales del sistema.
   */
  async generateSystemBackup(): Promise<any> {
    const [
      customers,
      products,
      services,
      streamingAccounts,
      currencies,
      locations,
      financialAccounts,
    ] = await Promise.all([
      prisma.customer.findMany({ take: 1000 }),
      prisma.product.findMany({ take: 1000 }),
      prisma.service.findMany({ take: 500 }),
      prisma.streamingAccount.findMany({ take: 500 }),
      prisma.currency.findMany(),
      prisma.location.findMany(),
      prisma.financialAccount.findMany(),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      system: 'CASA ERP',
      version: '1.0.0',
      data: {
        customersCount: customers.length,
        productsCount: products.length,
        servicesCount: services.length,
        streamingAccountsCount: streamingAccounts.length,
        currencies,
        locations,
        financialAccounts,
        customers,
        products,
        services,
        streamingAccounts,
      },
    };
  }
}

export const settingService = new SettingService();
