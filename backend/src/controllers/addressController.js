import Address from '../models/address.js';
import { sendSuccess } from '../utils/response.js';
import { CustomError } from '../utils/CustomError.js';

/**
 * Get all saved addresses of the user
 */
export const getAddresses = async (req, res, next) => {
  try {
    const addresses = await Address.find({ userId: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
    return sendSuccess(res, 200, 'Addresses fetched successfully', { addresses });
  } catch (error) {
    next(error);
  }
};

/**
 * Save a new address
 */
export const createAddress = async (req, res, next) => {
  try {
    const { title, addressLine1, addressLine2, city, state, zipCode, coordinates } = req.body;

    // Check if this is the user's first address
    const addressCount = await Address.countDocuments({ userId: req.user._id });
    const isDefault = addressCount === 0; // set as default if first address

    const address = await Address.create({
      userId: req.user._id,
      title,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      coordinates: {
        type: 'Point',
        coordinates: coordinates // [longitude, latitude]
      },
      isDefault
    });

    return sendSuccess(res, 201, 'Address saved successfully', { address });
  } catch (error) {
    next(error);
  }
};

/**
 * Update address details and handle default toggles
 */
export const updateAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, addressLine1, addressLine2, city, state, zipCode, coordinates, isDefault } = req.body;

    const address = await Address.findOne({ _id: id, userId: req.user._id });
    if (!address) {
      throw new CustomError('Address not found', 404);
    }

    if (title) address.title = title;
    if (addressLine1) address.addressLine1 = addressLine1;
    if (addressLine2 !== undefined) address.addressLine2 = addressLine2;
    if (city) address.city = city;
    if (state) address.state = state;
    if (zipCode) address.zipCode = zipCode;
    
    if (coordinates) {
      address.coordinates = {
        type: 'Point',
        coordinates: coordinates
      };
    }

    // Handle setting default address
    if (isDefault === true && !address.isDefault) {
      // Clear other defaults
      await Address.updateMany({ userId: req.user._id }, { isDefault: false });
      address.isDefault = true;
    }

    await address.save();

    return sendSuccess(res, 200, 'Address updated successfully', { address });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a saved address
 */
export const deleteAddress = async (req, res, next) => {
  try {
    const { id } = req.params;

    const address = await Address.findOne({ _id: id, userId: req.user._id });
    if (!address) {
      throw new CustomError('Address not found', 404);
    }

    const wasDefault = address.isDefault;
    await Address.deleteOne({ _id: id });

    // If we deleted the default address, set another address as default
    if (wasDefault) {
      const nextAddress = await Address.findOne({ userId: req.user._id });
      if (nextAddress) {
        nextAddress.isDefault = true;
        await nextAddress.save();
      }
    }

    return sendSuccess(res, 200, 'Address deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Set an address as default
 */
export const setDefaultAddress = async (req, res, next) => {
  try {
    const { id } = req.params;

    const address = await Address.findOne({ _id: id, userId: req.user._id });
    if (!address) {
      throw new CustomError('Address not found', 404);
    }

    // Reset default status on all user's addresses
    await Address.updateMany({ userId: req.user._id }, { isDefault: false });

    // Set new default
    address.isDefault = true;
    await address.save();

    return sendSuccess(res, 200, 'Default address set successfully', { address });
  } catch (error) {
    next(error);
  }
};
