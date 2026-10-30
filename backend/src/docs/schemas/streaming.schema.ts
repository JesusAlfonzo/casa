export const streamingSchemas = {
  ServiceType: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string', example: 'Streaming de Video' },
      description: {
        type: 'string',
        nullable: true,
        example: 'Cuentas y pantallas de video bajo demanda',
      },
      isActive: { type: 'boolean', example: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  CreateServiceTypeDTO: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', example: 'Streaming de Música' },
      description: {
        type: 'string',
        example: 'Spotify, Deezer, Tidal, Apple Music',
      },
      isActive: { type: 'boolean', default: true },
    },
  },
  Service: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      serviceTypeId: { type: 'string', format: 'uuid' },
      name: { type: 'string', example: 'Netflix Premium Ultra HD' },
      description: { type: 'string', nullable: true },
      defaultPrice: { type: 'number', example: 4.5 },
      billingCycleDays: { type: 'integer', example: 30 },
      maxProfiles: { type: 'integer', example: 5 },
      isActive: { type: 'boolean', example: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  CreateServiceDTO: {
    type: 'object',
    required: ['serviceTypeId', 'name', 'defaultPrice'],
    properties: {
      serviceTypeId: { type: 'string', format: 'uuid' },
      name: { type: 'string', example: 'Netflix Premium' },
      description: { type: 'string', example: 'Suscripción mensual a Netflix' },
      defaultPrice: { type: 'number', example: 4.5 },
      billingCycleDays: { type: 'integer', default: 30 },
      maxProfiles: { type: 'integer', default: 5 },
      isActive: { type: 'boolean', default: true },
    },
  },
  StreamingAccount: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      serviceId: { type: 'string', format: 'uuid' },
      email: {
        type: 'string',
        format: 'email',
        example: 'master.netflix01@erphibrido.com',
      },
      status: {
        type: 'string',
        enum: ['ACTIVE', 'SUSPENDED', 'EXPIRED'],
        example: 'ACTIVE',
      },
      renewalDate: { type: 'string', format: 'date-time', nullable: true },
      monthlyCost: { type: 'number', example: 12.0 },
      maxScreens: { type: 'integer', example: 5 },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  CreateStreamingAccountDTO: {
    type: 'object',
    required: ['serviceId', 'email', 'password', 'monthlyCost', 'maxScreens'],
    properties: {
      serviceId: { type: 'string', format: 'uuid' },
      email: {
        type: 'string',
        format: 'email',
        example: 'cuenta.streaming@erphibrido.com',
      },
      password: {
        type: 'string',
        format: 'password',
        example: 'SecretoStreaming2026!',
      },
      monthlyCost: { type: 'number', example: 12.0 },
      maxScreens: { type: 'integer', example: 5 },
      renewalDate: { type: 'string', format: 'date-time' },
      notes: {
        type: 'string',
        example: 'Contratada con tarjeta virtual Banesco',
      },
    },
  },
  StreamingProfile: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      streamingAccountId: { type: 'string', format: 'uuid' },
      profileNumber: { type: 'integer', example: 1 },
      profileName: { type: 'string', example: 'Perfil 1' },
      pin: { type: 'string', nullable: true, example: '1234' },
      isOccupied: { type: 'boolean', example: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  UpdateStreamingProfileDTO: {
    type: 'object',
    properties: {
      profileName: { type: 'string', example: 'Perfil VIP Juan' },
      pin: { type: 'string', example: '5678' },
      isOccupied: { type: 'boolean' },
    },
  },
};
