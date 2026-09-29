import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Users, Building2, FileText, ShieldCheck, ShieldAlert, Loader2, ToggleLeft, ToggleRight, Search, AlertCircle, BarChart3, FileCheck2, Eye } from 'lucide-react';
import { adminService } from '../services/api';
import { AnimatedCounter } from '../components/common/AnimatedCounter';

export const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'overview' | 'verifications' | 'ngos' | 'users' | 'requests'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Verifications Queue
  const [verifications, setVerifications] = useState<any[]>([]);
  const [verifLoading, setVerifLoading] = useState(false);
  const [verifStatusFilter, setVerifStatusFilter] = useState('');
  const [verifSearch, setVerifSearch] = useState('');

  // NGOs
  const [ngos, setNgos] = useState<any[]>([]);
  const [ngosLoading, setNgosLoading] = useState(false);
  const [ngoStatusFilter, setNgoStatusFilter] = useState('');
  const [ngoSearch, setNgoSearch] = useState('');
  const [verifying, setVerifying] = useState<number | null>(null);

  // Users
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [togglingUser, setTogglingUser] = useState<number | null>(null);

  // Requests
  const [requests, setRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [reqStatusFilter, setReqStatusFilter] = useState('');

  useEffect(() => {
    adminService.getStats().then(d => setStats(d.stats)).catch(console.error).finally(() => setStatsLoading(false));
  }, []);

  const loadNgos = async () => {
    setNgosLoading(true);
    try {
      const params: any = {};
      if (ngoStatusFilter) params.status = ngoStatusFilter;
      if (ngoSearch) params.search = ngoSearch;
      const data = await adminService.getNgos(params);
      setNgos(data.ngos || []);
    } catch { setNgos([]); }
    finally { setNgosLoading(false); }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const params: any = {};
      if (userRoleFilter) params.role = userRoleFilter;
      if (userSearch) params.search = userSearch;
      const data = await adminService.getUsers(params);
      setUsers(data.users || []);
    } catch { setUsers([]); }
    finally { setUsersLoading(false); }
  };

  const loadVerifications = async () => {
    setVerifLoading(true);
    try {
      const params: any = {};
      if (verifStatusFilter) params.status = verifStatusFilter;
      if (verifSearch) params.search = verifSearch;
      const data = await adminService.getVerifications(params);
      setVerifications(data.verifications || []);
    } catch {
      setVerifications([]);
    } finally {
      setVerifLoading(false);
    }
  };

  const loadRequests = async () => {
    setRequestsLoading(true);
    try {
      const params: any = {};
      if (reqStatusFilter) params.status = reqStatusFilter;
      const data = await adminService.getRequests(params);
      setRequests(data.requests || []);
    } catch { setRequests([]); }
    finally { setRequestsLoading(false); }
  };

  useEffect(() => { if (tab === 'verifications') loadVerifications(); }, [tab, verifStatusFilter]); // eslint-disable-line
  useEffect(() => { if (tab === 'ngos') loadNgos(); }, [tab, ngoStatusFilter]); // eslint-disable-line
  useEffect(() => { if (tab === 'users') loadUsers(); }, [tab, userRoleFilter]); // eslint-disable-line
  useEffect(() => { if (tab === 'requests') loadRequests(); }, [tab, reqStatusFilter]); // eslint-disable-line

  const handleVerify = async (ngoId: number) => {
    setVerifying(ngoId);
    try {
      await adminService.verifyNgo(ngoId, 'GOVERNMENT_VERIFIED');
      loadNgos();
      adminService.getStats().then(d => setStats(d.stats));
    } catch (err: any) { alert(err.response?.data?.error || t('errors.failedToSubmit', 'Failed to verify NGO.')); }
    finally { setVerifying(null); }
  };

  const handleReject = async (ngoId: number) => {
    try {
      await adminService.rejectNgo(ngoId, 'Rejected by admin');
      loadNgos();
    } catch (err: any) { alert(err.response?.data?.error || t('errors.failedToSubmit', 'Failed to reject NGO.')); }
  };

  const handleToggleUser = async (userId: number) => {
    setTogglingUser(userId);
    try {
      await adminService.toggleUserStatus(userId);
      loadUsers();
    } catch (err: any) { alert(err.response?.data?.error || t('errors.failedToSubmit', 'Failed to toggle user status.')); }
    finally { setTogglingUser(null); }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 space-y-8">
      <div className="pt-4">
        <h1 className="font-display font-extrabold text-3xl text-forest-dark">{t('admin.adminConsole', 'Admin Console')}</h1>
        <p className="text-emerald-950/60 text-sm mt-1">{t('admin.adminSubtitle', 'Oversee the entire Sahay ecosystem')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'overview', label: t('admin.overview', 'Overview'), icon: <BarChart3 className="w-3.5 h-3.5" /> },
          { key: 'verifications', label: t('admin.verificationsQueue', 'Verifications Queue'), icon: <FileCheck2 className="w-3.5 h-3.5" /> },
          { key: 'ngos', label: t('admin.ngos', 'NGOs'), icon: <Building2 className="w-3.5 h-3.5" /> },
          { key: 'users', label: t('admin.users', 'Users'), icon: <Users className="w-3.5 h-3.5" /> },
          { key: 'requests', label: t('admin.requests', 'Requests'), icon: <FileText className="w-3.5 h-3.5" /> }
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-medium text-sm transition-all ${tab === t.key ? 'bg-primary text-white shadow-sm' : 'bg-bg-nature text-forest-dark/70 hover:bg-forest-light/30'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-8">
          {statsLoading ? (
            <div className="text-center py-16"><Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" /></div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: t('admin.totalUsers', 'Total Users'), value: stats.totalUsers, color: 'text-forest-dark' },
                  { label: t('admin.totalNgos', 'Total NGOs'), value: stats.totalNgos, color: 'text-blue-600' },
                  { label: t('status.VERIFIED', 'Verified NGOs'), value: stats.verifiedNgos, color: 'text-emerald-600' },
                  { label: t('admin.totalRequests', 'Total Requests'), value: stats.totalRequests, color: 'text-primary' },
                  { label: t('status.PENDING', 'Pending'), value: stats.pendingRequests, color: 'text-amber-600' },
                  { label: t('common.active', 'Active'), value: stats.acceptedRequests, color: 'text-blue-600' },
                  { label: t('status.COMPLETED', 'Completed'), value: stats.completedRequests, color: 'text-emerald-600' },
                  { label: t('status.CANCELLED', 'Cancelled'), value: stats.cancelledRequests, color: 'text-rose-600' }
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl p-5 border border-forest-light/20 shadow-sm text-center">
                    <div className={`font-display font-bold text-2xl ${s.color}`}><AnimatedCounter value={s.value} /></div>
                    <p className="text-xs text-emerald-950/60 font-medium mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Requests by Type */}
              <div className="bg-white rounded-2xl p-6 border border-forest-light/20 shadow-sm space-y-4">
                <h3 className="font-display font-bold text-lg text-forest-dark">Requests by Category</h3>
                <div className="space-y-2">
                  {stats.requestsByType?.map((r: any) => {
                    const max = Math.max(...stats.requestsByType.map((x: any) => x.count), 1);
                    return (
                      <div key={r.type} className="flex items-center gap-3">
                        <span className="text-xs font-medium text-forest-dark/70 w-28">{r.type}</span>
                        <div className="flex-1 bg-bg-nature rounded-full h-4 overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(r.count / max) * 100}%` }} transition={{ duration: 0.8 }}
                            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full" />
                        </div>
                        <span className="text-xs font-bold text-forest-dark w-8 text-right">{r.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : <p className="text-center text-emerald-950/50">No data available.</p>}
        </div>
      )}

      {/* Verifications Tab */}
      {tab === 'verifications' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {[
                { val: '', label: 'All Cases' },
                { val: 'NEEDS_ADMIN_REVIEW', label: 'Needs Review' },
                { val: 'NEEDS_CORRECTION', label: 'Action Required' },
                { val: 'PROCESSING', label: 'Processing' },
                { val: 'APPROVED', label: 'Approved' },
                { val: 'REJECTED', label: 'Rejected' },
              ].map(s => (
                <button
                  key={s.val}
                  onClick={() => setVerifStatusFilter(s.val)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    verifStatusFilter === s.val ? 'bg-primary text-white shadow-xs' : 'bg-bg-nature text-forest-dark/70 hover:bg-forest-light/30'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); loadVerifications(); }} className="flex gap-2 w-full md:w-auto">
              <input
                type="text"
                value={verifSearch}
                onChange={(e) => setVerifSearch(e.target.value)}
                placeholder="Search by NGO, PAN, or Reg No..."
                className="px-4 py-2 rounded-xl border border-forest-light/40 bg-bg-nature text-xs focus:border-primary outline-none w-full md:w-64"
              />
              <button type="submit" className="bg-primary text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-forest-dark transition-all">
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>

          {verifLoading ? (
            <div className="text-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" /></div>
          ) : verifications.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-forest-light/20 p-8">
              <FileCheck2 className="w-10 h-10 text-forest-dark/20 mx-auto" />
              <p className="text-sm font-semibold text-forest-dark mt-2">No verification cases found</p>
              <p className="text-xs text-emerald-950/50 mt-1">There are no NGO document submissions matching your filter.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-forest-light/20 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-bg-nature border-b border-forest-light/20">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">NGO Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">City</th>
                      <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">Consistency Score</th>
                      <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">Match Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">Docs</th>
                      <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">Verification Status</th>
                      <th className="text-right px-4 py-3 font-semibold text-forest-dark/80">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-forest-light/10">
                    {verifications.map((v: any) => (
                      <tr key={v.verification_id} className="hover:bg-bg-nature/40 transition-colors">
                        <td className="px-4 py-3 font-bold text-forest-dark">
                          {v.ngos?.ngo_name}
                          <p className="text-[10px] text-emerald-950/50 font-normal">
                            Reg: {v.ngos?.registration_number || 'N/A'} • PAN: {v.ngos?.pan || 'N/A'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-emerald-950/70">{v.ngos?.cities?.city_name || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <span className="font-display font-bold text-sm text-primary">
                            {v.screening_score != null ? `${v.screening_score}%` : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-emerald-700 font-bold">{v.total_matches}✓</span>{' '}
                          <span className="text-rose-700 font-bold ml-1">{v.total_mismatches}✗</span>{' '}
                          <span className="text-gray-400 font-medium ml-1">{v.total_not_found}?</span>
                        </td>
                        <td className="px-4 py-3 text-emerald-950/70">{v.documents?.length || 0}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            v.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                            v.status === 'NEEDS_CORRECTION' ? 'bg-rose-100 text-rose-800' :
                            v.status === 'REJECTED' ? 'bg-gray-100 text-gray-800' :
                            v.status === 'PROCESSING' ? 'bg-purple-100 text-purple-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {v.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => navigate(`/admin/verifications/${v.verification_id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-forest-dark transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" /> Review Case
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* NGOs Tab */}
      {tab === 'ngos' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex gap-2 flex-wrap">
              {['', 'PENDING', 'GOVERNMENT_VERIFIED', 'MANUALLY_VERIFIED', 'CONTACT_VERIFIED'].map(s => (
                <button key={s} onClick={() => setNgoStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${ngoStatusFilter === s ? 'bg-primary text-white' : 'bg-bg-nature text-forest-dark/70'}`}>
                  {s ? s.replace('_', ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()) : 'All'}
                </button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); loadNgos(); }} className="flex gap-2">
              <input type="text" value={ngoSearch} onChange={(e) => setNgoSearch(e.target.value)} placeholder="Search NGOs..."
                className="px-4 py-2 rounded-xl border border-forest-light/40 bg-bg-nature text-sm focus:border-primary outline-none" />
              <button type="submit" className="bg-primary text-white px-4 py-2 rounded-xl text-sm"><Search className="w-4 h-4" /></button>
            </form>
          </div>
          {ngosLoading ? <div className="text-center py-10"><Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" /></div>
          : ngos.length === 0 ? <div className="text-center py-10"><AlertCircle className="w-8 h-8 text-forest-dark/20 mx-auto" /><p className="text-sm text-emerald-950/50 mt-2">No NGOs found</p></div>
          : (
            <div className="bg-white rounded-2xl border border-forest-light/20 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-bg-nature border-b border-forest-light/20">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">NGO Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">City</th>
                      <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">Reg. No.</th>
                      <th className="text-right px-4 py-3 font-semibold text-forest-dark/80">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ngos.map((ngo: any) => (
                      <tr key={ngo.ngo_id} className="border-b border-forest-light/10 hover:bg-bg-nature/50">
                        <td className="px-4 py-3 font-medium text-forest-dark">{ngo.ngo_name}</td>
                        <td className="px-4 py-3 text-emerald-950/60">{ngo.cities?.city_name || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            ngo.verification_status === 'PENDING' ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'}`}>
                            {ngo.verification_status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-emerald-950/50 text-xs">{ngo.registration_number || 'N/A'}</td>
                        <td className="px-4 py-3 text-right space-x-2">
                          {ngo.verification_status === 'PENDING' && (
                            <>
                              <button onClick={() => handleVerify(ngo.ngo_id)} disabled={verifying === ngo.ngo_id}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50">
                                {verifying === ngo.ngo_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />} Verify
                              </button>
                              <button onClick={() => handleReject(ngo.ngo_id)}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-100 text-rose-700 text-xs font-medium hover:bg-rose-200">
                                <ShieldAlert className="w-3 h-3" /> Reject
                              </button>
                            </>
                          )}
                          {ngo.verification_status !== 'PENDING' && (
                            <span className="text-xs text-emerald-600 font-medium">✓ Verified</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex gap-2 flex-wrap">
              {['', 'MIGRANT', 'VOLUNTEER', 'NGO', 'ADMIN'].map(r => (
                <button key={r} onClick={() => setUserRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${userRoleFilter === r ? 'bg-primary text-white' : 'bg-bg-nature text-forest-dark/70'}`}>
                  {r || 'All'}
                </button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); loadUsers(); }} className="flex gap-2">
              <input type="text" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search users..."
                className="px-4 py-2 rounded-xl border border-forest-light/40 bg-bg-nature text-sm focus:border-primary outline-none" />
              <button type="submit" className="bg-primary text-white px-4 py-2 rounded-xl text-sm"><Search className="w-4 h-4" /></button>
            </form>
          </div>
          {usersLoading ? <div className="text-center py-10"><Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" /></div>
          : (
            <div className="bg-white rounded-2xl border border-forest-light/20 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-bg-nature border-b border-forest-light/20">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">Email</th>
                      <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">Role</th>
                      <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">Status</th>
                      <th className="text-right px-4 py-3 font-semibold text-forest-dark/80">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u: any) => (
                      <tr key={u.user_id} className="border-b border-forest-light/10 hover:bg-bg-nature/50">
                        <td className="px-4 py-3 font-medium text-forest-dark">{u.full_name}</td>
                        <td className="px-4 py-3 text-emerald-950/60">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            u.role === 'ADMIN' ? 'bg-amber-100 text-amber-800' :
                            u.role === 'NGO' ? 'bg-blue-100 text-blue-800' :
                            u.role === 'VOLUNTEER' ? 'bg-purple-100 text-purple-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>{u.role}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {u.role !== 'ADMIN' && (
                            <button onClick={() => handleToggleUser(u.user_id)} disabled={togglingUser === u.user_id}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium hover:bg-bg-nature transition-colors">
                              {togglingUser === u.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> :
                                u.is_active ? <><ToggleRight className="w-4 h-4 text-emerald-600" /> Active</> : <><ToggleLeft className="w-4 h-4 text-rose-500" /> Inactive</>}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Requests Tab */}
      {tab === 'requests' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {['', 'PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED'].map(s => (
              <button key={s} onClick={() => setReqStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${reqStatusFilter === s ? 'bg-primary text-white' : 'bg-bg-nature text-forest-dark/70'}`}>
                {s || 'All'}
              </button>
            ))}
          </div>
          {requestsLoading ? <div className="text-center py-10"><Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" /></div>
          : (
            <div className="bg-white rounded-2xl border border-forest-light/20 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-bg-nature border-b border-forest-light/20">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">ID</th>
                      <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">Title</th>
                      <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">Type</th>
                      <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">User</th>
                      <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">City</th>
                      <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r: any) => (
                      <tr key={r.request_id} className="border-b border-forest-light/10 hover:bg-bg-nature/50">
                        <td className="px-4 py-3 text-primary font-bold">#{r.request_id}</td>
                        <td className="px-4 py-3 font-medium text-forest-dark max-w-xs truncate">{r.title}</td>
                        <td className="px-4 py-3 text-emerald-950/60">{r.request_type}</td>
                        <td className="px-4 py-3 text-emerald-950/60">{r.users?.full_name}</td>
                        <td className="px-4 py-3 text-emerald-950/60">{r.cities?.city_name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            r.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                            r.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' :
                            r.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>{r.status}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-emerald-950/50">{new Date(r.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
