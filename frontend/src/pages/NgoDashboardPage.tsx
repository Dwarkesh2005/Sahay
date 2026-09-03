import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, Loader2, MessageSquare, ShieldCheck, AlertCircle, Settings, FileCheck2 } from 'lucide-react';
import { requestService, ngoService, chatService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { NgoVerificationPage } from './NgoVerificationPage';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-amber-100 text-amber-800' },
  ACCEPTED: { label: 'Accepted', color: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-100 text-rose-800' }
};
const TYPE_ICONS: Record<string, string> = { FOOD: '🍲', SHELTER: '🏠', MEDICAL: '🏥', EMPLOYMENT: '💼', GUIDANCE: '🧭' };
const SERVICE_OPTIONS = ['FOOD', 'SHELTER', 'MEDICAL', 'EMPLOYMENT', 'EDUCATION', 'LEGAL', 'GUIDANCE', 'OTHER'];

export const NgoDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'requests' | 'profile' | 'verification'>('requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [responding, setResponding] = useState<number | null>(null);
  const [responseMsg, setResponseMsg] = useState('');
  const [completing, setCompleting] = useState<number | null>(null);

  // NGO Profile editing
  const [ngoProfile, setNgoProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editServices, setEditServices] = useState<string[]>([]);

  // Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatId, setChatId] = useState<number | null>(null);
  const [chatMsg, setChatMsg] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const data = await requestService.getNgoFeedRequests(params);
      setRequests(data.requests || []);
    } catch { setRequests([]); }
    finally { setLoading(false); }
  };

  const loadProfile = async () => {
    if (!user?.ngo) return;
    try {
      const data = await ngoService.getNgoById(user.ngo.ngo_id);
      setNgoProfile(data.ngo);
      setEditDesc(data.ngo?.description || '');
      setEditServices(data.ngo?.ngo_services?.map((s: any) => s.service) || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchRequests(); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === 'profile') loadProfile(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAccept = async (requestId: number) => {
    if (!responseMsg.trim()) return alert('Please enter a response message.');
    setResponding(requestId);
    try {
      await requestService.respondToRequest(requestId, responseMsg);
      setResponseMsg('');
      setResponding(null);
      fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to accept request.');
      setResponding(null);
    }
  };

  const handleComplete = async (requestId: number) => {
    setCompleting(requestId);
    try {
      await requestService.updateRequestStatus(requestId, 'COMPLETED');
      fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to complete request.');
    } finally { setCompleting(null); }
  };

  const saveProfile = async () => {
    setProfileLoading(true);
    setProfileMsg('');
    try {
      await ngoService.updateMyProfile({ description: editDesc, services: editServices });
      setProfileMsg('Profile updated successfully!');
      loadProfile();
    } catch { setProfileMsg('Failed to update profile.'); }
    finally { setProfileLoading(false); }
  };

  const openChat = async (chats: any[]) => {
    if (!chats || chats.length === 0) return;
    const cId = chats[0].chat_id;
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

  const verBadge = user?.ngo?.verification_status;
  const isVerified = verBadge && verBadge !== 'PENDING';

  return (
    <div className="max-w-6xl mx-auto px-6 space-y-8">
      {/* Header */}
      <div className="pt-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-3xl text-forest-dark">NGO Portal</h1>
            <p className="text-emerald-950/60 text-sm mt-1">{user?.ngo?.ngo_name || user?.full_name}</p>
          </div>
          <div className="flex items-center gap-2">
            {isVerified ? (
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                <Clock className="w-3.5 h-3.5" /> Pending Verification
              </span>
            )}
          </div>
        </div>

        {!isVerified && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
            <strong>Note:</strong> Your NGO is pending verification. You can still view and respond to help requests while your account is being reviewed by our admin team.
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setTab('requests')} className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${tab === 'requests' ? 'bg-primary text-white shadow-sm' : 'bg-bg-nature text-forest-dark/70 hover:bg-forest-light/30'}`}>
            Requests Feed
          </button>
          <button onClick={() => setTab('profile')} className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-1.5 ${tab === 'profile' ? 'bg-primary text-white shadow-sm' : 'bg-bg-nature text-forest-dark/70 hover:bg-forest-light/30'}`}>
            <Settings className="w-3.5 h-3.5" /> Profile & Services
          </button>
          <button onClick={() => setTab('verification')} className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-1.5 ${tab === 'verification' ? 'bg-primary text-white shadow-sm' : 'bg-bg-nature text-forest-dark/70 hover:bg-forest-light/30'}`}>
            <FileCheck2 className="w-3.5 h-3.5" /> Document Verification
          </button>
        </div>
      </div>

      {tab === 'requests' && (
        <>
          {/* Status Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            {['PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED', ''].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${statusFilter === s ? 'bg-primary text-white' : 'bg-bg-nature text-forest-dark/70 hover:bg-forest-light/30'}`}>
                {s || 'All'}
              </button>
            ))}
          </div>

          {/* Request Cards */}
          {loading ? (
            <div className="text-center py-16"><Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" /></div>
          ) : requests.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <AlertCircle className="w-10 h-10 text-forest-dark/20 mx-auto" />
              <h3 className="font-display font-semibold text-lg text-forest-dark/50">No requests found</h3>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((req: any) => {
                const sc = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
                const isMyResponse = req.request_responses?.some((r: any) => r.responder_id === user?.user_id);
                return (
                  <motion.div key={req.request_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-5 border border-forest-light/20 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xl">{TYPE_ICONS[req.request_type] || '📋'}</span>
                          <h3 className="font-display font-bold text-forest-dark">{req.title}</h3>
                          <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold ${sc.color}`}>{sc.label}</span>
                        </div>
                        <p className="text-sm text-emerald-950/70">{req.description}</p>
                        <div className="flex items-center gap-4 text-xs text-emerald-950/50">
                          <span>#{req.request_id}</span>
                          <span>By: {req.users?.full_name || 'Unknown'}</span>
                          <span>{req.cities?.city_name || 'Unknown'}</span>
                          <span>{new Date(req.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        {req.status === 'PENDING' && !isMyResponse && (
                          <div className="space-y-2">
                            <textarea
                              value={responding === req.request_id ? responseMsg : ''}
                              onChange={(e) => { setResponding(req.request_id); setResponseMsg(e.target.value); }}
                              onFocus={() => setResponding(req.request_id)}
                              placeholder="Your response message..."
                              rows={2}
                              className="w-full md:w-56 px-3 py-2 rounded-xl border border-forest-light/40 bg-bg-nature text-sm focus:border-primary outline-none resize-none"
                            />
                            <button
                              onClick={() => handleAccept(req.request_id)}
                              disabled={responding !== req.request_id || !responseMsg.trim()}
                              className="w-full flex items-center justify-center gap-1 px-4 py-2 rounded-xl bg-primary text-white hover:bg-forest-dark disabled:bg-primary/30 text-xs font-semibold transition-all"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Accept Request
                            </button>
                          </div>
                        )}
                        {req.status === 'ACCEPTED' && isMyResponse && (
                          <div className="space-y-2">
                            <button onClick={() => handleComplete(req.request_id)} disabled={completing === req.request_id}
                              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold transition-all">
                              {completing === req.request_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Mark Resolved
                            </button>
                            {req.chats && req.chats.length > 0 && (
                              <button onClick={() => openChat(req.chats)}
                                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-all">
                                <MessageSquare className="w-3.5 h-3.5" /> Chat
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'profile' && (
        <div className="bg-white rounded-3xl p-8 border border-forest-light/20 shadow-sm space-y-6">
          <h2 className="font-display font-bold text-xl text-forest-dark">NGO Profile & Services</h2>
          {ngoProfile && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-emerald-950/50">NGO Name</p><p className="font-medium">{ngoProfile.ngo_name}</p></div>
                <div><p className="text-xs text-emerald-950/50">Registration No.</p><p className="font-medium">{ngoProfile.registration_number || 'N/A'}</p></div>
                <div><p className="text-xs text-emerald-950/50">Darpan ID</p><p className="font-medium">{ngoProfile.ngo_darpan_id || 'N/A'}</p></div>
                <div><p className="text-xs text-emerald-950/50">Location</p><p className="font-medium">{ngoProfile.cities?.city_name}, {ngoProfile.cities?.state}</p></div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-forest-dark/80 block">Description</label>
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3}
                  className="w-full px-4 py-3 bg-bg-nature rounded-xl border border-forest-light/40 focus:border-primary outline-none text-sm resize-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-forest-dark/80 block">Services Provided</label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_OPTIONS.map(svc => (
                    <button key={svc} type="button"
                      onClick={() => setEditServices(prev => prev.includes(svc) ? prev.filter(s => s !== svc) : [...prev, svc])}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${editServices.includes(svc) ? 'bg-primary text-white border-primary' : 'bg-bg-nature text-forest-dark/70 border-forest-light/30 hover:border-primary/30'}`}>
                      {svc}
                    </button>
                  ))}
                </div>
              </div>
              {profileMsg && <p className={`text-sm font-medium ${profileMsg.includes('success') ? 'text-emerald-600' : 'text-rose-600'}`}>{profileMsg}</p>}
              <button onClick={saveProfile} disabled={profileLoading}
                className="bg-primary hover:bg-forest-dark text-white font-semibold px-6 py-2.5 rounded-xl transition-all disabled:bg-primary/30">
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      )}

      {tab === 'verification' && (
        <NgoVerificationPage />
      )}

      {/* Chat Modal */}
      {chatOpen && chatId && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setChatOpen(false)}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-lg max-h-[70vh] flex flex-col shadow-2xl border border-forest-light/20">
            <div className="p-4 border-b border-forest-light/15 flex items-center justify-between">
              <h3 className="font-display font-bold text-forest-dark">Chat with Requester</h3>
              <button onClick={() => setChatOpen(false)} className="text-forest-dark/50 hover:text-forest-dark text-xl">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
              {chatLoading ? <div className="text-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" /></div>
              : chatMessages.length === 0 ? <p className="text-center text-sm text-emerald-950/50 py-8">No messages yet.</p>
              : chatMessages.map((m: any) => (
                <div key={m.message_id} className={`flex ${m.sender_id === user?.user_id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${m.sender_id === user?.user_id ? 'bg-primary text-white rounded-br-md' : 'bg-bg-nature text-forest-dark rounded-bl-md'}`}>
                    <p className="text-[10px] font-semibold opacity-70 mb-0.5">{m.users?.full_name}</p>
                    <p>{m.message}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-forest-light/15 flex gap-2">
              <input type="text" value={chatMsg} onChange={(e) => setChatMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Type a message..." className="flex-1 px-4 py-2.5 rounded-xl bg-bg-nature border border-forest-light/40 focus:border-primary outline-none text-sm" />
              <button onClick={sendChatMessage} className="bg-primary text-white px-4 py-2.5 rounded-xl hover:bg-forest-dark transition-colors">Send</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
