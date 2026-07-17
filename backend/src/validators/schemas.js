import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').max(50),
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  phone: z.string().min(8, 'Phone number must be at least 8 characters long'),
  role: z.enum(['customer', 'delivery_partner', 'admin', 'store_manager']).optional()
});

export const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required')
});

export const addressSchema = z.object({
  title: z.string().min(1, 'Title is required (e.g. Home, Work)'),
  addressLine1: z.string().min(1, 'Address Line 1 is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(4, 'ZIP code must be at least 4 characters'),
  coordinates: z.array(z.number()).length(2, 'Coordinates must be [longitude, latitude]')
});

export const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').max(50),
  image: z.string().url('Please provide a valid image URL'),
  description: z.string().optional()
});

export const productSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  image: z.string().url('Please provide a valid image URL'),
  price: z.number().min(0, 'Price cannot be negative'),
  discountPrice: z.number().min(0).optional(),
  unit: z.string().min(1, 'Unit description is required (e.g. 500g, 1L)'),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  category: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID'),
  brand: z.string().optional()
});
