import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { 
  CheckCircle2, Clock, MapPin, Phone, ShieldCheck, 
  ArrowLeft, ShoppingBag, Truck, Check, HelpCircle 
} from 'lucide-react';
import api from '../utils/axios.js';
import { PageLoader } from '../components/LoadingSkeleton.jsx';
import { toast } from 'react-toastify';

export const OrderTracking = () => {
  const { id } = useParams();
  const { user } = useSelector((state) => state.auth);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [driverCoords, setDriverCoords] = useState(null);

  // Calculate rider fraction along route path
  const getRiderFraction = () => {
    if (!order) return 0;
    if (order.orderStatus === 'delivered') return 1;
    if (order.orderStatus !== 'out_for_delivery') return 0;
    
    // If out_for_delivery and we have coordinates:
    const startLng = 77.1025;
    const endLng = order.deliveryAddress?.coordinates?.[0] || 77.1250;
    const currentLng = driverCoords ? driverCoords[0] : startLng;
    
    const diff = endLng - startLng;
    if (diff === 0) return 0.5;
    
    const fraction = (currentLng - startLng) / diff;
    return Math.min(0.95, Math.max(0, fraction)); // clamp progress, leave 0.95 until marked delivered
  };

  const riderFraction = getRiderFraction();

  const getRiderPosition = (t) => {
    // Cubic Bezier path M 50 120 C 120 40, 200 160, 270 60
    const p0 = { x: 50, y: 120 };
    const p1 = { x: 120, y: 40 };
    const p2 = { x: 200, y: 160 };
    const p3 = { x: 270, y: 60 };

    const x = Math.pow(1-t, 3)*p0.x + 3*Math.pow(1-t, 2)*t*p1.x + 3*(1-t)*Math.pow(t, 2)*p2.x + Math.pow(t, 3)*p3.x;
    const y = Math.pow(1-t, 3)*p0.y + 3*Math.pow(1-t, 2)*t*p1.y + 3*(1-t)*Math.pow(t, 2)*p2.y + Math.pow(t, 3)*p3.y;

    return { x, y };
  };

  const riderPos = getRiderPosition(riderFraction);

  // Fetch initial details of order
  const fetchDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/orders/${id}`);
      setOrder(response.data.data.order);
    } catch (error) {
      toast.error('Failed to fetch tracking details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  // Connect to Sockets
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const socketInstance = io(socketUrl);
    setSocket(socketInstance);

    // Join order tracking room
    socketInstance.emit('joinOrderRoom', { orderId: id });

    // Listen for order status timeline updates
    socketInstance.on('orderStatusChanged', (data) => {
      if (data.orderId === id) {
        toast.info(`Order status updated to: ${data.status.replace('_', ' ')}`);
        setOrder((prev) => prev ? { 
          ...prev, 
          orderStatus: data.status, 
          timeline: data.timeline,
          deliveryPartner: data.deliveryPartner !== undefined ? data.deliveryPartner : prev.deliveryPartner
        } : null);
      }
    });

    // Listen for live driver coordinates streaming
    socketInstance.on('driverLocationUpdate', (data) => {
      // coordinates are [lng, lat]
      setDriverCoords(data.coordinates);
    });

    return () => {
      socketInstance.off('orderStatusChanged');
      socketInstance.off('driverLocationUpdate');
      socketInstance.disconnect();
    };
  }, [id]);

  if (loading && !order) {
    return <PageLoader />;
  }

  if (!order) {
    return (
      <div className="text-center py-20 bg-white dark:bg-dark-card rounded-3xl p-8 border border-gray-100 dark:border-dark-border">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white font-sans">Order Not Found</h2>
        <p className="text-xs text-gray-500 dark:text-dark-muted mt-1.5 mb-6">Could not identify order ref #{id}.</p>
        <Link to="/profile" className="py-2.5 px-5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-semibold">
          Return to History
        </Link>
      </div>
    );
  }

  const timelineSteps = [
    { status: 'placed', label: 'Order Placed', desc: 'Order received & items reserved', icon: Clock },
    { status: 'packing', label: 'Packing Items', desc: 'Store is picking and packing your groceries', icon: ShoppingBag },
    { status: 'out_for_delivery', label: 'Out for Delivery', desc: 'Rider is on the way to your door', icon: Truck },
    { status: 'delivered', label: 'Delivered', desc: 'Verification OTP checked. Drop-off complete', icon: CheckCircle2 }
  ];

  // Identify index of current status to highlight completed steps
  const getStepIndex = (status) => {
    return timelineSteps.findIndex(s => s.status === status);
  };
  const currentIndex = getStepIndex(order.orderStatus);

  return (
    <div className="flex flex-col gap-8 pb-20 max-w-4xl mx-auto">
      
      {/* Back Header */}
      <div className="flex justify-between items-center">
        <Link
          to="/profile"
          className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-dark-muted hover:text-gray-700 dark:hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to History
        </Link>
        <span className="text-[10px] font-mono text-gray-400">ID: #{order._id}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Side: Professional Timeline Visualizer */}
        <div className="md:col-span-2 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-[32px] shadow-sm relative">
          
          <h2 className="text-base font-extrabold text-gray-900 dark:text-white font-sans mb-6">
            Delivery Radar Tracking Map
          </h2>

          {/* SVG Radar Map Visualizer */}
          <div className="w-full h-48 bg-slate-900 rounded-[24px] relative mb-8 overflow-hidden border border-slate-800/80 flex items-center justify-center">
            {/* Dark grid background representation */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-25" />
            
            <svg className="w-full h-full relative z-10" viewBox="0 0 320 180">
              {/* Route path dashed */}
              <path
                d="M 50 120 C 120 40, 200 160, 270 60"
                fill="none"
                stroke="#334155"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="6 6"
              />
              
              {/* Completed route path glowing */}
              <path
                id="glowing-route"
                d="M 50 120 C 120 40, 200 160, 270 60"
                fill="none"
                stroke="#22c55e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="300"
                strokeDashoffset={300 - 300 * riderFraction}
                className="transition-all duration-1000"
              />

              {/* Grovio Hub (Store) Pin */}
              <g transform="translate(50, 120)">
                <circle cx="0" cy="0" r="12" fill="#3b82f6" className="animate-ping" opacity="0.2" />
                <circle cx="0" cy="0" r="5" fill="#3b82f6" />
                <text x="8" y="3" fill="#64748b" className="text-[7px] font-sans font-black">GROVIO HUB</text>
              </g>

              {/* Customer Home Pin */}
              <g transform="translate(270, 60)">
                <circle cx="0" cy="0" r="12" fill="#22c55e" className="animate-ping" opacity="0.2" />
                <circle cx="0" cy="0" r="5" fill="#22c55e" />
                <text x="8" y="3" fill="#64748b" className="text-[7px] font-sans font-black">YOUR HOME</text>
              </g>

              {/* Rider Scooter Icon / Glowing Point */}
              {order.orderStatus === 'out_for_delivery' && (
                <g transform={`translate(${riderPos.x}, ${riderPos.y})`} className="transition-all duration-1000">
                  <circle cx="0" cy="0" r="16" fill="#ef4444" className="animate-ping" opacity="0.35" />
                  <circle cx="0" cy="0" r="6" fill="#ef4444" />
                  <text x="-16" y="-12" fill="#ef4444" className="text-[8px] font-black font-sans uppercase tracking-wider animate-pulse">RIDER (LIVE)</text>
                </g>
              )}
            </svg>

            {/* Float stats */}
            <div className="absolute bottom-3 right-4 z-20 flex gap-4 text-[9px] font-bold text-gray-400 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800/60 font-mono">
              <span>SPEED: 30 KM/H</span>
              <span>ETA: {order.orderStatus === 'delivered' ? '0' : order.orderStatus === 'out_for_delivery' ? '5-7' : '10-12'} MINS</span>
            </div>
          </div>

          <h2 className="text-base font-extrabold text-gray-900 dark:text-white font-sans mb-8">
            Delivery Timeline Status
          </h2>

          <div className="relative pl-8 border-l-2 border-gray-100 dark:border-slate-800 space-y-8 ml-4">
            {timelineSteps.map((step, idx) => {
              const isPast = idx < currentIndex;
              const isActive = idx === currentIndex;
              const isFuture = idx > currentIndex;
              
              const isCancelled = order.orderStatus === 'cancelled';

              let dotColor = 'border-gray-200 bg-white text-gray-400';
              if (isCancelled && idx <= 1) dotColor = 'border-red-500 bg-red-100 text-red-500';
              else if (isCancelled) dotColor = 'border-gray-200 bg-white text-gray-400';
              else if (isPast) dotColor = 'border-primary-500 bg-primary-500 text-white';
              else if (isActive) dotColor = 'border-primary-500 bg-primary-50 dark:bg-primary-950 text-primary-500 ring-4 ring-primary-500/10 dark:ring-primary-500/20';

              const timestamp = order.timeline.find(t => t.status === step.status)?.timestamp;

              return (
                <div key={step.status} className="relative text-left">
                  {/* Timeline icon dot */}
                  <span className={`absolute -left-12 top-0.5 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${dotColor}`}>
                    {isPast && !isCancelled ? <Check size={14} /> : <step.icon size={14} />}
                  </span>

                  <div>
                    <h3 className={`text-sm font-bold ${
                      isActive ? 'text-primary-500' : isFuture ? 'text-gray-400' : 'text-gray-800 dark:text-white'
                    }`}>
                      {step.label}
                    </h3>
                    <p className="text-[10px] text-gray-500 dark:text-dark-muted font-medium mt-0.5 max-w-sm">
                      {step.desc}
                    </p>
                    {timestamp && (
                      <span className="text-[9px] text-gray-400 font-bold block mt-1.5">
                        {new Date(timestamp).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cancellation Alert */}
          {order.orderStatus === 'cancelled' && (
            <div className="mt-8 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex gap-3 text-left">
              <CheckCircle2 className="text-red-500 flex-shrink-0" size={18} />
              <div>
                <p className="text-xs font-bold text-red-800 dark:text-red-400">Order Cancelled & Restocked</p>
                <p className="text-[10px] text-red-600 dark:text-red-400/80 mt-0.5">
                  Refund was processed back to your original source card. Grocery inventory items have been released to the catalog.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Security OTP and Rider Detail cards */}
        <div className="flex flex-col gap-6">
          
          {/* Security OTP block */}
          {order.orderStatus !== 'delivered' && order.orderStatus !== 'cancelled' && (
            <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-[32px] shadow-sm text-center">
              <ShieldCheck className="text-primary-500 mx-auto mb-2" size={24} />
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Rider Delivery OTP
              </h3>
              
              <div className="bg-primary-50 dark:bg-primary-950/20 border border-dashed border-primary-200 dark:border-primary-900/50 py-3 rounded-2xl my-4">
                <span className="text-2xl font-black text-primary-600 dark:text-primary-500 font-mono tracking-widest leading-none">
                  {order.otp}
                </span>
              </div>
              <p className="text-[9px] text-gray-400 dark:text-dark-muted font-semibold max-w-[200px] mx-auto leading-relaxed">
                Provide this secure 4-digit code to the delivery rider ONLY when you receive your grocery package.
              </p>
            </div>
          )}

          {/* Delivery Rider Details */}
          {order.deliveryPartner ? (
            <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-[32px] shadow-sm text-left">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                Your Delivery Partner
              </h3>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-primary-500 font-bold uppercase">
                  {order.deliveryPartner.name.substring(0, 2)}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{order.deliveryPartner.name}</p>
                  <p className="text-[10px] text-gray-500 dark:text-dark-muted mt-0.5">Assigned Rider</p>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-slate-800/50">
                <a
                  href={`tel:${order.deliveryPartner.phone}`}
                  className="flex-1 py-2 px-3 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-dark-text font-bold text-[10px] rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone size={12} />
                  Call Partner
                </a>
              </div>
            </div>
          ) : order.orderStatus !== 'cancelled' ? (
            <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-[32px] shadow-sm text-center py-8">
              <Truck size={24} className="text-gray-400 mx-auto mb-2 animate-pulse" />
              <p className="text-xs font-bold text-gray-900 dark:text-white">Searching for Rider...</p>
              <p className="text-[10px] text-gray-400 dark:text-dark-muted mt-1 leading-relaxed">
                A nearby Grovio rider partner is self-assigning to pick up your packed groceries.
              </p>
            </div>
          ) : null}

          {/* Sockets coordinates tracking mock display */}
          {order.orderStatus === 'out_for_delivery' && (
            <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-[32px] shadow-sm text-left">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <MapPin size={12} className="text-primary-500" />
                Live GPS Tracker
              </h3>
              
              <div className="p-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-dark-border rounded-xl">
                <p className="text-[10px] font-bold text-gray-600 dark:text-dark-text">Current Coordinates:</p>
                <p className="text-[11px] font-mono text-primary-500 font-extrabold mt-1">
                  {driverCoords ? `${driverCoords[1].toFixed(5)}, ${driverCoords[0].toFixed(5)}` : 'Syncing rider GPS signals...'}
                </p>
                <span className="text-[9px] text-gray-400 block mt-1.5">
                  Updates every 10 seconds from driver tracking console.
                </span>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
export default OrderTracking;
