import { prisma } from '#config/prisma.js';
import {
  type CreateLocationDTO,
  type UpdateLocationDTO,
  type LocationQueryDTO,
  type LocationWithDetails,
  type PaginatedLocationsResult,
} from '#types/location.types.js';

export class LocationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'LocationError';
    this.statusCode = statusCode;
  }
}

/**
 * Genera un código de ubicación único si no se proporciona uno manual.
 */
const generateRandomCode = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `LOC-${timestamp}-${randomPart}`;
};

/**
 * Verifica recursivamente que una ubicación destino no sea descendiente de la ubicación dada,
 * evitando ciclos infinitos en la jerarquía (ej. Sucursal -> Almacén -> Pasillo -> Estante).
 */
const checkCircularReference = async (
  locationId: string,
  targetParentId: string
): Promise<boolean> => {
  let currentParentId: string | null = targetParentId;

  while (currentParentId) {
    if (currentParentId === locationId) {
      return true; // Se detectó ciclo
    }
    const parent: { parentLocationId: string | null } | null =
      await prisma.location.findUnique({
        where: { id: currentParentId },
        select: { parentLocationId: true },
      });
    currentParentId = parent?.parentLocationId || null;
  }

  return false;
};

/**
 * Crear una nueva ubicación o sububicación física/lógica de almacenamiento.
 */
export const createLocation = async (
  dto: CreateLocationDTO
): Promise<LocationWithDetails> => {
  const name = dto.name?.trim();
  if (!name) {
    throw new LocationError('El nombre de la ubicación es obligatorio', 400);
  }

  let code = dto.code?.trim().toUpperCase();
  if (!code) {
    code = generateRandomCode();
  } else {
    const existingCode = await prisma.location.findUnique({
      where: { code },
    });
    if (existingCode) {
      throw new LocationError(
        `Ya existe una ubicación con el código "${code}"`,
        409
      );
    }
  }

  // Validar existencia de la ubicación padre si se especificó
  const parentLocationId = dto.parentLocationId || null;
  if (parentLocationId) {
    const parent = await prisma.location.findUnique({
      where: { id: parentLocationId },
    });
    if (!parent) {
      throw new LocationError('La ubicación padre especificada no existe', 404);
    }
  }

  const location = await prisma.location.create({
    data: {
      code,
      name,
      description: dto.description?.trim() || null,
      address: dto.address?.trim() || null,
      parentLocationId,
      isActive: dto.isActive ?? true,
    },
    include: {
      parentLocation: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      _count: {
        select: {
          sublocations: true,
          inventories: true,
          purchaseItems: true,
        },
      },
    },
  });

  return location as LocationWithDetails;
};

/**
 * Listar ubicaciones con filtros de jerarquía, estado, búsqueda y paginación.
 */
export const getLocations = async (
  query: LocationQueryDTO
): Promise<PaginatedLocationsResult> => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (query.isActive !== undefined) {
    where.isActive = Boolean(query.isActive);
  }

  if (query.isRoot === true) {
    where.parentLocationId = null;
  } else if (query.parentLocationId !== undefined) {
    where.parentLocationId = query.parentLocationId;
  }

  if (query.search && query.search.trim()) {
    const term = query.search.trim();
    where.OR = [
      { code: { contains: term, mode: 'insensitive' } },
      { name: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { address: { contains: term, mode: 'insensitive' } },
    ];
  }

  const allowedSortBy = ['code', 'name', 'createdAt', 'updatedAt'];
  const sortBy = allowedSortBy.includes(query.sortBy as string)
    ? (query.sortBy as string)
    : 'name';
  const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';

  const [total, locations] = await Promise.all([
    prisma.location.count({ where }),
    prisma.location.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        parentLocation: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            sublocations: true,
            inventories: true,
            purchaseItems: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: locations as LocationWithDetails[],
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

/**
 * Obtener el árbol jerárquico de ubicaciones (Sucursales -> Almacenes -> Pasillos/Estantes).
 */
export const getLocationTree = async (
  onlyActive: boolean = true
): Promise<LocationWithDetails[]> => {
  const whereRoot: any = {
    parentLocationId: null,
  };

  if (onlyActive) {
    whereRoot.isActive = true;
  }

  const rootLocations = await prisma.location.findMany({
    where: whereRoot,
    orderBy: { name: 'asc' },
    include: {
      sublocations: {
        where: onlyActive ? { isActive: true } : {},
        orderBy: { name: 'asc' },
        include: {
          sublocations: {
            where: onlyActive ? { isActive: true } : {},
            orderBy: { name: 'asc' },
            include: {
              _count: {
                select: {
                  sublocations: true,
                  inventories: true,
                  purchaseItems: true,
                },
              },
            },
          },
          _count: {
            select: {
              sublocations: true,
              inventories: true,
              purchaseItems: true,
            },
          },
        },
      },
      _count: {
        select: { sublocations: true, inventories: true, purchaseItems: true },
      },
    },
  });

  return rootLocations as LocationWithDetails[];
};

/**
 * Obtener detalle de una ubicación por ID.
 */
export const getLocationById = async (
  id: string
): Promise<LocationWithDetails> => {
  if (!id) {
    throw new LocationError('El ID de la ubicación es requerido', 400);
  }

  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      parentLocation: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      sublocations: {
        include: {
          _count: {
            select: {
              sublocations: true,
              inventories: true,
              purchaseItems: true,
            },
          },
        },
      },
      _count: {
        select: {
          sublocations: true,
          inventories: true,
          purchaseItems: true,
        },
      },
    },
  });

  if (!location) {
    throw new LocationError('Ubicación no encontrada', 404);
  }

  return location as LocationWithDetails;
};

/**
 * Actualizar una ubicación existente.
 */
export const updateLocation = async (
  id: string,
  dto: UpdateLocationDTO
): Promise<LocationWithDetails> => {
  if (!id) {
    throw new LocationError('El ID de la ubicación es requerido', 400);
  }

  const existing = await prisma.location.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new LocationError('Ubicación no encontrada', 404);
  }

  const updateData: any = {};

  if (dto.name !== undefined) {
    const trimmedName = dto.name.trim();
    if (!trimmedName) {
      throw new LocationError(
        'El nombre de la ubicación no puede estar vacío',
        400
      );
    }
    updateData.name = trimmedName;
  }

  if (dto.code !== undefined) {
    const trimmedCode = dto.code.trim().toUpperCase();
    if (!trimmedCode) {
      throw new LocationError(
        'El código de la ubicación no puede estar vacío',
        400
      );
    }

    const duplicateCode = await prisma.location.findFirst({
      where: {
        code: trimmedCode,
        NOT: { id },
      },
    });

    if (duplicateCode) {
      throw new LocationError(
        `Ya existe otra ubicación con el código "${trimmedCode}"`,
        409
      );
    }

    updateData.code = trimmedCode;
  }

  if (dto.description !== undefined) {
    updateData.description = dto.description ? dto.description.trim() : null;
  }

  if (dto.address !== undefined) {
    updateData.address = dto.address ? dto.address.trim() : null;
  }

  if (dto.parentLocationId !== undefined) {
    const parentId = dto.parentLocationId;

    if (parentId) {
      if (parentId === id) {
        throw new LocationError(
          'Una ubicación no puede ser su propia ubicación padre',
          400
        );
      }

      const parentExists = await prisma.location.findUnique({
        where: { id: parentId },
      });
      if (!parentExists) {
        throw new LocationError(
          'La ubicación padre especificada no existe',
          404
        );
      }

      const hasCycle = await checkCircularReference(id, parentId);
      if (hasCycle) {
        throw new LocationError(
          'No se puede asignar como padre a una sububicación descendiente (referencia circular)',
          400
        );
      }
    }

    updateData.parentLocationId = parentId || null;
  }

  if (dto.isActive !== undefined) {
    updateData.isActive = Boolean(dto.isActive);
  }

  const updated = await prisma.location.update({
    where: { id },
    data: updateData,
    include: {
      parentLocation: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      _count: {
        select: {
          sublocations: true,
          inventories: true,
          purchaseItems: true,
        },
      },
    },
  });

  return updated as LocationWithDetails;
};

/**
 * Eliminar una ubicación física o lógica.
 * Protege la integridad si tiene sububicaciones, existencias en inventario o compras asociadas.
 */
export const deleteLocation = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  if (!id) {
    throw new LocationError('El ID de la ubicación es requerido', 400);
  }

  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          sublocations: true,
          inventories: true,
          purchaseItems: true,
        },
      },
    },
  });

  if (!location) {
    throw new LocationError('Ubicación no encontrada', 404);
  }

  if (location._count.sublocations > 0) {
    throw new LocationError(
      `No se puede eliminar la ubicación "${location.name}" porque tiene ${location._count.sublocations} sububicación(es) asociada(s). Reasigne o elimine las sububicaciones primero.`,
      400
    );
  }

  if (location._count.inventories > 0) {
    throw new LocationError(
      `No se puede eliminar la ubicación "${location.name}" porque tiene registros de inventario vinculados. Puede desactivarla en su lugar.`,
      400
    );
  }

  if (location._count.purchaseItems > 0) {
    throw new LocationError(
      `No se puede eliminar la ubicación "${location.name}" porque figura como destino en compras registradas. Puede desactivarla en su lugar.`,
      400
    );
  }

  await prisma.location.delete({
    where: { id },
  });

  return {
    success: true,
    message: `Ubicación "${location.name}" eliminada exitosamente`,
  };
};

/**
 * Alternar el estado activo / inactivo de una ubicación.
 */
export const toggleLocationStatus = async (
  id: string
): Promise<LocationWithDetails> => {
  if (!id) {
    throw new LocationError('El ID de la ubicación es requerido', 400);
  }

  const location = await prisma.location.findUnique({
    where: { id },
  });

  if (!location) {
    throw new LocationError('Ubicación no encontrada', 404);
  }

  const updated = await prisma.location.update({
    where: { id },
    data: {
      isActive: !location.isActive,
    },
    include: {
      parentLocation: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      _count: {
        select: {
          sublocations: true,
          inventories: true,
          purchaseItems: true,
        },
      },
    },
  });

  return updated as LocationWithDetails;
};
