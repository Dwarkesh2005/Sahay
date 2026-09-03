import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Soup, Home, Briefcase, Activity, Compass, MapPin, ArrowRight, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { requestService, citiesService } from '../services/api';

const CATEGORIES = [
  { value: 'FOOD', label: 'Food Assistance', icon: <Soup className="w-6 h-6" />, desc: 'Community kitchens, rations, food drives' },
  { value: 'SHELTER', label: 'Shelter Support', icon: <Home className="w-6 h-6" />, desc: 'Night shelters, temporary accommodation' },
  { value: 'MEDICAL', label: 'Medical / Healthcare', icon: <Activity className="w-6 h-6" />, desc: 'Free clinics, ambulance, mental health' },
  { value: 'EMPLOYMENT', label: 'Employment Help', icon: <Briefcase className="w-6 h-6" />, desc: 'Daily wage work, skills training, jobs' },
  { value: 'GUIDANCE', label: 'General Guidance', icon: <Compass className="w-6 h-6" />, desc: 'Documents, navigation, translation' }
];

export const CreateRequestPage: React.FC = () => {
  const navigate = useNavigate();
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

  useEffect(() => {
    citiesService.getCities().then(setCities).catch(console.error);
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const data = await requestService.createRequest({
        request_type: requestType,
        title,
        description,
        city_id: parseInt(cityId)
      });
      setCreatedRequest(data.request);
      setStep(4);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return !!requestType;
    if (step === 2) return title.length >= 5 && description.length >= 10;
    if (step === 3) return !!cityId;
    return true;
  };

  return (
    <div className="max-w-3xl mx-auto px-6 space-y-8">
      <div className="text-center space-y-2 pt-4">
        <h1 className="font-display font-extrabold text-3xl md:text-4xl text-forest-dark">Request Help</h1>
        <p className="text-emerald-950/70">Tell us what you need — we'll connect you with the right support.</p>
      </div>

      {/* Progress Steps */}
      {step < 4 && (
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                s <= step ? 'bg-primary text-white' : 'bg-forest-light/30 text-forest-dark/50'
              }`}>
                {s < step ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 rounded ${s < step ? 'bg-primary' : 'bg-forest-light/30'}`} />}
            </React.Fragment>
          ))}
        </div>
      )}

      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-3xl p-8 shadow-sm border border-forest-light/20"
      >
        {/* Step 1: Category Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="font-display font-bold text-xl text-forest-dark">What kind of help do you need?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setRequestType(cat.value)}
                  className={`text-left p-4 rounded-2xl border-2 transition-all duration-200 ${
                    requestType === cat.value
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-forest-light/20 hover:border-primary/30 hover:bg-bg-nature'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${requestType === cat.value ? 'bg-primary text-white' : 'bg-bg-nature text-primary'}`}>
                      {cat.icon}
                    </div>
                    <div>
                      <p className="font-display font-semibold text-forest-dark">{cat.label}</p>
                      <p className="text-xs text-emerald-950/60">{cat.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Details */}
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
                  placeholder="Brief summary of your need (e.g., Need medical help urgently)"
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
                  placeholder="Describe your situation in detail — what do you need, how urgently, any specific requirements..."
                  rows={5}
                  className="w-full px-4 py-3 bg-bg-nature rounded-xl border border-forest-light/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm resize-none"
                />
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
                <p><span className="font-medium text-forest-dark">Title:</span> {title}</p>
                <p><span className="font-medium text-forest-dark">Description:</span> <span className="text-emerald-950/70">{description.substring(0, 100)}{description.length > 100 ? '...' : ''}</span></p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && createdRequest && (
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display font-bold text-2xl text-forest-dark">Help Request Created!</h2>
              <p className="text-emerald-950/70">Your request has been submitted. Nearby NGOs and volunteers will be notified.</p>
            </div>
            <div className="bg-bg-nature rounded-2xl p-6 border border-forest-light/20 text-left space-y-3 max-w-md mx-auto">
              <div className="flex justify-between text-sm">
                <span className="text-emerald-950/60">Request ID</span>
                <span className="font-bold text-primary">#{createdRequest.request_id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-emerald-950/60">Category</span>
                <span className="font-medium text-forest-dark">{createdRequest.request_type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-emerald-950/60">Status</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">PENDING</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-emerald-950/60">Location</span>
                <span className="font-medium text-forest-dark">{createdRequest.cities?.city_name}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-primary hover:bg-forest-dark text-white font-semibold px-8 py-3 rounded-xl shadow-md transition-all duration-300"
              >
                Track My Requests
              </button>
              <button
                onClick={() => navigate('/ngos')}
                className="glass-panel hover:bg-white text-forest-dark font-semibold px-8 py-3 rounded-xl transition-all"
              >
                Browse NGOs
              </button>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        {step < 4 && (
          <div className="flex justify-between items-center pt-6 border-t border-forest-light/15 mt-6">
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)} className="flex items-center gap-2 text-forest-dark/70 hover:text-primary font-medium transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-2 bg-primary hover:bg-forest-dark disabled:bg-primary/30 text-white font-semibold px-6 py-2.5 rounded-xl transition-all duration-300"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
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
    </div>
  );
};
