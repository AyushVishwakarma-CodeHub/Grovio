import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import NotificationBell from './NotificationBell.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Search, ShoppingCart, User, Sun, Moon, MapPin, 
  ChevronDown, LogOut, LayoutDashboard, Menu, X, ShoppingBag, LifeBuoy, Heart 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import { logoutUser } from '../store/authSlice.js';
import { selectCartTotalItems, selectCartSubtotal } from '../store/cartSlice.js';
import GrovioLogo from './GrovioLogo.jsx';

export const Navbar = ({ onCartToggle }) => {
  const { darkMode, toggleTheme } = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  
  const cartItemCount = useSelector(selectCartTotalItems);
  const cartSubtotal = useSelector(selectCartSubtotal);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  // displayAddress: shown in navbar — reads from localStorage first, then user profile
  const [displayAddress, setDisplayAddress] = useState(
    () => localStorage.getItem('grovio_address') || user?.address || ''
  );

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    setProfileOpen(false);
    navigate('/login');
  };

  return (
    <>
    <nav className="sticky top-0 z-40 w-full glass border-b border-gray-100 dark:border-dark-border transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Logo & Tagline */}
          <div className="flex items-center gap-6 flex-shrink-0">
            <Link to="/" className="group hover:opacity-90 transition-opacity duration-200">
              <GrovioLogo size={36} showTagline={true} />
            </Link>

            {/* Address Selector (Blinkit style) */}
            <div
              className="hidden lg:flex items-center gap-2 text-left cursor-pointer p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors duration-200"
              onClick={() => {
                setAddressInput(displayAddress);
                setAddressModalOpen(true);
              }}
              role="button"
              aria-label="Select delivery address"
            >
              <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-950/20 text-primary-500 flex items-center justify-center">
                <MapPin size={18} />
              </div>
              <div className="text-xs">
                <p className="font-bold text-gray-900 dark:text-white flex items-center gap-0.5">
                  Delivery in 10 mins
                  <ChevronDown size={12} />
                </p>
                <p className="text-gray-500 dark:text-dark-muted max-w-[150px] truncate">
                  {displayAddress || 'Select Address'}
                </p>
              </div>
            </div>
          </div>

          {/* Instant Search Bar */}
          <form 
            onSubmit={handleSearchSubmit} 
            className="flex-1 max-w-lg relative group hidden md:block"
          >
            <div className="relative">
              <input
                type="text"
                placeholder='Search "milk", "fresh fruits", "biscuits"...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2.5 sm:py-3 pl-12 pr-4 text-sm rounded-2xl border border-gray-200 dark:border-dark-border bg-gray-50/50 dark:bg-slate-900/30 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:focus:ring-primary-500 transition-all duration-300 shadow-inner"
              />
              <button 
                type="submit"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors duration-200"
              >
                <Search size={18} />
              </button>
            </div>
          </form>

          {/* Right Section Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 sm:p-3 rounded-2xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-dark-text transition-all duration-300 transform active:scale-95"
              aria-label="Toggle Theme"
            >
              {darkMode ? <Sun size={18} className="text-yellow-500" /> : <Moon size={18} />}
            </button>

            {/* Notification Bell */}
            <NotificationBell />

            {/* Profile Dropdown */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-1.5 p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-all duration-200"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <ChevronDown size={14} className="text-gray-500 hidden sm:block" />
                </button>

                {profileOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setProfileOpen(false)}
                    />
                    <div className="absolute right-0 mt-3 w-56 rounded-2xl shadow-xl bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border py-2 z-20 transform origin-top-right transition-all duration-200">
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-border">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {user?.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-dark-muted truncate">
                          {user?.email}
                        </p>
                      </div>
                      
                      {/* Role dashboard shortcut links */}
                      {(user?.role === 'admin' || user?.role === 'store_manager') && (
                        <Link
                          to="/admin"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <LayoutDashboard size={16} className="text-primary-500" />
                          Admin Console
                        </Link>
                      )}

                      {user?.role === 'delivery_partner' && (
                        <Link
                          to="/rider"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <LayoutDashboard size={16} className="text-primary-500" />
                          Rider Dashboard
                        </Link>
                      )}

                      <Link
                        to="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <ShoppingBag size={16} />
                        My Orders
                      </Link>

                      <Link
                        to="/wishlist"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Heart size={16} className="text-red-500" />
                        My Wishlist
                      </Link>

                      <Link
                        to="/support"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors border-b border-gray-100 dark:border-dark-border/40 pb-2"
                      >
                        <LifeBuoy size={16} />
                        Support Helpdesk
                      </Link>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-left transition-colors border-t border-gray-100 dark:border-dark-border"
                      >
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="py-2.5 px-5 text-sm font-semibold rounded-2xl text-white bg-primary-500 hover:bg-primary-600 shadow-glow transition-all duration-300"
              >
                Login
              </Link>
            )}

            {/* Shopping Cart Button (Trigger Drawer) */}
            <button
              onClick={onCartToggle}
              className="flex items-center gap-2 py-2.5 px-4 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white shadow-glow hover:shadow-lg transition-all duration-300 transform active:scale-95"
            >
              <div className="relative">
                <ShoppingCart size={18} />
                {cartItemCount > 0 && (
                  <span className="absolute -top-3.5 -right-3.5 bg-red-500 text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-bold border-2 border-primary-500">
                    {cartItemCount}
                  </span>
                )}
              </div>
              <div className="text-xs font-bold hidden sm:block text-left">
                <p className="leading-tight">My Cart</p>
                <p className="text-[10px] opacity-80 leading-none">
                  {cartItemCount > 0 ? `₹${cartSubtotal}` : 'Empty'}
                </p>
              </div>
            </button>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-2xl md:hidden hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Search and Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 dark:border-dark-border glass p-4 flex flex-col gap-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2 pl-10 pr-4 text-sm rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white"
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </form>
          
          <div className="flex flex-col gap-2 font-medium">
            <Link to="/" className="px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800" onClick={() => setMobileMenuOpen(false)}>
              Shop Home
            </Link>
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-left text-sm text-gray-700 dark:text-dark-text"
              onClick={() => { setMobileMenuOpen(false); setAddressModalOpen(true); }}
            >
              <MapPin size={14} className="text-primary-500" />
              {user?.address ? `Delivering to: ${user.address}` : 'Select Delivery Address'}
            </button>
          </div>
        </div>
      )}

      {/* ── Address Modal — rendered via portal to document.body so fixed positioning works correctly ── */}
    </nav>

    {addressModalOpen && ReactDOM.createPortal(
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
          onClick={() => setAddressModalOpen(false)}
        />
        {/* Modal Card — perfectly centred */}
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
          <div className="w-full max-w-md bg-white dark:bg-dark-card rounded-3xl shadow-2xl border border-gray-100 dark:border-dark-border p-6 pointer-events-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-950/30 flex items-center justify-center">
                  <MapPin size={18} className="text-primary-500" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Delivery Address</h2>
                  <p className="text-xs text-gray-500 dark:text-dark-muted">Where should we deliver?</p>
                </div>
              </div>
              <button
                onClick={() => setAddressModalOpen(false)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Delivery promise badge */}
            <div className="flex items-center gap-2 bg-primary-50 dark:bg-primary-950/20 rounded-2xl px-4 py-3 mb-5">
              <span className="text-lg">⚡</span>
              <div>
                <p className="text-sm font-bold text-primary-600 dark:text-primary-400">Delivery in 10 minutes</p>
                <p className="text-xs text-primary-500/80">Fastest grocery delivery in your area</p>
              </div>
            </div>

            {/* Address input */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-700 dark:text-dark-text uppercase tracking-wider mb-2">
                Enter your full address
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="e.g. 123, Model Town, Jalandhar, Punjab"
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-2xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (addressInput.trim()) {
                        const addr = addressInput.trim();
                        localStorage.setItem('grovio_address', addr);
                        setDisplayAddress(addr);
                        setAddressModalOpen(false);
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Quick suggestions */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-500 dark:text-dark-muted mb-2">Quick pick</p>
              <div className="flex flex-wrap gap-2">
                {['Jalandhar, Punjab', 'Model Town, Jalandhar', 'Lajpat Nagar, Jalandhar'].map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setAddressInput(loc)}
                    className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-dark-border hover:border-primary-400 hover:text-primary-500 dark:text-dark-text transition-colors"
                  >
                    📍 {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setAddressModalOpen(false)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-dark-border text-sm font-semibold text-gray-600 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (addressInput.trim()) {
                    const addr = addressInput.trim();
                    localStorage.setItem('grovio_address', addr);
                    setDisplayAddress(addr);
                    setAddressModalOpen(false);
                  }
                }}
                className="flex-1 py-3 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-bold shadow-glow transition-all active:scale-95"
              >
                Save Address
              </button>
            </div>
          </div>
        </div>
      </>,
      document.body
    )}
  </>  
  );
};
export default Navbar;
