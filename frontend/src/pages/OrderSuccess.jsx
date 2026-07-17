import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, ShieldCheck, ArrowRight, Home, Copy, Check } from 'lucide-react';
import { fetchOrderDetails } from '../store/orderSlice.js';
import { PageLoader } from '../components/LoadingSkeleton.jsx';
import { toast } from 'react-toastify';

export const OrderSuccess = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentOrder, loading } = useSelector((state) => state.orders);

  useEffect(() => {
    dispatch(fetchOrderDetails(id));
  }, [dispatch, id]);

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(id);
    toast.success('Order ID copied to clipboard');
  };

  if (loading && !currentOrder) {
    return <PageLoader />;
  }

  if (!currentOrder) {
    return (
      <div className="text-center py-20 bg-white dark:bg-dark-card rounded-3xl p-8 border border-gray-100 dark:border-dark-border">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Order Details Not Found</h2>
        <p className="text-xs text-gray-500 dark:text-dark-muted mt-1.5 mb-6">Could not load the success configuration for this order ID.</p>
        <Link to="/" className="py-2.5 px-5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-semibold">
          Return to Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 relative overflow-hidden transition-colors duration-300">
      
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-60 h-60 rounded-full bg-primary-500/5 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-emerald-500/5 blur-3xl" />

      <div className="max-w-md w-full glass p-8 sm:p-10 rounded-[32px] border border-gray-100 dark:border-dark-border shadow-xl text-center relative z-10 bg-white dark:bg-dark-card">
        
        {/* Animated Check circle */}
        <div className="w-20 h-20 bg-green-50 dark:bg-green-950/20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500 border border-green-100 dark:border-green-900/50">
          <CheckCircle2 size={40} className="animate-bounce" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white font-sans tracking-tight">
          Order Placed!
        </h1>
        <p className="text-sm font-semibold text-primary-500 mt-2 font-sans">
          Delivering in 10-15 minutes
        </p>
        <p className="text-xs text-gray-500 dark:text-dark-muted mt-1.5 max-w-xs mx-auto leading-relaxed">
          Your order has been received, and stock is allocated. Share the security OTP with the rider only at drop-off.
        </p>

        {/* Security OTP display */}
        <div className="my-8 p-4 bg-primary-50/50 dark:bg-primary-950/15 border border-dashed border-primary-200 dark:border-primary-905/30 rounded-2xl">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
            Delivery Security OTP
          </p>
          <p className="text-3xl font-black text-primary-600 dark:text-primary-500 font-mono tracking-widest mt-2 leading-none">
            {currentOrder.otp}
          </p>
          <span className="text-[9px] text-gray-400 font-semibold block mt-2">
            Share this with the rider to verify delivery drop-off
          </span>
        </div>

        {/* Info panel */}
        <div className="flex flex-col gap-3 text-xs text-left text-gray-600 dark:text-dark-muted border-t border-b border-gray-100 dark:border-slate-800/50 py-4 my-6">
          <div className="flex justify-between items-center">
            <span>Order Reference ID</span>
            <button
              onClick={handleCopyOrderId}
              className="font-mono font-bold text-gray-900 dark:text-white flex items-center gap-1 hover:text-primary-500 transition-colors"
            >
              {id.substring(0, 8)}...
              <Copy size={12} />
            </button>
          </div>
          <div className="flex justify-between">
            <span>Payment Method</span>
            <span className="font-bold text-gray-900 dark:text-white uppercase">
              {currentOrder.paymentMethod} ({currentOrder.paymentStatus})
            </span>
          </div>
          <div className="flex justify-between">
            <span>Total Bill Paid</span>
            <span className="font-bold text-gray-900 dark:text-white">
              ₹{currentOrder.totals.grandTotal}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <button
            onClick={() => navigate(`/order-tracking/${id}`)}
            className="flex-1 py-4 px-5 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-glow hover:shadow-lg transition-all duration-300 transform active:scale-95"
          >
            <span>Live Tracking</span>
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => navigate('/')}
            className="py-4 px-5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-250 dark:hover:bg-slate-700 text-gray-700 dark:text-dark-text rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors transform active:scale-95"
          >
            <Home size={16} />
            Go Home
          </button>
        </div>

      </div>
    </div>
  );
};
export default OrderSuccess;
