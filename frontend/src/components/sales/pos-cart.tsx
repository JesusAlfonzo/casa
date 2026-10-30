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

  return (
    <Card className="flex flex-col h-full border-border shadow-xs">
      {/* Customer Header */}
      <CardHeader className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span>Cliente de la Venta:</span>
          </Label>

          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onOpenQuickCustomer}
            className="h-6 text-[11px] gap-1 text-primary hover:text-primary"
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
            className="flex-1 h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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
              className="text-[11px] h-8 px-2"
              title="Volver a Consumidor Final"
            >
              Quitar
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Cart Items List */}
      <CardContent className="flex-1 overflow-y-auto p-3 space-y-2">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-2">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold text-foreground">Carrito vacío</p>
            <p className="text-[11px] text-muted-foreground max-w-[180px] mt-0.5">
              Haz clic en los productos del catálogo o escanea con el lector.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map((item) => (
              <div
                key={item.tempId}
                className="flex items-center justify-between rounded-lg border border-border bg-card/60 p-2.5 text-xs shadow-2xs hover:border-border/80 transition-colors"
              >
                {/* Info */}
                <div className="flex flex-col max-w-[170px] truncate">
                  <span className="font-semibold text-foreground truncate">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span>${item.unitPrice.toFixed(2)} c/u</span>
                    {item.categoryName && (
                      <>
                        <span>•</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          {item.categoryName}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>

                {/* Quantity Controls & Subtotal */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-md border border-input bg-background">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.tempId, -1)}
                      className="px-1.5 py-1 text-muted-foreground hover:text-foreground"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => onSetQuantity(item.tempId, Number(e.target.value) || 1)}
                      className="w-8 text-center text-xs font-semibold bg-transparent focus:outline-none"
                      min={1}
                    />
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.tempId, 1)}
                      className="px-1.5 py-1 text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="text-right min-w-[50px]">
                    <span className="font-bold text-foreground">
                      ${item.subtotal.toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.tempId)}
                    className="text-muted-foreground hover:text-destructive p-1 rounded-md"
                    title="Eliminar artículo"
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
      <CardFooter className="flex flex-col p-3 border-t border-border bg-muted/20 space-y-3">
        {/* Discount & Notes expandable */}
        <div className="w-full grid grid-cols-2 gap-2 text-xs">
          <div className="space-y-1">
            <Label htmlFor="pos-discount" className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Percent className="h-3 w-3" />
              <span>Descuento ($)</span>
            </Label>
            <Input
              id="pos-discount"
              type="number"
              placeholder="0.00"
              value={globalDiscount || ""}
              onChange={(e) => onSetGlobalDiscount(Math.max(0, Number(e.target.value) || 0))}
              className="h-7 text-xs"
              min={0}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="pos-notes" className="text-[11px] text-muted-foreground">
              Nota / Referencia
            </Label>
            <Input
              id="pos-notes"
              placeholder="Opcional..."
              value={notes}
              onChange={(e) => onSetNotes(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
        </div>

        {/* Totals */}
        <div className="w-full space-y-1 text-xs border-t border-border/80 pt-2">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>

          {totalDiscount > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span>Descuento aplicado:</span>
              <span>-${totalDiscount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex items-baseline justify-between pt-1 border-t border-border text-foreground">
            <span className="font-bold text-sm">TOTAL A COBRAR:</span>
            <div className="text-right">
              <div className="text-lg font-black tracking-tight">
                ${grandTotal.toFixed(2)}
              </div>
              {exchangeRate > 1 && (
                <div className="text-[11px] text-muted-foreground font-mono">
                  Bs. {totalBs}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full flex items-center gap-2">
          {cart.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearCart}
              className="text-xs text-muted-foreground hover:text-destructive h-10 px-2.5"
              title="Vaciar carrito"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}

          <Button
            type="button"
            size="lg"
            disabled={cart.length === 0}
            onClick={onCheckout}
            className="flex-1 h-10 gap-2 font-bold shadow-sm"
          >
            <CreditCard className="h-4 w-4" />
            <span>Cobrar (${grandTotal.toFixed(2)})</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
