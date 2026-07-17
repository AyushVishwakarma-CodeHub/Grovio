import Category from '../models/category.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { CustomError } from '../utils/CustomError.js';

/**
 * Get all active categories (public)
 */
export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    return sendSuccess(res, 200, 'Categories fetched successfully', { categories });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all categories (Admin / Manager - including inactive)
 */
export const getAllCategoriesAdmin = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    return sendSuccess(res, 200, 'All categories fetched for admin', { categories });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new category
 */
export const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      throw new CustomError('Category with this name already exists', 400);
    }

    let imageUrl = '';
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'categories');
      imageUrl = uploadResult.secure_url;
    } else {
      throw new CustomError('Please provide a category image file', 400);
    }

    const category = await Category.create({
      name,
      description,
      image: imageUrl
    });

    return sendSuccess(res, 201, 'Category created successfully', { category });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing category
 */
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      throw new CustomError('Category not found', 404);
    }

    if (name && name !== category.name) {
      const nameConflict = await Category.findOne({ name });
      if (nameConflict) {
        throw new CustomError('Category name already in use by another category', 400);
      }
      category.name = name;
    }

    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = isActive === 'true' || isActive === true;

    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'categories');
      category.image = uploadResult.secure_url;
    }

    await category.save();

    return sendSuccess(res, 200, 'Category updated successfully', { category });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft delete or toggle category status
 */
export const toggleCategoryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) {
      throw new CustomError('Category not found', 404);
    }

    category.isActive = !category.isActive;
    await category.save();

    const statusMessage = category.isActive ? 'activated' : 'deactivated';
    return sendSuccess(res, 200, `Category ${statusMessage} successfully`, { category });
  } catch (error) {
    next(error);
  }
};
