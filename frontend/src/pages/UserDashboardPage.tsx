import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, CheckCircle, XCircle, AlertCircle, Loader2, PlusCircle,
  MessageSquare, Filter, Bell, RefreshCw, ChevronDown, ChevronUp,
  MapPin, Building, ExternalLink, Flame
} from 'lucide-react';
import { requestService, chatService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { HelpRequest } from '../types';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Waiting for NGO', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: <Clock className="w-3.5 h-3.5" /> },
  ACCEPTED: { label: 'Accepted', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  EXPIRED: { label: 'Expired', color: 'bg-gray-200 text-gray-700 border-gray-300', icon: <Clock className="w-3.5 h-3.5" /> },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-100 text-rose-800 border-rose-200', icon: <XCircle className="w-3.5 h-3.5" /> }
};

const TYPE_ICONS: Record<string, string> = {
  FOOD: '🍲',
  SHELTER: '🏠',
  MEDICAL: '🏥',
  EMPLOYMENT: '💼',
  GUIDANCE: '🧭'
};

const NGO_STATUS_BADGES: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  ACCEPTED: { label: 'Accepted', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold' },
  REJECTED: { label: 'Rejected', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500 border-gray-200' },
  EXPIRED: { label: 'Expired', color: 'bg-gray-100 text-gray-500 border-gray-200' }
};

export const UserDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedRequestId, setExpandedRequestId] = useState<number | null>(null);

  // Operation states
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [reminding, setReminding] = useState<number | null>(null);
  const [renewing, setRenewing] = useState<number | null>(null);
  const [reminderNotices, setReminderNotices] = useState<Record<number, string>>({});

  // Chat modal
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatId, setChatId] = useState<number | null>(null);
  const [chatMsg, setChatMsg] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const data = await requestService.getUserRequests(params);
      setRequests(data.requests || []);
    } catch {
      setError('Failed to load your requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Cancel
  const handleCancel = async (requestId: number) => {
    if (!confirm('Are you sure you want to cancel this request?')) return;
    setCancelling(requestId);
    try {
      await requestService.updateRequestStatus(requestId, 'CANCELLED');
      fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel request.');
    } finally {
      setCancelling(null);
    }
  };

  // Handle Reminder
  const handleRemind = async (requestId: number) => {
    setReminding(requestId);
    try {
      const res = await requestService.remindNgos(requestId);
      setReminderNotices((prev) => ({
        ...prev,
        [requestId]: `Reminder sent to ${res.remindedCount} NGO(s)! ✓`
      }));
      fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to send reminder.');
    } finally {
      setReminding(null);
    }
  };

  // Handle Renewal
  const handleRenew = async (requestId: number) => {
    setRenewing(requestId);
    try {
      const res = await requestService.renewRequest(requestId);
      // Navigate to /request-help passing the renewed request so migrant can select NGOs for the new 7-day period
      navigate('/request-help', {
        state: { renewedRequest: res.request }
      });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to renew request.');
      setRenewing(null);
    }
  };

  // Chat helpers
  const openChat = async (reqChats: any[]) => {
    if (!reqChats || reqChats.length === 0) return;
    const cId = reqChats[0].chat_id;
    setChatId(cId);
    setChatOpen(true);
    setChatLoading(true);
    try {
      const data = await chatService.getMessages(cId);
      setChatMessages(data.messages || []);
    } catch {
      setChatMessages([]);
    } finally {
      setChatLoading(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatId || !chatMsg.trim()) return;
    try {
      await chatService.sendMessage(chatId, chatMsg.trim());
      setChatMsg('');
      const data = await chatService.getMessages(chatId);
      setChatMessages(data.messages || []);
    } catch {
      /* ignore */
    }
  };

  const formatCountdown = (cooldownSeconds: number) => {
    const hours = Math.floor(cooldownSeconds / 3600);
    const minutes = Math.floor((cooldownSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDaysRemaining = (remainingSeconds: number) => {
    const days = Math.floor(remainingSeconds / 86400);
    const hours = Math.floor((remainingSeconds % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'PENDING' && !r.is_expired).length,
    completed: requests.filter((r) => r.status === 'COMPLETED' || r.status === 'ACCEPTED').length,
    expired: requests.filter((r) => r.status === 'EXPIRED' || r.is_expired).length
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4">
        <div>
          <h1 className="font-display font-extrabold text-3xl text-forest-dark">My Requests</h1>
          <p className="text-emerald-950/60 text-sm mt-1">
            Welcome back, {user?.full_name || 'User'} — Track your active needs and NGO responses
          </p>
        </div>
        <Link
          to="/request-help"
          className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-forest-dark text-white font-semibold px-6 py-3 rounded-xl shadow-md transition-all duration-300 text-sm"
        >
          <PlusCircle className="w-4 h-4" /> Post New Need
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: stats.total, color: 'text-forest-dark', bg: 'bg-white' },
          { label: 'Waiting for NGO', value: stats.pending, color: 'text-amber-600', bg: 'bg-amber-50/50' },
          { label: 'Accepted / Done', value: stats.completed, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
          { label: 'Expired', value: stats.expired, color: 'text-gray-600', bg: 'bg-gray-50' }
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl p-4 border border-forest-light/20 shadow-sm text-center ${s.bg}`}>
            <p className={`font-display font-bold text-2xl ${s.color}`}>{s.value}</p>
            <p className="text-xs text-emerald-950/60 font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="w-4 h-4 text-forest-dark/50 shrink-0" />
        {[
          { key: '', label: 'All Requests' },
          { key: 'PENDING', label: 'Pending' },
          { key: 'COMPLETED', label: 'Completed' },
          { key: 'EXPIRED', label: 'Expired' },
          { key: 'CANCELLED', label: 'Cancelled' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === tab.key
                ? 'bg-primary text-white shadow-sm'
                : 'bg-bg-nature text-forest-dark/70 hover:bg-forest-light/30'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-xs text-emerald-950/60 mt-2">Loading your requests...</p>
        </div>
      ) : error ? (
        <div className="text-center py-16 space-y-3 bg-white rounded-2xl border border-forest-light/20 p-8">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <p className="text-rose-600 text-sm font-medium">{error}</p>
          <button
            onClick={fetchRequests}
            className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-forest-dark transition-all"
          >
            Retry
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 space-y-4 bg-white rounded-3xl border border-forest-light/20 p-8">
          <div className="w-16 h-16 rounded-full bg-forest-light/20 flex items-center justify-center mx-auto">
            <PlusCircle className="w-8 h-8 text-forest-dark/30" />
          </div>
          <h3 className="font-display font-semibold text-xl text-forest-dark/70">No Requests Found</h3>
          <p className="text-emerald-950/50 text-sm max-w-sm mx-auto">
            You don't have any requests in this category. Post your need to receive assistance from verified NGOs.
          </p>
          <Link
            to="/request-help"
            className="inline-flex items-center gap-1.5 text-primary hover:underline font-semibold text-sm"
          >
            Post a need now →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const sc = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
            const isCompleted = req.status === 'COMPLETED' || req.status === 'ACCEPTED';
            const isExpired = req.status === 'EXPIRED' || req.is_expired;
            const isPending = req.status === 'PENDING' && !isExpired;
            const isExpanded = expandedRequestId === req.request_id;
            const contactedNgos = req.need_ngo_requests || [];

            return (
              <motion.div
                key={req.request_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-5 border border-forest-light/20 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                {/* Top Row: Need Info & Status */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xl">{TYPE_ICONS[req.request_type] || '📋'}</span>
                      <h3 className="font-display font-bold text-forest-dark text-lg">{req.title}</h3>
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold border ${sc.color}`}
                      >
                        {sc.icon} {sc.label}
                      </span>
                      {req.renewal_number && req.renewal_number > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                          <RefreshCw className="w-3 h-3" /> Renewed {req.renewal_number} time{req.renewal_number > 1 ? 's' : ''}
                        </span>
                      ) : null}
                      {req.urgency && req.urgency !== 'MEDIUM' ? (
                        <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                          req.urgency === 'EMERGENCY' ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          <Flame className="w-3 h-3" /> {req.urgency}
                        </span>
                      ) : null}
                    </div>

                    <p className="text-sm text-emerald-950/75 leading-relaxed">{req.description}</p>

                    {/* Metadata tags */}
                    <div className="flex items-center gap-4 text-xs text-emerald-950/50 flex-wrap pt-1">
                      <span>#{req.request_id}</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {req.cities?.city_name || 'City'}
                      </span>
                      <span>Sent: {new Date(req.created_at).toLocaleDateString()}</span>
                      {req.expires_at && (
                        <span className={isExpired ? 'text-rose-600 font-semibold' : 'text-emerald-800 font-medium'}>
                          {isExpired
                            ? `Expired: ${new Date(req.expires_at).toLocaleDateString()}`
                            : `Expires: ${new Date(req.expires_at).toLocaleDateString()} (${formatDaysRemaining(req.remaining_seconds || 0)})`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Top Right: Status Banner or Action */}
                  <div className="shrink-0 flex items-center gap-2">
                    {req.chats && req.chats.length > 0 && (
                      <button
                        onClick={() => openChat(req.chats!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Chat
                      </button>
                    )}
                    {isPending && (
                      <button
                        onClick={() => handleCancel(req.request_id)}
                        disabled={cancelling === req.request_id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold transition-all"
                      >
                        {cancelling === req.request_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />} Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* ─── ACCEPTED / COMPLETED CARD ─── */}
                {isCompleted && req.accepted_ngo && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-sm">
                        <CheckCircle className="w-4 h-4 text-emerald-600" /> Request Accepted
                      </div>
                      <p className="text-xs text-emerald-800">
                        Handled by: <strong>{req.accepted_ngo.ngo_name}</strong>
                        {req.completed_at ? ` • Accepted on ${new Date(req.completed_at).toLocaleDateString()}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/ngos/${req.accepted_ngo.ngo_id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm"
                      >
                        <ExternalLink className="w-3 h-3" /> View NGO
                      </Link>
                      {req.chats && req.chats.length > 0 && (
                        <button
                          onClick={() => openChat(req.chats!)}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-50 transition-all"
                        >
                          <MessageSquare className="w-3 h-3" /> Contact NGO
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ─── EXPIRED NOTICE & RENEW BUTTON ─── */}
                {isExpired && !isCompleted && (
                  <div className="bg-gray-100 border border-gray-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-800 font-bold text-sm">
                        <Clock className="w-4 h-4 text-gray-500" /> Request Expired
                      </div>
                      <p className="text-xs text-gray-600">
                        This request reached its 7-day validity limit. You can renew it to recalculate recommendations and start a new cycle.
                      </p>
                    </div>

                    <button
                      onClick={() => handleRenew(req.request_id)}
                      disabled={renewing === req.request_id}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-forest-dark disabled:bg-primary/40 text-white text-xs font-bold transition-all shadow-sm"
                    >
                      {renewing === req.request_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Renew Request
                    </button>
                  </div>
                )}

                {/* ─── PENDING SUMMARY & REMINDER SECTION ─── */}
                {isPending && (
                  <div className="bg-bg-nature rounded-xl p-4 border border-forest-light/25 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      {/* NGOs contacted stats */}
                      <div className="flex items-center gap-3 text-xs font-medium text-forest-dark flex-wrap">
                        <span>NGOs Contacted: <strong>{req.stats?.contacted || contactedNgos.length}</strong></span>
                        <span>•</span>
                        <span className="text-emerald-700">Accepted: <strong>{req.stats?.accepted || 0}</strong></span>
                        <span>•</span>
                        <span className="text-rose-700">Rejected: <strong>{req.stats?.rejected || 0}</strong></span>
                        <span>•</span>
                        <span className="text-amber-700">Pending: <strong>{req.stats?.pending || 0}</strong></span>
                      </div>

                      {/* Remind Button */}
                      <div>
                        {req.can_remind ? (
                          <button
                            onClick={() => handleRemind(req.request_id)}
                            disabled={reminding === req.request_id}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary hover:bg-forest-dark disabled:bg-primary/40 text-white text-xs font-semibold transition-all shadow-sm"
                          >
                            {reminding === req.request_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                            Remind NGOs
                          </button>
                        ) : req.remaining_reminder_cooldown_seconds && req.remaining_reminder_cooldown_seconds > 0 ? (
                          <span className="text-xs text-emerald-900/60 font-medium bg-white px-3 py-1.5 rounded-lg border border-forest-light/20">
                            Reminder sent ✓ (Next in {formatCountdown(req.remaining_reminder_cooldown_seconds)})
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {reminderNotices[req.request_id] && (
                      <div className="text-xs text-emerald-800 font-semibold bg-emerald-100/70 px-3 py-1.5 rounded-lg">
                        {reminderNotices[req.request_id]}
                      </div>
                    )}
                  </div>
                )}

                {/* ─── ACCORDION: VIEW NGO RESPONSES ─── */}
                {contactedNgos.length > 0 && (
                  <div className="border-t border-forest-light/15 pt-2">
                    <button
                      onClick={() => setExpandedRequestId(isExpanded ? null : req.request_id)}
                      className="flex items-center justify-between w-full text-xs font-semibold text-forest-dark/70 hover:text-primary transition-colors py-1"
                    >
                      <span className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5" />
                        View NGO Responses ({contactedNgos.length})
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-3 space-y-2"
                        >
                          {contactedNgos.map((ngoReq) => {
                            const badge = NGO_STATUS_BADGES[ngoReq.status] || NGO_STATUS_BADGES.PENDING;
                            return (
                              <div
                                key={ngoReq.id}
                                className="bg-bg-nature/60 rounded-xl p-3 border border-forest-light/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                              >
                                <div className="space-y-0.5">
                                  <div className="font-semibold text-forest-dark">
                                    {ngoReq.ngo?.ngo_name || 'NGO Partner'}
                                  </div>
                                  <div className="text-emerald-950/50 text-[11px]">
                                    Sent: {new Date(ngoReq.sent_at).toLocaleDateString()}
                                    {ngoReq.reminder_count > 0 && ` • Reminded ${ngoReq.reminder_count}x`}
                                  </div>
                                  {ngoReq.rejection_reason && (
                                    <div className="text-rose-700 text-[11px] pt-1">
                                      <strong>Reason:</strong> "{ngoReq.rejection_reason}"
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${badge.color}`}>
                                    {badge.label}
                                  </span>
                                  {ngoReq.ngo?.phone_number && (
                                    <a
                                      href={`tel:${ngoReq.ngo.phone_number}`}
                                      className="text-primary hover:underline font-medium text-[11px]"
                                    >
                                      Contact
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Simple Chat Modal */}
      {chatOpen && chatId && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setChatOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl w-full max-w-lg max-h-[75vh] flex flex-col shadow-2xl border border-forest-light/20 overflow-hidden"
          >
            <div className="p-4 bg-primary text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                <h3 className="font-display font-bold text-base">Conversation with NGO</h3>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px] bg-bg-nature/40">
              {chatLoading ? (
                <div className="text-center py-10">
                  <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
                </div>
              ) : chatMessages.length === 0 ? (
                <p className="text-center text-xs text-emerald-950/50 py-10">
                  No messages yet. Send a message to communicate with the NGO.
                </p>
              ) : (
                chatMessages.map((m: any) => (
                  <div
                    key={m.message_id}
                    className={`flex ${m.sender_id === user?.user_id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] px-4 py-2 rounded-2xl text-xs ${
                        m.sender_id === user?.user_id
                          ? 'bg-primary text-white rounded-br-none shadow-sm'
                          : 'bg-white text-forest-dark rounded-bl-none border border-forest-light/20 shadow-sm'
                      }`}
                    >
                      <p className="text-[10px] font-bold opacity-75 mb-0.5">{m.users?.full_name}</p>
                      <p className="leading-relaxed">{m.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-forest-light/15 bg-white flex gap-2">
              <input
                type="text"
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-bg-nature border border-forest-light/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-xs"
              />
              <button
                onClick={sendChatMessage}
                disabled={!chatMsg.trim()}
                className="bg-primary hover:bg-forest-dark disabled:bg-primary/40 text-white px-5 py-2.5 rounded-xl font-semibold text-xs transition-colors"
              >
                Send
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
