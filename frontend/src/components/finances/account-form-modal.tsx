"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  type FinancialAccount,
  type FinancialAccountType,
  type CreateFinancialAccountDTO,
  type UpdateFinancialAccountDTO,
  type Currency,
  type PaymentMethod,
} from "@/types/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Landmark, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AccountFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: FinancialAccount | null;
  onSuccess?: () => void;
}

const ACCOUNT_TYPES: { label: string; value: FinancialAccountType }[] = [
  { label: "Banco Nacional", value: "DOMESTIC_BANK" },
  { label: "Banco Internacional", value: "INTERNATIONAL_BANK" },
  { label: "Billetera Digital (Zelle, Binance, PayPal)", value: "DIGITAL_WALLET" },
  { label: "Caja de Efectivo / Caja Chica", value: "CASH_REGISTER" },
];

export function AccountFormModal({
  open,
  onOpenChange,
  account,
  onSuccess,
}: AccountFormModalProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(account?.id);

  // Cargar monedas
  const { data: currenciesData } = useQuery({
    queryKey: ["currencies-active"],
    queryFn: async () => {
      const res = await api.get<{ data: Currency[] } | Currency[]>("/currencies");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray((res as { data: Currency[] }).data)) {
        return (res as { data: Currency[] }).data;
      }
      return [];
    },
    enabled: open,
  });

  // Cargar métodos de pago
  const { data: methodsData } = useQuery({
    queryKey: ["payment-methods-all"],
    queryFn: async () => {
      const res = await api.get<{ data: PaymentMethod[] } | PaymentMethod[]>("/payment-methods");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray((res as { data: PaymentMethod[] }).data)) {
        return (res as { data: PaymentMethod[] }).data;
      }
      return [];
    },
    enabled: open,
  });

  const currencies = Array.isArray(currenciesData) ? currenciesData : [];
  const paymentMethods = Array.isArray(methodsData) ? methodsData : [];

  // State synchronization pattern for React 19
  const [prevAccount, setPrevAccount] = useState<FinancialAccount | null | undefined>(account);
  const [name, setName] = useState(account?.name || "");
  const [type, setType] = useState<FinancialAccountType>(account?.type || "DOMESTIC_BANK");
  const [bankName, setBankName] = useState(account?.bankName || "");
  const [accountNumber, setAccountNumber] = useState(account?.accountNumber || "");
  const [holderName, setHolderName] = useState(account?.holderName || "");
  const [identifier, setIdentifier] = useState(account?.identifier || "");
  const [currencyId, setCurrencyId] = useState(account?.currencyId || "");
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [selectedMethods, setSelectedMethods] = useState<string[]>(
    account?.paymentMethods?.filter((pm) => pm.isActive).map((pm) => pm.paymentMethodId) || []
  );
  const [isActive, setIsActive] = useState(account?.isActive ?? true);

  if (account !== prevAccount) {
    setPrevAccount(account);
    if (account) {
      setName(account.name);
      setType(account.type);
      setBankName(account.bankName || "");
      setAccountNumber(account.accountNumber || "");
      setHolderName(account.holderName || "");
      setIdentifier(account.identifier || "");
      setCurrencyId(account.currencyId);
      setIsActive(account.isActive);
      const activeMethodIds = account.paymentMethods
        ?.filter((pm) => pm.isActive)
        .map((pm) => pm.paymentMethodId) || [];
      setSelectedMethods(activeMethodIds);
    } else {
      setName("");
      setType("DOMESTIC_BANK");
      setBankName("");
      setAccountNumber("");
      setHolderName("");
      setIdentifier("");
      setCurrencyId("");
      setInitialBalance(0);
      setIsActive(true);
      setSelectedMethods([]);
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEditing && account) {
        const payload: UpdateFinancialAccountDTO = {
          name,
          type,
          bankName: bankName.trim() || null,
          accountNumber: accountNumber.trim() || null,
          holderName: holderName.trim() || null,
          identifier: identifier.trim() || null,
          paymentMethodIds: selectedMethods,
          isActive,
        };
        return api.put(`/financial-accounts/${account.id}`, payload);
      } else {
        const effectiveCurrencyId =
          currencyId || currencies.find((c) => c.isBase)?.id || currencies[0]?.id;

        const payload: CreateFinancialAccountDTO = {
          name,
          type,
          bankName: bankName.trim() || null,
          accountNumber: accountNumber.trim() || null,
          holderName: holderName.trim() || null,
          identifier: identifier.trim() || null,
          currencyId: effectiveCurrencyId,
          initialBalance: Number(initialBalance) || 0,
          paymentMethodIds: selectedMethods,
          isActive,
        };
        return api.post("/financial-accounts", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-accounts"] });
      toast.success(
        isEditing
          ? "Cuenta financiera actualizada correctamente"
          : "Cuenta financiera creada exitosamente"
      );
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Error al procesar la cuenta financiera");
    },
  });

  const toggleMethod = (methodId: string) => {
    setSelectedMethods((prev) =>
      prev.includes(methodId)
        ? prev.filter((id) => id !== methodId)
        : [...prev, methodId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("El nombre de la cuenta es requerido");
      return;
    }
    const effectiveCurrencyId =
      currencyId || currencies.find((c) => c.isBase)?.id || currencies[0]?.id;

    if (!effectiveCurrencyId && !isEditing) {
      toast.error("Debe seleccionar una moneda para la cuenta");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-primary/10 text-primary">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                {isEditing ? "Editar Cuenta Financiera" : "Nueva Cuenta / Caja"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isEditing
                  ? "Actualiza los datos y métodos de pago permitidos para esta cuenta."
                  : "Registra una cuenta bancaria, billetera digital o caja de efectivo para procesar cobros y pagos."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Nombre y Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-name" className="text-xs font-semibold">
                Nombre de la Cuenta <span className="text-destructive">*</span>
              </Label>
              <Input
                id="acc-name"
                placeholder="ej: Banesco Corriente / Zelle Principal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="acc-type" className="text-xs font-semibold">
                Tipo de Cuenta <span className="text-destructive">*</span>
              </Label>
              <select
                id="acc-type"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={type}
                onChange={(e) => setType(e.target.value as FinancialAccountType)}
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Moneda y Saldo Inicial (solo al crear) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-currency" className="text-xs font-semibold">
                Moneda <span className="text-destructive">*</span>
              </Label>
              {isEditing ? (
                <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs font-mono text-muted-foreground">
                  {account?.currency?.name} ({account?.currency?.symbol}) - No modificable
                </div>
              ) : (
                <select
                  id="acc-currency"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  value={currencyId || currencies.find((c) => c.isBase)?.id || ""}
                  onChange={(e) => setCurrencyId(e.target.value)}
                  required
                >
                  <option value="">Seleccione una moneda</option>
                  {currencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code} - {c.symbol}) {c.isBase ? "★ Base" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {!isEditing && (
              <div className="space-y-1.5">
                <Label htmlFor="acc-initial-balance" className="text-xs font-semibold">
                  Saldo Inicial
                </Label>
                <Input
                  id="acc-initial-balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={initialBalance || ""}
                  onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 0)}
                  className="text-xs font-mono"
                />
              </div>
            )}
          </div>

          {/* Banco y Número de cuenta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-bank" className="text-xs font-semibold">
                Banco / Plataforma (Opcional)
              </Label>
              <Input
                id="acc-bank"
                placeholder="ej: Banesco, Mercantil, Binance"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="acc-number" className="text-xs font-semibold">
                Número de Cuenta / Identificador / Email
              </Label>
              <Input
                id="acc-number"
                placeholder="ej: 0134-XXXX... o correo@zelle.com"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
          </div>

          {/* Titular y Cédula/RIF */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-holder" className="text-xs font-semibold">
                Nombre del Titular
              </Label>
              <Input
                id="acc-holder"
                placeholder="ej: Empresa C.A. / Juan Pérez"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="acc-id" className="text-xs font-semibold">
                Cédula / RIF / Identificador Fiscal
              </Label>
              <Input
                id="acc-id"
                placeholder="ej: J-12345678-0"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Métodos de Pago Asociados */}
          <div className="space-y-2 pt-1 border-t border-border">
            <Label className="text-xs font-semibold">
              Métodos de Pago Habilitados para esta Cuenta
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Selecciona qué formas de pago registradas en el POS o Compras pueden liquidarse en esta cuenta.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {paymentMethods.map((pm) => {
                const isSelected = selectedMethods.includes(pm.id);
                return (
                  <button
                    type="button"
                    key={pm.id}
                    onClick={() => toggleMethod(pm.id)}
                    className={`flex items-center gap-2 p-2 rounded-md border text-left text-xs transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border bg-background hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <div
                      className={`h-3 w-3 rounded-full border ${
                        isSelected
                          ? "bg-primary border-primary"
                          : "border-muted-foreground"
                      }`}
                    />
                    <span className="truncate">{pm.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Estado Activo */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="acc-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <Label htmlFor="acc-active" className="text-xs cursor-pointer">
              Cuenta habilitada para operaciones comerciales
            </Label>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="gap-2">
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "Guardar Cambios" : "Crear Cuenta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
