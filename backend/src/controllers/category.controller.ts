import { type Response, type NextFunction } from 'express';
import {
  createCategory as createCategoryService,
  getCategories as getCategoriesService,
  getCategoryTree as getCategoryTreeService,
  getCategoryById as getCategoryByIdService,
  updateCategory as updateCategoryService,
  deleteCategory as deleteCategoryService,
  toggleCategoryStatus as toggleCategoryStatusService,
  CategoryError,
} from '#services/category.service.js';
import { type AuthenticatedRequest } from '#types/auth.types.js';

/**
 * Crear una nueva categoría o subcategoría.
 * POST /api/categories
 */
export const createCategory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, slug, description, parentCategoryId, isActive } = req.body;

    const category = await createCategoryService({
      name,
      slug,
      description,
      parentCategoryId,
      isActive,
    });

    res.status(201).json({
      success: true,
      message: 'Categoría creada exitosamente',
      data: category,
    });
  } catch (error) {
    if (error instanceof CategoryError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Listar categorías con paginación, filtros y búsqueda.
 * GET /api/categories
 */
export const getCategories = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search, isActive, parentCategoryId, isRoot, page, limit, sortBy, sortOrder } =
      req.query;

    const result = await getCategoriesService({
      search: search as string,
      isActive:
        isActive !== undefined ? isActive === 'true' || isActive === '1' : undefined,
      parentCategoryId: parentCategoryId as string,
      isRoot: isRoot !== undefined ? isRoot === 'true' || isRoot === '1' : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof CategoryError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener el árbol jerárquico completo de categorías y subcategorías.
 * GET /api/categories/tree
 */
export const getCategoryTree = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const onlyActive = req.query.all !== 'true';
    const tree = await getCategoryTreeService(onlyActive);

    res.status(200).json({
      success: true,
      data: tree,
    });
  } catch (error) {
    if (error instanceof CategoryError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener detalle de una categoría por ID.
 * GET /api/categories/:id
 */
export const getCategoryById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const category = await getCategoryByIdService(id);

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    if (error instanceof CategoryError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Actualizar una categoría existente.
 * PUT /api/categories/:id o PATCH /api/categories/:id
 */
export const updateCategory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const { name, slug, description, parentCategoryId, isActive } = req.body;

    const category = await updateCategoryService(id, {
      name,
      slug,
      description,
      parentCategoryId,
      isActive,
    });

    res.status(200).json({
      success: true,
      message: 'Categoría actualizada exitosamente',
      data: category,
    });
  } catch (error) {
    if (error instanceof CategoryError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Eliminar una categoría (si no posee productos ni subcategorías asociadas).
 * DELETE /api/categories/:id
 */
export const deleteCategory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const result = await deleteCategoryService(id);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof CategoryError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Alternar el estado activo / inactivo de una categoría.
 * PATCH /api/categories/:id/status
 */
export const toggleCategoryStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const category = await toggleCategoryStatusService(id);

    res.status(200).json({
      success: true,
      message: `Categoría ${category.isActive ? 'activada' : 'desactivada'} exitosamente`,
      data: category,
    });
  } catch (error) {
    if (error instanceof CategoryError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};
