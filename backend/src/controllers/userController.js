import User from '../models/user.js';
import { sendSuccess } from '../utils/response.js';
import { CustomError } from '../utils/CustomError.js';

/**
 * List all registered users (excluding passwords, paginated)
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return sendSuccess(res, 200, 'Registered user list fetched successfully', { users });
  } catch (error) {
    next(error);
  }
};

/**
 * Modify a user's access role (Customer, Rider, Manager, Admin)
 */
export const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['customer', 'delivery_partner', 'store_manager', 'admin'].includes(role)) {
      throw new CustomError('Invalid role specified', 400);
    }

    const user = await User.findById(id);
    if (!user) {
      throw new CustomError('User account not found', 404);
    }

    // Prevent changing your own role to avoid lockout
    if (user._id.toString() === req.user._id.toString()) {
      throw new CustomError('Cannot modify your own administrative role', 400);
    }

    user.role = role;
    await user.save();

    return sendSuccess(res, 200, 'User role updated successfully', { user });
  } catch (error) {
    next(error);
  }
};

/**
 * Suspend or activate a user account profile
 */
export const toggleUserSuspension = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      throw new CustomError('User account not found', 404);
    }

    if (user._id.toString() === req.user._id.toString()) {
      throw new CustomError('Cannot suspend your own account profile', 400);
    }

    // Toggle active status
    user.status = user.status === 'active' ? 'suspended' : 'active';
    await user.save();

    return sendSuccess(res, 200, `User status set to ${user.status} successfully`, { user });
  } catch (error) {
    next(error);
  }
};

/**
 * Permanently delete a user account
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      throw new CustomError('User account not found', 404);
    }

    if (user._id.toString() === req.user._id.toString()) {
      throw new CustomError('Cannot delete your own admin account', 400);
    }

    await User.findByIdAndDelete(id);

    return sendSuccess(res, 200, 'User account successfully deleted');
  } catch (error) {
    next(error);
  }
};
