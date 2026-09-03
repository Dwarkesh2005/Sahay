import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, XCircle, AlertCircle, Loader2, PlusCircle, MessageSquare, Filter } from 'lucide-react';
import { requestService, chatService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Pending', color: 'bg-amber-100 text-amber-800', icon: <Clock className="w-3.5 h-3.5" /> },
  ACCEPTED: { label: 'Accepted', color: 'bg-blue-100 text-blue-800', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-800', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-100 text-rose-800', icon: <XCircle className="w-3.5 h-3.5" /> }
};

const TYPE_ICONS: Record<string, string> = { FOOD: '🍲', SHELTER: '🏠', MEDICAL: '🏥', EMPLOYMENT: '💼', GUIDANCE: '🧭' };

export const UserDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [cancelling, setCancelling] = useState<number | null>(null);

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
      setError('Failed to load requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const openChat = async (reqChats: any[]) => {
    if (!reqChats || reqChats.length === 0) return;
    const cId = reqChats[0].chat_id;
    setChatId(cId);
    setChatOpen(true);
    setChatLoading(true);
    try {
      const data = await chatService.getMessages(cId);
      setChatMessages(data.messages || []);
    } catch { setChatMessages([]); }
    finally { setChatLoading(false); }
  };

  const sendChatMessage = async () => {
    if (!chatId || !chatMsg.trim()) return;
    try {
      await chatService.sendMessage(chatId, chatMsg.trim());
      setChatMsg('');
      const data = await chatService.getMessages(chatId);
      setChatMessages(data.messages || []);
    } catch { /* ignore */ }
  };

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'PENDING').length,
    active: requests.filter(r => r.status === 'ACCEPTED').length,
    completed: requests.filter(r => r.status === 'COMPLETED').length
  };

  return (
    <div className="max-w-6xl mx-auto px-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4">
        <div>
          <h1 className="font-display font-extrabold text-3xl text-forest-dark">My Requests</h1>
          <p className="text-emerald-950/60 text-sm mt-1">Welcome back, {user?.full_name || 'User'}</p>
        </div>
        <Link
          to="/request-help"
          className="inline-flex items-center gap-2 bg-primary hover:bg-forest-dark text-white font-semibold px-6 py-3 rounded-xl shadow-md transition-all duration-300"
        >
          <PlusCircle className="w-4 h-4" /> New Request
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-forest-dark' },
          { label: 'Pending', value: stats.pending, color: 'text-amber-600' },
          { label: 'Active', value: stats.active, color: 'text-blue-600' },
          { label: 'Completed', value: stats.completed, color: 'text-emerald-600' }
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-forest-light/20 shadow-sm text-center">
            <p className={`font-display font-bold text-2xl ${s.color}`}>{s.value}</p>
            <p className="text-xs text-emerald-950/60 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-forest-dark/50" />
        {['', 'PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              statusFilter === s ? 'bg-primary text-white' : 'bg-bg-nature text-forest-dark/70 hover:bg-forest-light/30'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="text-center py-16"><Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" /></div>
      ) : error ? (
        <div className="text-center py-16 space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <p className="text-rose-600">{error}</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-full bg-forest-light/20 flex items-center justify-center mx-auto">
            <PlusCircle className="w-8 h-8 text-forest-dark/30" />
          </div>
          <h3 className="font-display font-semibold text-xl text-forest-dark/60">No Requests Yet</h3>
          <p className="text-emerald-950/50 text-sm">Create your first help request to get started.</p>
          <Link to="/request-help" className="text-primary hover:underline font-medium text-sm">Create Request →</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req: any) => {
            const sc = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
            const responder = req.request_responses?.[0];
            return (
              <motion.div
                key={req.request_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-5 border border-forest-light/20 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{TYPE_ICONS[req.request_type] || '📋'}</span>
                      <h3 className="font-display font-bold text-forest-dark">{req.title}</h3>
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold ${sc.color}`}>
                        {sc.icon} {sc.label}
                      </span>
                    </div>
                    <p className="text-sm text-emerald-950/70 line-clamp-1">{req.description}</p>
                    <div className="flex items-center gap-4 text-xs text-emerald-950/50">
                      <span>#{req.request_id}</span>
                      <span>{req.cities?.city_name || 'Unknown'}</span>
                      <span>{new Date(req.created_at).toLocaleDateString()}</span>
                      {responder && (
                        <span className="text-primary font-medium">
                          Handled by: {responder.users?.ngos?.ngo_name || responder.users?.full_name || 'NGO'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {req.chats && req.chats.length > 0 && (
                      <button
                        onClick={() => openChat(req.chats)}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Chat
                      </button>
                    )}
                    {req.status === 'PENDING' && (
                      <button
                        onClick={() => handleCancel(req.request_id)}
                        disabled={cancelling === req.request_id}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition-all"
                      >
                        {cancelling === req.request_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />} Cancel
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Simple Chat Modal */}
      {chatOpen && chatId && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setChatOpen(false)}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-lg max-h-[70vh] flex flex-col shadow-2xl border border-forest-light/20"
          >
            <div className="p-4 border-b border-forest-light/15 flex items-center justify-between">
              <h3 className="font-display font-bold text-forest-dark">Chat</h3>
              <button onClick={() => setChatOpen(false)} className="text-forest-dark/50 hover:text-forest-dark">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
              {chatLoading ? (
                <div className="text-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" /></div>
              ) : chatMessages.length === 0 ? (
                <p className="text-center text-sm text-emerald-950/50 py-8">No messages yet.</p>
              ) : (
                chatMessages.map((m: any) => (
                  <div key={m.message_id} className={`flex ${m.sender_id === user?.user_id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                      m.sender_id === user?.user_id
                        ? 'bg-primary text-white rounded-br-md'
                        : 'bg-bg-nature text-forest-dark rounded-bl-md'
                    }`}>
                      <p className="text-[10px] font-semibold opacity-70 mb-0.5">{m.users?.full_name}</p>
                      <p>{m.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-forest-light/15 flex gap-2">
              <input
                type="text"
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-bg-nature border border-forest-light/40 focus:border-primary outline-none text-sm"
              />
              <button
                onClick={sendChatMessage}
                className="bg-primary text-white px-4 py-2.5 rounded-xl hover:bg-forest-dark transition-colors"
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
