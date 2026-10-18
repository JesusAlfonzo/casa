import { prisma } from '#config/prisma.js';
import {
  type CreateMeasurementUnitDTO,
  type UpdateMeasurementUnitDTO,
  type MeasurementUnitQueryDTO,
  type MeasurementUnitWithCount,
  type PaginatedMeasurementUnitsResult,
} from '#types/measurement-unit.types.js';

export class MeasurementUnitError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'MeasurementUnitError';
    this.statusCode = statusCode;
  }
}

/**
 * Crear una nueva unidad de medida.
 */
export const createMeasurementUnit = async (
  dto: CreateMeasurementUnitDTO
): Promise<MeasurementUnitWithCount> => {
  const name = dto.name?.trim();
  const abbreviation = dto.abbreviation?.trim();

  if (!name) {
    throw new MeasurementUnitError(
      'El nombre de la unidad de medida es obligatorio',
      400
    );
  }

  if (!abbreviation) {
    throw new MeasurementUnitError(
      'La abreviatura de la unidad de medida es obligatoria',
      400
    );
  }

  // Verificar si ya existe una unidad con el mismo nombre
  const existingName = await prisma.measurementUnit.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive',
      },
    },
  });

  if (existingName) {
    throw new MeasurementUnitError(
      `Ya existe una unidad de medida con el nombre "${name}"`,
      409
    );
  }

  // Verificar si ya existe una unidad con la misma abreviatura
  const existingAbbr = await prisma.measurementUnit.findFirst({
    where: {
      abbreviation: {
        equals: abbreviation,
        mode: 'insensitive',
      },
    },
  });

  if (existingAbbr) {
    throw new MeasurementUnitError(
      `Ya existe una unidad de medida con la abreviatura "${abbreviation}"`,
      409
    );
  }

  const measurementUnit = await prisma.measurementUnit.create({
    data: {
      name,
      abbreviation,
      allowsDecimals: dto.allowsDecimals ?? false,
      isActive: dto.isActive ?? true,
    },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  return measurementUnit;
};

/**
 * Listar unidades de medida con paginación, filtros y búsqueda.
 */
export const getMeasurementUnits = async (
  query: MeasurementUnitQueryDTO
): Promise<PaginatedMeasurementUnitsResult> => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
  const skip = (page - 1) * limit;

  const where: any = {};

  // Filtro por término de búsqueda (nombre o abreviatura)
  if (query.search && query.search.trim()) {
    const term = query.search.trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { abbreviation: { contains: term, mode: 'insensitive' } },
    ];
  }

  // Filtro por estado activo / inactivo
  if (query.isActive !== undefined) {
    where.isActive = Boolean(query.isActive);
  }

  // Filtro por si admite decimales (fracciones)
  if (query.allowsDecimals !== undefined) {
    where.allowsDecimals = Boolean(query.allowsDecimals);
  }

  // Ordenamiento
  const allowedSortBy = ['name', 'abbreviation', 'createdAt'];
  const sortBy = allowedSortBy.includes(query.sortBy as string)
    ? (query.sortBy as string)
    : 'name';
  const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';

  const [total, measurementUnits] = await Promise.all([
    prisma.measurementUnit.count({ where }),
    prisma.measurementUnit.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: {
          select: { products: true },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: measurementUnits,
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
 * Obtener detalle de una unidad de medida por su ID único.
 */
export const getMeasurementUnitById = async (
  id: string
): Promise<MeasurementUnitWithCount> => {
  if (!id) {
    throw new MeasurementUnitError(
      'El ID de la unidad de medida es requerido',
      400
    );
  }

  const unit = await prisma.measurementUnit.findUnique({
    where: { id },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  if (!unit) {
    throw new MeasurementUnitError('Unidad de medida no encontrada', 404);
  }

  return unit;
};

/**
 * Actualizar una unidad de medida existente.
 */
export const updateMeasurementUnit = async (
  id: string,
  dto: UpdateMeasurementUnitDTO
): Promise<MeasurementUnitWithCount> => {
  if (!id) {
    throw new MeasurementUnitError(
      'El ID de la unidad de medida es requerido',
      400
    );
  }

  const existing = await prisma.measurementUnit.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new MeasurementUnitError('Unidad de medida no encontrada', 404);
  }

  const updateData: any = {};

  if (dto.name !== undefined) {
    const trimmedName = dto.name.trim();
    if (!trimmedName) {
      throw new MeasurementUnitError(
        'El nombre de la unidad no puede estar vacío',
        400
      );
    }

    const duplicateName = await prisma.measurementUnit.findFirst({
      where: {
        name: {
          equals: trimmedName,
          mode: 'insensitive',
        },
        NOT: { id },
      },
    });

    if (duplicateName) {
      throw new MeasurementUnitError(
        `Ya existe otra unidad de medida con el nombre "${trimmedName}"`,
        409
      );
    }

    updateData.name = trimmedName;
  }

  if (dto.abbreviation !== undefined) {
    const trimmedAbbr = dto.abbreviation.trim();
    if (!trimmedAbbr) {
      throw new MeasurementUnitError(
        'La abreviatura no puede estar vacía',
        400
      );
    }

    const duplicateAbbr = await prisma.measurementUnit.findFirst({
      where: {
        abbreviation: {
          equals: trimmedAbbr,
          mode: 'insensitive',
        },
        NOT: { id },
      },
    });

    if (duplicateAbbr) {
      throw new MeasurementUnitError(
        `Ya existe otra unidad de medida con la abreviatura "${trimmedAbbr}"`,
        409
      );
    }

    updateData.abbreviation = trimmedAbbr;
  }

  if (dto.allowsDecimals !== undefined) {
    updateData.allowsDecimals = Boolean(dto.allowsDecimals);
  }

  if (dto.isActive !== undefined) {
    updateData.isActive = Boolean(dto.isActive);
  }

  const updatedUnit = await prisma.measurementUnit.update({
    where: { id },
    data: updateData,
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  return updatedUnit;
};

/**
 * Eliminar una unidad de medida.
 * Si tiene productos asociados en el catálogo, se rechaza la eliminación para proteger la integridad.
 */
export const deleteMeasurementUnit = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  if (!id) {
    throw new MeasurementUnitError(
      'El ID de la unidad de medida es requerido',
      400
    );
  }

  const unit = await prisma.measurementUnit.findUnique({
    where: { id },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  if (!unit) {
    throw new MeasurementUnitError('Unidad de medida no encontrada', 404);
  }

  if (unit._count.products > 0) {
    throw new MeasurementUnitError(
      `No se puede eliminar la unidad "${unit.name}" (${unit.abbreviation}) porque tiene ${unit._count.products} producto(s) asociado(s). Puede desactivarla en su lugar.`,
      400
    );
  }

  await prisma.measurementUnit.delete({
    where: { id },
  });

  return {
    success: true,
    message: `Unidad de medida "${unit.name}" eliminada exitosamente`,
  };
};

/**
 * Alternar el estado activo / inactivo de una unidad de medida.
 */
export const toggleMeasurementUnitStatus = async (
  id: string
): Promise<MeasurementUnitWithCount> => {
  if (!id) {
    throw new MeasurementUnitError(
      'El ID de la unidad de medida es requerido',
      400
    );
  }

  const unit = await prisma.measurementUnit.findUnique({
    where: { id },
  });

  if (!unit) {
    throw new MeasurementUnitError('Unidad de medida no encontrada', 404);
  }

  const updated = await prisma.measurementUnit.update({
    where: { id },
    data: {
      isActive: !unit.isActive,
    },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  return updated;
};
