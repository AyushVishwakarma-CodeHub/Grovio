import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { 
  LifeBuoy, Plus, Send, ShieldAlert, CheckCircle2, 
  HelpCircle, MessageSquare, AlertCircle, FileText, ChevronRight, X 
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import api from '../utils/axios.js';
import { toast } from 'react-toastify';
import { PageLoader } from '../components/LoadingSkeleton.jsx';

export const Support = () => {
  const { user } = useSelector((state) => state.auth);

  // States
  const [ticketsList, setTicketsList] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ordersList, setOrdersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);

  // Socket state
  const [socket, setSocket] = useState(null);
  
  // Chat scroll anchor
  const chatBottomRef = useRef(null);

  const { 
    register: registerTicket, 
    handleSubmit: handleTicketSubmit, 
    watch: watchTicketForm, 
    reset: resetTicketForm 
  } = useForm({
    defaultValues: { category: 'query' }
  });

  const selectedCategory = watchTicketForm('category');

  // Fetch tickets and orders
  const loadSupportData = async (selectFirst = false) => {
    try {
      setLoading(true);
      const ticketsResponse = await api.get('/support');
      const tickets = ticketsResponse.data.data.tickets;
      setTicketsList(tickets);

      if (selectFirst && tickets.length > 0) {
        setSelectedTicket(tickets[0]);
      } else if (selectedTicket) {
        // Refresh selected ticket content
        const refreshed = tickets.find(t => t._id === selectedTicket._id);
        if (refreshed) setSelectedTicket(refreshed);
      }

      // Fetch user orders (for associate order selection dropdown)
      const ordersResponse = await api.get('/orders');
      setOrdersList(ordersResponse.data.data.orders);

    } catch (error) {
      toast.error('Failed to load support center data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSupportData(true);
  }, []);

  // Socket Connection and live chat updates
  useEffect(() => {
    if (!selectedTicket) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const socketInstance = io(socketUrl);
    setSocket(socketInstance);

    // Join room for this specific ticket
    socketInstance.emit('joinOrderRoom', { orderId: selectedTicket._id }); // Reuse joinOrderRoom since room mapping is matching

    // Listen for new messages
    socketInstance.on('newTicketMessage', (data) => {
      if (data.ticketId === selectedTicket._id) {
        // Update selected ticket messages
        setSelectedTicket(prev => prev ? {
          ...prev,
          status: data.status,
          refundRequest: data.refundRequest,
          messages: [...prev.messages, data.message]
        } : null);

        // Update list
        setTicketsList(prevList => prevList.map(t => 
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
  }, [selectedTicket?._id]);

  // Auto-scroll to bottom of chat on message list changes
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicket?.messages?.length]);

  // Open support ticket
  const handleCreateTicket = async (data) => {
    try {
      const response = await api.post('/support', data);
      toast.success('Support ticket opened! Our helpdesk agent will reply shortly.');
      setTicketModalOpen(false);
      resetTicketForm();
      loadSupportData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to open ticket');
    }
  };

  // Send message reply
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      setSending(true);
      await api.post(`/support/${selectedTicket._id}/reply`, { text: replyText });
      setReplyText('');
    } catch (error) {
      toast.error('Failed to send reply message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-20 max-w-6xl mx-auto text-left font-sans">
      
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            Support Helpdesk
          </h1>
          <p className="text-xs text-gray-500 dark:text-dark-muted mt-1">
            Resolve complaints, request refunds, and chat live with Grovio agents.
          </p>
        </div>

        <button
          onClick={() => setTicketModalOpen(true)}
          className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-glow transition-all"
        >
          <Plus size={14} />
          Create Support Claim
        </button>
      </div>

      {loading && ticketsList.length === 0 ? (
        <PageLoader />
      ) : ticketsList.length === 0 ? (
        <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-12 rounded-[32px] text-center shadow-sm max-w-md mx-auto">
          <LifeBuoy size={40} className="text-gray-400 mx-auto mb-3 animate-spin" style={{ animationDuration: '8s' }} />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">No Tickets Found</h2>
          <p className="text-xs text-gray-500 dark:text-dark-muted mt-1.5 mb-6">
            If you have issues with packaging, delayed delivery, or need refunds, file a support claim.
          </p>
          <button
            onClick={() => setTicketModalOpen(true)}
            className="py-2.5 px-5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold"
          >
            Create Ticket
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch h-[550px]">
          
          {/* Left panel: Tickets List */}
          <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-[32px] p-5 shadow-sm overflow-y-auto flex flex-col gap-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-slate-800 pb-3">
              Your Support Claims
            </h3>

            <div className="space-y-2.5 flex-1">
              {ticketsList.map((ticket) => {
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
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate font-medium">
                      Last Update: {new Date(ticket.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel: Active Chat UI thread */}
          <div className="md:col-span-2 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-[32px] shadow-sm flex flex-col overflow-hidden">
            
            {selectedTicket ? (
              <>
                {/* Chat Header details */}
                <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/10">
                  <div>
                    <span className="text-[9px] font-mono text-gray-400">TICKET REF: #{selectedTicket._id.substring(18).toUpperCase()}</span>
                    <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white mt-1">
                      {selectedTicket.subject}
                    </h3>
                  </div>

                  {selectedTicket.refundRequest?.refundStatus !== 'none' && (
                    <div className="text-right">
                      <span className={`px-2.5 py-1 text-[9px] font-bold border rounded-full uppercase tracking-wider ${
                        selectedTicket.refundRequest.refundStatus === 'approved' ? 'border-green-200 text-green-500 bg-green-50 dark:bg-emerald-950/20' :
                        selectedTicket.refundRequest.refundStatus === 'rejected' ? 'border-red-200 text-red-500 bg-red-50 dark:bg-red-950/20' :
                        'border-yellow-200 text-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
                      }`}>
                        REFUND: {selectedTicket.refundRequest.refundStatus}
                      </span>
                      <p className="text-[9px] text-gray-400 mt-1">Value Claim: ₹{selectedTicket.refundRequest.amount}</p>
                    </div>
                  )}
                </div>

                {/* Messages log body */}
                <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-gray-50/20 dark:bg-slate-900/5">
                  {selectedTicket.messages.map((msg, index) => {
                    const isSelf = msg.sender === user._id || msg.sender?._id === user._id;
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

                {/* Input action toolbar */}
                {selectedTicket.status !== 'resolved' ? (
                  <form onSubmit={handleSendReply} className="p-4 border-t border-gray-100 dark:border-slate-800 flex gap-2">
                    <input
                      type="text"
                      placeholder="Type your response to Grovio Support agent..."
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
                <p className="text-xs">Select a support ticket from the list to start live chat</p>
              </div>
            )}

          </div>

        </div>
      )}

      {/* Create Support Claim Modal */}
      {ticketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="max-w-md w-full glass p-6 rounded-[28px] shadow-xl border border-gray-100 dark:border-dark-border relative animate-scaleIn bg-white dark:bg-dark-card">
            
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Open Support Claim
              </h3>
              <button onClick={() => setTicketModalOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500"><X size={16} /></button>
            </div>

            <form onSubmit={handleTicketSubmit(handleCreateTicket)} className="space-y-4 text-xs text-left">
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Subject Title</label>
                <input
                  type="text"
                  placeholder="e.g. Delayed package delivery, missing bread item"
                  {...registerTicket('subject', { required: 'Subject is required' })}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 rounded-xl focus:outline-none text-gray-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Claim Category</label>
                  <select
                    {...registerTicket('category', { required: true })}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 rounded-xl focus:outline-none text-gray-800 dark:text-white"
                  >
                    <option value="query">General Query</option>
                    <option value="complaint">Complaint</option>
                    <option value="refund">Refund Request</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Associated Order (Optional)</label>
                  <select
                    {...registerTicket('orderId')}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 rounded-xl focus:outline-none text-gray-800 dark:text-white font-mono"
                  >
                    <option value="">None</option>
                    {ordersList.map(o => (
                      <option key={o._id} value={o._id}>#{o._id.substring(18).toUpperCase()} (₹{o.totals.grandTotal})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conditional Refund inputs */}
              {selectedCategory === 'refund' && (
                <div className="p-4 bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-950/20 rounded-2xl space-y-3 animate-fadeIn">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-emerald-600 uppercase">Refund Value (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 150"
                      {...registerTicket('refundAmount', { required: 'Refund value required' })}
                      className="w-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border px-3 py-2 rounded-xl focus:outline-none text-gray-800 dark:text-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-emerald-600 uppercase">Refund Claim Reason</label>
                    <input
                      type="text"
                      placeholder="e.g. Milk packet was leaking, brown bread stale"
                      {...registerTicket('refundReason', { required: 'Reason is required' })}
                      className="w-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border px-3 py-2 rounded-xl focus:outline-none text-gray-800 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Describe your Issue</label>
                <textarea
                  rows={3}
                  placeholder="Provide logs details..."
                  {...registerTicket('message', { required: 'Initial message description is required' })}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-dark-border px-3 py-2 rounded-xl focus:outline-none text-gray-800 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-bold shadow-glow mt-4"
              >
                Submit Claim Ticket
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default Support;
