import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Soup, Home, Briefcase, Activity, Compass, MapPin, ArrowRight, ArrowLeft,
  CheckCircle, Loader2, ShieldCheck, Search, AlertCircle, Users, UserCheck, Flame
} from 'lucide-react';
import { requestService, citiesService } from '../services/api';
import { formatLocalizedDate } from '../i18n';

const CATEGORY_ITEMS = [
  { value: 'FOOD', icon: <Soup className="w-6 h-6" /> },
  { value: 'SHELTER', icon: <Home className="w-6 h-6" /> },
  { value: 'MEDICAL', icon: <Activity className="w-6 h-6" /> },
  { value: 'EMPLOYMENT', icon: <Briefcase className="w-6 h-6" /> },
  { value: 'GUIDANCE', icon: <Compass className="w-6 h-6" /> }
];

const URGENCIES = [
  { value: 'LOW', key: 'LOW' },
  { value: 'MEDIUM', key: 'MEDIUM' },
  { value: 'HIGH', key: 'HIGH' },
  { value: 'EMERGENCY', key: 'CRITICAL' }
];

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
  const { t } = useTranslation();
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
      setError(err.response?.data?.error || t('errors.failedToSubmit', 'Failed to create request. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Send to Single NGO
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
      setSendSuccessMessage(`${t('request.requestSubmitted', 'Request successfully sent!')} (${ngoName})`);
    } catch (err: any) {
      setError(err.response?.data?.error || t('errors.failedToSubmit', 'Failed to send request to selected NGO.'));
    } finally {
      setSendingRequest(false);
    }
  };

  // Send to All Suggested NGOs
  const handleSendAll = async () => {
    if (!createdRequest) return;
    setShowConfirmAllModal(false);
    setSendingRequest(true);
    setError(null);
    try {
      const res = await requestService.sendRequests(createdRequest.request_id, {
        mode: 'ALL'
      });
      setSendSuccessMessage(
        `${t('request.requestSubmitted', 'Request successfully sent to all recommended NGOs!')} (${res.count || recommendations.length})`
      );
    } catch (err: any) {
      setError(err.response?.data?.error || t('errors.failedToSubmit', 'Failed to send request to all NGOs.'));
    } finally {
      setSendingRequest(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return !!requestType;
    if (step === 2) return title.length >= 3 && description.length >= 5;
    if (step === 3) return !!cityId;
    return true;
  };

  return (
    <div className="max-w-3xl mx-auto px-6 space-y-8 pb-12">
      <div className="text-center space-y-2 pt-4">
        <h1 className="font-display font-extrabold text-3xl md:text-4xl text-forest-dark">
          {createdRequest?.renewal_number ? t('request.renewRequest', 'Renew Help Request') : t('request.createRequest', 'Request Help')}
        </h1>
        <p className="text-emerald-950/70">
          {t('landing.heroSubtitle', "Tell us what you need — we'll recommend relevant NGOs and route your request directly.")}
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
        className="bg-white rounded-3xl p-6 sm:p-8 border border-forest-light/20 shadow-sm space-y-6 text-left"
      >
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Step 1: Category */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-display font-bold text-xl text-forest-dark">
              {t('request.requestCategory', 'What kind of help do you need?')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CATEGORY_ITEMS.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setRequestType(cat.value)}
                  className={`p-4 rounded-2xl text-left border transition-all duration-200 flex items-start gap-3.5 cursor-pointer ${
                    requestType === cat.value
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                      : 'border-forest-light/25 hover:border-primary/50 hover:bg-bg-nature/50'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${requestType === cat.value ? 'bg-primary text-white' : 'bg-forest-light/20 text-forest-dark'}`}>
                    {cat.icon}
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-forest-dark">
                      {t(`categories.${cat.value}`, cat.value)}
                    </h4>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Details & Urgency */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="font-display font-bold text-xl text-forest-dark">
              {t('request.description', 'Describe your situation')}
            </h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-forest-dark/80 block" htmlFor="req-title">
                  {t('request.requestTitle', 'Title')}
                </label>
                <input
                  id="req-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('request.requestTitle', 'Brief summary of your need')}
                  maxLength={150}
                  className="w-full px-4 py-3 bg-bg-nature rounded-xl border border-forest-light/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                />
                <p className="text-xs text-emerald-950/40 text-right">{title.length}/150</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-forest-dark/80 block" htmlFor="req-desc">
                  {t('request.description', 'Description')}
                </label>
                <textarea
                  id="req-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('request.descriptionPlaceholder', 'Describe your situation in detail...')}
                  rows={4}
                  className="w-full px-4 py-3 bg-bg-nature rounded-xl border border-forest-light/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm resize-none"
                />
              </div>

              {/* Urgency Selector */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-forest-dark/80 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-600" /> {t('request.urgency', 'Urgency Level')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {URGENCIES.map((u) => (
                    <button
                      key={u.value}
                      type="button"
                      onClick={() => setUrgency(u.value)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        urgency === u.value
                          ? 'border-primary bg-primary/10 text-forest-dark ring-2 ring-primary/20 font-bold'
                          : 'border-forest-light/30 bg-bg-nature hover:border-forest-light text-forest-dark/70'
                      }`}
                    >
                      <div className="text-xs font-semibold">{t(`urgency.${u.key}`, u.value)}</div>
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
            <h2 className="font-display font-bold text-xl text-forest-dark">
              {t('request.locationCity', 'Where are you located?')}
            </h2>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-forest-dark/80 flex items-center gap-1" htmlFor="req-city">
                <MapPin className="w-3.5 h-3.5" /> {t('auth.selectCity', 'Select Your City')}
              </label>
              <select
                id="req-city"
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className="w-full py-3 px-4 bg-bg-nature rounded-xl border border-forest-light/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              >
                <option value="">{t('auth.selectCity', 'Choose a city...')}</option>
                {cities.map((city: any) => (
                  <option key={city.city_id} value={city.city_id}>{city.city_name}</option>
                ))}
              </select>
            </div>

            {/* Summary Preview */}
            <div className="bg-bg-nature rounded-2xl p-4 border border-forest-light/20 space-y-2">
              <h4 className="text-xs font-semibold text-forest-dark/70 uppercase tracking-wide">
                {t('common.details', 'Request Summary')}
              </h4>
              <div className="text-sm space-y-1">
                <p><span className="font-medium text-forest-dark">{t('request.requestCategory', 'Category')}:</span> {t(`categories.${requestType}`, requestType)}</p>
                <p><span className="font-medium text-forest-dark">{t('request.urgency', 'Urgency')}:</span> {t(`urgency.${urgency}`, urgency)}</p>
                <p><span className="font-medium text-forest-dark">{t('common.details', 'Title')}:</span> {title}</p>
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
                  {createdRequest?.renewal_number ? t('request.renewRequest', 'Request Renewed') : t('request.requestCreatedSuccess', 'Request Created Successfully')}
                </h4>
                <p className="text-xs text-emerald-800">
                  {t('request.expiresIn', 'Valid until')}: <strong>{createdRequest?.expires_at ? formatLocalizedDate(createdRequest.expires_at) : ''}</strong>
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
                <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="bg-primary hover:bg-forest-dark text-white font-semibold px-6 py-2.5 rounded-xl shadow-md transition-all text-sm cursor-pointer"
                  >
                    {t('navbar.dashboard', 'Track My Requests')}
                  </button>
                  <button
                    onClick={() => navigate('/ngos')}
                    className="bg-bg-nature hover:bg-forest-light/20 text-forest-dark font-semibold px-6 py-2.5 rounded-xl transition-all text-sm cursor-pointer"
                  >
                    {t('navbar.findNgos', 'Browse All NGOs')}
                  </button>
                </div>
              </motion.div>
            )}

            {!sendSuccessMessage && (
              <>
                <div className="space-y-1">
                  <h3 className="font-display font-bold text-xl text-forest-dark">
                    {t('request.recommendedNgos', 'Recommended NGOs')}
                  </h3>
                  <p className="text-xs text-emerald-950/60">
                    {t('request.selectNgosDesc', 'Choose from verified NGOs matching your need.')}
                  </p>
                </div>

                {/* Detected Categories */}
                {detectedCategories.length > 0 && !recsLoading && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-xs text-emerald-950/50 font-medium">{t('common.details', 'Matched')}:</span>
                    {detectedCategories.map((cat) => (
                      <span key={cat} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                        {t(`categories.${cat}`, cat)}
                      </span>
                    ))}
                  </div>
                )}

                {/* Loading State */}
                {recsLoading && (
                  <div className="text-center py-10 space-y-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                    <p className="text-sm text-emerald-950/60 font-medium">{t('common.loading', 'Analyzing your need and matching registered NGOs...')}</p>
                  </div>
                )}

                {/* Recommendation List */}
                <AnimatePresence>
                  {!recsLoading && recommendations.length > 0 && (
                    <div className="space-y-3">
                      {recommendations.map((rec) => {
                        const isSelected = selectedNgoId === rec.ngoId;
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
                                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-emerald-100 text-emerald-800 border-emerald-200">
                                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                        {t('ngo.verifiedBadge', 'Govt Verified')}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap gap-1">
                                    {rec.matchedNeeds.map((need) => (
                                      <span key={need} className="text-[11px] px-2 py-0.5 rounded-full bg-bg-nature border border-forest-light/20 font-medium text-forest-dark">
                                        {t(`categories.${need}`, need)}
                                      </span>
                                    ))}
                                  </div>

                                  <div className="flex items-center gap-3 text-xs text-emerald-950/60">
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" /> {rec.city}
                                    </span>
                                    {rec.distanceKm !== null && (
                                      <span className="font-medium text-primary">{rec.distanceKm} km {t('request.distance', 'away')}</span>
                                    )}
                                  </div>

                                  <p className="text-xs text-emerald-950/70 leading-relaxed pt-1">{rec.reason}</p>
                                </div>
                              </div>

                              <div className="text-center shrink-0">
                                <div className={`text-2xl font-extrabold font-display leading-none ${
                                  rec.matchScore >= 80 ? 'text-primary' : rec.matchScore >= 60 ? 'text-emerald-600' : 'text-amber-600'
                                }`}>
                                  {rec.matchScore}%
                                </div>
                                <p className="text-[10px] text-emerald-950/40 font-medium uppercase tracking-wider mt-0.5">
                                  {t('request.matchScore', 'Match')}
                                </p>
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
                      <h4 className="font-display font-semibold text-forest-dark">
                        {t('request.noNgosInCity', 'No specific NGOs found in this city. Your request will still be broadcast in the public feed.')}
                      </h4>
                    </div>
                    <Link
                      to="/ngos"
                      className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-forest-dark transition-colors"
                    >
                      <Search className="w-3.5 h-3.5" /> {t('navbar.findNgos', 'Browse All NGOs')}
                    </Link>
                  </div>
                )}

                {/* Action Buttons: Option A & Option B */}
                {!recsLoading && recommendations.length > 0 && (
                  <div className="pt-4 border-t border-forest-light/15 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={handleSendSingle}
                        disabled={sendingRequest || !selectedNgoId}
                        className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-primary hover:bg-forest-dark disabled:bg-primary/40 text-white font-semibold text-sm transition-all shadow-sm cursor-pointer"
                      >
                        {sendingRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                        {t('request.sendToIndividual', 'Send to Selected NGO')}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowConfirmAllModal(true)}
                        disabled={sendingRequest}
                        className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-forest-dark hover:bg-forest-dark/90 disabled:bg-forest-dark/40 text-white font-semibold text-sm transition-all shadow-sm cursor-pointer"
                      >
                        <Users className="w-4 h-4" /> {t('request.sendToAll', 'Send to All Recommended')} ({recommendations.length})
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
                className="flex items-center gap-2 text-forest-dark/70 hover:text-primary font-medium transition-colors cursor-pointer text-sm"
              >
                <ArrowLeft className="w-4 h-4" /> {t('common.back', 'Back')}
              </button>
            ) : <div />}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-2 bg-primary hover:bg-forest-dark disabled:bg-primary/30 text-white font-semibold px-6 py-2.5 rounded-xl transition-all duration-300 text-sm cursor-pointer"
              >
                {t('common.next', 'Next')} <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canProceed() || submitting}
                className="flex items-center gap-2 bg-primary hover:bg-forest-dark disabled:bg-primary/30 text-white font-semibold px-6 py-2.5 rounded-xl transition-all duration-300 text-sm cursor-pointer"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {t('common.submit', 'Submit Request')}
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* Confirmation Modal */}
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
                <h3 className="font-display font-bold text-xl text-forest-dark">
                  {t('common.confirm', 'Are you sure?')}
                </h3>
                <p className="text-sm text-emerald-950/70">
                  {t('request.selectNgosDesc', 'Your request will be sent to all recommended NGOs.')}
                </p>
              </div>

              <div className="flex gap-3 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmAllModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-forest-light/30 hover:bg-bg-nature text-forest-dark font-medium text-sm transition-all cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSendAll}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-forest-dark text-white font-semibold text-sm transition-all shadow-md cursor-pointer"
                >
                  {t('common.confirm', 'Send Request')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
