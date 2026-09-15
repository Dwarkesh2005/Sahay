import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, CheckCircle, XCircle, Loader2, MessageSquare, ShieldCheck,
  Settings, FileCheck2, Inbox, MapPin, Flame, Bell
} from 'lucide-react';
import { requestService, ngoService, chatService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { NgoVerificationPage } from './NgoVerificationPage';

const STATUS_CONFIG: Record<string, { label: string; color: string; border: string }> = {
  PENDING: { label: 'Pending Action', color: 'bg-amber-100 text-amber-800', border: 'border-amber-200' },
  ACCEPTED: { label: 'Accepted', color: 'bg-blue-100 text-blue-800', border: 'border-blue-200' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-800', border: 'border-emerald-200' },
  REJECTED: { label: 'Rejected', color: 'bg-rose-100 text-rose-800', border: 'border-rose-200' },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700', border: 'border-gray-200' },
  EXPIRED: { label: 'Expired', color: 'bg-gray-100 text-gray-700', border: 'border-gray-200' }
};

const TYPE_ICONS: Record<string, string> = {
  FOOD: '🍲',
  SHELTER: '🏠',
  MEDICAL: '🏥',
  EMPLOYMENT: '💼',
  GUIDANCE: '🧭'
};

const SERVICE_OPTIONS = [
  'FOOD', 'SHELTER', 'MEDICAL', 'EMPLOYMENT', 'EDUCATION', 'LEGAL',
  'GUIDANCE', 'OTHER', 'SKILL_DEVELOPMENT', 'FINANCIAL_ASSISTANCE',
  'WOMEN_SUPPORT', 'CHILD_SUPPORT', 'ELDERLY_SUPPORT', 'DISABILITY_SUPPORT',
  'MIGRANT_SUPPORT', 'DOCUMENTATION', 'EMERGENCY'
];

export const NgoDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'incoming' | 'feed' | 'profile' | 'verification'>('incoming');

  // Incoming Requests state
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [incomingLoading, setIncomingLoading] = useState(true);
  const [incomingFilter, setIncomingFilter] = useState('PENDING');

  // City Feed state (for browse / general requests)
  const [feedRequests, setFeedRequests] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);

  // Response / Reject modals
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [acceptMessage, setAcceptMessage] = useState('');
  const [acceptLoading, setAcceptLoading] = useState(false);

  const [rejectingItem, setRejectingItem] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const [completingId, setCompletingId] = useState<number | null>(null);

  // Profile
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

  // Fetch incoming requests sent to this NGO
  const fetchIncomingRequests = async () => {
    setIncomingLoading(true);
    try {
      const params: any = {};
      if (incomingFilter && incomingFilter !== 'ALL') {
        params.status = incomingFilter;
      }
      const data = await requestService.getNgoIncomingRequests(params);
      setIncomingRequests(data.requests || []);
    } catch {
      setIncomingRequests([]);
    } finally {
      setIncomingLoading(false);
    }
  };

  // Fetch general city feed
  const fetchFeedRequests = async () => {
    setFeedLoading(true);
    try {
      const data = await requestService.getNgoFeedRequests({ status: 'PENDING' });
      setFeedRequests(data.requests || []);
    } catch {
      setFeedRequests([]);
    } finally {
      setFeedLoading(false);
    }
  };

  const loadProfile = async () => {
    if (!user?.ngo) return;
    try {
      const data = await ngoService.getNgoById(user.ngo.ngo_id);
      setNgoProfile(data.ngo);
      setEditDesc(data.ngo?.description || '');
      setEditServices(data.ngo?.ngo_services?.map((s: any) => s.service) || []);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (tab === 'incoming') fetchIncomingRequests();
    if (tab === 'feed') fetchFeedRequests();
    if (tab === 'profile') loadProfile();
  }, [tab, incomingFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Accept
  const handleAcceptSubmit = async (ngoRequestId: number) => {
    setAcceptLoading(true);
    try {
      await requestService.acceptNgoIncomingRequest(ngoRequestId, acceptMessage.trim() || undefined);
      setAcceptingId(null);
      setAcceptMessage('');
      fetchIncomingRequests();
      alert('Request accepted successfully! Request is now completed and other NGOs cannot accept.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to accept request.');
    } finally {
      setAcceptLoading(false);
    }
  };

  // Handle Reject
  const handleRejectSubmit = async () => {
    if (!rejectingItem) return;
    setRejectLoading(true);
    try {
      await requestService.rejectNgoIncomingRequest(rejectingItem.id, rejectionReason.trim() || undefined);
      setRejectingItem(null);
      setRejectionReason('');
      fetchIncomingRequests();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reject request.');
    } finally {
      setRejectLoading(false);
    }
  };

  const handleComplete = async (requestId: number) => {
    setCompletingId(requestId);
    try {
      await requestService.updateRequestStatus(requestId, 'COMPLETED');
      fetchIncomingRequests();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to complete request.');
    } finally {
      setCompletingId(null);
    }
  };

  const saveProfile = async () => {
    setProfileLoading(true);
    setProfileMsg('');
    try {
      await ngoService.updateMyProfile({ description: editDesc, services: editServices });
      setProfileMsg('Profile updated successfully!');
      loadProfile();
    } catch {
      setProfileMsg('Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Chat
  const openChat = async (chats: any[]) => {
    if (!chats || chats.length === 0) return;
    const cId = chats[0].chat_id;
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

  const verBadge = user?.ngo?.verification_status;
  const isVerified = verBadge && verBadge !== 'PENDING';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8 pb-16">
      {/* Header */}
      <div className="pt-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-3xl text-forest-dark">NGO Portal</h1>
            <p className="text-emerald-950/60 text-sm mt-1">
              {user?.ngo?.ngo_name || user?.full_name} — Help Request Operations Center
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isVerified ? (
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified NGO
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                <Clock className="w-3.5 h-3.5" /> Verification Pending
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 flex-wrap border-b border-forest-light/15 pb-2">
          <button
            onClick={() => setTab('incoming')}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all flex items-center gap-1.5 ${
              tab === 'incoming'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-bg-nature text-forest-dark/70 hover:bg-forest-light/30'
            }`}
          >
            <Inbox className="w-4 h-4" /> Incoming Requests
          </button>
          <button
            onClick={() => setTab('feed')}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
              tab === 'feed'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-bg-nature text-forest-dark/70 hover:bg-forest-light/30'
            }`}
          >
            City Public Feed
          </button>
          <button
            onClick={() => setTab('profile')}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-1.5 ${
              tab === 'profile'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-bg-nature text-forest-dark/70 hover:bg-forest-light/30'
            }`}
          >
            <Settings className="w-3.5 h-3.5" /> Profile & Services
          </button>
          <button
            onClick={() => setTab('verification')}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-1.5 ${
              tab === 'verification'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-bg-nature text-forest-dark/70 hover:bg-forest-light/30'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" /> Document Verification
          </button>
        </div>
      </div>

      {/* ─── TAB 1: INCOMING REQUESTS ─── */}
      {tab === 'incoming' && (
        <div className="space-y-6">
          {/* Filter Sub-Tabs */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-forest-dark/50 mr-1">Filter:</span>
              {[
                { key: 'PENDING', label: 'Pending' },
                { key: 'ACCEPTED', label: 'Accepted' },
                { key: 'REJECTED', label: 'Rejected' },
                { key: 'COMPLETED', label: 'Completed' },
                { key: 'ALL', label: 'All' }
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setIncomingFilter(f.key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    incomingFilter === f.key
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-bg-nature text-forest-dark/70 hover:bg-forest-light/30'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchIncomingRequests}
              className="text-xs text-forest-dark/60 hover:text-primary font-medium"
            >
              Refresh
            </button>
          </div>

          {/* Cards List */}
          {incomingLoading ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="text-xs text-emerald-950/60 mt-2">Loading incoming requests...</p>
            </div>
          ) : incomingRequests.length === 0 ? (
            <div className="text-center py-16 space-y-3 bg-white rounded-3xl border border-forest-light/20 p-8">
              <Inbox className="w-12 h-12 text-forest-dark/20 mx-auto" />
              <h3 className="font-display font-semibold text-lg text-forest-dark/60">No Incoming Requests</h3>
              <p className="text-xs text-emerald-950/50 max-w-sm mx-auto">
                No requests found with status "{incomingFilter}". Requests routed to your NGO by migrants will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {incomingRequests.map((item: any) => {
                const need = item.need;
                const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
                const isItemPending = item.status === 'PENDING';
                const isItemAccepted = item.status === 'ACCEPTED' || need?.status === 'COMPLETED';
                const isItemRejected = item.status === 'REJECTED';
                const isItemCancelled = item.status === 'CANCELLED';
                const isItemExpired = item.status === 'EXPIRED' || need?.is_expired;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-5 border border-forest-light/20 shadow-sm hover:shadow-md transition-all space-y-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      {/* Left: Need info */}
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-xl">{TYPE_ICONS[need?.request_type] || '📋'}</span>
                          <h3 className="font-display font-bold text-forest-dark text-lg">{need?.title}</h3>
                          <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold border ${statusCfg.color} ${statusCfg.border}`}>
                            {statusCfg.label}
                          </span>
                          {need?.urgency && need.urgency !== 'MEDIUM' && (
                            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                              need.urgency === 'EMERGENCY' ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}>
                              <Flame className="w-3 h-3" /> Urgency: {need.urgency}
                            </span>
                          )}
                          {item.reminder_count > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200 animate-pulse">
                              <Bell className="w-3 h-3" /> Reminded {item.reminder_count}x
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-emerald-950/75 leading-relaxed">{need?.description}</p>

                        <div className="flex items-center gap-4 text-xs text-emerald-950/50 flex-wrap pt-1">
                          <span>User: <strong>{need?.users?.full_name || 'Anonymous'}</strong></span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {need?.cities?.city_name || 'City'}
                          </span>
                          <span>Sent: {new Date(item.sent_at).toLocaleDateString()}</span>
                          {need?.expires_at && (
                            <span className={need.is_expired ? 'text-rose-600 font-medium' : 'text-emerald-800 font-medium'}>
                              {need.is_expired ? 'Expired' : `Expires: ${new Date(need.expires_at).toLocaleDateString()}`}
                            </span>
                          )}
                        </div>

                        {/* Rejection reason banner */}
                        {isItemRejected && item.rejection_reason && (
                          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                            <strong>Rejection reason recorded:</strong> "{item.rejection_reason}"
                          </div>
                        )}

                        {/* Other NGO accepted notice */}
                        {isItemCancelled && (
                          <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
                            Another NGO has already accepted this request. It is no longer actionable.
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-col gap-2 shrink-0 sm:min-w-[170px]">
                        {isItemPending && !isItemExpired && (
                          <>
                            <button
                              onClick={() => {
                                setAcceptingId(item.id);
                                setAcceptMessage('Hello, we have received your request and can provide the necessary assistance.');
                              }}
                              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-forest-dark text-white text-xs font-bold transition-all shadow-sm"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Accept Request
                            </button>

                            <button
                              onClick={() => {
                                setRejectingItem(item);
                                setRejectionReason('');
                              }}
                              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-all"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject Request
                            </button>
                          </>
                        )}

                        {isItemAccepted && (
                          <div className="space-y-2">
                            {need?.chats && need.chats.length > 0 && (
                              <button
                                onClick={() => openChat(need.chats)}
                                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition-all"
                              >
                                <MessageSquare className="w-3.5 h-3.5" /> Open Chat
                              </button>
                            )}
                            {need?.status !== 'COMPLETED' && (
                              <button
                                onClick={() => handleComplete(need.request_id)}
                                disabled={completingId === need.request_id}
                                className="w-full flex items-center justify-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold transition-all"
                              >
                                {completingId === need.request_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                Mark Resolved
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
        </div>
      )}

      {/* ─── TAB 2: CITY PUBLIC FEED ─── */}
      {tab === 'feed' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-forest-dark">Open Community Needs</h3>
            <span className="text-xs text-emerald-950/60">Feed of pending requests in your region</span>
          </div>

          {feedLoading ? (
            <div className="text-center py-16"><Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" /></div>
          ) : feedRequests.length === 0 ? (
            <div className="text-center py-16 text-sm text-emerald-950/50">No open requests currently in your area.</div>
          ) : (
            <div className="space-y-3">
              {feedRequests.map((req) => (
                <div key={req.request_id} className="bg-white rounded-2xl p-5 border border-forest-light/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span>{TYPE_ICONS[req.request_type] || '📋'}</span>
                      <h4 className="font-display font-bold text-forest-dark">{req.title}</h4>
                    </div>
                    <p className="text-xs text-emerald-950/70">{req.description}</p>
                    <div className="text-[11px] text-emerald-950/50 flex gap-3 pt-1">
                      <span>By: {req.users?.full_name}</span>
                      <span>City: {req.cities?.city_name}</span>
                      <span>{new Date(req.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setAcceptingId(req.request_id);
                      setAcceptMessage('We can support your request.');
                    }}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-forest-dark text-white text-xs font-bold shrink-0"
                  >
                    Accept Need
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: PROFILE ─── */}
      {tab === 'profile' && (
        <div className="bg-white rounded-3xl p-8 border border-forest-light/20 shadow-sm space-y-6">
          <h2 className="font-display font-bold text-xl text-forest-dark">NGO Profile & Services</h2>
          {ngoProfile && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><strong>NGO Name:</strong> {ngoProfile.ngo_name}</div>
                <div><strong>Contact Person:</strong> {ngoProfile.contact_person}</div>
                <div><strong>Email:</strong> {ngoProfile.email}</div>
                <div><strong>Phone:</strong> {ngoProfile.phone_number}</div>
                <div><strong>City:</strong> {ngoProfile.cities?.city_name}, {ngoProfile.cities?.state}</div>
                <div><strong>Address:</strong> {ngoProfile.address}</div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-forest-dark/80">Organization Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-bg-nature rounded-xl border border-forest-light/40 focus:border-primary text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-forest-dark/80">Services Offered</label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_OPTIONS.map((srv) => {
                    const active = editServices.includes(srv);
                    return (
                      <button
                        key={srv}
                        type="button"
                        onClick={() => {
                          setEditServices(
                            active ? editServices.filter((s) => s !== srv) : [...editServices, srv]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          active
                            ? 'bg-primary text-white'
                            : 'bg-bg-nature text-forest-dark/70 hover:bg-forest-light/30'
                        }`}
                      >
                        {srv.replace('_', ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {profileMsg && (
                <p className="text-xs font-semibold text-emerald-700">{profileMsg}</p>
              )}

              <button
                onClick={saveProfile}
                disabled={profileLoading}
                className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-forest-dark"
              >
                {profileLoading ? 'Saving...' : 'Save Profile'}
              </button>
            </>
          )}
        </div>
      )}

      {/* ─── TAB 4: VERIFICATION ─── */}
      {tab === 'verification' && <NgoVerificationPage />}

      {/* ─── MODAL: ACCEPT REQUEST ─── */}
      <AnimatePresence>
        {acceptingId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-forest-light/20 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-forest-dark">Accept Request</h3>
                  <p className="text-xs text-emerald-950/60">Confirm your acceptance and notify the migrant.</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-forest-dark/80">Response Message to Migrant</label>
                <textarea
                  value={acceptMessage}
                  onChange={(e) => setAcceptMessage(e.target.value)}
                  placeholder="Introduce your NGO and explain how you will assist..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-bg-nature rounded-xl border border-forest-light/40 focus:border-primary outline-none text-xs"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setAcceptingId(null)}
                  disabled={acceptLoading}
                  className="px-4 py-2 rounded-xl border border-forest-light/30 hover:bg-bg-nature text-forest-dark text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAcceptSubmit(acceptingId)}
                  disabled={acceptLoading}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-forest-dark disabled:bg-primary/40 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  {acceptLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Confirm Acceptance
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: REJECT REQUEST (WITH OPTIONAL REASON) ─── */}
      <AnimatePresence>
        {rejectingItem !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-forest-light/20 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-forest-dark">Reject Request</h3>
                  <p className="text-xs text-emerald-950/60">The migrant will see your response.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-forest-dark/80">Reason (optional)</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Capacity full this week, Outside service sector, etc."
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-bg-nature rounded-xl border border-forest-light/40 focus:border-rose-400 outline-none text-xs"
                />
              </div>

              <p className="text-[11px] text-emerald-950/50">
                Note: After rejecting, your NGO will not be able to accept this request afterward.
              </p>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setRejectingItem(null)}
                  disabled={rejectLoading}
                  className="px-4 py-2 rounded-xl border border-forest-light/30 hover:bg-bg-nature text-forest-dark text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectSubmit}
                  disabled={rejectLoading}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  {rejectLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Reject
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: CHAT ─── */}
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
                <h3 className="font-display font-bold text-base">Chat with Migrant</h3>
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
                <div className="text-center py-10"><Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" /></div>
              ) : chatMessages.length === 0 ? (
                <p className="text-center text-xs text-emerald-950/50 py-10">No messages yet.</p>
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
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-bg-nature border border-forest-light/40 focus:border-primary outline-none text-xs"
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
