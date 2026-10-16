import { prisma } from '#config/prisma.js';
import {
  type CreateCategoryDTO,
  type UpdateCategoryDTO,
  type CategoryQueryDTO,
  type CategoryWithDetails,
  type PaginatedCategoriesResult,
} from '#types/category.types.js';

export class CategoryError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'CategoryError';
    this.statusCode = statusCode;
  }
}

/**
 * Convierte un texto a formato slug (amigable para URLs y búsquedas).
 * Ejemplo: "Electrónica y Hogar" -> "electronica-y-hogar"
 */
export const generateSlug = (text: string): string => {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Verifica de forma recursiva que una categoría destino no sea descendiente de la categoría dada,
 * evitando ciclos infinitos en la jerarquía.
 */
const checkCircularReference = async (
  categoryId: string,
  targetParentId: string
): Promise<boolean> => {
  let currentParentId: string | null = targetParentId;

  while (currentParentId) {
    if (currentParentId === categoryId) {
      return true; // Hay ciclo
    }
    const parent: { parentCategoryId: string | null } | null = await prisma.category.findUnique({
      where: { id: currentParentId },
      select: { parentCategoryId: true },
    });
    currentParentId = parent?.parentCategoryId || null;
  }

  return false;
};

/**
 * Crear una nueva categoría o subcategoría.
 */
export const createCategory = async (
  dto: CreateCategoryDTO
): Promise<CategoryWithDetails> => {
  const name = dto.name?.trim();

  if (!name) {
    throw new CategoryError('El nombre de la categoría es obligatorio', 400);
  }

  // Generar o normalizar slug
  const slug = dto.slug?.trim() ? generateSlug(dto.slug) : generateSlug(name);

  if (!slug) {
    throw new CategoryError('No se pudo generar un slug válido para la categoría', 400);
  }

  // Validar unicidad del slug
  const existingSlug = await prisma.category.findUnique({
    where: { slug },
  });

  if (existingSlug) {
    throw new CategoryError(`Ya existe una categoría con el slug "${slug}"`, 409);
  }

  // Si se asigna categoría padre, verificar que exista
  if (dto.parentCategoryId) {
    const parentCategory = await prisma.category.findUnique({
      where: { id: dto.parentCategoryId },
    });
    if (!parentCategory) {
      throw new CategoryError('La categoría padre especificada no existe', 404);
    }
  }

  const category = await prisma.category.create({
    data: {
      name,
      slug,
      description: dto.description?.trim() || null,
      parentCategoryId: dto.parentCategoryId || null,
      isActive: dto.isActive ?? true,
    },
    include: {
      parentCategory: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      _count: {
        select: {
          products: true,
          subcategories: true,
        },
      },
    },
  });

  return category as CategoryWithDetails;
};

/**
 * Listar categorías con paginación, filtros y búsqueda.
 */
export const getCategories = async (
  query: CategoryQueryDTO
): Promise<PaginatedCategoriesResult> => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
  const skip = (page - 1) * limit;

  const where: any = {};

  // Búsqueda por texto (nombre, slug o descripción)
  if (query.search && query.search.trim()) {
    const term = query.search.trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { slug: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
    ];
  }

  // Filtro por estado activo / inactivo
  if (query.isActive !== undefined) {
    where.isActive = Boolean(query.isActive);
  }

  // Filtro de categorías raíz (sin categoría padre)
  if (query.isRoot === true) {
    where.parentCategoryId = null;
  } else if (query.parentCategoryId !== undefined) {
    where.parentCategoryId = query.parentCategoryId;
  }

  // Ordenamiento
  const allowedSortBy = ['name', 'slug', 'createdAt', 'updatedAt'];
  const sortBy = allowedSortBy.includes(query.sortBy as string)
    ? (query.sortBy as string)
    : 'name';
  const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';

  const [total, categories] = await Promise.all([
    prisma.category.count({ where }),
    prisma.category.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        parentCategory: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            products: true,
            subcategories: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: categories as CategoryWithDetails[],
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
 * Obtener el árbol jerárquico completo de categorías y subcategorías.
 */
export const getCategoryTree = async (
  onlyActive: boolean = true
): Promise<CategoryWithDetails[]> => {
  const whereRoot: any = {
    parentCategoryId: null,
  };

  if (onlyActive) {
    whereRoot.isActive = true;
  }

  const rootCategories = await prisma.category.findMany({
    where: whereRoot,
    orderBy: { name: 'asc' },
    include: {
      subcategories: {
        where: onlyActive ? { isActive: true } : {},
        orderBy: { name: 'asc' },
        include: {
          subcategories: {
            where: onlyActive ? { isActive: true } : {},
            orderBy: { name: 'asc' },
            include: {
              _count: {
                select: { products: true, subcategories: true },
              },
            },
          },
          _count: {
            select: { products: true, subcategories: true },
          },
        },
      },
      _count: {
        select: { products: true, subcategories: true },
      },
    },
  });

  return rootCategories as CategoryWithDetails[];
};

/**
 * Obtener detalle de una categoría por su ID único.
 */
export const getCategoryById = async (
  id: string
): Promise<CategoryWithDetails> => {
  if (!id) {
    throw new CategoryError('El ID de la categoría es requerido', 400);
  }

  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      parentCategory: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      subcategories: {
        include: {
          _count: {
            select: { products: true, subcategories: true },
          },
        },
      },
      _count: {
        select: { products: true, subcategories: true },
      },
    },
  });

  if (!category) {
    throw new CategoryError('Categoría no encontrada', 404);
  }

  return category as CategoryWithDetails;
};

/**
 * Actualizar una categoría existente.
 */
export const updateCategory = async (
  id: string,
  dto: UpdateCategoryDTO
): Promise<CategoryWithDetails> => {
  if (!id) {
    throw new CategoryError('El ID de la categoría es requerido', 400);
  }

  const existing = await prisma.category.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new CategoryError('Categoría no encontrada', 404);
  }

  const updateData: any = {};

  if (dto.name !== undefined) {
    const trimmedName = dto.name.trim();
    if (!trimmedName) {
      throw new CategoryError('El nombre de la categoría no puede estar vacío', 400);
    }
    updateData.name = trimmedName;

    // Si no se proporcionó un slug explícito, regenerar el slug a partir del nuevo nombre
    if (dto.slug === undefined) {
      const generated = generateSlug(trimmedName);
      const duplicateSlug = await prisma.category.findFirst({
        where: {
          slug: generated,
          NOT: { id },
        },
      });
      if (duplicateSlug) {
        throw new CategoryError(
          `El slug generado "${generated}" ya pertenece a otra categoría`,
          409
        );
      }
      updateData.slug = generated;
    }
  }

  if (dto.slug !== undefined) {
    const newSlug = generateSlug(dto.slug);
    if (!newSlug) {
      throw new CategoryError('El slug proporcionado no es válido', 400);
    }

    const duplicateSlug = await prisma.category.findFirst({
      where: {
        slug: newSlug,
        NOT: { id },
      },
    });

    if (duplicateSlug) {
      throw new CategoryError(
        `Ya existe otra categoría con el slug "${newSlug}"`,
        409
      );
    }

    updateData.slug = newSlug;
  }

  if (dto.description !== undefined) {
    updateData.description = dto.description ? dto.description.trim() : null;
  }

  if (dto.parentCategoryId !== undefined) {
    const parentId = dto.parentCategoryId;

    if (parentId) {
      if (parentId === id) {
        throw new CategoryError(
          'Una categoría no puede ser su propia categoría padre',
          400
        );
      }

      // Validar que la categoría padre exista
      const parentExists = await prisma.category.findUnique({
        where: { id: parentId },
      });
      if (!parentExists) {
        throw new CategoryError('La categoría padre especificada no existe', 404);
      }

      // Validar que no se forme un ciclo en la jerarquía
      const hasCycle = await checkCircularReference(id, parentId);
      if (hasCycle) {
        throw new CategoryError(
          'No se puede asignar como padre a una subcategoría descendiente (referencia circular)',
          400
        );
      }
    }

    updateData.parentCategoryId = parentId || null;
  }

  if (dto.isActive !== undefined) {
    updateData.isActive = Boolean(dto.isActive);
  }

  const updated = await prisma.category.update({
    where: { id },
    data: updateData,
    include: {
      parentCategory: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      _count: {
        select: {
          products: true,
          subcategories: true,
        },
      },
    },
  });

  return updated as CategoryWithDetails;
};

/**
 * Eliminar una categoría.
 * Protege la integridad: no permite eliminar si tiene productos o subcategorías asociadas.
 */
export const deleteCategory = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  if (!id) {
    throw new CategoryError('El ID de la categoría es requerido', 400);
  }

  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          products: true,
          subcategories: true,
        },
      },
    },
  });

  if (!category) {
    throw new CategoryError('Categoría no encontrada', 404);
  }

  if (category._count.subcategories > 0) {
    throw new CategoryError(
      `No se puede eliminar la categoría "${category.name}" porque tiene ${category._count.subcategories} subcategoría(s) asociada(s). Reasigne o elimine las subcategorías primero.`,
      400
    );
  }

  if (category._count.products > 0) {
    throw new CategoryError(
      `No se puede eliminar la categoría "${category.name}" porque tiene ${category._count.products} producto(s) vinculado(s). Puede desactivarla en su lugar.`,
      400
    );
  }

  await prisma.category.delete({
    where: { id },
  });

  return {
    success: true,
    message: `Categoría "${category.name}" eliminada exitosamente`,
  };
};

/**
 * Alternar el estado activo / inactivo de una categoría.
 */
export const toggleCategoryStatus = async (
  id: string
): Promise<CategoryWithDetails> => {
  if (!id) {
    throw new CategoryError('El ID de la categoría es requerido', 400);
  }

  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    throw new CategoryError('Categoría no encontrada', 404);
  }

  const updated = await prisma.category.update({
    where: { id },
    data: {
      isActive: !category.isActive,
    },
    include: {
      parentCategory: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      _count: {
        select: {
          products: true,
          subcategories: true,
        },
      },
    },
  });

  return updated as CategoryWithDetails;
};
