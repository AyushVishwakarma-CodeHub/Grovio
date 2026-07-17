import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { 
  MapPin, CheckCircle2, Clock, Truck, ShieldCheck, 
  Navigation, Play, Check, XCircle, ArrowRight, 
  TrendingUp, CircleDollarSign, CalendarDays, Compass, HelpCircle 
} from 'lucide-react';
import api from '../utils/axios.js';
import { toast } from 'react-toastify';

export const RiderDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  // Tab State: 'active' | 'history' | 'earnings'
  const [activeTab, setActiveTab] = useState('active');

  // List states
  const [availableOrders, setAvailableOrders] = useState([]);
  const [completedDeliveries, setCompletedDeliveries] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Verify OTP state
  const [otpInput, setOtpInput] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Sockets & Location simulator state
  const [socket, setSocket] = useState(null);
  const [coords, setCoords] = useState([77.1025, 28.7041]); // Delhi center starting point
  const [gpsIntervalId, setGpsIntervalId] = useState(null);

  // Fetch all rider-related order feeds
  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // 1. Get all available orders needing driver assignments
      const feedResponse = await api.get('/orders/rider/feed');
      setAvailableOrders(feedResponse.data.data.orders);

      // 2. Query driver's history (completed vs in-progress)
      const historyResponse = await api.get('/orders');
      const allOrders = historyResponse.data.data.orders;

      // Filter in-transit order assigned to this rider
      const activeJob = allOrders.find(
        o => o.deliveryPartner?._id === user._id && ['placed', 'packing', 'out_for_delivery'].includes(o.orderStatus)
      ) || allOrders.find(
        o => o.deliveryPartner === user._id && ['placed', 'packing', 'out_for_delivery'].includes(o.orderStatus)
      );
      
      setActiveOrder(activeJob || null);

      // Filter completed orders by this rider
      const completed = allOrders.filter(
        o => (o.deliveryPartner?._id === user._id || o.deliveryPartner === user._id) && o.orderStatus === 'delivered'
      );
      setCompletedDeliveries(completed);

    } catch (error) {
      toast.error('Failed to load delivery feed details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Connect to Sockets for active order notifications
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const socketInstance = io(socketUrl);
    setSocket(socketInstance);

    // Live listen to new customer order placement broadcasts
    socketInstance.on('newOrderAlert', (data) => {
      toast.info(`New Grovio order available near ${data.address}! Feed updated.`);
      // Reload feed list
      api.get('/orders/rider/feed').then(res => {
        setAvailableOrders(res.data.data.orders);
      });
    });

    return () => {
      socketInstance.off('newOrderAlert');
      socketInstance.disconnect();
    };
  }, []);

  // Haversine formula to compute distance in km between coordinates
  const calculateDistance = (lon1, lat1, lon2, lat2) => {
    const R = 6371; // radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return parseFloat((R * c).toFixed(2)); // distance in km
  };

  // Route calculation helper
  const getRouteMetrics = () => {
    if (!activeOrder) return { distance: 0, eta: 0 };
    
    // Store coordinate (Delhi hub)
    const storeLng = 77.1025;
    const storeLat = 28.7041;
    
    // Customer address coordinate (default fallback if coordinate array is empty)
    const custCoords = activeOrder.deliveryAddress?.coordinates || [77.1250, 28.7180];
    
    const distance = calculateDistance(storeLng, storeLat, custCoords[0], custCoords[1]);
    
    // ETA at average speed of 30 km/h + packing delay buffer
    const eta = Math.round((distance / 30) * 60 + 5); 
    
    return { distance, eta };
  };

  const { distance: routeDistance, eta: routeEta } = getRouteMetrics();

  // Simulate active rider coordinate drifts and socket broadcasts
  const startGpsBroadcast = (orderId) => {
    if (gpsIntervalId) clearInterval(gpsIntervalId);

    toast.success('Rider GPS transmitter active! Synchronizing tracking views.');

    let currentLng = 77.1025;
    let currentLat = 28.7041;

    const interval = setInterval(() => {
      currentLng += 0.00045;
      currentLat += 0.00030;
      setCoords([currentLng, currentLat]);

      if (socket) {
        socket.emit('driverLocationUpdate', {
          orderId,
          driverId: user._id,
          coordinates: [currentLng, currentLat]
        });
      }
    }, 7000);

    setGpsIntervalId(interval);
  };

  const stopGpsBroadcast = () => {
    if (gpsIntervalId) {
      clearInterval(gpsIntervalId);
      setGpsIntervalId(null);
      toast.info('GPS transmission disconnected.');
    }
  };

  useEffect(() => {
    // Release gps loop if active job completes
    if (!activeOrder && gpsIntervalId) {
      stopGpsBroadcast();
    }
  }, [activeOrder]);

  useEffect(() => {
    return () => {
      if (gpsIntervalId) clearInterval(gpsIntervalId);
    };
  }, [gpsIntervalId]);

  // Accept available order assignment
  const handleAcceptOrder = async (orderId) => {
    try {
      await api.post(`/orders/${orderId}/assign`);
      toast.success('Order assigned successfully! Please pick up items from Grovio Hub.');
      loadDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept order');
    }
  };

  // Pickup package from store
  const handleConfirmPickup = async () => {
    try {
      await api.post(`/orders/${activeOrder._id}/pickup`);
      toast.success('Pickup confirmed! Proceed to shipping address.');
      
      // Auto start GPS broadcaster
      startGpsBroadcast(activeOrder._id);
      loadDashboardData();
    } catch (error) {
      toast.error('Failed to confirm pickup');
    }
  };

  // Reject / Release delivery assignment
  const handleReleaseOrder = async () => {
    if (!window.confirm('Are you sure you want to release this shipment? It will go back to the public driver feed.')) return;
    
    try {
      await api.post(`/orders/${activeOrder._id}/release`);
      toast.info('Delivery assignment released.');
      stopGpsBroadcast();
      setActiveOrder(null);
      loadDashboardData();
    } catch (error) {
      toast.error('Failed to release delivery');
    }
  };

  // Confirm delivery drop-off via OTP check
  const handleVerifyOtp = async () => {
    if (!otpInput) {
      toast.warning('Please input the 4-digit customer security OTP');
      return;
    }

    try {
      setVerifying(true);
      await api.post(`/orders/${activeOrder._id}/verify-otp`, { otp: otpInput });
      
      toast.success('OTP verified successfully! Order completed.');
      stopGpsBroadcast();
      setActiveOrder(null);
      setOtpInput('');
      loadDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'OTP verification failed. Please check digits.');
    } finally {
      setVerifying(false);
    }
  };

  // Calculations for Earnings (₹50 flat payout per drop-off + ₹10 bonus tips mock)
  const earningsPerOrder = 50;
  const totalPayout = completedDeliveries.length * earningsPerOrder;
  const totalTips = completedDeliveries.length * 15; // mock tip metrics

  return (
    <div className="flex flex-col gap-8 pb-20">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white font-sans">
            Delivery Partner Hub
          </h1>
          <p className="text-xs text-gray-500 dark:text-dark-muted mt-1">
            Registered Partner: <span className="font-bold text-primary-500">{user?.name}</span>
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-gray-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-gray-200 dark:border-slate-700/50">
          {[
            { id: 'active', label: 'Active Jobs', icon: Truck },
            { id: 'history', label: 'Deliveries History', icon: CalendarDays },
            { id: 'earnings', label: 'Earnings Summary', icon: CircleDollarSign }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-dark-card text-primary-500 shadow-sm'
                  : 'text-gray-500 dark:text-dark-muted hover:text-gray-800 dark:hover:text-white'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Panel Content depending on activeTab */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {activeTab === 'active' && (
          <>
            {/* Left Columns: Active Job Details or Available listings */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {activeOrder ? (
                <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-[32px] shadow-sm text-left">
                  
                  {/* Status header */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="text-[9px] font-bold bg-yellow-50 dark:bg-yellow-950/20 text-yellow-500 px-3 py-1 rounded-full uppercase border border-yellow-100 dark:border-yellow-900/30">
                        {activeOrder.orderStatus === 'out_for_delivery' ? 'IN TRANSIT' : 'ASSIGNED (PICKUP PENDING)'}
                      </span>
                      <h2 className="text-base font-extrabold text-gray-900 dark:text-white mt-3">
                        Order ID: #{activeOrder._id.substring(16).toUpperCase()}
                      </h2>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-900 dark:text-white">₹{activeOrder.totals.grandTotal}</p>
                      <p className="text-[9px] text-gray-400 dark:text-dark-muted uppercase font-bold mt-0.5">Collect Cash/UPI</p>
                    </div>
                  </div>

                  {/* Customer shipping details */}
                  <div className="p-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl flex gap-3 text-xs mb-6">
                    <MapPin className="text-primary-500 flex-shrink-0" size={18} />
                    <div>
                      <p className="font-bold text-gray-800 dark:text-white uppercase tracking-wide">
                        Customer Destination ({activeOrder.deliveryAddress.title})
                      </p>
                      <p className="text-gray-600 dark:text-dark-muted mt-1 leading-relaxed font-sans">
                        {activeOrder.deliveryAddress.addressLine1}, {activeOrder.deliveryAddress.addressLine2 && `${activeOrder.deliveryAddress.addressLine2}, `}
                        {activeOrder.deliveryAddress.city}, {activeOrder.deliveryAddress.state} - {activeOrder.deliveryAddress.zipCode}
                      </p>
                    </div>
                  </div>

                  {/* Route Optimization directions */}
                  <div className="p-5 border border-primary-100 dark:border-primary-950/20 bg-primary-50/10 dark:bg-primary-950/10 rounded-2xl mb-6">
                    <h3 className="text-xs font-bold text-primary-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Compass size={14} className="animate-spin" style={{ animationDuration: '6s' }} />
                      Optimized Delivery Route instructions
                    </h3>

                    <div className="grid grid-cols-2 gap-4 text-xs font-bold mb-4 border-b border-gray-100 dark:border-slate-800 pb-3">
                      <div>
                        <p className="text-gray-400 text-[10px] uppercase">Optimal Distance</p>
                        <p className="text-gray-900 dark:text-white mt-0.5">{routeDistance} km</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-[10px] uppercase">Estimated Transit time</p>
                        <p className="text-gray-900 dark:text-white mt-0.5">{routeEta} mins (at 30km/h)</p>
                      </div>
                    </div>

                    <div className="space-y-2.5 text-xs text-gray-600 dark:text-dark-muted font-medium">
                      <div className="flex gap-2">
                        <span className="w-4 h-4 rounded-full bg-gray-200 dark:bg-slate-800 text-[9px] font-bold flex items-center justify-center">1</span>
                        <span>Pick up package from **Grovio Hub** [77.1025, 28.7041]</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="w-4 h-4 rounded-full bg-gray-200 dark:bg-slate-800 text-[9px] font-bold flex items-center justify-center">2</span>
                        <span>Travel east along optimal route path (Distance: {routeDistance} km)</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="w-4 h-4 rounded-full bg-gray-200 dark:bg-slate-800 text-[9px] font-bold flex items-center justify-center">3</span>
                        <span>Arrive at customer house coordinates [{(activeOrder.deliveryAddress?.coordinates?.[1] || 28.7180).toFixed(4)}, {(activeOrder.deliveryAddress?.coordinates?.[0] || 77.1250).toFixed(4)}]</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {activeOrder.orderStatus !== 'out_for_delivery' ? (
                      <>
                        <button
                          onClick={handleConfirmPickup}
                          className="flex-1 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold shadow-glow hover:shadow-lg transition-all"
                        >
                          Confirm Pickup & Start Transit
                        </button>
                        <button
                          onClick={handleReleaseOrder}
                          className="py-3 px-5 border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-bold rounded-xl transition-all"
                        >
                          Release/Reject Order
                        </button>
                      </>
                    ) : (
                      <div className="w-full p-4 border border-dashed border-primary-200 dark:border-primary-900/50 bg-primary-50/50 dark:bg-primary-950/15 rounded-2xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-primary-500">
                          <Play size={12} className="animate-ping" />
                          <span>GPS Signals Active...</span>
                        </div>
                        <span className="text-[10px] text-gray-500">Broadcasting updates to customer page.</span>
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-8 rounded-[32px] shadow-sm text-center">
                  <Truck className="text-gray-400 mx-auto mb-3" size={32} />
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">No Active Deliveries</h2>
                  <p className="text-xs text-gray-500 dark:text-dark-muted mt-1.5">
                    Choose a shipment from the Available Feed on the right to start earning flat payouts.
                  </p>
                </div>
              )}

            </div>

            {/* Right Column: OTP checks & Available List */}
            <div className="flex flex-col gap-6">
              
              {/* OTP Drop-off validation form (only active if picked up) */}
              {activeOrder && activeOrder.orderStatus === 'out_for_delivery' && (
                <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-[32px] shadow-sm text-center">
                  <ShieldCheck className="text-primary-500 mx-auto mb-2" size={24} />
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Validate Drop-off OTP
                  </h3>
                  <p className="text-[10px] text-gray-500 dark:text-dark-muted mt-1 leading-relaxed">
                    Enter the 4-digit security code received from the customer to verify payment/shipment drop-off.
                  </p>

                  <div className="mt-4 flex flex-col gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="Enter 4-Digit OTP"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2.5 text-center text-sm font-bold tracking-widest rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-white font-mono"
                    />
                    <button
                      onClick={handleVerifyOtp}
                      disabled={verifying}
                      className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold shadow-glow hover:shadow-lg transition-all"
                    >
                      {verifying ? 'Verifying...' : 'Complete Drop-off'}
                    </button>
                  </div>
                </div>
              )}

              {/* Available feed */}
              <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-[32px] shadow-sm text-left">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                  Available Shipments Feed
                </h3>

                {loading ? (
                  <div className="space-y-3">
                    <div className="h-16 bg-gray-100 dark:bg-slate-800 animate-pulse rounded-xl" />
                  </div>
                ) : availableOrders.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-[11px] text-gray-500 dark:text-dark-muted">No pending shipments available right now.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {availableOrders.map((order) => (
                      <div
                        key={order._id}
                        className="p-4 border border-gray-100 dark:border-slate-800 rounded-xl hover:border-gray-200 dark:hover:border-slate-700 bg-gray-50/30 dark:bg-slate-900/10 flex justify-between items-center gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-gray-900 dark:text-white truncate">
                            {order.deliveryAddress.city} - Ref #{order._id.substring(18).toUpperCase()}
                          </p>
                          <p className="text-[9px] text-gray-500 dark:text-dark-muted mt-0.5 font-medium">
                            Payout: ₹50 | Collect: ₹{order.totals.grandTotal}
                          </p>
                        </div>

                        <button
                          onClick={() => handleAcceptOrder(order._id)}
                          disabled={!!activeOrder}
                          title={activeOrder ? 'Complete your current delivery first' : 'Accept Delivery Job'}
                          className="py-1.5 px-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-lg text-[10px] font-bold shadow-sm transition-all flex-shrink-0"
                        >
                          Accept
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div className="lg:col-span-3 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-[32px] shadow-sm text-left">
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white font-sans mb-6">
              Completed Deliveries History
            </h2>

            {completedDeliveries.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xs text-gray-500 dark:text-dark-muted">No completed deliveries found in history log.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 uppercase tracking-widest text-[9px]">
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Customer Address</th>
                      <th className="py-3 px-4">Date Completed</th>
                      <th className="py-3 px-4">Collectable</th>
                      <th className="py-3 px-4 text-right">Rider Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedDeliveries.map((o) => (
                      <tr key={o._id} className="border-b border-gray-50 dark:border-slate-850 hover:bg-gray-50/20 dark:hover:bg-slate-800/10">
                        <td className="py-4 px-4 font-mono font-bold text-gray-900 dark:text-white">
                          #{o._id.substring(16).toUpperCase()}
                        </td>
                        <td className="py-4 px-4 font-medium text-gray-700 dark:text-dark-text">
                          {o.deliveryAddress.addressLine1}, {o.deliveryAddress.city}
                        </td>
                        <td className="py-4 px-4 text-gray-500">
                          {new Date(o.updatedAt).toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-gray-900 dark:text-white font-semibold">
                          ₹{o.totals.grandTotal} ({o.paymentMethod.toUpperCase()})
                        </td>
                        <td className="py-4 px-4 text-right font-extrabold text-green-500">
                          +₹{earningsPerOrder}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="lg:col-span-3 flex flex-col gap-6">
            
            {/* Earnings metric summary grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-6 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-3xl text-left shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Delivery Fees</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">₹{totalPayout}</h3>
                <span className="text-[9px] text-gray-400 block mt-1">Flat ₹50 per completed drop-off</span>
              </div>

              <div className="p-6 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-3xl text-left shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Shopper Tips (Estimated)</p>
                <h3 className="text-2xl font-black text-emerald-500 mt-1">₹{totalTips}</h3>
                <span className="text-[9px] text-gray-400 block mt-1">Flat mock ₹15 bonus per run</span>
              </div>

              <div className="p-6 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-3xl text-left shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Revenue Earned</p>
                <h3 className="text-2xl font-black text-primary-500 mt-1">₹{totalPayout + totalTips}</h3>
                <span className="text-[9px] text-gray-400 block mt-1">Fees + tips accumulated</span>
              </div>
            </div>

            {/* Earnings Analysis Visual card */}
            <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-[32px] shadow-sm text-left">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <TrendingUp size={16} className="text-primary-500" />
                Performance metrics breakdown
              </h3>
              <p className="text-xs text-gray-600 dark:text-dark-muted font-medium mb-6">
                Review completed trips summaries. Payouts are transferred automatically to your registered bank account weekly.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-dark-border rounded-2xl">
                  <p className="text-[10px] text-gray-400 uppercase">Trips Completed</p>
                  <p className="text-base font-extrabold text-gray-800 dark:text-white mt-1">{completedDeliveries.length}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-dark-border rounded-2xl">
                  <p className="text-[10px] text-gray-400 uppercase">Avg Payout/Trip</p>
                  <p className="text-base font-extrabold text-gray-800 dark:text-white mt-1">₹{completedDeliveries.length > 0 ? ((totalPayout + totalTips) / completedDeliveries.length).toFixed(1) : 0}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-dark-border rounded-2xl">
                  <p className="text-[10px] text-gray-400 uppercase">Total Distance Run</p>
                  <p className="text-base font-extrabold text-gray-800 dark:text-white mt-1">
                    {completedDeliveries.length * 3.5} km
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-dark-border rounded-2xl">
                  <p className="text-[10px] text-gray-400 uppercase">Ratings (Mock)</p>
                  <p className="text-base font-extrabold text-gray-800 dark:text-white mt-1">4.9 ★</p>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
export default RiderDashboard;
