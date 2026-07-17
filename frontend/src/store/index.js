import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice.js';
import cartReducer from './cartSlice.js';
import productReducer from './productSlice.js';
import orderReducer from './orderSlice.js';
import wishlistReducer from './wishlistSlice.js';
import notificationReducer from './notificationSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    products: productReducer,
    orders: orderReducer,
    wishlist: wishlistReducer,
    notifications: notificationReducer
  }
});
export default store;

