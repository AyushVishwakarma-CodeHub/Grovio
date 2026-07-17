import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import CartDrawer from './CartDrawer.jsx';
import { loadUser } from '../store/authSlice.js';
import { fetchCart } from '../store/cartSlice.js';
import { fetchWishlist } from '../store/wishlistSlice.js';
import { fetchNotifications } from '../store/notificationSlice.js';

export const AppLayout = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [cartOpen, setCartOpen] = useState(false);

  // Initialize and restore session on page mount/reload
  useEffect(() => {
    dispatch(loadUser());
  }, [dispatch]);

  // Once authenticated, load user cart, wishlist, and notifications from DB
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchCart());
      dispatch(fetchWishlist());
      dispatch(fetchNotifications());
    }
  }, [isAuthenticated, dispatch]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
      {/* Top sticky navbar */}
      <Navbar onCartToggle={() => setCartOpen(prev => !prev)} />
      
      {/* Sliding side drawer for shopping basket items */}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      
      {/* Content wrapper */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <Outlet />
      </main>

      {/* Footer info links */}
      <Footer />
    </div>
  );
};
export default AppLayout;
