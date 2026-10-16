import { prisma } from '#config/prisma.js';
import {
  type CreateBrandDTO,
  type UpdateBrandDTO,
  type BrandQueryDTO,
  type BrandWithCount,
  type PaginatedBrandsResult,
} from '#types/brand.types.js';

export class BrandError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'BrandError';
    this.statusCode = statusCode;
  }
}

/**
 * Crear una nueva marca en el catálogo.
 */
export const createBrand = async (
  dto: CreateBrandDTO
): Promise<BrandWithCount> => {
  const name = dto.name?.trim();

  if (!name) {
    throw new BrandError('El nombre de la marca es obligatorio', 400);
  }

  // Verificar si ya existe una marca con el mismo nombre (insensible a mayúsculas/minúsculas)
  const existing = await prisma.brand.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive',
      },
    },
  });

  if (existing) {
    throw new BrandError(`Ya existe una marca con el nombre "${name}"`, 409);
  }

  const brand = await prisma.brand.create({
    data: {
      name,
      description: dto.description?.trim() || null,
      logoUrl: dto.logoUrl?.trim() || null,
      isActive: dto.isActive ?? true,
    },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  return brand;
};

/**
 * Listar marcas con paginación, búsqueda por texto, filtro de estado y ordenamiento.
 */
export const getBrands = async (
  query: BrandQueryDTO
): Promise<PaginatedBrandsResult> => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
  const skip = (page - 1) * limit;

  const where: any = {};

  // Filtro de búsqueda por nombre o descripción
  if (query.search && query.search.trim()) {
    const term = query.search.trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
    ];
  }

  // Filtro por estado activo / inactivo
  if (query.isActive !== undefined) {
    where.isActive = Boolean(query.isActive);
  }

  // Ordenamiento
  const allowedSortBy = ['name', 'createdAt', 'updatedAt'];
  const sortBy = allowedSortBy.includes(query.sortBy as string)
    ? (query.sortBy as string)
    : 'name';
  const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';

  const [total, brands] = await Promise.all([
    prisma.brand.count({ where }),
    prisma.brand.findMany({
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
    data: brands,
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
 * Obtener una marca por su ID único.
 */
export const getBrandById = async (id: string): Promise<BrandWithCount> => {
  if (!id) {
    throw new BrandError('El ID de la marca es requerido', 400);
  }

  const brand = await prisma.brand.findUnique({
    where: { id },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  if (!brand) {
    throw new BrandError('Marca no encontrada', 404);
  }

  return brand;
};

/**
 * Actualizar una marca existente.
 */
export const updateBrand = async (
  id: string,
  dto: UpdateBrandDTO
): Promise<BrandWithCount> => {
  if (!id) {
    throw new BrandError('El ID de la marca es requerido', 400);
  }

  // Verificar que la marca exista
  const existing = await prisma.brand.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new BrandError('Marca no encontrada', 404);
  }

  const updateData: any = {};

  if (dto.name !== undefined) {
    const trimmedName = dto.name.trim();
    if (!trimmedName) {
      throw new BrandError('El nombre de la marca no puede estar vacío', 400);
    }

    // Verificar si el nuevo nombre ya está ocupado por otra marca
    const duplicate = await prisma.brand.findFirst({
      where: {
        name: {
          equals: trimmedName,
          mode: 'insensitive',
        },
        NOT: { id },
      },
    });

    if (duplicate) {
      throw new BrandError(
        `Ya existe otra marca con el nombre "${trimmedName}"`,
        409
      );
    }

    updateData.name = trimmedName;
  }

  if (dto.description !== undefined) {
    updateData.description = dto.description ? dto.description.trim() : null;
  }

  if (dto.logoUrl !== undefined) {
    updateData.logoUrl = dto.logoUrl ? dto.logoUrl.trim() : null;
  }

  if (dto.isActive !== undefined) {
    updateData.isActive = Boolean(dto.isActive);
  }

  const updatedBrand = await prisma.brand.update({
    where: { id },
    data: updateData,
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  return updatedBrand;
};

/**
 * Eliminar una marca.
 * Si tiene productos asociados, rechaza la eliminación para proteger la integridad referencial.
 */
export const deleteBrand = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  if (!id) {
    throw new BrandError('El ID de la marca es requerido', 400);
  }

  const brand = await prisma.brand.findUnique({
    where: { id },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  if (!brand) {
    throw new BrandError('Marca no encontrada', 404);
  }

  if (brand._count.products > 0) {
    throw new BrandError(
      `No se puede eliminar la marca "${brand.name}" porque tiene ${brand._count.products} producto(s) asociado(s). Puede desactivarla en su lugar.`,
      400
    );
  }

  await prisma.brand.delete({
    where: { id },
  });

  return {
    success: true,
    message: `Marca "${brand.name}" eliminada exitosamente`,
  };
};

/**
 * Alternar el estado activo/inactivo de una marca.
 */
export const toggleBrandStatus = async (
  id: string
): Promise<BrandWithCount> => {
  if (!id) {
    throw new BrandError('El ID de la marca es requerido', 400);
  }

  const brand = await prisma.brand.findUnique({
    where: { id },
  });

  if (!brand) {
    throw new BrandError('Marca no encontrada', 404);
  }

  const updated = await prisma.brand.update({
    where: { id },
    data: {
      isActive: !brand.isActive,
    },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  return updated;
};
