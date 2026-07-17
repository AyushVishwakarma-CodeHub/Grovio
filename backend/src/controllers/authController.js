import User from '../models/user.js';
import Cart from '../models/cart.js';
import { generateAccessToken, generateRefreshToken } from '../utils/token.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { CustomError } from '../utils/CustomError.js';
import jwt from 'jsonwebtoken';

/**
 * Register user
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      throw new CustomError('User with this email or phone number already exists', 400);
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: role || 'customer'
    });

    // Create empty cart for customer
    if (user.role === 'customer') {
      await Cart.create({ userId: user._id, items: [] });
    }

    // Hide password before sending response
    user.password = undefined;

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token to user
    await User.findByIdAndUpdate(user._id, { refreshToken });

    return sendSuccess(res, 201, 'User registered successfully', {
      user,
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user and select password
    const user = await User.findOne({ email }).select('+password +status');
    if (!user || !(await user.comparePassword(password))) {
      throw new CustomError('Invalid email or password', 401);
    }

    if (user.status === 'suspended') {
      throw new CustomError('Your account is suspended. Please contact support.', 403);
    }

    // Hide password
    user.password = undefined;

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token to user
    await User.findByIdAndUpdate(user._id, { refreshToken });

    return sendSuccess(res, 200, 'Login successful', {
      user,
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh token
 */
export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new CustomError('Refresh token is required', 400);
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET || 'fallback_refresh_secret_key_54321');
    } catch (error) {
      throw new CustomError('Invalid or expired refresh token', 401);
    }

    // Check if user exists and token matches
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      throw new CustomError('Invalid refresh token session', 401);
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Update refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    return sendSuccess(res, 200, 'Tokens refreshed successfully', {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 */
export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Clear refresh token in DB
      await User.findOneAndUpdate({ refreshToken }, { $unset: { refreshToken: 1 } });
    }

    return sendSuccess(res, 200, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    return sendSuccess(res, 200, 'User profile fetched successfully', { user });
  } catch (error) {
    next(error);
  }
};
