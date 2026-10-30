"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  type Customer,
  type PaginatedCustomersResult,
} from "@/types/customer";
import { type SaleTransaction } from "@/types/pos";
import { CustomerStatsCards } from "@/components/customers/customer-stats-cards";
import { CustomerTable } from "@/components/customers/customer-table";
import { CustomerFormModal } from "@/components/customers/customer-form-modal";
import { CustomerDetailSheet } from "@/components/customers/customer-detail-sheet";
import { SaleReceiptDialog } from "@/components/sales/sale-receipt-dialog";
import { Button } from "@/components/ui/button";
import { UserPlus, RefreshCw } from "lucide-react";

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modals and sheets state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<SaleTransaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Build query URL
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (searchTerm.trim()) {
    params.set("search", searchTerm.trim());
  }
  if (statusFilter === "ACTIVE") {
    params.set("isActive", "true");
  } else if (statusFilter === "INACTIVE") {
    params.set("isActive", "false");
  }

  // Fetch paginated customers
  const {
    data: customersRes,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["customers", page, searchTerm, statusFilter],
    queryFn: async () => {
      return api.get<PaginatedCustomersResult>(
        `/customers?${params.toString()}`
      );
    },
  });

  // Fetch exchange rate for display
  const { data: exchangeRateData } = useQuery({
    queryKey: ["current-exchange-rate"],
    queryFn: async () => {
      try {
        const res = await api.get<{ rate: number | string }>("/exchange-rates/current");
        return Number(res?.rate || 1);
      } catch {
        return 50.0;
      }
    },
  });

  const exchangeRate = exchangeRateData || 50.0;
  const customers = customersRes?.items || [];
  const total = customersRes?.total || 0;
  const totalPages = customersRes?.totalPages || 1;

  const handleOpenCreateModal = () => {
    setEditingCustomer(null);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setIsDetailOpen(true);
  };

  const handleViewReceipt = (sale: SaleTransaction) => {
    setSelectedReceiptSale(sale);
    setIsReceiptOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Directorio de Clientes
            </h1>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              CRM 360°
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Gestión unificada de clientes, pantallas de streaming asignadas, historial comercial y cobranzas por WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>
          <Button
            size="sm"
            onClick={handleOpenCreateModal}
            className="gap-1.5 shadow-xs"
          >
            <UserPlus className="h-4 w-4" />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <CustomerStatsCards
        customers={customers}
        totalFromApi={total}
      />

      {/* Main Customers Table */}
      <CustomerTable
        customers={customers}
        isLoading={isLoading}
        page={page}
        totalPages={totalPages}
        total={total}
        searchTerm={searchTerm}
        onSearchChange={(term) => {
          setSearchTerm(term);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(status) => {
          setStatusFilter(status);
          setPage(1);
        }}
        onPageChange={(newPage) => setPage(newPage)}
        onSelectCustomer={handleSelectCustomer}
        onEditCustomer={handleOpenEditModal}
      />

      {/* Create / Edit Customer Modal */}
      <CustomerFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        customer={editingCustomer}
      />

      {/* Customer 360° Slide-Over Sheet */}
      <CustomerDetailSheet
        customerId={selectedCustomerId}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEditCustomer={(cust) => {
          setIsDetailOpen(false);
          handleOpenEditModal(cust);
        }}
        onViewReceipt={handleViewReceipt}
        exchangeRate={exchangeRate}
      />

      {/* Thermal Ticket / Receipt Dialog for Customer Sales */}
      <SaleReceiptDialog
        sale={selectedReceiptSale}
        open={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
        exchangeRate={exchangeRate}
      />
    </div>
  );
}
