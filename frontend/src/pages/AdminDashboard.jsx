import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { 
  TrendingUp, AlertTriangle, ClipboardList, Package, 
  Plus, Users, Percent, Trash2, Edit, X, UserMinus, ShieldAlert,
  LifeBuoy, Send, ShieldCheck, MessageSquare
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import api from '../utils/axios.js';
import { toast } from 'react-toastify';
import { PageLoader } from '../components/LoadingSkeleton.jsx';

export const AdminDashboard = () => {
  const { user: currentUser } = useSelector((state) => state.auth);

  // Tab State: 'overview' | 'operations' | 'catalog' | 'users' | 'coupons'
  const [activeTab, setActiveTab] = useState('overview');

  // Load States
  const [stats, setStats] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  const [inventoryLogs, setInventoryLogs] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [couponsList, setCouponsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [supportTickets, setSupportTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  // Chat scroll anchor
  const chatBottomRef = useRef(null);

  // Send message reply states
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  // Modals & Form States
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // null for create, product object for edit
  const [selectedProductId, setSelectedProductId] = useState('');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('restock');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Hooks for forms
  const { 
    register: registerProduct, 
    handleSubmit: handleProductSubmit, 
    setValue: setProductValue,
    reset: resetProductForm 
  } = useForm();

  const { 
    register: registerCoupon, 
    handleSubmit: handleCouponSubmit, 
    reset: resetCouponForm 
  } = useForm();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Stats
      const statsResponse = await api.get('/inventory/stats');
      setStats(statsResponse.data.data.stats);

      // 2. Fetch Active Orders
      const ordersResponse = await api.get('/orders/admin/all');
      const active = ordersResponse.data.data.orders.filter(
        o => ['placed', 'packing', 'out_for_delivery'].includes(o.orderStatus)
      );
      setActiveOrders(active);

      // 3. Fetch Inventory Logs
      const logsResponse = await api.get('/inventory/logs');
      setInventoryLogs(logsResponse.data.data.logs);

      // 4. Fetch Products Catalog SKUs
      const productsResponse = await api.get('/products?limit=100');
      setProductsList(productsResponse.data.data.products);

      // 5. Fetch Categories
      const categoriesResponse = await api.get('/categories');
      setCategoriesList(categoriesResponse.data.data.categories);

      // 6. Fetch Users (only if role is admin)
      if (currentUser?.role === 'admin') {
        const usersResponse = await api.get('/users');
        setUsersList(usersResponse.data.data.users);
      }

      // 7. Fetch Coupons list
      const couponsResponse = await api.get('/coupons');
      setCouponsList(couponsResponse.data.data.coupons);

      // 8. Fetch System Analytics
      const analyticsResponse = await api.get('/analytics');
      setAnalyticsData(analyticsResponse.data.data);

      // 9. Fetch Support Tickets
      const ticketsResponse = await api.get('/support');
      setSupportTickets(ticketsResponse.data.data.tickets);

    } catch (error) {
      toast.error('Failed to load Enterprise Metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Socket Connection for active support ticket chat
  useEffect(() => {
    if (!selectedTicket || activeTab !== 'support') return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const socketInstance = io(socketUrl);

    socketInstance.emit('joinOrderRoom', { orderId: selectedTicket._id });

    socketInstance.on('newTicketMessage', (data) => {
      if (data.ticketId === selectedTicket._id) {
        setSelectedTicket(prev => prev ? {
          ...prev,
          status: data.status,
          refundRequest: data.refundRequest,
          messages: [...prev.messages, data.message]
        } : null);

        setSupportTickets(prevList => prevList.map(t => 
          t._id === data.ticketId 
            ? { ...t, status: data.status, messages: [...t.messages, data.message] }
            : t
        ));
      }
    });

    return () => {
      socketInstance.off('newTicketMessage');
      socketInstance.disconnect();
    };
  }, [selectedTicket?._id, activeTab]);

  // Auto-scroll to bottom of chat on message list changes
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicket?.messages?.length]);

  // Update order status
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Order status updated to: ${newStatus}`);
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update order status');
    }
  };

  // Adjust product stock
  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedProductId || !adjustQty) {
      toast.warning('Please select a product SKU and input quantity');
      return;
    }

    try {
      setAdjusting(true);
      await api.post('/inventory/adjust', {
        productId: selectedProductId,
        quantity: parseInt(adjustQty),
        changeType: adjustType,
        notes: adjustNotes || `Manual adjustment`
      });
      toast.success('Stock adjusted successfully');
      setAdjustQty('');
      setAdjustNotes('');
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to adjust stock');
    } finally {
      setAdjusting(false);
    }
  };

  // User Actions: Role changes
  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      toast.success('User role updated successfully');
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to modify role');
    }
  };

  // User Actions: Suspension toggle
  const handleToggleSuspension = async (userId) => {
    try {
      await api.patch(`/users/${userId}/toggle-status`);
      toast.success('User status toggled successfully');
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to toggle user suspension');
    }
  };

  // User Actions: Delete User
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Permanently delete this user account?')) return;
    try {
      await api.delete(`/users/${userId}`);
      toast.info('User account permanently deleted.');
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to delete user account');
    }
  };

  // Coupon Actions: Create Coupon
  const handleCreateCoupon = async (data) => {
    try {
      await api.post('/coupons', data);
      toast.success('Discount Coupon created successfully');
      resetCouponForm();
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create coupon');
    }
  };

  // Coupon Actions: Delete Coupon
  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm('Delete this Coupon code?')) return;
    try {
      await api.delete(`/coupons/${couponId}`);
      toast.info('Coupon code deleted.');
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to delete coupon');
    }
  };

  // Product Actions: Open Create/Edit modal
  const openProductModal = (product = null) => {
    setEditingProduct(product);
    if (product) {
      // Edit mode pre-fills
      setProductValue('name', product.name);
      setProductValue('description', product.description);
      setProductValue('price', product.price);
      setProductValue('discountPrice', product.discountPrice || '');
      setProductValue('stock', product.stock);
      setProductValue('unit', product.unit);
      setProductValue('category', product.category);
      setProductValue('lowStockThreshold', product.lowStockThreshold);
    } else {
      resetProductForm();
    }
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (data) => {
    try {
      const payload = {
        ...data,
        price: Number(data.price),
        discountPrice: data.discountPrice ? Number(data.discountPrice) : undefined,
        stock: Number(data.stock),
        lowStockThreshold: Number(data.lowStockThreshold)
      };

      if (editingProduct) {
        // Edit mode
        await api.put(`/products/${editingProduct._id}`, payload);
        toast.success('Product updated successfully');
      } else {
        // Create mode
        await api.post('/products', payload);
        toast.success('New Product added to catalog');
      }
      setProductModalOpen(false);
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save product');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Delete this product from catalog? This cannot be undone.')) return;
    try {
      await api.delete(`/products/${productId}`);
      toast.info('Product removed from catalog');
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to remove product');
    }
  };

  if (loading && !stats) {
    return <PageLoader />;
  }

  const chartData = stats?.categoriesBreakdown?.map(c => ({
    name: c.categoryName.substring(0, 12),
    stock: c.totalStock,
    value: Math.round(c.totalValue)
  })) || [];

  return (
    <div className="flex flex-col gap-8 pb-20 font-sans">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            Enterprise Admin Dashboard
          </h1>
          <p className="text-xs text-gray-500 dark:text-dark-muted mt-1">
            Configure system-wide stores, products catalog SKU, roles, coupons, and view analytics.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl border border-gray-200 dark:border-slate-700/50">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'operations', label: 'Operations', icon: ClipboardList },
            { id: 'catalog', label: 'SKU Catalog', icon: Package },
            { id: 'users', label: 'User Accounts', icon: Users, disabled: currentUser?.role !== 'admin' },
            { id: 'coupons', label: 'Coupons', icon: Percent },
            { id: 'support', label: 'Support Helpdesk', icon: LifeBuoy }
          ].map((tab) => {
            if (tab.disabled) return null;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-dark-card text-primary-500 shadow-sm'
                    : 'text-gray-500 dark:text-dark-muted hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Overview Tab (Charts & Quick Stats) */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-8">
          
          {/* Sales Analytics Overview metrics grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-3xl flex justify-between items-center shadow-sm">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Sales Revenue</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                  ₹{analyticsData?.financials?.totalRevenue?.toLocaleString() || '0'}
                </h3>
                <span className="text-[9px] text-gray-400 block mt-1">Processed paid orders</span>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-3xl flex justify-between items-center shadow-sm">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Orders Count</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                  {analyticsData?.financials?.totalOrders || '0'} Trips
                </h3>
                <span className="text-[9px] text-gray-400 block mt-1">Average Order: ₹{analyticsData?.financials?.avgOrderValue || '0'}</span>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-500 flex items-center justify-center">
                <ClipboardList size={20} />
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-3xl flex justify-between items-center shadow-sm">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Grovio SKU Catalog</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                  {analyticsData?.store?.totalCatalogItems || '0'} Items
                </h3>
                <span className="text-[9px] text-gray-400 block mt-1">{stats?.totalSKUs} active in inventory</span>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-50 dark:bg-yellow-950/20 text-yellow-500 flex items-center justify-center">
                <Package size={20} />
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-3xl flex justify-between items-center shadow-sm">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-sans">Promo Coupons</p>
                <h3 className="text-2xl font-black text-primary-500 mt-1">
                  {couponsList.length} Active
                </h3>
                <span className="text-[9px] text-gray-400 block mt-1">Low Stock SKU Alerts: {stats?.lowStockSKUs}</span>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/20 text-primary-500 flex items-center justify-center">
                <Percent size={20} />
              </div>
            </div>
          </div>

          {/* Monthly Sales Revenue trend chart */}
          <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-3xl shadow-sm text-left">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-6">
              Monthly Sales & Revenue Growth Trend
            </h3>
            <div className="h-72 w-full text-xs">
              {analyticsData?.monthlySales && analyticsData.monthlySales.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.monthlySales}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="month" tick={{ fill: '#94a3b8' }} />
                    <YAxis yAxisId="left" tick={{ fill: '#94a3b8' }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Orders Placed" />
                    <Bar yAxisId="right" dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Monthly Revenue (₹)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  Insufficient historical data to render monthly sales trend chart.
                </div>
              )}
            </div>
          </div>

          {/* Top Products & Top Customers Grids */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
            
            {/* Top Products */}
            <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-3xl shadow-sm flex flex-col">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                Top Performing Products
              </h3>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 uppercase tracking-widest text-[9px]">
                      <th className="py-2.5 px-3">Item Details</th>
                      <th className="py-2.5 px-3 text-center">Units Sold</th>
                      <th className="py-2.5 px-3 text-right">Total Cash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData?.topProducts?.length === 0 ? (
                      <tr><td colSpan={3} className="text-center py-6 text-gray-500">No items sales logs recorded.</td></tr>
                    ) : (
                      analyticsData?.topProducts?.map((tp) => (
                        <tr key={tp._id} className="border-b border-gray-50 dark:border-slate-850 hover:bg-gray-50/10">
                          <td className="py-3 px-3 font-bold text-gray-800 dark:text-white">{tp.name}</td>
                          <td className="py-3 px-3 text-center font-bold text-gray-600 dark:text-dark-text">{tp.unitsSold} units</td>
                          <td className="py-3 px-3 text-right font-extrabold text-emerald-500">₹{tp.totalSalesValue?.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Customers */}
            <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-3xl shadow-sm flex flex-col">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                Highest Spending Customers
              </h3>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 uppercase tracking-widest text-[9px]">
                      <th className="py-2.5 px-3">Shopper</th>
                      <th className="py-2.5 px-3 text-center">Orders</th>
                      <th className="py-2.5 px-3 text-right">Amount Spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData?.topCustomers?.length === 0 ? (
                      <tr><td colSpan={3} className="text-center py-6 text-gray-500">No customer spendings logs recorded.</td></tr>
                    ) : (
                      analyticsData?.topCustomers?.map((tc) => (
                        <tr key={tc.user?._id || Math.random()} className="border-b border-gray-50 dark:border-slate-850 hover:bg-gray-50/10">
                          <td className="py-3 px-3">
                            <p className="font-bold text-gray-900 dark:text-white">{tc.user?.name || 'Guest Shopper'}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{tc.user?.email}</p>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-gray-600 dark:text-dark-text">{tc.ordersCount} times</td>
                          <td className="py-3 px-3 text-right font-extrabold text-primary-500">₹{tc.totalSpent?.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Store Category Snapshot & Delivery analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            {/* Store Categories list */}
            <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-3xl shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                Store Categories Analysis
              </h3>
              <div className="space-y-3">
                {analyticsData?.store?.categories?.map((cat) => (
                  <div key={cat.category} className="flex justify-between items-center text-xs p-3 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
                    <span className="font-bold text-gray-700 dark:text-white uppercase tracking-wider">{cat.category?.replace('-', ' ')}</span>
                    <span className="text-gray-400 font-medium">
                      SKUs: <strong className="text-gray-900 dark:text-white">{cat.skuCount}</strong> | Avg Price: <strong className="text-primary-500">₹{cat.avgPrice}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Partner Analytics */}
            <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-3xl shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                Delivery Fulfillment Ratios
              </h3>
              <div className="grid grid-cols-2 gap-3 text-center text-xs">
                <div className="p-4 bg-green-50/50 dark:bg-emerald-950/15 border border-green-100 dark:border-emerald-950/30 rounded-2xl">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Fulfillment Completed</p>
                  <p className="text-lg font-black text-emerald-500 mt-1">{analyticsData?.delivery?.delivered || '0'} Deliveries</p>
                  <span className="text-[9px] text-gray-400 mt-0.5 block">Paid: ₹{(analyticsData?.delivery?.delivered || 0) * 50} rider payouts</span>
                </div>

                <div className="p-4 bg-yellow-50/50 dark:bg-yellow-950/15 border border-yellow-100 dark:border-yellow-950/30 rounded-2xl">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Active in Transit</p>
                  <p className="text-lg font-black text-yellow-500 mt-1">
                    {(analyticsData?.delivery?.packing || 0) + (analyticsData?.delivery?.out_for_delivery || 0)} Shipments
                  </p>
                  <span className="text-[9px] text-gray-400 mt-0.5 block">Packing & Dispatch stages</span>
                </div>

                <div className="p-4 bg-red-50/50 dark:bg-red-950/15 border border-red-100 dark:border-red-950/30 rounded-2xl">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Cancellations Rate</p>
                  <p className="text-lg font-black text-red-500 mt-1">{analyticsData?.delivery?.cancelled || '0'} Orders</p>
                  <span className="text-[9px] text-gray-400 mt-0.5 block">Inventory restocked automatically</span>
                </div>

                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/15 border border-blue-100 dark:border-blue-950/30 rounded-2xl">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Tax & Surcharges Collected</p>
                  <p className="text-lg font-black text-blue-500 mt-1">₹{analyticsData?.financials?.totalTax?.toLocaleString() || '0'}</p>
                  <span className="text-[9px] text-gray-400 mt-0.5 block">GST Flat 5% calculation</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Operations Tab (Active Orders / Adjustments / Logs) */}
      {activeTab === 'operations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
          {/* Active Orders List */}
          <div className="lg:col-span-2 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-3xl shadow-sm flex flex-col gap-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-slate-800 pb-3 flex items-center gap-1.5">
              <ClipboardList size={16} className="text-primary-500" />
              Active Shipments Pipeline
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 uppercase tracking-widest text-[9px] border-b border-gray-100 dark:border-slate-800">
                    <th className="py-2.5 px-3">Order Ref</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Bill Total</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrders.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-6 text-gray-500">No active shipments in transit.</td></tr>
                  ) : (
                    activeOrders.map((o) => (
                      <tr key={o._id} className="border-b border-gray-50 dark:border-slate-850 hover:bg-gray-50/10 dark:hover:bg-slate-800/10">
                        <td className="py-3 px-3 font-mono font-bold text-gray-900 dark:text-white">#{o._id.substring(18).toUpperCase()}</td>
                        <td className="py-3 px-3">{o.deliveryAddress.city}</td>
                        <td className="py-3 px-3 font-extrabold text-gray-900 dark:text-white">₹{o.totals.grandTotal}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-full uppercase tracking-wider ${
                            o.orderStatus === 'placed' ? 'border-blue-100 text-blue-500 bg-blue-50 dark:bg-blue-950/20' :
                            o.orderStatus === 'packing' ? 'border-yellow-100 text-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' :
                            'border-purple-100 text-purple-500 bg-purple-50 dark:bg-purple-950/20'
                          }`}>
                            {o.orderStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right flex justify-end gap-1.5">
                          {o.orderStatus === 'placed' && (
                            <button onClick={() => handleUpdateStatus(o._id, 'packing')} className="py-1 px-2.5 bg-yellow-500 text-white rounded-lg font-bold text-[10px]">Pack Items</button>
                          )}
                          {o.orderStatus === 'packing' && (
                            <button onClick={() => handleUpdateStatus(o._id, 'out_for_delivery')} className="py-1 px-2.5 bg-purple-500 text-white rounded-lg font-bold text-[10px]">Dispatch</button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Manual Adjustments form */}
          <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-3xl shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Plus size={16} className="text-primary-500" />
              Manual Stock Adjustment
            </h3>

            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Product SKU</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 text-xs rounded-xl focus:outline-none text-gray-800 dark:text-white"
                >
                  <option value="">Select product...</option>
                  {productsList.map((p) => (
                    <option key={p._id} value={p._id}>{p.name} ({p.unit}) - Stock: {p.stock}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Change Qty</label>
                  <input
                    type="number"
                    placeholder="+50 / -10"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 text-xs rounded-xl focus:outline-none text-gray-800 dark:text-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Adjustment Type</label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 text-xs rounded-xl focus:outline-none text-gray-800 dark:text-white"
                  >
                    <option value="restock">Restock</option>
                    <option value="adjustment">Audit Adjustment</option>
                    <option value="sale">Manual Sale</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Audit Notes</label>
                <textarea
                  rows={2}
                  placeholder="Notes..."
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 text-xs rounded-xl focus:outline-none text-gray-800 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={adjusting}
                className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold transition-all shadow-glow"
              >
                {adjusting ? 'Adjusting...' : 'Save Stock Adjust'}
              </button>
            </form>
          </div>

          {/* Inventory Logs audit history */}
          <div className="lg:col-span-3 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-3xl shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-6">
              Warehouse Inventory Logs History
            </h3>
            <div className="overflow-x-auto max-h-72 overflow-y-auto pr-1">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 uppercase tracking-widest text-[9px]">
                    <th className="py-2.5 px-3">Item name</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-center">Change Qty</th>
                    <th className="py-2.5 px-3 text-center">Transition</th>
                    <th className="py-2.5 px-3">Audit Details</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryLogs.map((log) => (
                    <tr key={log._id} className="border-b border-gray-50 dark:border-slate-850 hover:bg-gray-50/10 dark:hover:bg-slate-800/10">
                      <td className="py-3 px-3 font-bold text-gray-800 dark:text-white">{log.product?.name || 'Deleted Item'}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 text-[9px] rounded-full uppercase tracking-wider font-extrabold border ${
                          log.changeType === 'sale' ? 'border-red-100 text-red-500 bg-red-50 dark:bg-red-950/20' :
                          log.changeType === 'restock' ? 'border-green-100 text-green-500 bg-green-50 dark:bg-green-950/20' :
                          'border-yellow-100 text-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
                        }`}>{log.changeType}</span>
                      </td>
                      <td className={`py-3 px-3 text-center font-extrabold ${log.quantity > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                      </td>
                      <td className="py-3 px-3 text-center text-gray-500 font-mono">{log.previousStock} → {log.newStock}</td>
                      <td className="py-3 px-3 text-gray-600 dark:text-dark-muted font-medium italic">{log.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SKU Catalog Tab (Products list & Add/Edit modals) */}
      {activeTab === 'catalog' && (
        <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-3xl shadow-sm text-left">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Grocery SKUs Catalog
            </h3>
            <button
              onClick={() => openProductModal(null)}
              className="flex items-center gap-1 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-glow"
            >
              <Plus size={14} />
              Add Product SKU
            </button>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto pr-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 uppercase tracking-widest text-[9px]">
                  <th className="py-3 px-3">Product details</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-center">Unit</th>
                  <th className="py-3 px-3 text-center">Pricing</th>
                  <th className="py-3 px-3 text-center">Warehouse Stock</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {productsList.map((p) => (
                  <tr key={p._id} className="border-b border-gray-50 dark:border-slate-850 hover:bg-gray-50/10 dark:hover:bg-slate-800/10">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <img src={p.images?.[0] || 'https://unsplash.com/photos/mock'} className="w-8 h-8 rounded-lg object-cover bg-gray-100" />
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{p.name}</p>
                          <p className="text-[10px] text-gray-400 truncate max-w-xs">{p.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-gray-500 capitalize">{p.category?.replace('-', ' ')}</td>
                    <td className="py-3.5 px-3 text-center text-gray-600 dark:text-dark-text font-bold">{p.unit}</td>
                    <td className="py-3.5 px-3 text-center">
                      <p className="font-bold text-gray-900 dark:text-white">₹{p.discountPrice || p.price}</p>
                      {p.discountPrice && <p className="text-[10px] text-gray-400 line-through">₹{p.price}</p>}
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold">
                      <span className={p.stock <= p.lowStockThreshold ? 'text-red-500 animate-pulse' : 'text-gray-800 dark:text-white'}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openProductModal(p)} className="p-1.5 border border-gray-200 dark:border-slate-800 hover:text-primary-500 rounded-lg"><Edit size={12} /></button>
                        <button onClick={() => handleDeleteProduct(p._id)} className="p-1.5 border border-red-100 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Accounts Tab (Admin only: Roles & Suspension) */}
      {activeTab === 'users' && currentUser?.role === 'admin' && (
        <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-3xl shadow-sm text-left">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-6">
            Registered User Accounts Management
          </h3>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto pr-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 uppercase tracking-widest text-[9px]">
                  <th className="py-3 px-4">User details</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Joined At</th>
                  <th className="py-3 px-4">Access Role</th>
                  <th className="py-3 px-4">Suspension status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((usr) => (
                  <tr key={usr._id} className="border-b border-gray-50 dark:border-slate-850 hover:bg-gray-50/10 dark:hover:bg-slate-800/10">
                    <td className="py-4 px-4 font-bold text-gray-900 dark:text-white">{usr.name}</td>
                    <td className="py-4 px-4 text-gray-500 font-mono">{usr.email}</td>
                    <td className="py-4 px-4 text-gray-500 font-mono">{new Date(usr.createdAt).toLocaleDateString()} {new Date(usr.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-full capitalize ${
                        usr.role === 'admin' ? 'border-red-200 text-red-500 bg-red-50 dark:bg-red-950/20' :
                        usr.role === 'store_manager' ? 'border-blue-200 text-blue-500 bg-blue-50 dark:bg-blue-950/20' :
                        usr.role === 'delivery_partner' ? 'border-yellow-200 text-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' :
                        'border-gray-200 text-gray-500'
                      }`}>
                        {usr.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleToggleSuspension(usr._id)}
                        disabled={usr._id === currentUser._id}
                        className={`px-3 py-1 text-[10px] font-bold rounded-xl transition-colors ${
                          usr.status === 'active'
                            ? 'bg-green-50 dark:bg-green-950/20 text-green-500 border border-green-100 dark:border-green-950/30'
                            : 'bg-red-50 dark:bg-red-950/20 text-red-500 border border-red-100 dark:border-red-950/30 animate-pulse'
                        }`}
                      >
                        {usr.status === 'active' ? 'Active (Suspend)' : 'Suspended (Approve)'}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-right flex items-center justify-end gap-2">
                      <select
                        value={usr.role}
                        disabled={usr._id === currentUser._id}
                        onChange={(e) => handleRoleChange(usr._id, e.target.value)}
                        className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-xs px-2.5 py-1.5 rounded-xl focus:outline-none"
                      >
                        <option value="customer">Customer</option>
                        <option value="delivery_partner">Rider</option>
                        <option value="store_manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                      
                      <button
                        onClick={() => handleDeleteUser(usr._id)}
                        disabled={usr._id === currentUser._id}
                        className="p-1.5 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                        title="Delete User"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Coupons Tab (Promo code lists & Creations) */}
      {activeTab === 'coupons' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
          
          {/* Coupon lists */}
          <div className="lg:col-span-2 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-3xl shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-6">
              Active Promotions Promo Codes
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 uppercase tracking-widest text-[9px]">
                    <th className="py-2.5 px-3">Coupon Code</th>
                    <th className="py-2.5 px-3">Type / Value</th>
                    <th className="py-2.5 px-3">Min Purchase</th>
                    <th className="py-2.5 px-3">Expiry Date</th>
                    <th className="py-2.5 px-3 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {couponsList.map((cpn) => (
                    <tr key={cpn._id} className="border-b border-gray-50 dark:border-slate-850 hover:bg-gray-50/10 dark:hover:bg-slate-800/10">
                      <td className="py-3.5 px-3 font-mono font-extrabold text-primary-500">{cpn.code}</td>
                      <td className="py-3.5 px-3 font-bold text-gray-900 dark:text-white capitalize">
                        {cpn.discountType === 'flat' ? `₹${cpn.discountValue} Flat` : `${cpn.discountValue}% Percentage`}
                      </td>
                      <td className="py-3.5 px-3 font-bold">₹{cpn.minPurchase}</td>
                      <td className="py-3.5 px-3 text-gray-500">{new Date(cpn.expiryDate).toLocaleDateString()}</td>
                      <td className="py-3.5 px-3 text-right">
                        <button onClick={() => handleDeleteCoupon(cpn._id)} className="p-1.5 border border-red-100 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-lg transition-colors"><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create Coupon form */}
          <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-3xl shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-1">
              <Plus size={16} className="text-primary-500" />
              Create Promo Code
            </h3>

            <form onSubmit={handleCouponSubmit(handleCreateCoupon)} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Coupon Code</label>
                <input
                  type="text"
                  placeholder="e.g. MONSOON20"
                  {...registerCoupon('code', { required: 'Code is required' })}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 text-xs rounded-xl focus:outline-none text-gray-800 dark:text-white uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Type</label>
                  <select
                    {...registerCoupon('discountType', { required: true })}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 text-xs rounded-xl focus:outline-none text-gray-800 dark:text-white"
                  >
                    <option value="flat">Flat ₹ Discount</option>
                    <option value="percentage">% Percentage</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Discount Value</label>
                  <input
                    type="number"
                    placeholder="e.g. 50 or 15"
                    {...registerCoupon('discountValue', { required: 'Value is required' })}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 text-xs rounded-xl focus:outline-none text-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Min Cart Purchase (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 199"
                  {...registerCoupon('minPurchase')}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 text-xs rounded-xl focus:outline-none text-gray-800 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Expiry Date</label>
                <input
                  type="date"
                  {...registerCoupon('expiryDate', { required: 'Expiry is required' })}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 text-xs rounded-xl focus:outline-none text-gray-800 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold transition-all shadow-glow"
              >
                Create Promo Coupon
              </button>
            </form>
          </div>

        </div>
      )}

      {/* Support Helpdesk Tickets management */}
      {activeTab === 'support' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch h-[550px] text-left">
          {/* Left Panel: Tickets List */}
          <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-[32px] p-5 shadow-sm overflow-y-auto flex flex-col gap-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-slate-800 pb-3">
              Open Support Claims ({supportTickets.length})
            </h3>
            
            <div className="space-y-2.5 flex-1">
              {supportTickets.map((ticket) => {
                const isSelected = selectedTicket?._id === ticket._id;
                return (
                  <div
                    key={ticket._id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50/10 dark:bg-primary-950/10 shadow-sm'
                        : 'border-gray-100 dark:border-slate-800/80 hover:bg-gray-50/50 dark:hover:bg-slate-800/20'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className={`px-2 py-0.5 text-[8px] font-bold border rounded-full uppercase tracking-wider ${
                        ticket.category === 'refund' ? 'border-emerald-100 text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' :
                        ticket.category === 'complaint' ? 'border-red-100 text-red-500 bg-red-50 dark:bg-red-950/20' :
                        'border-blue-100 text-blue-500 bg-blue-50 dark:bg-blue-950/20'
                      }`}>
                        {ticket.category}
                      </span>
                      
                      <span className={`text-[9px] font-bold uppercase ${
                        ticket.status === 'open' ? 'text-blue-500 animate-pulse' :
                        ticket.status === 'in_progress' ? 'text-yellow-500' :
                        'text-gray-400'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>

                    <h4 className="text-xs font-extrabold text-gray-900 dark:text-white mt-2.5 truncate">
                      {ticket.subject}
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                      User: {ticket.userId?.name || 'Guest'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Chat UI thread */}
          <div className="md:col-span-2 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-[32px] shadow-sm flex flex-col overflow-hidden">
            {selectedTicket ? (
              <>
                {/* Header details with action dropdown/buttons */}
                <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/10 flex-wrap gap-3">
                  <div>
                    <span className="text-[9px] font-mono text-gray-400">TICKET REF: #{selectedTicket._id.substring(18).toUpperCase()}</span>
                    <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white mt-1">
                      {selectedTicket.subject}
                    </h3>
                  </div>

                  {/* Actions for admins (Refund claim details & resolving status) */}
                  <div className="flex items-center gap-2">
                    {selectedTicket.status !== 'resolved' && (
                      <button
                        onClick={async () => {
                          await api.post(`/support/${selectedTicket._id}/reply`, { ticketStatus: 'resolved', text: 'Issue resolved. Closing ticket.' });
                          toast.info('Ticket resolved and closed.');
                          fetchDashboardData();
                        }}
                        className="py-1.5 px-3 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-bold text-[10px] rounded-lg transition-colors"
                      >
                        Resolve & Close
                      </button>
                    )}

                    {selectedTicket.category === 'refund' && selectedTicket.refundRequest?.refundStatus === 'pending' && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={async () => {
                            await api.post(`/support/${selectedTicket._id}/reply`, { refundStatus: 'approved', text: `Your refund request of ₹${selectedTicket.refundRequest.amount} has been approved.` });
                            toast.success('Refund request approved and processed');
                            fetchDashboardData();
                          }}
                          className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] rounded-lg transition-all"
                        >
                          Approve Refund (₹{selectedTicket.refundRequest.amount})
                        </button>
                        <button
                          onClick={async () => {
                            await api.post(`/support/${selectedTicket._id}/reply`, { refundStatus: 'rejected', text: 'Your refund request has been rejected.' });
                            toast.info('Refund request rejected.');
                            fetchDashboardData();
                          }}
                          className="py-1.5 px-3 bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] rounded-lg transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {selectedTicket.refundRequest?.refundStatus !== 'none' && selectedTicket.refundRequest?.refundStatus !== 'pending' && (
                      <span className={`px-2 py-0.5 text-[8px] font-bold border rounded-full uppercase tracking-wider ${
                        selectedTicket.refundRequest.refundStatus === 'approved' ? 'border-green-200 text-green-500 bg-green-50' : 'border-red-200 text-red-500 bg-red-50'
                      }`}>
                        REFUND: {selectedTicket.refundRequest.refundStatus}
                      </span>
                    )}
                  </div>
                </div>

                {/* Messages log list */}
                <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-gray-50/20 dark:bg-slate-900/5">
                  {selectedTicket.messages?.map((msg, index) => {
                    const isSelf = msg.sender === currentUser._id || msg.sender?._id === currentUser._id;
                    return (
                      <div
                        key={index}
                        className={`flex flex-col max-w-[80%] ${isSelf ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                      >
                        <span className="text-[9px] font-bold text-gray-400 mb-1">
                          {msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div
                          className={`p-3 rounded-2xl text-xs font-sans font-medium leading-relaxed ${
                            isSelf
                              ? 'bg-primary-500 text-white rounded-tr-none'
                              : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-dark-text rounded-tl-none border border-gray-150 dark:border-slate-800'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatBottomRef} />
                </div>

                {/* Input action reply toolbar */}
                {selectedTicket.status !== 'resolved' ? (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!replyText.trim()) return;
                    setSending(true);
                    try {
                      await api.post(`/support/${selectedTicket._id}/reply`, { text: replyText });
                      setReplyText('');
                    } catch (error) {
                      toast.error('Failed to post message response');
                    } finally {
                      setSending(false);
                    }
                  }} className="p-4 border-t border-gray-100 dark:border-slate-800 flex gap-2">
                    <input
                      type="text"
                      placeholder="Type your response as Support Agent..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-4 py-2.5 text-xs rounded-xl focus:outline-none text-gray-800 dark:text-white font-sans"
                    />
                    <button
                      type="submit"
                      disabled={sending}
                      className="p-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl shadow-glow transition-all"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                ) : (
                  <div className="p-4 bg-gray-100 dark:bg-slate-900 text-center text-xs text-gray-500 font-bold">
                    This support ticket has been resolved and closed.
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-400">
                <MessageSquare size={36} className="mb-2" />
                <p className="text-xs">Select a customer claim ticket from the list to initiate live helpdesk thread</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Catalog SKU Create/Edit Modal */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="max-w-md w-full glass p-6 rounded-[28px] shadow-xl border border-gray-100 dark:border-dark-border relative animate-scaleIn bg-white dark:bg-dark-card text-left">
            <div className="flex justify-between items-center mb-4 border-b border-gray-150 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                {editingProduct ? 'Edit Grocery SKU' : 'Create Grocery SKU'}
              </h3>
              <button onClick={() => setProductModalOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500"><X size={16} /></button>
            </div>

            <form onSubmit={handleProductSubmit(handleSaveProduct)} className="space-y-4 text-xs font-medium">
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Product Name</label>
                <input
                  type="text"
                  placeholder="e.g. Fresh Organic Bananas"
                  {...registerProduct('name', { required: true })}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 rounded-xl focus:outline-none text-gray-800 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Description</label>
                <textarea
                  rows={2}
                  placeholder="Product specs..."
                  {...registerProduct('description', { required: true })}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 rounded-xl focus:outline-none text-gray-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Price (₹)</label>
                  <input
                    type="number"
                    placeholder="99"
                    {...registerProduct('price', { required: true })}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 rounded-xl focus:outline-none text-gray-800 dark:text-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Discount Price (₹)</label>
                  <input
                    type="number"
                    placeholder="Optional discount price"
                    {...registerProduct('discountPrice')}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 rounded-xl focus:outline-none text-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Initial Stock</label>
                  <input
                    type="number"
                    placeholder="100"
                    {...registerProduct('stock', { required: true })}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 rounded-xl focus:outline-none text-gray-800 dark:text-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Unit (e.g. 500g, 1L)</label>
                  <input
                    type="text"
                    placeholder="500g"
                    {...registerProduct('unit', { required: true })}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 rounded-xl focus:outline-none text-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Category slug</label>
                  <select
                    {...registerProduct('category', { required: true })}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 rounded-xl focus:outline-none text-gray-800 dark:text-white capitalize"
                  >
                    {categoriesList.map(c => (
                      <option key={c._id} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Low Stock Alert limit</label>
                  <input
                    type="number"
                    placeholder="10"
                    {...registerProduct('lowStockThreshold', { required: true })}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 rounded-xl focus:outline-none text-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-bold shadow-glow mt-4"
              >
                Save catalog product
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default AdminDashboard;
