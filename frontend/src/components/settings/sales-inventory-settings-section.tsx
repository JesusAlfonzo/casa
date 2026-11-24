"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FinancialAccountOption, SystemSettingsState } from "./types";

interface SalesInventorySettingsSectionProps {
  formData: SystemSettingsState;
  accounts: FinancialAccountOption[];
  onChange: <K extends keyof SystemSettingsState>(
    field: K,
    value: SystemSettingsState[K]
  ) => void;
}

export function SalesInventorySettingsSection({
  formData,
  accounts,
  onChange,
}: SalesInventorySettingsSectionProps) {
  const selectedAccount = accounts.find(
    (acc) => acc.id === formData.finance_default_cash_account_id
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Ventas e Inventario
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Reglas sencillas para cobrar más rápido y controlar tu mercancía.
        </p>
      </div>

      <Separator />

      {/* Cuenta por defecto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-md">
          <Label className="text-sm font-medium">
            Cuenta donde entra el dinero normalmente
          </Label>
          <p className="text-sm text-muted-foreground">
            Se selecciona sola cuando registras una venta (siempre puedes
            cambiarla al momento de cobrar).
          </p>
        </div>

        <div className="w-full sm:w-64 shrink-0">
          <Select
            value={formData.finance_default_cash_account_id || "__none__"}
            onValueChange={(val) =>
              onChange(
                "finance_default_cash_account_id",
                !val || val === "__none__" ? "" : val
              )
            }
          >
            <SelectTrigger className="w-full h-10 text-sm">
              <SelectValue>
                {selectedAccount
                  ? `${selectedAccount.name}${
                      selectedAccount.currency?.code
                        ? ` (${selectedAccount.currency.code})`
                        : ""
                    }`
                  : "Elegir cuenta..."}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sin cuenta fija</SelectItem>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name}
                  {acc.currency?.code ? ` (${acc.currency.code})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Aviso de poca mercancía */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-md">
          <Label htmlFor="min-stock" className="text-sm font-medium">
            Aviso de poca mercancía
          </Label>
          <p className="text-sm text-muted-foreground">
            El sistema te avisará cuando de algún producto queden pocas unidades
            disponibles.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Input
            id="min-stock"
            type="number"
            min={1}
            max={100}
            value={formData.inventory_global_min_stock_alert}
            onChange={(e) =>
              onChange(
                "inventory_global_min_stock_alert",
                Math.max(1, Math.min(100, Number(e.target.value) || 1))
              )
            }
            className="w-20 h-10 text-center text-sm font-medium"
          />
          <span className="text-sm text-muted-foreground">unidades</span>
        </div>
      </div>

      <Separator />

      {/* Vender sin existencia */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 max-w-lg">
            <Label
              htmlFor="switch-zero-stock"
              className="text-sm font-medium cursor-pointer"
            >
              Permitir vender aunque el inventario marque 0
            </Label>
            <p className="text-sm text-muted-foreground">
              Útil si a veces vendes algo antes de haber cargado la compra en el
              sistema.
            </p>
          </div>
          <Switch
            id="switch-zero-stock"
            checked={formData.inventory_allow_zero_stock_sales}
            onCheckedChange={(checked) =>
              onChange("inventory_allow_zero_stock_sales", checked)
            }
          />
        </div>

        <p className="text-xs text-muted-foreground rounded-lg bg-muted/40 px-3.5 py-2.5">
          {formData.inventory_allow_zero_stock_sales
            ? "Activado: podrás registrar ventas aunque un producto aparezca en 0 (el conteo quedará en negativo hasta que agregues mercancía)."
            : "Desactivado: no se podrá vender un producto si aparece agotado en el sistema."}
        </p>
      </div>
    </div>
  );
}
