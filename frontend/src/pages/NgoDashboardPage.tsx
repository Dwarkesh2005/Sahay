import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatLocalizedDate } from '../i18n';
import {
  Clock, CheckCircle, XCircle, Loader2, MessageSquare, ShieldCheck,
  Settings, FileCheck2, Inbox, MapPin, Flame, Bell
} from 'lucide-react';
import { requestService, ngoService, chatService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { NgoVerificationPage } from './NgoVerificationPage';

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
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [tab, setTab] = useState<'incoming' | 'feed' | 'profile' | 'verification'>('incoming');

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { label: t('status.PENDING', 'Pending'), color: 'bg-amber-100 text-amber-800', border: 'border-amber-200' };
      case 'ACCEPTED':
        return { label: t('status.ACCEPTED', 'Accepted'), color: 'bg-blue-100 text-blue-800', border: 'border-blue-200' };
      case 'COMPLETED':
        return { label: t('status.COMPLETED', 'Completed'), color: 'bg-emerald-100 text-emerald-800', border: 'border-emerald-200' };
      case 'REJECTED':
        return { label: t('status.REJECTED', 'Rejected'), color: 'bg-rose-100 text-rose-800', border: 'border-rose-200' };
      case 'CANCELLED':
        return { label: t('status.CANCELLED', 'Cancelled'), color: 'bg-gray-100 text-gray-700', border: 'border-gray-200' };
      case 'EXPIRED':
      default:
        return { label: t('status.EXPIRED', 'Expired'), color: 'bg-gray-100 text-gray-700', border: 'border-gray-200' };
    }
  };

  // Incoming Requests state
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [allIncoming, setAllIncoming] = useState<any[]>([]);
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
      const [filteredData, allData] = await Promise.all([
        requestService.getNgoIncomingRequests(params),
        requestService.getNgoIncomingRequests({})
      ]);
      setIncomingRequests(filteredData.requests || []);
      setAllIncoming(allData.requests || []);
    } catch {
      setIncomingRequests([]);
      setAllIncoming([]);
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
      alert(t('ngo.acceptSuccessAlert', 'Request accepted successfully! Request is now completed and other NGOs cannot accept.'));
    } catch (err: any) {
      alert(err.response?.data?.error || t('errors.failedToSubmit', 'Failed to accept request.'));
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
      alert(err.response?.data?.error || t('errors.failedToSubmit', 'Failed to reject request.'));
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
      alert(err.response?.data?.error || t('errors.failedToSubmit', 'Failed to complete request.'));
    } finally {
      setCompletingId(null);
    }
  };

  const saveProfile = async () => {
    setProfileLoading(true);
    setProfileMsg('');
    try {
      await ngoService.updateMyProfile({ description: editDesc, services: editServices });
      setProfileMsg(t('ngo.profileUpdatedSuccess', 'Profile updated successfully!'));
      loadProfile();
    } catch {
      setProfileMsg(t('errors.failedToSubmit', 'Failed to update profile.'));
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
            <h1 className="font-display font-extrabold text-3xl text-forest-dark">
              {t('ngo.portalTitle', 'NGO Portal')}
            </h1>
            <p className="text-emerald-950/60 text-sm mt-1">
              {user?.ngo?.ngo_name || user?.full_name} — {t('ngo.portalSubtitle', 'Help Request Operations Center')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isVerified ? (
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" /> {t('ngo.verifiedBadge', 'Verified NGO')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                <Clock className="w-3.5 h-3.5" /> {t('ngo.verificationPending', 'Verification Pending')}
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
            <Inbox className="w-4 h-4" /> {t('ngo.incomingRequests', 'Incoming Requests')}
          </button>
          <button
            onClick={() => setTab('feed')}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
              tab === 'feed'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-bg-nature text-forest-dark/70 hover:bg-forest-light/30'
            }`}
          >
            {t('ngo.cityFeed', 'City Public Feed')}
          </button>
          <button
            onClick={() => setTab('profile')}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-1.5 ${
              tab === 'profile'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-bg-nature text-forest-dark/70 hover:bg-forest-light/30'
            }`}
          >
            <Settings className="w-3.5 h-3.5" /> {t('ngo.profileAndServices', 'Profile & Services')}
          </button>
          <button
            onClick={() => setTab('verification')}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-1.5 ${
              tab === 'verification'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-bg-nature text-forest-dark/70 hover:bg-forest-light/30'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" /> {t('ngo.docVerification', 'Document Verification')}
          </button>
        </div>
      </div>

      {/* ─── TAB 1: INCOMING REQUESTS ─── */}
      {tab === 'incoming' && (
        <div className="space-y-6">
          {/* Incoming Overview Stats Cards */}
          {(() => {
            const pool = allIncoming.length > 0 ? allIncoming : incomingRequests;
            const ngoStats = {
              total: pool.length,
              pending: pool.filter((r) => r.status === 'PENDING').length,
              accepted: pool.filter((r) => r.status === 'ACCEPTED').length,
              completed: pool.filter((r) => r.status === 'COMPLETED').length,
            };
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: t('ngo.totalIncoming', 'Total Requests Received'), value: ngoStats.total, color: 'text-forest-dark', bg: 'bg-white' },
                  { label: t('status.PENDING', 'Awaiting Action'), value: ngoStats.pending, color: 'text-amber-600', bg: 'bg-amber-50/50' },
                  { label: t('status.ACCEPTED', 'In Progress / Accepted'), value: ngoStats.accepted, color: 'text-blue-600', bg: 'bg-blue-50/50' },
                  { label: t('status.COMPLETED', 'Successfully Completed'), value: ngoStats.completed, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
                ].map((s) => (
                  <div key={s.label} className={`rounded-2xl p-4 border border-forest-light/20 shadow-sm text-center ${s.bg}`}>
                    <p className={`font-display font-bold text-2xl ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-emerald-950/60 font-medium mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Filter Sub-Tabs */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-forest-dark/50 mr-1">{t('common.filter', 'Filter')}:</span>
              {[
                { key: 'PENDING', label: t('status.PENDING', 'Pending') },
                { key: 'ACCEPTED', label: t('status.ACCEPTED', 'Accepted') },
                { key: 'REJECTED', label: t('status.REJECTED', 'Rejected') },
                { key: 'COMPLETED', label: t('status.COMPLETED', 'Completed') },
                { key: 'ALL', label: t('common.all', 'All') }
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
              {t('common.refresh', 'Refresh')}
            </button>
          </div>

          {/* Cards List */}
          {incomingLoading ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="text-xs text-emerald-950/60 mt-2">{t('ngo.loadingIncoming', 'Loading incoming requests...')}</p>
            </div>
          ) : incomingRequests.length === 0 ? (
            <div className="text-center py-16 space-y-3 bg-white rounded-3xl border border-forest-light/20 p-8">
              <Inbox className="w-12 h-12 text-forest-dark/20 mx-auto" />
              <h3 className="font-display font-semibold text-lg text-forest-dark/60">
                {t('ngo.noIncomingRequests', 'No Incoming Requests')}
              </h3>
              <p className="text-xs text-emerald-950/50 max-w-sm mx-auto">
                {t('ngo.noIncomingWithStatus', { status: incomingFilter })}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {incomingRequests.map((item: any) => {
                const need = item.need;
                const statusCfg = getStatusConfig(item.status);
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
                              <Flame className="w-3 h-3" /> {t('request.urgency', 'Urgency Level')}: {String(t('urgency.' + need.urgency, need.urgency))}
                            </span>
                          )}
                          {item.reminder_count > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200 animate-pulse">
                              <Bell className="w-3 h-3" /> {t('ngo.remindedCount', { count: item.reminder_count })}
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-emerald-950/75 leading-relaxed">{need?.description}</p>

                        <div className="flex items-center gap-4 text-xs text-emerald-950/50 flex-wrap pt-1">
                          <span>{t('ngo.userLabel', 'User')}: <strong>{need?.users?.full_name || 'Anonymous'}</strong></span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {need?.cities?.city_name || 'City'}
                          </span>
                          <span>{t('ngo.sentLabel', 'Sent')}: {formatLocalizedDate(item.sent_at, i18n.language)}</span>
                          {need?.expires_at && (
                            <span className={need.is_expired ? 'text-rose-600 font-medium' : 'text-emerald-800 font-medium'}>
                              {need.is_expired ? t('status.EXPIRED', 'Expired') : `${t('ngo.expiresLabel', 'Expires')}: ${formatLocalizedDate(need.expires_at, i18n.language)}`}
                            </span>
                          )}
                        </div>

                        {/* Rejection reason banner */}
                        {isItemRejected && item.rejection_reason && (
                          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                            <strong>{t('ngo.rejectionReasonRecorded', 'Rejection reason recorded')}:</strong> "{item.rejection_reason}"
                          </div>
                        )}

                        {/* Other NGO accepted notice */}
                        {isItemCancelled && (
                          <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
                            {t('ngo.otherAcceptedNotice', 'Another NGO has already accepted this request. It is no longer actionable.')}
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
                              <CheckCircle className="w-3.5 h-3.5" /> {t('ngo.acceptHelp', 'Accept Request')}
                            </button>

                            <button
                              onClick={() => {
                                setRejectingItem(item);
                                setRejectionReason('');
                              }}
                              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-all"
                            >
                              <XCircle className="w-3.5 h-3.5" /> {t('ngo.rejectHelp', 'Reject Request')}
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
                                <MessageSquare className="w-3.5 h-3.5" /> {t('ngo.openChat', 'Open Chat')}
                              </button>
                            )}
                            {need?.status !== 'COMPLETED' && (
                              <button
                                onClick={() => handleComplete(need.request_id)}
                                disabled={completingId === need.request_id}
                                className="w-full flex items-center justify-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold transition-all"
                              >
                                {completingId === need.request_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                {t('ngo.markResolved', 'Mark Resolved')}
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
            <h3 className="font-display font-bold text-lg text-forest-dark">{t('ngo.openCommunityNeeds', 'Open Community Needs')}</h3>
            <span className="text-xs text-emerald-950/60">{t('ngo.communityFeedSubtitle', 'Feed of pending requests in your region')}</span>
          </div>

          {feedLoading ? (
            <div className="text-center py-16"><Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" /></div>
          ) : feedRequests.length === 0 ? (
            <div className="text-center py-16 text-sm text-emerald-950/50">{t('ngo.noFeedRequests', 'No open requests currently in your area.')}</div>
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
                      <span>{t('ngo.userLabel', 'User')}: {req.users?.full_name}</span>
                      <span>{t('ngo.city', 'City')}: {req.cities?.city_name}</span>
                      <span>{formatLocalizedDate(req.created_at, i18n.language)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setAcceptingId(req.request_id);
                      setAcceptMessage('We can support your request.');
                    }}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-forest-dark text-white text-xs font-bold shrink-0"
                  >
                    {t('ngo.acceptNeed', 'Accept Need')}
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
          <h2 className="font-display font-bold text-xl text-forest-dark">{t('ngo.ngoProfileServices', 'NGO Profile & Services')}</h2>
          {ngoProfile && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><strong>{t('ngo.ngoName', 'NGO Name')}:</strong> {ngoProfile.ngo_name}</div>
                <div><strong>{t('ngo.contactPerson', 'Contact Person')}:</strong> {ngoProfile.contact_person}</div>
                <div><strong>{t('ngo.email', 'Email')}:</strong> {ngoProfile.email}</div>
                <div><strong>{t('ngo.phone', 'Phone')}:</strong> {ngoProfile.phone_number}</div>
                <div><strong>{t('ngo.city', 'City')}:</strong> {ngoProfile.cities?.city_name}, {ngoProfile.cities?.state}</div>
                <div><strong>{t('ngo.address', 'Address')}:</strong> {ngoProfile.address}</div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-forest-dark/80">{t('ngo.orgDescription', 'Organization Description')}</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-bg-nature rounded-xl border border-forest-light/40 focus:border-primary text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-forest-dark/80">{t('ngo.servicesOffered', 'Services Offered')}</label>
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
                        {t('categories.' + srv, srv.replace('_', ' '))}
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
                {profileLoading ? t('common.saving', 'Saving...') : t('ngo.saveProfile', 'Save Profile')}
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
                  <h3 className="font-display font-bold text-lg text-forest-dark">{t('ngo.acceptModalTitle', 'Accept Request')}</h3>
                  <p className="text-xs text-emerald-950/60">{t('ngo.acceptModalSubtitle', 'Confirm your acceptance and notify the migrant.')}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-forest-dark/80">{t('ngo.responseMessageLabel', 'Response Message to Migrant')}</label>
                <textarea
                  value={acceptMessage}
                  onChange={(e) => setAcceptMessage(e.target.value)}
                  placeholder={t('ngo.acceptMessagePlaceholder', 'Introduce your NGO and explain how you will assist...')}
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
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={() => handleAcceptSubmit(acceptingId)}
                  disabled={acceptLoading}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-forest-dark disabled:bg-primary/40 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  {acceptLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  {t('ngo.confirmAccept', 'Confirm Acceptance')}
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
                  <h3 className="font-display font-bold text-lg text-forest-dark">{t('ngo.rejectModalTitle', 'Reject Request')}</h3>
                  <p className="text-xs text-emerald-950/60">{t('ngo.rejectModalSubtitle', 'The migrant will see your response.')}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-forest-dark/80">{t('ngo.rejectionReason', 'Reason (optional)')}</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={t('ngo.rejectionPlaceholder', 'e.g. Capacity full this week, Outside service sector, etc.')}
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-bg-nature rounded-xl border border-forest-light/40 focus:border-rose-400 outline-none text-xs"
                />
              </div>

              <p className="text-[11px] text-emerald-950/50">
                {t('ngo.rejectNote', 'Note: After rejecting, your NGO will not be able to accept this request afterward.')}
              </p>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setRejectingItem(null)}
                  disabled={rejectLoading}
                  className="px-4 py-2 rounded-xl border border-forest-light/30 hover:bg-bg-nature text-forest-dark text-xs font-medium"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleRejectSubmit}
                  disabled={rejectLoading}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  {rejectLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {t('ngo.confirmReject', 'Reject')}
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
                <h3 className="font-display font-bold text-base">{t('ngo.chatWithMigrant', 'Chat with Migrant')}</h3>
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
                <p className="text-center text-xs text-emerald-950/50 py-10">{t('ngo.noChatMessages', 'No messages yet.')}</p>
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
                placeholder={t('ngo.typeAMessage', 'Type a message...')}
                className="flex-1 px-4 py-2.5 rounded-xl bg-bg-nature border border-forest-light/40 focus:border-primary outline-none text-xs"
              />
              <button
                onClick={sendChatMessage}
                disabled={!chatMsg.trim()}
                className="bg-primary hover:bg-forest-dark disabled:bg-primary/40 text-white px-5 py-2.5 rounded-xl font-semibold text-xs transition-colors"
              >
                {t('ngo.send', 'Send')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
