import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { MapPin, ShieldCheck, Phone, Mail, Globe, ArrowLeft, Loader2, AlertCircle, Send, AlertTriangle } from 'lucide-react';
import { ngoService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const NgoDetailPage: React.FC = () => {
  const { t } = useTranslation();
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
      .catch(() => setError(t('errors.failedToLoad', 'Failed to load NGO details.')))
      .finally(() => setLoading(false));
  }, [id, t]);

  if (loading) {
    return (
      <div className="text-center py-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
        <p className="text-emerald-950/60 mt-3">{t('common.loading', 'Loading NGO details...')}</p>
      </div>
    );
  }

  if (error || !ngo) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="font-display font-bold text-2xl text-forest-dark">
          {t('errors.notFound', 'NGO Not Found')}
        </h2>
        <p className="text-emerald-950/60">{error || t('errors.notFound', 'The NGO you are looking for does not exist.')}</p>
        <Link to="/ngos" className="text-primary hover:underline font-medium">
          ← {t('common.back', 'Back to Directory')}
        </Link>
      </div>
    );
  }

  const isVerified = ngo.verification_status && ngo.verification_status !== 'PENDING';

  return (
    <div className="max-w-4xl mx-auto px-6 space-y-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-medium text-forest-dark/70 hover:text-primary transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> {t('common.back', 'Back')}
      </button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        {/* Header Card */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-forest-light/20 space-y-6 text-left">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="font-display font-extrabold text-3xl text-forest-dark">{ngo.ngo_name}</h1>
              <div className="flex items-center gap-2 text-emerald-950/60 text-sm">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span>{ngo.address}</span>
              </div>
              {ngo.cities && (
                <p className="text-xs text-emerald-950/50">
                  {ngo.cities.city_name}, {ngo.cities.district}, {ngo.cities.state}
                </p>
              )}
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold border ${
                isVerified
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border-amber-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {isVerified ? t('ngo.verifiedBadge', 'Govt Verified') : t('ngo.unverified', 'Pending Review')}
            </span>
          </div>

          {/* Description */}
          {ngo.description && (
            <div>
              <h3 className="font-display font-semibold text-sm text-forest-dark mb-2">
                {t('common.details', 'About')}
              </h3>
              <p className="text-emerald-950/75 leading-relaxed">{ngo.description}</p>
            </div>
          )}

          {/* Services */}
          <div>
            <h3 className="font-display font-semibold text-sm text-forest-dark mb-2">
              {t('ngo.servicesOffered', 'Services Provided')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {ngo.ngo_services?.map((s: any) => (
                <span
                  key={s.service_id}
                  className="px-3 py-1.5 rounded-full bg-bg-nature border border-forest-light/20 text-sm font-medium text-forest-dark"
                >
                  {String(t(`categories.${s.service}`, s.service))}
                </span>
              ))}
              {(!ngo.ngo_services || ngo.ngo_services.length === 0) && (
                <span className="text-sm text-emerald-950/50">
                  {t('common.none', 'No services listed')}
                </span>
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
                  <p className="text-xs text-emerald-950/50">{t('ngo.contactPerson', 'Contact Person')}</p>
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
                  <p className="text-xs text-emerald-950/50">{t('ngo.phone', 'Phone')}</p>
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
                  <p className="text-xs text-emerald-950/50">{t('ngo.email', 'Email')}</p>
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
                  <p className="text-xs text-emerald-950/50">{t('ngo.website', 'Website')}</p>
                  <a
                    href={ngo.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    {ngo.website}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Registration Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-forest-light/15">
            {ngo.registration_number && (
              <div>
                <p className="text-xs text-emerald-950/50">{t('ngo.regNo', 'Registration Number')}</p>
                <p className="text-sm font-medium text-forest-dark">{ngo.registration_number}</p>
              </div>
            )}
            {ngo.ngo_darpan_id && (
              <div>
                <p className="text-xs text-emerald-950/50">{t('ngo.darpanId', 'NGO Darpan ID')}</p>
                <p className="text-sm font-medium text-forest-dark">{ngo.ngo_darpan_id}</p>
              </div>
            )}
          </div>

          {/* CTA & Actions */}
          <div className="pt-4 border-t border-forest-light/15 flex flex-wrap items-center justify-between gap-4">
            {isAuthenticated && user && (user.role === 'MIGRANT' || user.role === 'VOLUNTEER') ? (
              <Link
                to="/request-help"
                className="inline-flex items-center gap-2 bg-primary hover:bg-forest-dark text-white font-semibold px-8 py-3 rounded-xl shadow-md transition-all duration-300"
              >
                <Send className="w-4 h-4" /> {t('request.requestAssistance', 'Request Help from this NGO')}
              </Link>
            ) : !isAuthenticated ? (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-primary hover:bg-forest-dark text-white font-semibold px-8 py-3 rounded-xl shadow-md transition-all duration-300"
              >
                {t('navbar.login', 'Login to Request Help')}
              </Link>
            ) : <div />}

            {isAuthenticated && user?.role === 'MIGRANT' && (
              <Link
                to={`/report-ngo?ngoId=${ngo.ngo_id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/70 text-rose-700 text-xs font-semibold transition-all"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                {t('ngo.reportThisNgo', 'Report Fraud / Misconduct')}
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
