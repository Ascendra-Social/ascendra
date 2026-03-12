import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, Heart, MessageCircle, UserPlus, Mail, Check, CheckCheck } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

const typeConfig = {
  follow: { icon: UserPlus, color: 'text-cyan-500', bg: 'bg-cyan-500/10', label: 'followed you' },
  like: { icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500/10', label: 'liked your post' },
  comment: { icon: MessageCircle, color: 'text-violet-500', bg: 'bg-violet-500/10', label: 'commented on your post' },
  message: { icon: Mail, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'sent you a message' },
};

export default function NotificationBell({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!user?.id) return;
    fetchNotifications();

    // Poll every 5 minutes to avoid rate limits
    const interval = setInterval(fetchNotifications, 300000);
    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await base44.entities.Notification.filter(
        { recipient_id: user.id },
        '-created_date',
        30
      );
      setNotifications(data);
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const markOneRead = async (notif) => {
    if (notif.is_read) return;
    await base44.entities.Notification.update(notif.id, { is_read: true });
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
  };

  const getNotifLink = (notif) => {
    if (notif.type === 'follow') return createPageUrl(`Profile?id=${notif.sender_id}`);
    if (notif.type === 'message') return createPageUrl('Messages');
    return createPageUrl('Home');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-xl relative"
        onClick={() => setOpen(prev => !prev)}
      >
        <Bell className="w-5 h-5 text-slate-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-80 bg-slate-900 border border-cyan-500/20 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <h3 className="font-semibold text-white text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-cyan-400 hover:text-cyan-300 h-auto py-1 px-2 text-xs gap-1"
                  onClick={markAllRead}
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </Button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map(notif => {
                  const cfg = typeConfig[notif.type] || typeConfig.like;
                  const Icon = cfg.icon;
                  return (
                    <Link
                      key={notif.id}
                      to={getNotifLink(notif)}
                      onClick={() => { markOneRead(notif); setOpen(false); }}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-800 transition-colors cursor-pointer ${!notif.is_read ? 'bg-slate-800/60' : ''}`}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="w-9 h-9">
                          <AvatarImage src={notif.sender_avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-purple-400 text-white text-xs">
                            {notif.sender_name?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${cfg.bg}`}>
                          <Icon className={`w-3 h-3 ${cfg.color}`} />
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 leading-snug">
                          <span className="font-semibold">{notif.sender_name}</span>
                          {' '}{cfg.label}
                        </p>
                        {notif.content_preview && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate">"{notif.content_preview}"</p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                          {notif.created_date && formatDistanceToNow(new Date(notif.created_date), { addSuffix: true })}
                        </p>
                      </div>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
                      )}
                    </Link>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}