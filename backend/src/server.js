import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { globalErrorHandler } from './middlewares/error.js';
import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import userRoutes from './routes/userRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { sendSuccess } from './utils/response.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Attach socket io instance to request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middleware configurations
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Connect to MongoDB
connectDB();

// API Health Check
app.get('/api/health', (req, res) => {
  return sendSuccess(res, 200, 'Grocery Delivery System API is healthy and running');
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);

// Socket.io connection mapping
const activeUsers = new Map(); // userId -> socketId
const activeDrivers = new Map(); // driverId -> socketId

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join', (userId) => {
    activeUsers.set(userId, socket.id);
    console.log(`User ${userId} joined room ${socket.id}`);
  });

  socket.on('joinDriver', (driverId) => {
    activeDrivers.set(driverId, socket.id);
    console.log(`Delivery driver ${driverId} joined room ${socket.id}`);
  });

  socket.on('driverLocationUpdate', (data) => {
    // data: { driverId, orderId, coordinates: [lng, lat] }
    const { orderId, coordinates } = data;
    // Broadcast location update to room watching this order
    io.to(`order_${orderId}`).emit('locationUpdated', { coordinates });
  });

  socket.on('watchOrder', (orderId) => {
    socket.join(`order_${orderId}`);
    console.log(`Socket ${socket.id} watching order ${orderId}`);
  });

  socket.on('unwatchOrder', (orderId) => {
    socket.leave(`order_${orderId}`);
    console.log(`Socket ${socket.id} stopped watching order ${orderId}`);
  });

  socket.on('disconnect', () => {
    // Cleanup active connection caches
    for (const [userId, socketId] of activeUsers.entries()) {
      if (socketId === socket.id) {
        activeUsers.delete(userId);
        break;
      }
    }
    for (const [driverId, socketId] of activeDrivers.entries()) {
      if (socketId === socket.id) {
        activeDrivers.delete(driverId);
        break;
      }
    }
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Catch-all route handler for undefined endpoints
app.all('*', (req, res, next) => {
  const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  err.statusCode = 404;
  next(err);
});

// Global Error Handler
app.use(globalErrorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

export { app, io, server };
