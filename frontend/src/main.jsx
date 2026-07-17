import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { store } from './store/index.js';
import { ThemeProvider } from './context/ThemeContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

import AppLayout from './components/AppLayout.jsx';
import Home from './pages/Home.jsx';
import ProductDetails from './pages/ProductDetails.jsx';
import Search from './pages/Search.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Checkout from './pages/Checkout.jsx';
import OrderSuccess from './pages/OrderSuccess.jsx';
import Profile from './pages/Profile.jsx';
import OrderTracking from './pages/OrderTracking.jsx';
import RiderDashboard from './pages/RiderDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Support from './pages/Support.jsx';
import NotFound from './pages/NotFound.jsx';
import Wishlist from './pages/Wishlist.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import './index.css';

// Router setup mapping pages and nesting them under layouts
const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ErrorBoundary>
        <AppLayout />
      </ErrorBoundary>
    ),
    children: [
      {
        path: '/',
        element: <Home />
      },
      {
        path: '/category/:slug',
        element: <Home /> // Category view reuses the Home catalog view
      },
      {
        path: '/product/:slug',
        element: <ProductDetails />
      },
      {
        path: '/search',
        element: <Search />
      },
      {
        path: '/login',
        element: <Login />
      },
      {
        path: '/register',
        element: <Register />
      },
      {
        path: '/checkout',
        element: (
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        )
      },
      {
        path: '/order-success/:id',
        element: (
          <ProtectedRoute>
            <OrderSuccess />
          </ProtectedRoute>
        )
      },
      {
        path: '/profile',
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        )
      },
      {
        path: '/order-tracking/:id',
        element: (
          <ProtectedRoute>
            <OrderTracking />
          </ProtectedRoute>
        )
      },
      {
        path: '/rider',
        element: (
          <ProtectedRoute allowedRoles={['delivery_partner']}>
            <RiderDashboard />
          </ProtectedRoute>
        )
      },
      {
        path: '/admin',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'store_manager']}>
            <AdminDashboard />
          </ProtectedRoute>
        )
      },
      {
        path: '/support',
        element: (
          <ProtectedRoute>
            <Support />
          </ProtectedRoute>
        )
      },
      {
        path: '/wishlist',
        element: (
          <ProtectedRoute>
            <Wishlist />
          </ProtectedRoute>
        )
      }
    ]
  },
  {
    path: '*',
    element: <NotFound />
  }
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <RouterProvider router={router} />
        {/* Toast Triggers configuration container */}
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
