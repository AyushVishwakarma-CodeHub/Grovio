import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  User, Mail, Phone, Calendar, ShoppingBag, 
  MapPin, ChevronRight, XCircle, FileText, CheckCircle2, Clock 
} from 'lucide-react';
import api from '../utils/axios.js';
import { logoutUser } from '../store/authSlice.js';
import { PageLoader } from '../components/LoadingSkeleton.jsx';
import { toast } from 'react-toastify';
import { jsPDF } from 'jspdf';

export const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const loadMyOrders = async () => {
    try {
      setLoadingOrders(true);
      const response = await api.get('/orders');
      setOrders(response.data.data.orders);
    } catch (error) {
      toast.error('Failed to load order history');
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadMyOrders();
  }, []);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    
    try {
      await api.post(`/orders/${orderId}/cancel`);
      toast.success('Order cancelled successfully. Items restocked.');
      // Reload history list
      loadMyOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    }
  };

  const handleDownloadInvoice = async (orderId) => {
    try {
      const response = await api.get(`/payments/${orderId}/invoice`);
      const { invoice } = response.data.data;
      
      const doc = new jsPDF();
      
      // Branding Header
      doc.setTextColor(34, 197, 94); // Grovio Green (#22c55e)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(26);
      doc.text('Grovio', 20, 25);
      
      doc.setTextColor(100, 116, 139); // Slate Gray (#64748b)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Fresh Groceries. Delivered Smarter.', 20, 31);
      
      // Invoice Title
      doc.setTextColor(15, 23, 42); // Dark slate (#0f172a)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('TAX INVOICE', 190, 25, { align: 'right' });
      
      // Invoice Metadata
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Invoice No: ${invoice.invoiceNumber}`, 190, 31, { align: 'right' });
      doc.text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, 190, 36, { align: 'right' });
      doc.text(`Payment: ${invoice.paymentStatus.toUpperCase()} (${invoice.paymentMethod.toUpperCase()})`, 190, 41, { align: 'right' });
      
      // Separator line
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(20, 48, 190, 48);
      
      // Billing Details (Grid columns)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Customer Details', 20, 58);
      doc.text('Delivery Address', 110, 58);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text([
        `Name: ${invoice.customer.name}`,
        `Email: ${invoice.customer.email}`,
        `Phone: ${invoice.customer.phone}`
      ], 20, 64);
      
      doc.text([
        `${invoice.shippingAddress.addressLine1}`,
        `${invoice.shippingAddress.addressLine2 || ''}`,
        `${invoice.shippingAddress.city}, ${invoice.shippingAddress.state} - ${invoice.shippingAddress.zipCode}`
      ], 110, 64);
      
      // Separator line
      doc.line(20, 85, 190, 85);
      
      // Items list table header
      doc.setFont('helvetica', 'bold');
      doc.text('Item Description', 20, 93);
      doc.text('Qty', 110, 93, { align: 'center' });
      doc.text('Unit Price', 145, 93, { align: 'right' });
      doc.text('Total (INR)', 190, 93, { align: 'right' });
      
      // Divider
      doc.line(20, 97, 190, 97);
      
      // Items loop
      doc.setFont('helvetica', 'normal');
      let currentY = 105;
      invoice.items.forEach((item) => {
        doc.text(`${item.name}`, 20, currentY);
        doc.text(`${item.quantity}`, 110, currentY, { align: 'center' });
        doc.text(`Rs. ${item.price}`, 145, currentY, { align: 'right' });
        doc.text(`Rs. ${item.price * item.quantity}`, 190, currentY, { align: 'right' });
        currentY += 8;
      });
      
      // Separator line
      doc.line(20, currentY, 190, currentY);
      currentY += 8;
      
      // Bill Breakdown
      doc.setFontSize(9);
      doc.text('Subtotal:', 145, currentY, { align: 'right' });
      doc.text(`Rs. ${invoice.billing.subtotal}`, 190, currentY, { align: 'right' });
      
      currentY += 6;
      doc.text('GST (5%):', 145, currentY, { align: 'right' });
      doc.text(`Rs. ${invoice.billing.tax}`, 190, currentY, { align: 'right' });
      
      currentY += 6;
      doc.text('Delivery Fee:', 145, currentY, { align: 'right' });
      doc.text(`Rs. ${invoice.billing.deliveryFee}`, 190, currentY, { align: 'right' });
      
      currentY += 6;
      doc.text('Discount:', 145, currentY, { align: 'right' });
      doc.text(`-Rs. ${invoice.billing.discount}`, 190, currentY, { align: 'right' });
      
      // Grand Total
      currentY += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(34, 197, 94); // Grovio Green
      doc.text('Grand Total:', 145, currentY, { align: 'right' });
      doc.text(`Rs. ${invoice.billing.grandTotal}`, 190, currentY, { align: 'right' });
      
      // Footer Branding
      currentY += 25;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // Slate Light (#94a3b8)
      doc.text('Thank you for shopping with Grovio! Fresh Groceries. Delivered Smarter.', 105, currentY, { align: 'center' });
      
      // Save document
      doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);
      toast.success('Invoice downloaded as PDF');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate PDF invoice file');
    }
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    toast.info('Logged out successfully');
    navigate('/login');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'placed':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400 border-blue-100 dark:border-blue-900/30';
      case 'packing':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 dark:text-yellow-400 border-yellow-100 dark:border-yellow-900/30';
      case 'out_for_delivery':
        return 'text-purple-600 bg-purple-50 dark:bg-purple-950/20 dark:text-purple-400 border-purple-100 dark:border-purple-900/30';
      case 'delivered':
        return 'text-green-600 bg-green-50 dark:bg-green-950/20 dark:text-green-400 border-green-100 dark:border-green-900/30';
      case 'cancelled':
        return 'text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400 border-red-100 dark:border-red-900/30';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-slate-800/40 dark:text-dark-muted border-gray-100 dark:border-slate-800';
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-20">
      
      {/* Left side: Profile Summary Card */}
      <div className="w-full lg:w-1/3 flex flex-col gap-6">
        <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-3xl shadow-sm text-center">
          <div className="w-20 h-20 bg-primary-100 dark:bg-primary-950/30 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary-50 dark:border-primary-900">
            <User size={36} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white capitalize">{user?.name}</h2>
          <p className="text-xs text-gray-500 dark:text-dark-muted mt-1 uppercase tracking-wider font-bold">
            Role: {user?.role.replace('_', ' ')}
          </p>

          <div className="text-left mt-8 space-y-4 border-t border-gray-100 dark:border-slate-800/50 pt-6">
            <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-dark-muted">
              <Mail size={16} className="text-gray-400" />
              <span>{user?.email}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-dark-muted">
              <Phone size={16} className="text-gray-400" />
              <span>{user?.phone || 'No phone number saved'}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-dark-muted">
              <Calendar size={16} className="text-gray-400" />
              <span>Member since {new Date(user?.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full mt-8 py-3 bg-red-50 dark:bg-red-950/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-950/40 text-xs font-bold rounded-2xl transition-colors active:scale-95 transform"
          >
            Logout Account
          </button>
        </div>

        {/* Dashboard Shortcuts based on role */}
        {(user?.role === 'admin' || user?.role === 'store_manager') && (
          <Link
            to="/admin"
            className="p-5 rounded-3xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs flex justify-between items-center shadow-glow transition-all"
          >
            <span>GO TO ADMIN DASHBOARD</span>
            <ChevronRight size={16} />
          </Link>
        )}
        {user?.role === 'delivery_partner' && (
          <Link
            to="/rider"
            className="p-5 rounded-3xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs flex justify-between items-center shadow-glow transition-all"
          >
            <span>GO TO RIDER DASHBOARD</span>
            <ChevronRight size={16} />
          </Link>
        )}
      </div>

      {/* Right side: Orders List Grid */}
      <div className="flex-1 flex flex-col gap-6">
        <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-3xl shadow-sm">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-slate-800 pb-3">
            <ShoppingBag size={18} className="text-primary-500" />
            Your Order History
          </h2>

          {loadingOrders ? (
            <div className="space-y-4">
              <div className="h-24 bg-gray-100 dark:bg-slate-800 animate-pulse rounded-2xl" />
              <div className="h-24 bg-gray-100 dark:bg-slate-800 animate-pulse rounded-2xl" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-xs text-gray-500 dark:text-dark-muted font-medium">You haven't placed any orders yet.</p>
              <Link
                to="/"
                className="inline-block mt-4 text-xs font-bold text-primary-500 hover:underline"
              >
                Browse Grocery Shop
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order._id}
                  className="p-5 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900/30 flex flex-col sm:flex-row justify-between gap-4 hover:border-gray-200 dark:hover:border-slate-700 transition-all"
                >
                  <div className="flex flex-col gap-1.5 text-left min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-gray-400">#{order._id.substring(16).toUpperCase()}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 border rounded-full capitalize ${getStatusColor(order.orderStatus)}`}>
                        {order.orderStatus.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-dark-muted font-medium mt-1">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>

                    <div className="text-xs text-gray-700 dark:text-dark-text mt-2 font-medium truncate max-w-sm sm:max-w-md">
                      {order.items.map(item => `${item.name} (${item.quantity}x)`).join(', ')}
                    </div>
                  </div>

                  {/* Actions & Price */}
                  <div className="flex sm:flex-col justify-between items-end gap-2 flex-shrink-0">
                    <span className="text-sm font-extrabold text-gray-900 dark:text-white">
                      ₹{order.totals.grandTotal}
                    </span>

                    <div className="flex gap-2 flex-wrap sm:flex-nowrap mt-1">
                      {/* Invoice Link */}
                      <button
                        onClick={() => handleDownloadInvoice(order._id)}
                        title="Download PDF Invoice"
                        className="p-2 border border-gray-200 dark:border-slate-800 text-gray-500 hover:text-primary-500 dark:text-dark-text rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <FileText size={14} />
                      </button>

                      {/* Track Page Link */}
                      {order.orderStatus !== 'cancelled' && (
                        <Link
                          to={`/order-tracking/${order._id}`}
                          className="p-2 border border-primary-100 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/20 rounded-xl transition-all"
                        >
                          <ChevronRight size={14} />
                        </Link>
                      )}

                      {/* Cancel Trigger */}
                      {['placed', 'packing'].includes(order.orderStatus) && (
                        <button
                          onClick={() => handleCancelOrder(order._id)}
                          title="Cancel Order"
                          className="p-2 border border-red-100 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors"
                        >
                          <XCircle size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
export default Profile;
