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
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

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
  const totalDiscount =
    globalDiscount +
    cart.reduce((acc, it) => acc + (it.discountAmount || 0), 0);
  const grandTotal = Math.max(0, subtotal - globalDiscount);
  const totalBs = (grandTotal * exchangeRate).toFixed(2);
  const totalUnits = cart.reduce((acc, it) => acc + it.quantity, 0);

  return (
    <Card className="flex flex-col h-full border border-border shadow-2xs rounded-xl overflow-hidden bg-card">
      {/* Cliente */}
      <CardHeader className="p-4 border-b border-border bg-card space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
            <User className="h-4 w-4 text-primary" />
            <span>Cliente</span>
          </Label>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenQuickCustomer}
            className="h-8 px-2.5 text-xs gap-1.5 text-primary hover:text-primary hover:bg-primary/10 font-medium"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Nuevo cliente</span>
          </Button>
        </div>

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
            className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          >
            <option value="">Cliente general</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.lastName || ""}{" "}
                {c.documentId ? `(${c.documentId})` : ""}
              </option>
            ))}
          </select>

          {selectedCustomer && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onSelectCustomer(null)}
              className="text-xs h-10 px-3 rounded-lg"
              title="Cambiar a cliente general"
            >
              Quitar
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Lista de productos en el carrito */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-3">
              <ShoppingBag className="h-7 w-7" />
            </div>
            <p className="text-base font-semibold text-foreground">
              El carrito está vacío
            </p>
            <p className="text-sm text-muted-foreground max-w-[230px] mt-1">
              Toca cualquier producto o servicio de la izquierda para agregarlo.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1 pb-1.5 border-b border-border/50">
              <span>
                {cart.length} {cart.length === 1 ? "producto" : "productos"} (
                {totalUnits} {totalUnits === 1 ? "unidad" : "unidades"})
              </span>
              <button
                type="button"
                onClick={onClearCart}
                className="text-muted-foreground hover:text-destructive transition-colors font-medium"
              >
                Vaciar carrito
              </button>
            </div>

            {cart.map((item) => (
              <div
                key={item.tempId}
                className="rounded-xl border border-border bg-card p-3.5 space-y-3 transition-colors hover:border-foreground/20"
              >
                {/* Fila 1: Nombre completo del producto y botón quitar */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <h4 className="font-semibold text-sm text-foreground leading-snug line-clamp-2">
                      {item.name}
                    </h4>
                    <div className="flex items-center flex-wrap gap-1.5 text-xs text-muted-foreground">
                      <span className="font-mono">
                        ${item.unitPrice.toFixed(2)} c/u
                      </span>
                      {item.categoryName && (
                        <>
                          <span>•</span>
                          <Badge
                            variant="secondary"
                            className="text-xs font-normal px-2 py-0"
                          >
                            {item.categoryName}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.tempId)}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors shrink-0"
                    title="Quitar del carrito"
                    aria-label={`Quitar ${item.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Fila 2: Controles de cantidad a la izquierda y subtotal destacado a la derecha */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/50">
                  <div className="flex items-center rounded-lg border border-input bg-background">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.tempId, -1)}
                      className="px-2.5 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
                      title="Restar 1"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        onSetQuantity(item.tempId, Number(e.target.value) || 1)
                      }
                      className="w-10 text-center text-sm font-semibold font-mono bg-transparent focus:outline-none"
                      min={1}
                    />
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.tempId, 1)}
                      className="px-2.5 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
                      title="Sumar 1"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="font-bold font-mono text-foreground text-base">
                      ${item.subtotal.toFixed(2)}
                    </span>
                    {exchangeRate > 1 && (
                      <span className="block text-xs font-mono text-muted-foreground">
                        Bs. {(item.subtotal * exchangeRate).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Totales y botón de cobro */}
      <CardFooter className="flex flex-col p-4 border-t border-border bg-muted/20 space-y-4 mt-auto">
        <div className="w-full grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label
              htmlFor="pos-discount"
              className="text-xs font-medium text-muted-foreground flex items-center gap-1"
            >
              <Percent className="h-3.5 w-3.5" />
              <span>Descuento ($)</span>
            </Label>
            <Input
              id="pos-discount"
              type="number"
              placeholder="0.00"
              value={globalDiscount || ""}
              onChange={(e) =>
                onSetGlobalDiscount(Math.max(0, Number(e.target.value) || 0))
              }
              className="h-9 text-sm font-mono rounded-lg bg-background"
              min={0}
            />
          </div>

          <div className="space-y-1">
            <Label
              htmlFor="pos-notes"
              className="text-xs font-medium text-muted-foreground flex items-center gap-1"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Nota (opcional)</span>
            </Label>
            <Input
              id="pos-notes"
              placeholder="Ej. Entrega en la tarde"
              value={notes}
              onChange={(e) => onSetNotes(e.target.value)}
              className="h-9 text-sm rounded-lg bg-background"
            />
          </div>
        </div>

        <div className="w-full space-y-1.5 text-sm border-t border-border/80 pt-3">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-mono">${subtotal.toFixed(2)}</span>
          </div>

          {totalDiscount > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span>Descuento</span>
              <span className="font-mono">-${totalDiscount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex items-baseline justify-between pt-2 border-t border-border text-foreground">
            <span className="font-bold text-base">Total a cobrar</span>
            <div className="text-right">
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
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

        <div className="w-full flex items-center gap-2 pt-1">
          {cart.length > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={onClearCart}
              className="text-muted-foreground hover:text-destructive h-11 px-3.5 rounded-xl"
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
            className="flex-1 h-11 gap-2 font-semibold text-base shadow-sm rounded-xl"
          >
            <CreditCard className="h-5 w-5" />
            <span>Cobrar ${grandTotal.toFixed(2)}</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
