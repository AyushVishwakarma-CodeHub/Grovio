import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/axios.js';

const initialState = {
  products: [],
  categories: [],
  featuredProducts: [],
  selectedProduct: null,
  pagination: {
    page: 1,
    limit: 12,
    totalProducts: 0,
    totalPages: 0
  },
  filters: {
    category: '',
    search: '',
    minPrice: '',
    maxPrice: '',
    brand: '',
    inStock: false,
    sortBy: 'newest'
  },
  loading: false,
  categoriesLoading: false,
  error: null
};

// Thunk to fetch products with filters & pagination
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (params, thunkAPI) => {
    try {
      const response = await api.get('/products', { params });
      return response.data.data; // { products, pagination }
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to fetch products');
    }
  }
);

// Thunk to fetch categories
export const fetchCategories = createAsyncThunk(
  'products/fetchCategories',
  async (_, thunkAPI) => {
    try {
      const response = await api.get('/categories');
      return response.data.data.categories;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to fetch categories');
    }
  }
);

// Thunk to fetch featured (discounted) products
export const fetchFeaturedProducts = createAsyncThunk(
  'products/fetchFeatured',
  async (_, thunkAPI) => {
    try {
      const response = await api.get('/products/featured');
      return response.data.data.products;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to fetch featured products');
    }
  }
);

// Thunk to fetch product details by slug
export const fetchProductBySlug = createAsyncThunk(
  'products/fetchBySlug',
  async (slug, thunkAPI) => {
    try {
      const response = await api.get(`/products/${slug}`);
      return response.data.data.product;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to fetch product details');
    }
  }
);

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setFilter: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1; // Reset to page 1 on filter update
    },
    resetFilters: (state) => {
      state.filters = { ...initialState.filters };
      state.pagination.page = 1;
    },
    setPage: (state, action) => {
      state.pagination.page = action.payload;
    },
    clearSelectedProduct: (state) => {
      state.selectedProduct = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Products
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload.products;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Categories
      .addCase(fetchCategories.pending, (state) => {
        state.categoriesLoading = true;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categoriesLoading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state) => {
        state.categoriesLoading = false;
      })

      // Fetch Featured Products
      .addCase(fetchFeaturedProducts.fulfilled, (state, action) => {
        state.featuredProducts = action.payload;
      })

      // Fetch Product Details
      .addCase(fetchProductBySlug.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductBySlug.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedProduct = action.payload;
      })
      .addCase(fetchProductBySlug.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { setFilter, resetFilters, setPage, clearSelectedProduct } = productSlice.actions;
export default productSlice.reducer;
