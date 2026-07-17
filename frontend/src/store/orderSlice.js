import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/axios.js';

const initialState = {
  orders: [],
  currentOrder: null,
  activeTrackingOrder: null,
  loading: false,
  error: null
};

// Thunk to create a new order
export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async (orderData, thunkAPI) => {
    try {
      const response = await api.post('/orders', orderData);
      return response.data.data.order;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to place order');
    }
  }
);

// Thunk to fetch user's order history
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (_, thunkAPI) => {
    try {
      const response = await api.get('/orders');
      return response.data.data.orders;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to load order history');
    }
  }
);

// Thunk to fetch a specific order details
export const fetchOrderDetails = createAsyncThunk(
  'orders/fetchOrderDetails',
  async (orderId, thunkAPI) => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      return response.data.data.order;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to load order details');
    }
  }
);

// Thunk to assign order to self (Delivery Driver)
export const assignOrderDriver = createAsyncThunk(
  'orders/assignDriver',
  async (orderId, thunkAPI) => {
    try {
      const response = await api.post(`/orders/${orderId}/assign`);
      return response.data.data.order;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to accept order');
    }
  }
);

// Thunk to update order status (Admin / Rider)
export const updateOrderStatus = createAsyncThunk(
  'orders/updateStatus',
  async ({ orderId, status }, thunkAPI) => {
    try {
      const response = await api.put(`/orders/${orderId}/status`, { status });
      return response.data.data.order;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to update order status');
    }
  }
);

// Thunk to verify delivery OTP (Rider completing delivery)
export const verifyOrderOtp = createAsyncThunk(
  'orders/verifyOtp',
  async ({ orderId, otp }, thunkAPI) => {
    try {
      const response = await api.post(`/orders/${orderId}/verify-otp`, { otp });
      return response.data.data.order;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Incorrect OTP or verification failed');
    }
  }
);

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setTrackingOrder: (state, action) => {
      state.activeTrackingOrder = action.payload;
    },
    updateTrackingStatus: (state, action) => {
      if (state.activeTrackingOrder && state.activeTrackingOrder._id === action.payload.orderId) {
        state.activeTrackingOrder.orderStatus = action.payload.status;
        state.activeTrackingOrder.timeline.push({
          status: action.payload.status,
          timestamp: new Date().toISOString()
        });
      }
    },
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Create Order
      .addCase(createOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder = action.payload;
        state.activeTrackingOrder = action.payload;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Orders List
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Order Details
      .addCase(fetchOrderDetails.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchOrderDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder = action.payload;
      })
      .addCase(fetchOrderDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Driver assignments & status modifications update currentOrder state
      .addCase(assignOrderDriver.fulfilled, (state, action) => {
        state.currentOrder = action.payload;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.currentOrder = action.payload;
        if (state.activeTrackingOrder && state.activeTrackingOrder._id === action.payload._id) {
          state.activeTrackingOrder = action.payload;
        }
      })
      .addCase(verifyOrderOtp.fulfilled, (state, action) => {
        state.currentOrder = action.payload;
        if (state.activeTrackingOrder && state.activeTrackingOrder._id === action.payload._id) {
          state.activeTrackingOrder = action.payload;
        }
      });
  }
});

export const { setTrackingOrder, updateTrackingStatus, clearCurrentOrder } = orderSlice.actions;
export default orderSlice.reducer;
