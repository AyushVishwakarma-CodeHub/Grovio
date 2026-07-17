import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import { CustomError } from '../utils/CustomError.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    // Check header for token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new CustomError('Not authorized to access this resource. No token provided.', 401);
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_12345');
    } catch (error) {
      throw new CustomError('Not authorized. Invalid or expired token.', 401);
    }

    // Find user
    const user = await User.findById(decoded.id).select('+status');
    if (!user) {
      throw new CustomError('The user belonging to this token no longer exists.', 401);
    }

    // Check if user is active
    if (user.status === 'suspended') {
      throw new CustomError('Your account has been suspended. Please contact support.', 403);
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new CustomError('You do not have permission to perform this action.', 403));
    }
    next();
  };
};
