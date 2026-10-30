export const salesSchemas = {
  Customer: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string', example: 'María' },
      lastName: { type: 'string', nullable: true, example: 'González' },
      documentId: { type: 'string', nullable: true, example: 'V-18765432' },
      phone: { type: 'string', nullable: true, example: '+584149876543' },
      email: {
        type: 'string',
        format: 'email',
        nullable: true,
        example: 'maria.gonzalez@email.com',
      },
      address: { type: 'string', nullable: true },
      isActive: { type: 'boolean', example: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  CreateCustomerDTO: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', example: 'María' },
      lastName: { type: 'string', example: 'González' },
      documentId: { type: 'string', example: 'V-18765432' },
      phone: { type: 'string', example: '+584149876543' },
      email: {
        type: 'string',
        format: 'email',
        example: 'maria.gonzalez@email.com',
      },
      address: { type: 'string', example: 'Altamira, Caracas' },
      notes: { type: 'string', example: 'Cliente frecuente de streaming' },
      isActive: { type: 'boolean', default: true },
    },
  },
  Subscription: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      customerId: { type: 'string', format: 'uuid' },
      serviceId: { type: 'string', format: 'uuid' },
      streamingProfileId: { type: 'string', format: 'uuid', nullable: true },
      startDate: { type: 'string', format: 'date-time' },
      endDate: { type: 'string', format: 'date-time' },
      renewalPrice: { type: 'number', example: 4.5 },
      status: {
        type: 'string',
        enum: ['ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED'],
        example: 'ACTIVE',
      },
      autoRenew: { type: 'boolean', example: true },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  CreateSubscriptionDTO: {
    type: 'object',
    required: [
      'customerId',
      'serviceId',
      'renewalPrice',
      'startDate',
      'endDate',
    ],
    properties: {
      customerId: { type: 'string', format: 'uuid' },
      serviceId: { type: 'string', format: 'uuid' },
      streamingProfileId: { type: 'string', format: 'uuid', nullable: true },
      renewalPrice: { type: 'number', example: 4.5 },
      startDate: { type: 'string', format: 'date-time' },
      endDate: { type: 'string', format: 'date-time' },
      autoRenew: { type: 'boolean', default: true },
      notes: {
        type: 'string',
        example: 'Suscripción mensual pantalla Netflix',
      },
    },
  },
  RenewSubscriptionDTO: {
    type: 'object',
    required: ['days'],
    properties: {
      days: { type: 'integer', example: 30 },
      price: { type: 'number', example: 4.5 },
    },
  },
  Sale: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      saleNumber: { type: 'string', example: 'VTA-2026-00001' },
      customerId: { type: 'string', format: 'uuid', nullable: true },
      currencyId: { type: 'string', format: 'uuid' },
      status: {
        type: 'string',
        enum: ['PENDING', 'PARTIALLY_PAID', 'COMPLETED', 'VOIDED'],
        example: 'COMPLETED',
      },
      subtotal: { type: 'number', example: 44.5 },
      tax: { type: 'number', example: 0.0 },
      discount: { type: 'number', example: 0.0 },
      total: { type: 'number', example: 44.5 },
      totalCollected: { type: 'number', example: 44.5 },
      totalPending: { type: 'number', example: 0.0 },
      createdAt: { type: 'string', format: 'date-time' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            itemType: { type: 'string', enum: ['PRODUCT', 'SERVICE'] },
            quantity: { type: 'number', example: 1 },
            unitPrice: { type: 'number', example: 40.0 },
            subtotal: { type: 'number', example: 40.0 },
          },
        },
      },
    },
  },
  CreateSaleDTO: {
    type: 'object',
    required: ['currencyId', 'items'],
    properties: {
      customerId: { type: 'string', format: 'uuid', nullable: true },
      currencyId: { type: 'string', format: 'uuid' },
      exchangeRateId: { type: 'string', format: 'uuid', nullable: true },
      notes: { type: 'string', example: 'Venta combinada mostrador + Netflix' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['itemType', 'quantity', 'unitPrice'],
          properties: {
            itemType: { type: 'string', enum: ['PRODUCT', 'SERVICE'] },
            productId: { type: 'string', format: 'uuid' },
            inventoryId: { type: 'string', format: 'uuid' },
            serviceId: { type: 'string', format: 'uuid' },
            streamingProfileId: { type: 'string', format: 'uuid' },
            quantity: { type: 'number', example: 1 },
            unitPrice: { type: 'number', example: 40.0 },
            discount: { type: 'number', default: 0.0 },
          },
        },
      },
      payments: {
        type: 'array',
        items: {
          type: 'object',
          required: ['financialAccountId', 'paymentMethodId', 'amount'],
          properties: {
            financialAccountId: { type: 'string', format: 'uuid' },
            paymentMethodId: { type: 'string', format: 'uuid' },
            amount: { type: 'number', example: 44.5 },
            reference: { type: 'string', example: 'TRANSF-123456' },
          },
        },
      },
    },
  },
  AddSalePaymentDTO: {
    type: 'object',
    required: ['financialAccountId', 'paymentMethodId', 'amount'],
    properties: {
      financialAccountId: { type: 'string', format: 'uuid' },
      paymentMethodId: { type: 'string', format: 'uuid' },
      amount: { type: 'number', example: 20.0 },
      reference: { type: 'string', example: 'PAGO-MOVIL-002' },
    },
  },
  VoidSaleDTO: {
    type: 'object',
    required: ['reason'],
    properties: {
      reason: {
        type: 'string',
        example: 'Devolución de cliente por error en pedido',
      },
    },
  },
  SaleStats: {
    type: 'object',
    properties: {
      totalSales: { type: 'integer', example: 12 },
      totalInvoiced: { type: 'number', example: 1450.0 },
      totalCollected: { type: 'number', example: 1350.0 },
      totalPending: { type: 'number', example: 100.0 },
    },
  },
};
