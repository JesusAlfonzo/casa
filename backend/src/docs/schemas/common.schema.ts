export const commonSchemas = {
  PaginationMeta: {
    type: 'object',
    properties: {
      total: { type: 'integer', example: 45 },
      page: { type: 'integer', example: 1 },
      limit: { type: 'integer', example: 10 },
      totalPages: { type: 'integer', example: 5 },
      hasNextPage: { type: 'boolean', example: true },
      hasPreviousPage: { type: 'boolean', example: false },
    },
    required: ['total', 'page', 'limit', 'totalPages'],
  },
  ApiSuccessResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Operación realizada con éxito' },
    },
    required: ['success'],
  },
  ApiErrorResponse: {
    type: 'object',
    properties: {
      error: { type: 'string', example: 'Descripción detallada del error' },
    },
    required: ['error'],
  },
};

export const commonParameters = [
  {
    name: 'id',
    in: 'path',
    required: true,
    description: 'Identificador único (UUID)',
    schema: { type: 'string', format: 'uuid' },
  },
];
