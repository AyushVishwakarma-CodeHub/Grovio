import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, X } from 'lucide-react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markOneNotificationRead,
  deleteNotificationAsync,
  selectNotifications,
  selectUnreadCount
} from '../store/notificationSlice.js';

const timeAgo = (dateStr) => {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const NotificationBell = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const notifications = useSelector(selectNotifications);
  const unreadCount = useSelector(selectUnreadCount);
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) dispatch(fetchNotifications());
  }, [isAuthenticated]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleOpen = () => {
    setOpen((prev) => !prev);
    if (!open && isAuthenticated) dispatch(fetchNotifications());
  };

  const handleMarkAllRead = () => dispatch(markAllNotificationsRead());

  const handleClickNotification = (n) => {
    if (!n.isRead) dispatch(markOneNotificationRead(n._id));
    if (n.link) navigate(n.link);
    setOpen(false);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    dispatch(deleteNotificationAsync(id));
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative p-2 sm:p-3 rounded-2xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-dark-text transition-all duration-300 transform active:scale-95"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white dark:border-slate-900 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-dark-card rounded-3xl shadow-2xl border border-gray-100 dark:border-dark-border z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-dark-border">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-primary-500" />
              <span className="text-sm font-bold text-gray-900 dark:text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-primary-500 text-white px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-[11px] text-primary-500 hover:text-primary-600 font-semibold px-2 py-1 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck size={13} /> All read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Bell size={32} className="text-gray-300 dark:text-slate-600" />
                <p className="text-sm text-gray-500 dark:text-dark-muted">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => handleClickNotification(n)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors group ${
                    !n.isRead
                      ? 'bg-primary-50/60 dark:bg-primary-950/10 hover:bg-primary-50 dark:hover:bg-primary-950/20'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base ${
                    !n.isRead ? 'bg-primary-100 dark:bg-primary-950/30' : 'bg-gray-100 dark:bg-slate-800'
                  }`}>
                    {n.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold leading-tight ${!n.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-dark-text'}`}>
                      {n.title}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-dark-muted mt-0.5 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>

                  {/* Unread dot + Delete */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {!n.isRead && (
                      <div className="w-2 h-2 rounded-full bg-primary-500" />
                    )}
                    <button
                      onClick={(e) => handleDelete(e, n._id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-300 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
