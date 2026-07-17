import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { 
  MapPin, Plus, Clock, CreditCard, ShoppingBag, 
  ChevronRight, Calendar, Landmark, Lock, CheckCircle2, X 
} from 'lucide-react';
import api from '../utils/axios.js';
import { 
  selectCartItems, selectCartSubtotal, guestClearCart, fetchCart 
} from '../store/cartSlice.js';
import { createOrder } from '../store/orderSlice.js';
import { toast } from 'react-toastify';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const Checkout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const cartItems = useSelector(selectCartItems);
  const subtotal = useSelector(selectCartSubtotal);

  // Read discount values passed from CartDrawer state
  const couponDiscount = location.state?.discount || 0;
  const appliedCoupon = location.state?.coupon || '';

  // Local States
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [deliverySlot, setDeliverySlot] = useState('instant');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);

  // Address Form Hook
  const { 
    register: registerAddress, 
    handleSubmit: handleAddressSubmit, 
    reset: resetAddressForm,
    formState: { errors: addressErrors } 
  } = useForm();

  // Card Payment Form Hook
  const { 
    register: registerCard, 
    handleSubmit: handleCardSubmit, 
    formState: { errors: cardErrors } 
  } = useForm();

  // Load user addresses on mount
  const loadAddresses = async () => {
    try {
      setAddressesLoading(true);
      const response = await api.get('/addresses');
      const fetched = response.data.data.addresses;
      setAddresses(fetched);
      
      // Auto select default address
      const defaultAddr = fetched.find(a => a.isDefault);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr._id);
      } else if (fetched.length > 0) {
        setSelectedAddressId(fetched[0]._id);
      }
    } catch (error) {
      toast.error('Failed to load saved addresses');
    } finally {
      setAddressesLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  // Redirect if cart is empty
  useEffect(() => {
    if (cartItems.length === 0) {
      toast.info('Your cart is empty. Redirecting to home.');
      navigate('/');
    }
  }, [cartItems, navigate]);

  // Billing details
  const tax = Math.round(subtotal * 0.05); // 5% GST
  const deliveryFee = subtotal > 200 ? 0 : 30;
  const grandTotal = Math.max(0, subtotal + tax + deliveryFee - couponDiscount);

  const handleAddNewAddress = async (data) => {
    try {
      const response = await api.post('/addresses', {
        title: data.title,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2 || '',
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        coordinates: [77.1025, 28.7041] // mock coords (Delhi NCR standard)
      });
      
      toast.success('Address saved successfully');
      setAddressModalOpen(false);
      resetAddressForm();
      
      // Reload and auto select new address
      const newAddr = response.data.data.address;
      setAddresses(prev => [newAddr, ...prev]);
      setSelectedAddressId(newAddr._id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save address');
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.warning('Please select a delivery address');
      return;
    }

    try {
      setOrderSubmitting(true);
      
      const orderPayload = {
        addressId: selectedAddressId,
        paymentMethod,
        coupon: appliedCoupon,
        discount: couponDiscount
      };

      const resultAction = await dispatch(createOrder(orderPayload));
      
      if (createOrder.fulfilled.match(resultAction)) {
        const order = resultAction.payload;

        // If Cash on Delivery, checkout is done immediately
        if (paymentMethod === 'cod') {
          toast.success('Order placed successfully! (Cash on Delivery)');
          dispatch(fetchCart()); // sync empty cart
          navigate(`/order-success/${order._id}`);
          return;
        }

        // If Credit Card/Online, trigger Razorpay online checkout
        if (paymentMethod === 'card') {
          // 1. Call Backend to create Razorpay Order
          const razorpayResponse = await api.post('/payments/create', { orderId: order._id });
          const { keyId, razorpayOrder } = razorpayResponse.data.data;

          // 2. Check if we are running in Simulation Fallback Mode
          if (razorpayOrder.mock) {
            toast.info('Razorpay Credentials not set. Simulating card checkout capture...');
            
            // Call backend verification with simulated credentials
            const verifyResponse = await api.post('/payments/verify', {
              orderId: order._id,
              razorpay_order_id: razorpayOrder.id,
              razorpay_payment_id: `pay_mock_${Math.random().toString(36).substring(2, 11)}`,
              razorpay_signature: 'mock_verified_signature'
            });

            if (verifyResponse.data.success) {
              toast.success('Simulated online card payment captured!');
              dispatch(fetchCart());
              navigate(`/order-success/${order._id}`);
            } else {
              toast.error('Simulated payment verification failed.');
            }
            return;
          }

          // 3. Load standard Razorpay Script and trigger gateway modal
          const isScriptLoaded = await loadRazorpayScript();
          if (!isScriptLoaded) {
            toast.error('Failed to load Razorpay payment gateway. Please check internet.');
            return;
          }

          const options = {
            key: keyId,
            amount: razorpayOrder.amount,
            currency: 'INR',
            name: 'Grovio',
            description: 'Fresh Groceries. Delivered Smarter.',
            order_id: razorpayOrder.id,
            handler: async function (response) {
              try {
                setOrderSubmitting(true);
                const verifyResponse = await api.post('/payments/verify', {
                  orderId: order._id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                });
                
                if (verifyResponse.data.success) {
                  toast.success('Online payment captured successfully!');
                  dispatch(fetchCart());
                  navigate(`/order-success/${order._id}`);
                }
              } catch (err) {
                toast.error('Payment signature verification failed.');
              } finally {
                setOrderSubmitting(false);
              }
            },
            prefill: {
              name: user?.name || 'Customer Name',
              email: user?.email || 'customer@example.com',
              contact: user?.phone || '9999999999'
            },
            theme: {
              color: '#22c55e' // Grovio Green
            },
            modal: {
              ondismiss: function () {
                toast.warning('Payment modal closed. Order is pending.');
                navigate(`/order-success/${order._id}`);
              }
            }
          };

          const rzp = new window.Razorpay(options);
          rzp.open();
        }

      } else {
        toast.error(resultAction.payload || 'Failed to place order.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'An unexpected error occurred during checkout');
    } finally {
      setOrderSubmitting(false);
    }
  };

  const onCheckoutSubmit = () => {
    if (paymentMethod === 'card') {
      // If card payment chosen, validate card form
      handleCardSubmit(handlePlaceOrder)();
    } else {
      handlePlaceOrder();
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-20">
      
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white font-sans">
          Secure Checkout
        </h1>
        <p className="text-xs text-gray-500 dark:text-dark-muted mt-1">
          Review your items, address, and select slot.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns: Address, Slot, and Payment */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* 1. Address Selection Box */}
          <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-3xl shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <MapPin size={18} className="text-primary-500" />
                Select Delivery Address
              </h2>
              <button
                onClick={() => setAddressModalOpen(true)}
                className="flex items-center gap-1 text-xs font-bold text-primary-500 hover:text-primary-600 border border-primary-100 hover:border-primary-200 bg-primary-50 dark:bg-primary-950/20 px-3 py-1.5 rounded-xl transition-all"
              >
                <Plus size={14} />
                Add New
              </button>
            </div>

            {addressesLoading ? (
              <div className="flex flex-col gap-3">
                <div className="h-16 w-full bg-gray-100 dark:bg-slate-800 animate-pulse rounded-2xl" />
                <div className="h-16 w-full bg-gray-100 dark:bg-slate-800 animate-pulse rounded-2xl" />
              </div>
            ) : addresses.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl">
                <p className="text-xs text-gray-500 dark:text-dark-muted font-medium">
                  No saved addresses found. Please save a shipping location.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addresses.map((addr) => {
                  const isChecked = selectedAddressId === addr._id;
                  return (
                    <div
                      key={addr._id}
                      onClick={() => setSelectedAddressId(addr._id)}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 relative ${
                        isChecked
                          ? 'border-primary-500 bg-primary-50/20 dark:bg-primary-950/10'
                          : 'border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          isChecked ? 'border-primary-500 bg-primary-500' : 'border-gray-300'
                        }`}>
                          {isChecked && <div className="w-1 h-1 rounded-full bg-white" />}
                        </span>
                        <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                          {addr.title}
                        </p>
                        {addr.isDefault && (
                          <span className="text-[9px] font-bold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-dark-text px-1.5 py-0.5 rounded-full">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-dark-muted mt-2 font-medium">
                        {addr.addressLine1}, {addr.addressLine2 && `${addr.addressLine2}, `}
                        {addr.city}, {addr.state} - {addr.zipCode}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Delivery Slot Choice */}
          <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-3xl shadow-sm">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
              <Clock size={18} className="text-primary-500" />
              Choose Delivery Slot
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'instant', title: 'Instant Delivery', sub: 'In 10-15 mins', fee: 'FREE', icon: Clock },
                { id: 'evening', title: 'Evening Slot', sub: '8:00 PM - 10:00 PM', fee: 'FREE', icon: Calendar },
                { id: 'tomorrow', title: 'Tomorrow Morning', sub: '8:00 AM - 10:00 AM', fee: 'FREE', icon: Calendar }
              ].map((slot) => {
                const isSelected = deliverySlot === slot.id;
                return (
                  <div
                    key={slot.id}
                    onClick={() => setDeliverySlot(slot.id)}
                    className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50/20 dark:bg-primary-950/10'
                        : 'border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <slot.icon size={16} className={isSelected ? 'text-primary-500' : 'text-gray-400'} />
                      <span className="text-[10px] font-bold text-green-500">{slot.fee}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white mt-3">
                      {slot.title}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-dark-muted mt-0.5 font-medium">
                      {slot.sub}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Payment Method Block */}
          <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-3xl shadow-sm">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
              <CreditCard size={18} className="text-primary-500" />
              Select Payment Method
            </h2>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { id: 'cod', title: 'Cash on Delivery', sub: 'Pay cash or UPI to rider', icon: Landmark },
                { id: 'card', title: 'Credit / Debit Card', sub: 'Instant secure simulation', icon: CreditCard }
              ].map((method) => {
                const isSelected = paymentMethod === method.id;
                return (
                  <div
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50/20 dark:bg-primary-950/10'
                        : 'border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <method.icon size={18} className={isSelected ? 'text-primary-500' : 'text-gray-400'} />
                    <p className="text-xs font-bold text-gray-900 dark:text-white mt-3">
                      {method.title}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-dark-muted mt-0.5">
                      {method.sub}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Mock Credit Card Form */}
            {paymentMethod === 'card' && (
              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-dark-border max-w-md animate-fadeIn">
                <h3 className="text-xs font-bold text-gray-700 dark:text-dark-text uppercase tracking-wide mb-4 flex items-center gap-1.5">
                  <Lock size={12} className="text-primary-500" />
                  Mock Card Payment Gateway
                </h3>

                <div className="space-y-4">
                  {/* Card Number */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Card Number</label>
                    <input
                      type="text"
                      placeholder="4242 4242 4242 4242"
                      {...registerCard('cardNumber', { required: 'Card number is required', pattern: { value: /^\d{16}$/, message: 'Must be 16 digits' } })}
                      className="w-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-white font-mono"
                    />
                    {cardErrors.cardNumber && <span className="text-[9px] text-red-500 font-bold">{cardErrors.cardNumber.message}</span>}
                  </div>

                  {/* Expiry & CVC */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Expiry Date</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        {...registerCard('expiry', { required: 'Expiry required', pattern: { value: /^(0[1-9]|1[0-2])\/?([0-9]{2})$/, message: 'Format MM/YY' } })}
                        className="w-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-white font-mono"
                      />
                      {cardErrors.expiry && <span className="text-[9px] text-red-500 font-bold">{cardErrors.expiry.message}</span>}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">CVC Code</label>
                      <input
                        type="password"
                        placeholder="•••"
                        {...registerCard('cvc', { required: 'CVC required', pattern: { value: /^\d{3}$/, message: 'Must be 3 digits' } })}
                        className="w-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-white font-mono"
                      />
                      {cardErrors.cvc && <span className="text-[9px] text-red-500 font-bold">{cardErrors.cvc.message}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Order Summary & Bill Details */}
        <div className="flex flex-col gap-6">
          
          {/* Order Summary (Items List) */}
          <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-3xl shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-slate-800 pb-2">
              Order Summary
            </h2>

            <div className="flex flex-col gap-3 max-h-56 overflow-y-auto pr-1">
              {cartItems.map((item) => (
                <div key={item.product._id} className="flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {item.product.name}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-dark-muted">
                      {item.product.unit} × {item.quantity}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-gray-900 dark:text-white flex-shrink-0">
                    ₹{(item.product.discountPrice || item.product.price) * item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Billing Calculation Panel */}
          <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-3xl shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-slate-800 pb-2">
              Bill Breakdown
            </h2>

            <div className="space-y-3.5">
              <div className="flex justify-between text-xs text-gray-600 dark:text-dark-muted">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-800 dark:text-white">₹{subtotal}</span>
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-xs text-green-500">
                  <span>Coupon Discount ({appliedCoupon})</span>
                  <span className="font-semibold">-₹{couponDiscount}</span>
                </div>
              )}

              <div className="flex justify-between text-xs text-gray-600 dark:text-dark-muted">
                <span>GST (5% Flat)</span>
                <span className="font-semibold text-gray-800 dark:text-white">₹{tax}</span>
              </div>

              <div className="flex justify-between text-xs text-gray-600 dark:text-dark-muted">
                <span>Delivery Fee</span>
                <span className="font-semibold text-gray-800 dark:text-white">
                  {deliveryFee === 0 ? <span className="text-green-500 font-bold">FREE</span> : `₹${deliveryFee}`}
                </span>
              </div>

              <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white border-t border-gray-100 dark:border-slate-850 pt-3">
                <span>Total Amount</span>
                <span>₹{grandTotal}</span>
              </div>

              <button
                onClick={onCheckoutSubmit}
                disabled={orderSubmitting}
                className="w-full py-4 px-6 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-bold flex items-center justify-between shadow-glow hover:shadow-lg transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                <span>{orderSubmitting ? 'Processing Order...' : 'Confirm & Pay'}</span>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* 4. Add Address Modal */}
      {addressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="max-w-md w-full glass p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-dark-border relative animate-scaleIn bg-white dark:bg-dark-card">
            
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Add Shipping Address
              </h3>
              <button
                onClick={() => setAddressModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddressSubmit(handleAddNewAddress)} className="space-y-4">
              {/* Title input */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Address Name (e.g. Home, Office)</label>
                <input
                  type="text"
                  placeholder="Home"
                  {...registerAddress('title', { required: 'Title is required' })}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-white"
                />
                {addressErrors.title && <span className="text-[9px] text-red-500 font-bold">{addressErrors.title.message}</span>}
              </div>

              {/* Line 1 */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Street Address Line 1</label>
                <input
                  type="text"
                  placeholder="Flat No. / House Name / Street"
                  {...registerAddress('addressLine1', { required: 'Street line 1 is required' })}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-white"
                />
                {addressErrors.addressLine1 && <span className="text-[9px] text-red-500 font-bold">{addressErrors.addressLine1.message}</span>}
              </div>

              {/* Line 2 */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Street Address Line 2 (Optional)</label>
                <input
                  type="text"
                  placeholder="Landmark / Locality"
                  {...registerAddress('addressLine2')}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-white"
                />
              </div>

              {/* City, State, ZIP */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">City</label>
                  <input
                    type="text"
                    placeholder="Delhi"
                    {...registerAddress('city', { required: 'City required' })}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-white"
                  />
                  {addressErrors.city && <span className="text-[9px] text-red-500 font-bold">{addressErrors.city.message}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">State</label>
                  <input
                    type="text"
                    placeholder="Delhi"
                    {...registerAddress('state', { required: 'State required' })}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-white"
                  />
                  {addressErrors.state && <span className="text-[9px] text-red-500 font-bold">{addressErrors.state.message}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">ZIP Code</label>
                  <input
                    type="text"
                    placeholder="110001"
                    {...registerAddress('zipCode', { required: 'ZIP required' })}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-white font-mono"
                  />
                  {addressErrors.zipCode && <span className="text-[9px] text-red-500 font-bold">{addressErrors.zipCode.message}</span>}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl text-xs font-bold shadow-glow mt-4 transform active:scale-95 transition-all"
              >
                Save Shipping Address
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default Checkout;
