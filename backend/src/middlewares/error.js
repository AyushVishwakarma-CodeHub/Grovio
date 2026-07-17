import { sendError } from '../utils/response.js';

export const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // 1. Mongoose duplicate key error (MongoDB index code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `Duplicate value '${value}' for field '${field}'. Please use another value.`;
    return sendError(res, 400, message);
  }

  // 2. Mongoose Cast Error (invalid ObjectId)
  if (err.name === 'CastError') {
    const message = `Invalid ${err.path}: ${err.value}`;
    return sendError(res, 400, message);
  }

  // 3. Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data: ${errors.join('. ')}`;
    return sendError(res, 400, message, errors);
  }

  // 4. JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 401, 'Invalid token. Please log in again.');
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 401, 'Your token has expired. Please log in again.');
  }

  // 5. Zod validation errors
  if (err.name === 'ZodError' || (err.issues && Array.isArray(err.issues))) {
    const errorDetails = err.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message
    }));
    return sendError(res, 400, 'Validation failed', errorDetails);
  }

  // Production vs Development error formatting
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      stack: err.stack,
      error: err
    });
  }

  // Standard safe operational/generic error in production
  return sendError(res, err.statusCode, err.message);
};
