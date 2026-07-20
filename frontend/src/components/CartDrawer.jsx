import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios.js';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Plus, Minus, Trash2, Ticket, ArrowRight, 
  ShoppingBag, ShieldCheck, Percent, HelpCircle 
} from 'lucide-react';
import { 
  selectCartItems, selectCartSubtotal, selectCartSavings,
  guestAddToCart, guestRemoveFromCart, 
  syncAddToCart, syncRemoveFromCart 
} from '../store/cartSlice.js';
import { toast } from 'react-toastify';

export const CartDrawer = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cartItems = useSelector(selectCartItems);
  const subtotal = useSelector(selectCartSubtotal);
  const savings = useSelector(selectCartSavings);
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [activeCoupon, setActiveCoupon] = useState('');
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCoupons();
    }
  }, [isOpen]);

  const fetchCoupons = async () => {
    try {
      const response = await api.get('/coupons');
      // Filter out inactive/expired if needed, or backend already sorts them
      setAvailableCoupons(response.data.data.coupons.filter(c => new Date(c.expiryDate) > new Date()));
    } catch (error) {
      console.error('Failed to fetch coupons', error);
    }
  };

  // Bill Calculations
  const tax = Math.round(subtotal * 0.05); // 5% GST
  const deliveryFee = subtotal > 200 || subtotal === 0 ? 0 : 30; // Free delivery above 200
  const grandTotal = Math.max(0, subtotal + tax + deliveryFee - appliedDiscount);

  const handleQuantityChange = (item, newQty) => {
    if (newQty < 1) {
      handleRemoveItem(item.product._id);
      return;
    }
    
    // Check stock bounds
    if (newQty > item.product.stock) {
      toast.warning(`Only ${item.product.stock} units available in stock.`);
      return;
    }

    if (isAuthenticated) {
      dispatch(syncAddToCart({ productId: item.product._id, quantity: newQty }));
    } else {
      dispatch(guestAddToCart({ product: item.product, quantity: newQty }));
    }
  };

  const handleRemoveItem = (productId) => {
    if (isAuthenticated) {
      dispatch(syncRemoveFromCart(productId));
    } else {
      dispatch(guestRemoveFromCart(productId));
    }
    toast.info('Item removed from cart');
  };

  const handleApplyCoupon = async (e, codeToApply = null) => {
    if (e) e.preventDefault();
    const code = (codeToApply || couponCode).trim().toUpperCase();
    if (!code) return;

    if (cartItems.length === 0) {
      toast.warning('Your cart is empty');
      return;
    }

    try {
      setIsApplying(true);
      const response = await api.post('/coupons/validate', {
        code,
        cartSubtotal: subtotal
      });
      
      const { discountAmount } = response.data.data;
      setAppliedDiscount(discountAmount);
      setActiveCoupon(code);
      setCouponCode('');
      toast.success(`${code} applied! ₹${discountAmount} saved.`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid coupon code');
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedDiscount(0);
    setActiveCoupon('');
    toast.info('Coupon removed');
  };

  const handleCheckout = () => {
    onClose();
    if (!isAuthenticated) {
      toast.info('Please login to place an order');
      navigate('/login', { state: { from: '/checkout' } });
    } else {
      navigate('/checkout', { state: { coupon: activeCoupon, discount: appliedDiscount } });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />

          {/* Cart Panel Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.35 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-dark-bg shadow-2xl flex flex-col h-full overflow-hidden transition-colors duration-300"
          >
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-dark-border flex items-center justify-between bg-white dark:bg-dark-card">
              <div className="flex items-center gap-2">
                <ShoppingBag className="text-primary-500" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  My Cart ({cartItems.length} items)
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-dark-text transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center my-auto text-center py-10">
                  <div className="w-20 h-20 rounded-full bg-primary-50 dark:bg-primary-950/20 flex items-center justify-center text-primary-500 mb-4 animate-bounce">
                    <ShoppingBag size={40} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    Your Cart is Empty
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-dark-muted mb-6">
                    Add items from the store to experience smart grocery shopping.
                  </p>
                  <button
                    onClick={onClose}
                    className="py-3 px-6 rounded-2xl text-sm font-semibold bg-primary-500 hover:bg-primary-600 text-white shadow-glow transition-all duration-300 transform active:scale-95"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <>
                  {/* Cart Items List */}
                  <div className="flex flex-col gap-4">
                    {cartItems.map((item) => {
                      const finalPrice = item.product.discountPrice || item.product.price;
                      return (
                        <motion.div
                          key={item.product._id}
                          layout
                          className="flex gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-dark-border group"
                        >
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-16 h-16 rounded-xl object-cover bg-white border border-gray-200/50"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                              {item.product.name}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-dark-muted">
                              {item.product.unit} | Brand: {item.product.brand || 'Fresh'}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                ₹{finalPrice}
                              </span>
                              {item.product.discountPrice && (
                                <span className="text-xs text-gray-400 line-through">
                                  ₹{item.product.price}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end justify-between">
                            <button
                              onClick={() => handleRemoveItem(item.product._id)}
                              className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all duration-200"
                            >
                              <Trash2 size={16} />
                            </button>
                            
                            {/* Quantity Editor Counter */}
                            <div className="flex items-center gap-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-1 shadow-sm mt-2">
                              <button
                                onClick={() => handleQuantityChange(item, item.quantity - 1)}
                                className="w-6 h-6 rounded-lg bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center text-gray-600 dark:text-white transition-colors"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="text-xs font-bold w-6 text-center text-gray-900 dark:text-white">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleQuantityChange(item, item.quantity + 1)}
                                className="w-6 h-6 rounded-lg bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center text-gray-600 dark:text-white transition-colors"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Coupon Application Block */}
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900/30 border border-dashed border-gray-300 dark:border-slate-800">
                    {activeCoupon ? (
                      <div className="flex items-center justify-between bg-primary-50 dark:bg-primary-950/20 p-2.5 rounded-xl border border-primary-200 dark:border-primary-900/50">
                        <div className="flex items-center gap-2">
                          <Percent size={16} className="text-primary-500" />
                          <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-white">
                              {activeCoupon} Applied
                            </p>
                            <p className="text-[10px] text-primary-600">
                              ₹{appliedDiscount} discount saved!
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleRemoveCoupon}
                          className="text-xs font-bold text-red-500 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleApplyCoupon} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter Promo Code (e.g. GROVIO50)"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          className="flex-1 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 uppercase font-mono tracking-wider text-gray-800 dark:text-white"
                        />
                        <button
                          type="submit"
                          disabled={isApplying}
                          className="py-2 px-4 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-semibold shadow-glow transform active:scale-95 transition-all disabled:opacity-50"
                        >
                          {isApplying ? 'Applying...' : 'Apply'}
                        </button>
                      </form>
                    )}

                    {/* Available Coupons List */}
                    {!activeCoupon && availableCoupons.length > 0 && (
                      <div className="mt-4 border-t border-dashed border-gray-200 dark:border-slate-800 pt-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Available Coupons</p>
                        <div className="flex flex-col gap-2">
                          {availableCoupons.map(coupon => (
                            <div key={coupon._id} className="flex justify-between items-center bg-white dark:bg-dark-card p-2 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
                              <div>
                                <p className="text-xs font-bold text-gray-900 dark:text-white uppercase font-mono">{coupon.code}</p>
                                <p className="text-[9px] text-gray-500 dark:text-dark-muted">
                                  Save {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`} 
                                  {coupon.minPurchase > 0 && ` on orders above ₹${coupon.minPurchase}`}
                                </p>
                              </div>
                              <button 
                                onClick={() => handleApplyCoupon(null, coupon.code)}
                                disabled={isApplying || subtotal < coupon.minPurchase}
                                className="text-[10px] font-bold text-primary-500 hover:text-white hover:bg-primary-500 px-2.5 py-1 rounded-lg transition-colors border border-primary-100 dark:border-primary-900/30 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-primary-500"
                              >
                                Apply
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bill Details */}
                  <div className="flex flex-col gap-3.5 bg-gray-50 dark:bg-slate-900/30 p-4 rounded-2xl border border-gray-100 dark:border-dark-border">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-200/50 dark:border-slate-800 pb-2">
                      Billing Details
                    </h3>
                    
                    <div className="flex justify-between text-xs text-gray-600 dark:text-dark-muted">
                      <span>Item Subtotal</span>
                      <span className="font-semibold text-gray-800 dark:text-white">₹{subtotal}</span>
                    </div>

                    {savings > 0 && (
                      <div className="flex justify-between text-xs text-green-500">
                        <span>Catalog Savings</span>
                        <span className="font-semibold">-₹{savings}</span>
                      </div>
                    )}

                    {activeCoupon && (
                      <div className="flex justify-between text-xs text-green-500">
                        <span>Coupon Discount ({activeCoupon})</span>
                        <span className="font-semibold">-₹{appliedDiscount}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-xs text-gray-600 dark:text-dark-muted">
                      <span className="flex items-center gap-1">
                        GST (5% Flat)
                        <HelpCircle size={12} className="opacity-50" />
                      </span>
                      <span className="font-semibold text-gray-800 dark:text-white">₹{tax}</span>
                    </div>

                    <div className="flex justify-between text-xs text-gray-600 dark:text-dark-muted">
                      <span>Delivery Fee</span>
                      <span className="font-semibold text-gray-800 dark:text-white">
                        {deliveryFee === 0 ? <span className="text-green-500">FREE</span> : `₹${deliveryFee}`}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white border-t border-gray-200/50 dark:border-slate-800 pt-2.5">
                      <span>Grand Total</span>
                      <span>₹{grandTotal}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Checkout Footer Button */}
            {cartItems.length > 0 && (
              <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card">
                <button
                  onClick={handleCheckout}
                  className="w-full py-4 px-6 rounded-2xl font-bold bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-between shadow-glow hover:shadow-lg transition-all duration-300 transform active:scale-95"
                >
                  <div className="text-left">
                    <p className="text-[10px] uppercase tracking-wider opacity-80">Proceeding to Pay</p>
                    <p className="text-sm font-extrabold">₹{grandTotal}</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-wide">
                    Checkout
                    <ArrowRight size={16} />
                  </span>
                </button>
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400 mt-3.5">
                  <ShieldCheck size={12} />
                  <span>Secure checkout processed by Grovio Shield</span>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
export default CartDrawer;
