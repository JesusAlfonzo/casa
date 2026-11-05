"use client";

import React from "react";
import { type CartItem, type Customer } from "@/types/pos";
import {
  Trash2,
  Plus,
  Minus,
  User,
  UserPlus,
  CreditCard,
  ShoppingBag,
  Percent,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

interface PosCartProps {
  cart: CartItem[];
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (cust: Customer | null) => void;
  onOpenQuickCustomer: () => void;
  onUpdateQuantity: (tempId: string, delta: number) => void;
  onSetQuantity: (tempId: string, quantity: number) => void;
  onRemoveItem: (tempId: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  globalDiscount: number;
  onSetGlobalDiscount: (discount: number) => void;
  notes: string;
  onSetNotes: (notes: string) => void;
  exchangeRate?: number;
}

export function PosCart({
  cart,
  customers,
  selectedCustomer,
  onSelectCustomer,
  onOpenQuickCustomer,
  onUpdateQuantity,
  onSetQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  globalDiscount,
  onSetGlobalDiscount,
  notes,
  onSetNotes,
  exchangeRate = 1,
}: PosCartProps) {
  const subtotal = cart.reduce((acc, it) => acc + it.subtotal, 0);
  const totalDiscount = globalDiscount + cart.reduce((acc, it) => acc + (it.discountAmount || 0), 0);
  const grandTotal = Math.max(0, subtotal - globalDiscount);
  const totalBs = (grandTotal * exchangeRate).toFixed(2);
  const totalUnits = cart.reduce((acc, it) => acc + it.quantity, 0);

  return (
    <Card className="flex flex-col h-full border border-border/80 shadow-xs rounded-xl overflow-hidden bg-card">
      {/* Customer Header */}
      <CardHeader className="p-3.5 border-b border-border bg-card/60 space-y-2.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
            <User className="h-3.5 w-3.5 text-primary" />
            <span>Cliente de la Venta</span>
          </Label>

          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onOpenQuickCustomer}
            className="h-6 text-[11px] gap-1 text-primary hover:text-primary hover:bg-primary/10 font-semibold"
          >
            <UserPlus className="h-3 w-3" />
            <span>+ Nuevo Cliente</span>
          </Button>
        </div>

        {/* Customer Select / Toggle */}
        <div className="flex items-center gap-2">
          <select
            value={selectedCustomer?.id || ""}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                onSelectCustomer(null);
              } else {
                const found = customers.find((c) => c.id === val);
                onSelectCustomer(found || null);
              }
            }}
            className="flex-1 h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring shadow-2xs font-medium"
          >
            <option value="">👤 Cliente Mostrador (Consumidor Final)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.lastName || ""} {c.documentId ? `(${c.documentId})` : ""}
              </option>
            ))}
          </select>

          {selectedCustomer && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => onSelectCustomer(null)}
              className="text-[11px] h-8 px-2.5 rounded-lg border-border/80"
              title="Volver a Consumidor Final"
            >
              Quitar
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Cart Items List */}
      <CardContent className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-3">
              <ShoppingBag className="h-7 w-7" />
            </div>
            <p className="text-sm font-semibold text-foreground">El carrito está vacío</p>
            <p className="text-xs text-muted-foreground max-w-[200px] mt-1">
              Selecciona productos del catálogo o utiliza el lector de código de barras.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 pb-1 border-b border-border/40">
              <span>{cart.length} ítems ({totalUnits} unidades)</span>
              <button
                type="button"
                onClick={onClearCart}
                className="text-muted-foreground hover:text-destructive transition-colors text-[11px]"
              >
                Limpiar todo
              </button>
            </div>

            {cart.map((item) => (
              <div
                key={item.tempId}
                className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-3 text-xs shadow-2xs hover:border-border transition-colors gap-2"
              >
                {/* Info */}
                <div className="flex flex-col min-w-0 flex-1 pr-1">
                  <span className="font-semibold text-foreground truncate text-xs">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                    <span className="font-mono">${item.unitPrice.toFixed(2)} c/u</span>
                    {item.categoryName && (
                      <>
                        <span>•</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 bg-muted/30 truncate max-w-[100px]">
                          {item.categoryName}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>

                {/* Quantity Controls & Subtotal */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="flex items-center rounded-lg border border-input bg-background shadow-2xs">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.tempId, -1)}
                      className="px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
                      title="Disminuir"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => onSetQuantity(item.tempId, Number(e.target.value) || 1)}
                      className="w-8 text-center text-xs font-bold font-mono bg-transparent focus:outline-none"
                      min={1}
                    />
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.tempId, 1)}
                      className="px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
                      title="Aumentar"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="text-right min-w-[55px]">
                    <span className="font-bold font-mono text-foreground text-xs sm:text-sm">
                      ${item.subtotal.toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.tempId)}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors"
                    title="Eliminar del carrito"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Cart Summary & Checkout Footer */}
      <CardFooter className="flex flex-col p-4 border-t border-border bg-muted/20 space-y-3.5 mt-auto">
        {/* Discount & Notes Inputs */}
        <div className="w-full grid grid-cols-2 gap-2.5 text-xs">
          <div className="space-y-1">
            <Label htmlFor="pos-discount" className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Percent className="h-3 w-3" />
              <span>Descuento ($)</span>
            </Label>
            <Input
              id="pos-discount"
              type="number"
              placeholder="0.00"
              value={globalDiscount || ""}
              onChange={(e) => onSetGlobalDiscount(Math.max(0, Number(e.target.value) || 0))}
              className="h-8 text-xs font-mono rounded-lg"
              min={0}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="pos-notes" className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>Nota / Ref</span>
            </Label>
            <Input
              id="pos-notes"
              placeholder="Opcional..."
              value={notes}
              onChange={(e) => onSetNotes(e.target.value)}
              className="h-8 text-xs rounded-lg"
            />
          </div>
        </div>

        {/* Totals Breakdown */}
        <div className="w-full space-y-1.5 text-xs border-t border-border/80 pt-2.5">
          <div className="flex justify-between text-muted-foreground font-medium">
            <span>Subtotal de ítems:</span>
            <span className="font-mono">${subtotal.toFixed(2)}</span>
          </div>

          {totalDiscount > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
              <span>Descuento aplicado:</span>
              <span className="font-mono">-${totalDiscount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex items-baseline justify-between pt-2 border-t border-border text-foreground">
            <span className="font-bold text-sm tracking-tight">TOTAL A COBRAR:</span>
            <div className="text-right">
              <div className="text-xl font-black font-mono tracking-tight text-foreground">
                ${grandTotal.toFixed(2)}
              </div>
              {exchangeRate > 1 && (
                <div className="text-xs text-muted-foreground font-mono">
                  Bs. {totalBs}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions Button */}
        <div className="w-full flex items-center gap-2 pt-1">
          {cart.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearCart}
              className="text-xs text-muted-foreground hover:text-destructive h-11 px-3 rounded-xl border-border/80"
              title="Vaciar carrito completo"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}

          <Button
            type="button"
            size="lg"
            disabled={cart.length === 0}
            onClick={onCheckout}
            className="flex-1 h-11 gap-2 font-bold text-sm shadow-md rounded-xl transition-all"
          >
            <CreditCard className="h-4 w-4" />
            <span>Cobrar ${grandTotal.toFixed(2)} USD</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
