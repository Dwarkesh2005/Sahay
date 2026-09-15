import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, ShieldCheck, Phone, Mail, Globe, ArrowLeft, Loader2, AlertCircle, Send } from 'lucide-react';
import { ngoService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const SERVICE_LABELS: Record<string, string> = {
  FOOD: '🍲 Food', SHELTER: '🏠 Shelter', MEDICAL: '🏥 Medical', EMPLOYMENT: '💼 Employment',
  EDUCATION: '📚 Education', LEGAL: '⚖️ Legal', GUIDANCE: '🧭 Guidance', OTHER: '📋 Other',
  SKILL_DEVELOPMENT: '🛠️ Skill Development', FINANCIAL_ASSISTANCE: '💰 Financial Assistance',
  WOMEN_SUPPORT: '👩 Women Support', CHILD_SUPPORT: '👶 Child Support',
  ELDERLY_SUPPORT: '👴 Elderly Support', DISABILITY_SUPPORT: '♿ Disability Support',
  MIGRANT_SUPPORT: '🚶 Migrant Support', DOCUMENTATION: '📄 Documentation',
  EMERGENCY: '🚨 Emergency'
};

const VERIFICATION_BADGE: Record<string, { label: string; color: string }> = {
  GOVERNMENT_VERIFIED: { label: 'Government Verified', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  CONTACT_VERIFIED: { label: 'Contact Verified', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  MANUALLY_VERIFIED: { label: 'Manually Verified', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  PENDING: { label: 'Pending Verification', color: 'bg-amber-100 text-amber-800 border-amber-200' }
};

export const NgoDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [ngo, setNgo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    ngoService.getNgoById(parseInt(id))
      .then((data) => setNgo(data.ngo))
      .catch(() => setError('Failed to load NGO details.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
        <p className="text-emerald-950/60 mt-3">Loading NGO details...</p>
      </div>
    );
  }

  if (error || !ngo) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="font-display font-bold text-2xl text-forest-dark">NGO Not Found</h2>
        <p className="text-emerald-950/60">{error || 'The NGO you are looking for does not exist.'}</p>
        <Link to="/ngos" className="text-primary hover:underline font-medium">← Back to Directory</Link>
      </div>
    );
  }

  const vBadge = VERIFICATION_BADGE[ngo.verification_status] || VERIFICATION_BADGE.PENDING;

  return (
    <div className="max-w-4xl mx-auto px-6 space-y-8">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-medium text-forest-dark/70 hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        {/* Header Card */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-forest-light/20 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="font-display font-extrabold text-3xl text-forest-dark">{ngo.ngo_name}</h1>
              <div className="flex items-center gap-2 text-emerald-950/60 text-sm">
                <MapPin className="w-4 h-4" />
                <span>{ngo.address}</span>
              </div>
              {ngo.cities && (
                <p className="text-xs text-emerald-950/50">{ngo.cities.city_name}, {ngo.cities.district}, {ngo.cities.state}</p>
              )}
            </div>
            <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold border ${vBadge.color}`}>
              <ShieldCheck className="w-3.5 h-3.5" /> {vBadge.label}
            </span>
          </div>

          {/* Description */}
          {ngo.description && (
            <div>
              <h3 className="font-display font-semibold text-sm text-forest-dark mb-2">About</h3>
              <p className="text-emerald-950/75 leading-relaxed">{ngo.description}</p>
            </div>
          )}

          {/* Services */}
          <div>
            <h3 className="font-display font-semibold text-sm text-forest-dark mb-2">Services Provided</h3>
            <div className="flex flex-wrap gap-2">
              {ngo.ngo_services?.map((s: any) => (
                <span key={s.service_id} className="px-3 py-1.5 rounded-full bg-bg-nature border border-forest-light/20 text-sm font-medium text-forest-dark">
                  {SERVICE_LABELS[s.service] || s.service}
                </span>
              ))}
              {(!ngo.ngo_services || ngo.ngo_services.length === 0) && (
                <span className="text-sm text-emerald-950/50">No services listed</span>
              )}
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ngo.contact_person && (
              <div className="flex items-center gap-3 text-sm text-forest-dark/80">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-emerald-950/50">Contact Person</p>
                  <p className="font-medium">{ngo.contact_person}</p>
                </div>
              </div>
            )}
            {ngo.phone_number && (
              <div className="flex items-center gap-3 text-sm text-forest-dark/80">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-emerald-950/50">Phone</p>
                  <p className="font-medium">{ngo.phone_number}</p>
                </div>
              </div>
            )}
            {ngo.email && (
              <div className="flex items-center gap-3 text-sm text-forest-dark/80">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-emerald-950/50">Email</p>
                  <p className="font-medium">{ngo.email}</p>
                </div>
              </div>
            )}
            {ngo.website && (
              <div className="flex items-center gap-3 text-sm text-forest-dark/80">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-emerald-950/50">Website</p>
                  <a href={ngo.website} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">{ngo.website}</a>
                </div>
              </div>
            )}
          </div>

          {/* Registration Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-forest-light/15">
            {ngo.registration_number && (
              <div>
                <p className="text-xs text-emerald-950/50">Registration Number</p>
                <p className="text-sm font-medium text-forest-dark">{ngo.registration_number}</p>
              </div>
            )}
            {ngo.ngo_darpan_id && (
              <div>
                <p className="text-xs text-emerald-950/50">NGO Darpan ID</p>
                <p className="text-sm font-medium text-forest-dark">{ngo.ngo_darpan_id}</p>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="pt-4 border-t border-forest-light/15">
            {isAuthenticated && user && (user.role === 'MIGRANT' || user.role === 'VOLUNTEER') ? (
              <Link
                to="/request-help"
                className="inline-flex items-center gap-2 bg-primary hover:bg-forest-dark text-white font-semibold px-8 py-3 rounded-xl shadow-md transition-all duration-300"
              >
                <Send className="w-4 h-4" /> Request Help from this NGO
              </Link>
            ) : !isAuthenticated ? (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-primary hover:bg-forest-dark text-white font-semibold px-8 py-3 rounded-xl shadow-md transition-all duration-300"
              >
                Login to Request Help
              </Link>
            ) : null}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
