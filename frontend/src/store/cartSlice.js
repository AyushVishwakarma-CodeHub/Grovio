import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/axios.js';

// Load guest cart from localStorage
const loadLocalCart = () => {
  try {
    const localCart = localStorage.getItem('grovio_cart');
    return localCart ? JSON.parse(localCart) : [];
  } catch (error) {
    return [];
  }
};

const initialState = {
  items: loadLocalCart(), // items: [{ product: {...}, quantity: 2 }]
  loading: false,
  error: null
};

// Thunk to Fetch Cart from database
export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, thunkAPI) => {
    try {
      const response = await api.get('/cart');
      return response.data.data.cart.items; // Returns populated items
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to fetch cart');
    }
  }
);

// Thunk to Add/Update item in cart
export const syncAddToCart = createAsyncThunk(
  'cart/syncAddToCart',
  async ({ productId, quantity }, thunkAPI) => {
    try {
      const response = await api.post('/cart/add', { product: productId, quantity });
      return response.data.data.cart.items;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to sync cart item');
    }
  }
);

// Thunk to Remove item from cart
export const syncRemoveFromCart = createAsyncThunk(
  'cart/syncRemoveFromCart',
  async (productId, thunkAPI) => {
    try {
      const response = await api.post('/cart/remove', { productId });
      return response.data.data.cart.items;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to remove cart item');
    }
  }
);

// Thunk to Clear cart
export const syncClearCart = createAsyncThunk(
  'cart/syncClearCart',
  async (_, thunkAPI) => {
    try {
      const response = await api.post('/cart/clear');
      return response.data.data.cart.items;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to clear cart');
    }
  }
);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Guest Reducers (Local Storage)
    guestAddToCart: (state, action) => {
      const { product, quantity = 1 } = action.payload;
      const existingItemIndex = state.items.findIndex(item => item.product._id === product._id);

      if (existingItemIndex > -1) {
        state.items[existingItemIndex].quantity = quantity;
      } else {
        state.items.push({ product, quantity });
      }
      localStorage.setItem('grovio_cart', JSON.stringify(state.items));
    },
    guestRemoveFromCart: (state, action) => {
      const productId = action.payload;
      state.items = state.items.filter(item => item.product._id !== productId);
      localStorage.setItem('grovio_cart', JSON.stringify(state.items));
    },
    guestClearCart: (state) => {
      state.items = [];
      localStorage.removeItem('grovio_cart');
    },
    // Merge local cart to DB cart upon login
    mergeLocalCart: (state) => {
      state.items = [];
      localStorage.removeItem('grovio_cart');
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Cart
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Sync Add To Cart
      .addCase(syncAddToCart.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      
      // Sync Remove From Cart
      .addCase(syncRemoveFromCart.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      
      // Sync Clear Cart
      .addCase(syncClearCart.fulfilled, (state, action) => {
        state.items = action.payload;
      });
  }
});

export const { guestAddToCart, guestRemoveFromCart, guestClearCart, mergeLocalCart } = cartSlice.actions;

// Selectors for quick cart calculation helper
export const selectCartItems = (state) => state.cart.items;
export const selectCartTotalItems = (state) => 
  state.cart.items.reduce((total, item) => total + item.quantity, 0);

export const selectCartSubtotal = (state) => 
  state.cart.items.reduce((total, item) => {
    const price = item.product.discountPrice || item.product.price;
    return total + (price * item.quantity);
  }, 0);

export const selectCartSavings = (state) => 
  state.cart.items.reduce((total, item) => {
    if (item.product.discountPrice) {
      const discount = item.product.price - item.product.discountPrice;
      return total + (discount * item.quantity);
    }
    return total;
  }, 0);

export default cartSlice.reducer;
