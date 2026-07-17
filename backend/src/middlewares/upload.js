import multer from 'multer';
import { CustomError } from '../utils/CustomError.js';

// Configure memory storage to retrieve buffer directly for Cloudinary stream upload
const storage = multer.memoryStorage();

// File filter to restrict uploads to image formats only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new CustomError('Invalid file type! Please upload images only.', 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB limit
  }
});

export default upload;
