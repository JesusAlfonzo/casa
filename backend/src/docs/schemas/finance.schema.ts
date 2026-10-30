export const financeSchemas = {
  Currency: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      code: { type: 'string', example: 'USD' },
      name: { type: 'string', example: 'Dólar Estadounidense' },
      symbol: { type: 'string', example: '$' },
      isBase: { type: 'boolean', example: true },
      decimals: { type: 'integer', example: 2 },
      isActive: { type: 'boolean', example: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  CreateCurrencyDTO: {
    type: 'object',
    required: ['code', 'name', 'symbol'],
    properties: {
      code: { type: 'string', example: 'EUR' },
      name: { type: 'string', example: 'Euro' },
      symbol: { type: 'string', example: '€' },
      isBase: { type: 'boolean', default: false },
      decimals: { type: 'integer', default: 2 },
      isActive: { type: 'boolean', default: true },
    },
  },
  UpdateCurrencyDTO: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      symbol: { type: 'string' },
      decimals: { type: 'integer' },
      isActive: { type: 'boolean' },
    },
  },
  ExchangeRate: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      sourceCurrencyId: { type: 'string', format: 'uuid' },
      targetCurrencyId: { type: 'string', format: 'uuid' },
      rate: { type: 'number', example: 36.5 },
      rateType: {
        type: 'string',
        enum: ['OFFICIAL', 'PARALLEL', 'CUSTOM'],
        example: 'OFFICIAL',
      },
      validFrom: { type: 'string', format: 'date-time' },
      validTo: { type: 'string', format: 'date-time', nullable: true },
      isActive: { type: 'boolean', example: true },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  CreateExchangeRateDTO: {
    type: 'object',
    required: ['sourceCurrencyId', 'targetCurrencyId', 'rate'],
    properties: {
      sourceCurrencyId: { type: 'string', format: 'uuid' },
      targetCurrencyId: { type: 'string', format: 'uuid' },
      rate: { type: 'number', example: 36.5 },
      rateType: {
        type: 'string',
        enum: ['OFFICIAL', 'PARALLEL', 'CUSTOM'],
        default: 'OFFICIAL',
      },
      validFrom: { type: 'string', format: 'date-time' },
    },
  },
  PaymentMethod: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string', example: 'Pago Móvil' },
      code: { type: 'string', example: 'PAGO_MOVIL' },
      requiresReference: { type: 'boolean', example: true },
      isActive: { type: 'boolean', example: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  CreatePaymentMethodDTO: {
    type: 'object',
    required: ['name', 'code'],
    properties: {
      name: { type: 'string', example: 'Zelle' },
      code: { type: 'string', example: 'ZELLE' },
      requiresReference: { type: 'boolean', default: true },
      isActive: { type: 'boolean', default: true },
    },
  },
  UpdatePaymentMethodDTO: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      code: { type: 'string' },
      requiresReference: { type: 'boolean' },
      isActive: { type: 'boolean' },
    },
  },
  FinancialAccount: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string', example: 'Banco Banesco - Cuenta Principal' },
      accountType: {
        type: 'string',
        enum: ['BANK', 'CASH', 'DIGITAL_WALLET'],
        example: 'BANK',
      },
      currencyId: { type: 'string', format: 'uuid' },
      accountNumber: {
        type: 'string',
        nullable: true,
        example: '0134-1234-5678-9012',
      },
      currentBalance: { type: 'number', example: 1540.5 },
      isActive: { type: 'boolean', example: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  CreateFinancialAccountDTO: {
    type: 'object',
    required: ['name', 'accountType', 'currencyId'],
    properties: {
      name: { type: 'string', example: 'Banesco Corriente VES' },
      accountType: {
        type: 'string',
        enum: ['BANK', 'CASH', 'DIGITAL_WALLET'],
        example: 'BANK',
      },
      currencyId: { type: 'string', format: 'uuid' },
      accountNumber: { type: 'string', example: '01340000000000000000' },
      initialBalance: { type: 'number', default: 0.0 },
      paymentMethodIds: {
        type: 'array',
        items: { type: 'string', format: 'uuid' },
      },
      isActive: { type: 'boolean', default: true },
    },
  },
  AdjustBalanceDTO: {
    type: 'object',
    required: ['type', 'amount', 'reason'],
    properties: {
      type: {
        type: 'string',
        enum: ['DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT'],
        example: 'DEPOSIT',
      },
      amount: { type: 'number', example: 100.0 },
      reason: { type: 'string', example: 'Apertura de turno en caja' },
    },
  },
  PaymentTransaction: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      financialAccountId: { type: 'string', format: 'uuid' },
      paymentMethodId: { type: 'string', format: 'uuid' },
      type: {
        type: 'string',
        enum: ['INCOME', 'EXPENSE', 'TRANSFER'],
        example: 'INCOME',
      },
      amount: { type: 'number', example: 120.0 },
      reference: { type: 'string', nullable: true, example: 'REF-987654' },
      status: {
        type: 'string',
        enum: ['COMPLETED', 'VOIDED'],
        example: 'COMPLETED',
      },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  Purchase: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      supplierId: { type: 'string', format: 'uuid' },
      currencyId: { type: 'string', format: 'uuid' },
      invoiceNumber: { type: 'string', nullable: true, example: 'FAC-001245' },
      status: {
        type: 'string',
        enum: ['PENDING', 'RECEIVED', 'CANCELLED'],
        example: 'RECEIVED',
      },
      total: { type: 'number', example: 1400.0 },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  CreatePurchaseDTO: {
    type: 'object',
    required: ['supplierId', 'currencyId', 'items'],
    properties: {
      supplierId: { type: 'string', format: 'uuid' },
      currencyId: { type: 'string', format: 'uuid' },
      invoiceNumber: { type: 'string', example: 'FAC-001245' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['productId', 'quantity', 'unitCost'],
          properties: {
            productId: { type: 'string', format: 'uuid' },
            locationId: { type: 'string', format: 'uuid' },
            quantity: { type: 'number', example: 5 },
            unitCost: { type: 'number', example: 280.0 },
          },
        },
      },
    },
  },
};
