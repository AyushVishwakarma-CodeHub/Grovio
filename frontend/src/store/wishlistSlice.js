import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/axios.js';

// Thunks
export const fetchWishlist = createAsyncThunk('wishlist/fetch', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/wishlist');
    return res.data.data.wishlist;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch wishlist');
  }
});

export const toggleWishlistItem = createAsyncThunk('wishlist/toggle', async (productId, { rejectWithValue }) => {
  try {
    const res = await api.post(`/wishlist/${productId}`);
    return res.data.data; // { added, wishlist }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update wishlist');
  }
});

export const clearWishlistAsync = createAsyncThunk('wishlist/clear', async (_, { rejectWithValue }) => {
  try {
    await api.delete('/wishlist');
    return [];
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to clear wishlist');
  }
});

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: {
    items: [],       // full product objects
    ids: [],         // just product IDs for quick lookup
    loading: false,
    error: null
  },
  reducers: {
    resetWishlist: (state) => {
      state.items = [];
      state.ids = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // fetch
      .addCase(fetchWishlist.pending, (state) => { state.loading = true; })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.ids = action.payload.map(p => p._id);
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // toggle
      .addCase(toggleWishlistItem.fulfilled, (state, action) => {
        const { added, wishlist } = action.payload;
        state.ids = wishlist;
        if (!added) {
          // Remove from items list
          state.items = state.items.filter(p => wishlist.includes(p._id));
        }
      })
      // clear
      .addCase(clearWishlistAsync.fulfilled, (state) => {
        state.items = [];
        state.ids = [];
      });
  }
});

export const { resetWishlist } = wishlistSlice.actions;

// Selectors
export const selectWishlistItems = (state) => state.wishlist.items;
export const selectWishlistIds = (state) => state.wishlist.ids;
export const selectIsWishlisted = (productId) => (state) =>
  state.wishlist.ids.includes(productId);

export default wishlistSlice.reducer;
