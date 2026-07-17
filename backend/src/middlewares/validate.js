/**
 * Zod validation middleware
 */
export const validate = (schema) => (req, res, next) => {
  try {
    // Validate request body
    const validated = schema.parse(req.body);
    req.body = validated; // Assign parsed and cleaned values back to req.body
    next();
  } catch (error) {
    next(error);
  }
};
