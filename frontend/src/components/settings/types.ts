export interface SystemSettingsState {
  // Mensajes de WhatsApp y Membresías
  streaming_payment_reminder_template: string;
  streaming_whatsapp_template: string;
  streaming_days_alert_cutoff: number;
  streaming_auto_notifications: boolean;

  // Dólar y Tasa BCV
  finance_bcv_auto_sync: boolean;

  // Ventas e Inventario
  finance_default_cash_account_id: string;
  inventory_global_min_stock_alert: number;
  inventory_allow_zero_stock_sales: boolean;

  // Datos del Negocio
  system_system_name: string;
  system_business_phone: string;
}

export const DEFAULT_SETTINGS_STATE: SystemSettingsState = {
  streaming_payment_reminder_template:
    "Hola {cliente}, te recordamos que tu membresía de {servicio} vence el {fecha_corte} (monto: {monto}). Avísanos cuando realices el pago para renovarla sin cortes. ¡Gracias!",
  streaming_whatsapp_template:
    "Hola {cliente}, aquí tienes los accesos a tu cuenta de {servicio}:\n\n📧 Correo: {email}\n🔑 Clave: {password}\n👤 Perfil: {perfil}\n🔒 PIN: {pin}\n📅 Vence el: {fecha_corte}\n\n¡Gracias por tu compra!",
  streaming_days_alert_cutoff: 5,
  streaming_auto_notifications: true,

  finance_bcv_auto_sync: true,

  finance_default_cash_account_id: "",
  inventory_global_min_stock_alert: 5,
  inventory_allow_zero_stock_sales: false,

  system_system_name: "Ventas de Casa",
  system_business_phone: "",
};

export interface FinancialAccountOption {
  id: string;
  name: string;
  accountType: string;
  currency?: {
    code: string;
    symbol: string;
  };
}
