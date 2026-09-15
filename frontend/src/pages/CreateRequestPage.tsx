import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Soup, Home, Briefcase, Activity, Compass, MapPin, ArrowRight, ArrowLeft,
  CheckCircle, Loader2, ShieldCheck, Search, AlertCircle, Users, UserCheck, Flame
} from 'lucide-react';
import { requestService, citiesService } from '../services/api';

const CATEGORIES = [
  { value: 'FOOD', label: 'Food Assistance', icon: <Soup className="w-6 h-6" />, desc: 'Community kitchens, rations, food drives' },
  { value: 'SHELTER', label: 'Shelter Support', icon: <Home className="w-6 h-6" />, desc: 'Night shelters, temporary accommodation' },
  { value: 'MEDICAL', label: 'Medical / Healthcare', icon: <Activity className="w-6 h-6" />, desc: 'Free clinics, ambulance, mental health' },
  { value: 'EMPLOYMENT', label: 'Employment Help', icon: <Briefcase className="w-6 h-6" />, desc: 'Daily wage work, skills training, jobs' },
  { value: 'GUIDANCE', label: 'General Guidance', icon: <Compass className="w-6 h-6" />, desc: 'Documents, navigation, translation' }
];

const CATEGORY_LABELS: Record<string, string> = {
  FOOD: '🍲 Food', SHELTER: '🏠 Shelter', MEDICAL: '🏥 Medical',
  EMPLOYMENT: '💼 Employment', EDUCATION: '📚 Education', LEGAL: '⚖️ Legal',
  GUIDANCE: '🧭 Guidance', OTHER: '📋 Other', SKILL_DEVELOPMENT: '🛠️ Skills',
  FINANCIAL_ASSISTANCE: '💰 Financial', WOMEN_SUPPORT: '👩 Women Support',
  CHILD_SUPPORT: '👶 Child Support', ELDERLY_SUPPORT: '👴 Elderly',
  DISABILITY_SUPPORT: '♿ Disability', MIGRANT_SUPPORT: '🚶 Migrant',
  DOCUMENTATION: '📄 Documents', EMERGENCY: '🚨 Emergency'
};

const URGENCIES = [
  { value: 'LOW', label: 'Standard', desc: 'Can wait 2-3 days' },
  { value: 'MEDIUM', label: 'Moderate', desc: 'Needed within 24-48 hours' },
  { value: 'HIGH', label: 'Urgent', desc: 'Needed today' },
  { value: 'EMERGENCY', label: 'Critical Emergency', desc: 'Immediate assistance required' }
];

const VERIFICATION_BADGE: Record<string, { label: string; color: string }> = {
  GOVERNMENT_VERIFIED: { label: 'Govt. Verified', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  CONTACT_VERIFIED: { label: 'Contact Verified', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  MANUALLY_VERIFIED: { label: 'Verified', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  PENDING: { label: 'Pending', color: 'bg-amber-100 text-amber-800 border-amber-200' }
};

interface NgoRecommendation {
  ngoId: number;
  name: string;
  matchScore: number;
  distanceKm: number | null;
  matchedNeeds: string[];
  cityMatch: boolean;
  verified: boolean;
  verificationStatus: string;
  reason: string;
  address: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  city: string;
}

export const CreateRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1);
  const [cities, setCities] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [createdRequest, setCreatedRequest] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [requestType, setRequestType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cityId, setCityId] = useState('');
  const [urgency, setUrgency] = useState('MEDIUM');

  // Recommendations state
  const [recommendations, setRecommendations] = useState<NgoRecommendation[]>([]);
  const [detectedCategories, setDetectedCategories] = useState<string[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsFetched, setRecsFetched] = useState(false);

  // Sending Request state
  const [selectedNgoId, setSelectedNgoId] = useState<number | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);
  const [showConfirmAllModal, setShowConfirmAllModal] = useState(false);

  useEffect(() => {
    citiesService.getCities().then(setCities).catch(console.error);

    // If navigated from renewal
    if (location.state?.renewedRequest) {
      setCreatedRequest(location.state.renewedRequest);
      setStep(4);
    }
  }, [location.state]);

  // Fetch recommendations after request is created
  useEffect(() => {
    if (createdRequest?.request_id && step === 4) {
      setRecsLoading(true);
      requestService.getRecommendations(createdRequest.request_id)
        .then((data) => {
          const recs = data.data || [];
          setRecommendations(recs);
          setDetectedCategories(data.meta?.detectedCategories || []);
          // Default select the first recommendation if available
          if (recs.length > 0) {
            setSelectedNgoId(recs[0].ngoId);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch recommendations:', err);
          setRecommendations([]);
        })
        .finally(() => {
          setRecsLoading(false);
          setRecsFetched(true);
        });
    }
  }, [createdRequest, step]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const data = await requestService.createRequest({
        request_type: requestType,
        title,
        description,
        city_id: parseInt(cityId),
        urgency
      });
      setCreatedRequest(data.request);
      setStep(4);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Send to Single NGO (Option A)
  const handleSendSingle = async () => {
    if (!createdRequest || !selectedNgoId) return;
    setSendingRequest(true);
    setError(null);
    try {
      await requestService.sendRequests(createdRequest.request_id, {
        mode: 'SINGLE',
        ngo_id: selectedNgoId
      });
      const ngoName = recommendations.find(r => r.ngoId === selectedNgoId)?.name || 'the selected NGO';
      setSendSuccessMessage(`Request successfully sent to ${ngoName}!`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send request to selected NGO.');
    } finally {
      setSendingRequest(false);
    }
  };

  // Send to All Suggested NGOs (Option B)
  const handleSendAll = async () => {
    if (!createdRequest) return;
    setShowConfirmAllModal(false);
    setSendingRequest(true);
    setError(null);
    try {
      const res = await requestService.sendRequests(createdRequest.request_id, {
        mode: 'ALL'
      });
      setSendSuccessMessage(`Request successfully sent to all ${res.count || recommendations.length} recommended NGOs!`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send request to all NGOs.');
    } finally {
      setSendingRequest(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return !!requestType;
    if (step === 2) return title.length >= 5 && description.length >= 10;
    if (step === 3) return !!cityId;
    return true;
  };

  return (
    <div className="max-w-3xl mx-auto px-6 space-y-8 pb-12">
      <div className="text-center space-y-2 pt-4">
        <h1 className="font-display font-extrabold text-3xl md:text-4xl text-forest-dark">
          {createdRequest?.renewal_number ? 'Renew Help Request' : 'Request Help'}
        </h1>
        <p className="text-emerald-950/70">
          {createdRequest?.renewal_number
            ? `Cycle #${createdRequest.renewal_number + 1} — Tell us what you need and we will recommend the best NGOs.`
            : "Tell us what you need — we'll recommend relevant NGOs and route your request directly."}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center justify-between relative max-w-lg mx-auto">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-forest-light/30 -translate-y-1/2 z-0" />
        <div
          className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 z-0 transition-all duration-500"
          style={{ width: `${((step - 1) / 3) * 100}%` }}
        />
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm z-10 transition-all duration-300 ${
              s === step
                ? 'bg-primary text-white ring-4 ring-primary/20 scale-110 shadow-md'
                : s < step
                ? 'bg-forest-dark text-white'
                : 'bg-white text-forest-dark/40 border border-forest-light/40'
            }`}
          >
            {s < step ? <CheckCircle className="w-5 h-5" /> : s}
          </div>
        ))}
      </div>

      {/* Step Container */}
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-3xl p-6 sm:p-8 border border-forest-light/20 shadow-sm space-y-6"
      >
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Step 1: Category */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-display font-bold text-xl text-forest-dark">What kind of help do you need?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setRequestType(cat.value)}
                  className={`p-4 rounded-2xl text-left border transition-all duration-200 flex items-start gap-3.5 ${
                    requestType === cat.value
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                      : 'border-forest-light/25 hover:border-primary/50 hover:bg-bg-nature/50'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${requestType === cat.value ? 'bg-primary text-white' : 'bg-forest-light/20 text-forest-dark'}`}>
                    {cat.icon}
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-forest-dark">{cat.label}</h4>
                    <p className="text-xs text-emerald-950/60 mt-0.5">{cat.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Details & Urgency */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="font-display font-bold text-xl text-forest-dark">Describe your situation</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-forest-dark/80 block" htmlFor="req-title">Title</label>
                <input
                  id="req-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief summary of your need (e.g., Medical treatment assistance required in Ahmedabad)"
                  maxLength={150}
                  className="w-full px-4 py-3 bg-bg-nature rounded-xl border border-forest-light/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                />
                <p className="text-xs text-emerald-950/40 text-right">{title.length}/150</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-forest-dark/80 block" htmlFor="req-desc">Description</label>
                <textarea
                  id="req-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your situation in detail — what do you need, how urgently, any medical symptoms or family requirements..."
                  rows={4}
                  className="w-full px-4 py-3 bg-bg-nature rounded-xl border border-forest-light/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm resize-none"
                />
              </div>

              {/* Urgency Selector */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-forest-dark/80 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-600" /> Urgency Level
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {URGENCIES.map((u) => (
                    <button
                      key={u.value}
                      type="button"
                      onClick={() => setUrgency(u.value)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        urgency === u.value
                          ? 'border-primary bg-primary/10 text-forest-dark ring-2 ring-primary/20 font-bold'
                          : 'border-forest-light/30 bg-bg-nature hover:border-forest-light text-forest-dark/70'
                      }`}
                    >
                      <div className="text-xs font-semibold">{u.label}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{u.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Location */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="font-display font-bold text-xl text-forest-dark">Where are you located?</h2>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-forest-dark/80 flex items-center gap-1" htmlFor="req-city">
                <MapPin className="w-3.5 h-3.5" /> Select Your City
              </label>
              <select
                id="req-city"
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className="w-full py-3 px-4 bg-bg-nature rounded-xl border border-forest-light/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              >
                <option value="">Choose a city...</option>
                {cities.map((city: any) => (
                  <option key={city.city_id} value={city.city_id}>{city.city_name}, {city.state}</option>
                ))}
              </select>
            </div>

            {/* Summary Preview */}
            <div className="bg-bg-nature rounded-2xl p-4 border border-forest-light/20 space-y-2">
              <h4 className="text-xs font-semibold text-forest-dark/70 uppercase tracking-wide">Request Summary</h4>
              <div className="text-sm space-y-1">
                <p><span className="font-medium text-forest-dark">Category:</span> {CATEGORIES.find(c => c.value === requestType)?.label}</p>
                <p><span className="font-medium text-forest-dark">Urgency:</span> {URGENCIES.find(u => u.value === urgency)?.label}</p>
                <p><span className="font-medium text-forest-dark">Title:</span> {title}</p>
                <p><span className="font-medium text-forest-dark">Description:</span> <span className="text-emerald-950/70">{description.substring(0, 100)}{description.length > 100 ? '...' : ''}</span></p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Recommended NGOs & Request Modes */}
        {step === 4 && (
          <div className="space-y-6">
            {/* Request Created Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <h4 className="font-display font-bold text-emerald-900 text-sm">
                  {createdRequest?.renewal_number ? `Need Request Renewed (Cycle #${createdRequest.renewal_number + 1})` : 'Need Request Created Successfully'}
                </h4>
                <p className="text-xs text-emerald-800">
                  Valid for <strong>7 days</strong> until {createdRequest?.expires_at ? new Date(createdRequest.expires_at).toLocaleDateString() : '7 days from now'}.
                  Choose below how you want to send your request to verified NGOs.
                </p>
              </div>
            </div>

            {/* Success Message Banner */}
            {sendSuccessMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-primary/10 border border-primary/30 rounded-2xl p-5 text-center space-y-3"
              >
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-forest-dark text-lg">{sendSuccessMessage}</h3>
                <p className="text-xs text-emerald-950/70 max-w-md mx-auto">
                  The NGO(s) have received your request. You can track responses, receive notifications, and send reminders (up to once every 24 hours) from your dashboard.
                </p>
                <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="bg-primary hover:bg-forest-dark text-white font-semibold px-6 py-2.5 rounded-xl shadow-md transition-all text-sm"
                  >
                    Track My Requests
                  </button>
                  <button
                    onClick={() => navigate('/ngos')}
                    className="bg-bg-nature hover:bg-forest-light/20 text-forest-dark font-semibold px-6 py-2.5 rounded-xl transition-all text-sm"
                  >
                    Browse All NGOs
                  </button>
                </div>
              </motion.div>
            )}

            {!sendSuccessMessage && (
              <>
                {/* Heading & Analysis */}
                <div className="space-y-1">
                  <h3 className="font-display font-bold text-xl text-forest-dark">
                    SAHAY Recommended NGOs
                  </h3>
                  <p className="text-xs text-emerald-950/60">
                    Based on your need categories and location, we identified the most relevant NGOs:
                  </p>
                </div>

                {/* Detected Categories */}
                {detectedCategories.length > 0 && !recsLoading && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-xs text-emerald-950/50 font-medium">Matched tags:</span>
                    {detectedCategories.map((cat) => (
                      <span key={cat} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                        {CATEGORY_LABELS[cat] || cat}
                      </span>
                    ))}
                  </div>
                )}

                {/* Loading State */}
                {recsLoading && (
                  <div className="text-center py-10 space-y-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                    <p className="text-sm text-emerald-950/60 font-medium">Analyzing your need and matching with registered NGOs...</p>
                  </div>
                )}

                {/* Recommendation List */}
                <AnimatePresence>
                  {!recsLoading && recommendations.length > 0 && (
                    <div className="space-y-3">
                      {recommendations.map((rec) => {
                        const isSelected = selectedNgoId === rec.ngoId;
                        const vBadge = VERIFICATION_BADGE[rec.verificationStatus] || VERIFICATION_BADGE.PENDING;

                        return (
                          <div
                            key={rec.ngoId}
                            onClick={() => setSelectedNgoId(rec.ngoId)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                                : 'border-forest-light/20 hover:border-primary/40 bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              {/* Selection radio + Info */}
                              <div className="flex items-start gap-3 flex-1">
                                <div className="pt-0.5">
                                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                    isSelected ? 'border-primary bg-primary' : 'border-forest-light/50 bg-white'
                                  }`}>
                                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                  </div>
                                </div>
                                <div className="space-y-1.5 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-display font-bold text-forest-dark text-base">{rec.name}</h4>
                                    {rec.verified && (
                                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border ${vBadge.color}`}>
                                        <ShieldCheck className="w-3 h-3" /> {vBadge.label}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap gap-1">
                                    {rec.matchedNeeds.map((need) => (
                                      <span key={need} className="text-[11px] px-2 py-0.5 rounded-full bg-bg-nature border border-forest-light/20 font-medium text-forest-dark">
                                        {CATEGORY_LABELS[need] || need}
                                      </span>
                                    ))}
                                  </div>

                                  <div className="flex items-center gap-3 text-xs text-emerald-950/60">
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" /> {rec.city}
                                      {!rec.cityMatch && <span className="text-amber-600 font-medium ml-0.5">· Nearby</span>}
                                    </span>
                                    {rec.distanceKm !== null && (
                                      <span className="font-medium text-primary">{rec.distanceKm} km away</span>
                                    )}
                                  </div>

                                  <p className="text-xs text-emerald-950/70 leading-relaxed pt-1">{rec.reason}</p>
                                </div>
                              </div>

                              {/* Match Score */}
                              <div className="text-center shrink-0">
                                <div className={`text-2xl font-extrabold font-display leading-none ${
                                  rec.matchScore >= 80 ? 'text-primary' :
                                  rec.matchScore >= 60 ? 'text-emerald-600' :
                                  'text-amber-600'
                                }`}>
                                  {rec.matchScore}%
                                </div>
                                <p className="text-[10px] text-emerald-950/40 font-medium uppercase tracking-wider mt-0.5">Match</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </AnimatePresence>

                {/* No match fallback */}
                {!recsLoading && recsFetched && recommendations.length === 0 && (
                  <div className="bg-bg-nature rounded-2xl p-6 border border-forest-light/20 text-center space-y-4">
                    <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                    <div className="space-y-1">
                      <h4 className="font-display font-semibold text-forest-dark">No Close Matches Found in this City</h4>
                      <p className="text-sm text-emerald-950/60">
                        You can still browse our registered NGO directory to find support organizations.
                      </p>
                    </div>
                    <Link
                      to="/ngos"
                      className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-forest-dark transition-colors"
                    >
                      <Search className="w-3.5 h-3.5" /> Browse All NGOs
                    </Link>
                  </div>
                )}

                {/* Action Buttons: Option A & Option B */}
                {!recsLoading && recommendations.length > 0 && (
                  <div className="pt-4 border-t border-forest-light/15 space-y-3">
                    <div className="text-xs font-semibold text-forest-dark/60 uppercase tracking-wide">
                      Choose How to Send Request:
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Option A */}
                      <button
                        type="button"
                        onClick={handleSendSingle}
                        disabled={sendingRequest || !selectedNgoId}
                        className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-primary hover:bg-forest-dark disabled:bg-primary/40 text-white font-semibold text-sm transition-all shadow-sm"
                      >
                        {sendingRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                        Send to Selected NGO
                      </button>

                      {/* Option B */}
                      <button
                        type="button"
                        onClick={() => setShowConfirmAllModal(true)}
                        disabled={sendingRequest}
                        className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-forest-dark hover:bg-forest-dark/90 disabled:bg-forest-dark/40 text-white font-semibold text-sm transition-all shadow-sm"
                      >
                        <Users className="w-4 h-4" /> Send to All Suggested NGOs ({recommendations.length})
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step Navigation Buttons (for steps 1-3) */}
        {step < 4 && (
          <div className="flex justify-between items-center pt-6 border-t border-forest-light/15 mt-6">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 text-forest-dark/70 hover:text-primary font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-2 bg-primary hover:bg-forest-dark disabled:bg-primary/30 text-white font-semibold px-6 py-2.5 rounded-xl transition-all duration-300"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canProceed() || submitting}
                className="flex items-center gap-2 bg-primary hover:bg-forest-dark disabled:bg-primary/30 text-white font-semibold px-6 py-2.5 rounded-xl transition-all duration-300"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Submit Request
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* Confirmation Modal for Option B (Send to All Suggested NGOs) */}
      <AnimatePresence>
        {showConfirmAllModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-forest-light/20 space-y-5 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>

              <div className="space-y-2">
                <h3 className="font-display font-bold text-xl text-forest-dark">Are you sure?</h3>
                <p className="text-sm text-emerald-950/70">
                  Your request will be sent to all <strong>{recommendations.length} recommended NGOs</strong>.
                  Any NGO that can help may accept your request.
                </p>
              </div>

              <div className="p-3 bg-bg-nature rounded-xl text-xs text-emerald-950/60 text-left">
                <strong>Note:</strong> Once any NGO accepts your request, it will be marked completed and other NGOs will no longer be able to accept.
              </div>

              <div className="flex gap-3 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmAllModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-forest-light/30 hover:bg-bg-nature text-forest-dark font-medium text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendAll}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-forest-dark text-white font-semibold text-sm transition-all shadow-md"
                >
                  Send Request
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
