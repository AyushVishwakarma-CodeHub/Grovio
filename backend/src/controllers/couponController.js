import Coupon from '../models/coupon.js';
import { sendSuccess } from '../utils/response.js';
import { CustomError } from '../utils/CustomError.js';

/**
 * Get all discount coupons
 */
export const getCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    return sendSuccess(res, 200, 'Coupons fetched successfully', { coupons });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new coupon
 */
export const createCoupon = async (req, res, next) => {
  try {
    const { code, discountType, discountValue, minPurchase, expiryDate } = req.body;

    if (!code || !discountType || !discountValue || !expiryDate) {
      throw new CustomError('Required parameters are missing', 400);
    }

    const exists = await Coupon.findOne({ code: code.toUpperCase() });
    if (exists) {
      throw new CustomError('Coupon code already exists', 400);
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountType,
      discountValue,
      minPurchase,
      expiryDate: new Date(expiryDate)
    });

    return sendSuccess(res, 201, 'Coupon created successfully', { coupon });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing coupon
 */
export const updateCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, discountType, discountValue, minPurchase, expiryDate, isActive } = req.body;

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      throw new CustomError('Coupon not found', 404);
    }

    if (code) coupon.code = code.toUpperCase();
    if (discountType) coupon.discountType = discountType;
    if (discountValue !== undefined) coupon.discountValue = discountValue;
    if (minPurchase !== undefined) coupon.minPurchase = minPurchase;
    if (expiryDate) coupon.expiryDate = new Date(expiryDate);
    if (isActive !== undefined) coupon.isActive = isActive;

    await coupon.save();

    return sendSuccess(res, 200, 'Coupon updated successfully', { coupon });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a coupon
 */
export const deleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      throw new CustomError('Coupon not found', 404);
    }

    await Coupon.deleteOne({ _id: id });
    return sendSuccess(res, 200, 'Coupon deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Validate coupon code on cart checkout
 */
export const validateCouponCode = async (req, res, next) => {
  try {
    const { code, cartSubtotal } = req.body;

    if (!code || cartSubtotal === undefined) {
      throw new CustomError('Coupon code and cart subtotal are required', 400);
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    
    if (!coupon) {
      throw new CustomError('Invalid coupon code', 404);
    }

    // Check expiry
    if (new Date(coupon.expiryDate) < new Date()) {
      throw new CustomError('Coupon code has expired', 400);
    }

    // Check minimum purchase amount
    if (Number(cartSubtotal) < coupon.minPurchase) {
      throw new CustomError(`Minimum purchase of ₹${coupon.minPurchase} required to apply this coupon.`, 400);
    }

    // Compute discount amount
    let discountAmount = 0;
    if (coupon.discountType === 'flat') {
      discountAmount = coupon.discountValue;
    } else {
      // Percentage
      discountAmount = Math.round((Number(cartSubtotal) * coupon.discountValue) / 100);
    }

    return sendSuccess(res, 200, 'Coupon is valid', {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount
    });
  } catch (error) {
    next(error);
  }
};
