import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Building2,
  FileText,
  Send,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  ShieldAlert,
  Info,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { ngoService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const ReportNgoPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();

  const preselectedNgoId = searchParams.get('ngoId');

  const [ngos, setNgos] = useState<any[]>([]);
  const [loadingNgos, setLoadingNgos] = useState(true);
  const [selectedNgoId, setSelectedNgoId] = useState<string>(preselectedNgoId || '');
  const [reportType, setReportType] = useState('FRAUD');
  const [reason, setReason] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch available NGOs to report
  useEffect(() => {
    let isMounted = true;
    const fetchNgos = async () => {
      try {
        setLoadingNgos(true);
        const data = await ngoService.getNgos({ limit: 50 });
        if (isMounted) {
          setNgos(data.ngos || []);
        }
      } catch (err) {
        console.error('Failed to load NGOs:', err);
      } finally {
        if (isMounted) setLoadingNgos(false);
      }
    };
    fetchNgos();
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedNgo = ngos.find((n) => n.ngo_id === parseInt(selectedNgoId, 10));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!isAuthenticated) {
      navigate('/login?redirect=/report-ngo');
      return;
    }

    if (user?.role !== 'MIGRANT') {
      setErrorMessage(t('report.migrantOnlyError', 'Only logged-in migrant workers can submit NGO reports.'));
      return;
    }

    if (!selectedNgoId) {
      setErrorMessage(t('report.selectNgoError', 'Please select an NGO from the list.'));
      return;
    }

    const trimmedReason = reason.trim();
    if (trimmedReason.length < 15) {
      setErrorMessage(
        t('report.minCharError', 'Please provide a detailed explanation of at least 15 characters.')
      );
      return;
    }

    setSubmitting(true);
    try {
      // Build explanation payload including category & optional evidence notes
      const fullExplanation = `[Category: ${reportType}]\n${trimmedReason}${
        evidenceNotes.trim() ? `\n\nSupporting Details/Evidence:\n${evidenceNotes.trim()}` : ''
      }`;

      const res = await ngoService.reportNgo(parseInt(selectedNgoId, 10), fullExplanation);
      setSuccessData(res.report || { report_id: 'SUBMITTED' });
    } catch (err: any) {
      const apiErr = err.response?.data?.error || t('report.submitFailed', 'Failed to submit report. Please try again.');
      setErrorMessage(apiErr);
    } finally {
      setSubmitting(false);
    }
  };

  if (successData) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 border border-forest-light/30 shadow-xl text-center space-y-6"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="font-display font-bold text-2xl text-forest-dark">
              {t('report.reportSubmitted', 'Case Reported to Admin')}
            </h2>
            <p className="text-sm text-emerald-950/70 max-w-md mx-auto">
              {t(
                'report.reportSubmittedDesc',
                'Your incident report has been securely dispatched to the Sahay Administrator console. Our audit team will review the details and initiate appropriate verification or regulatory actions.'
              )}
            </p>
          </div>

          {selectedNgo && (
            <div className="bg-bg-nature rounded-2xl p-4 border border-forest-light/20 text-left text-xs space-y-1.5">
              <div className="font-bold text-forest-dark flex items-center gap-1.5 text-sm">
                <Building2 className="w-4 h-4 text-primary" /> {selectedNgo.ngo_name}
              </div>
              <p className="text-emerald-950/70">
                <strong>{t('report.reportedCategory', 'Violation Type')}:</strong> {reportType}
              </p>
              <p className="text-emerald-950/70">
                <strong>{t('report.status', 'Status')}:</strong>{' '}
                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                  PENDING ADMIN REVIEW
                </span>
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => {
                setSuccessData(null);
                setReason('');
                setEvidenceNotes('');
              }}
              className="px-5 py-2.5 rounded-xl border border-forest-light/40 text-forest-dark text-xs font-semibold hover:bg-forest-light/20 transition-all"
            >
              {t('report.submitAnother', 'Submit Another Report')}
            </button>
            <Link
              to="/ngos"
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-forest-dark text-white text-xs font-bold transition-all shadow-sm"
            >
              {t('report.returnDirectory', 'Return to NGO Directory')}
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Link
          to="/ngos"
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-950/60 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {t('report.backToNgos', 'Back to NGOs')}
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shadow-sm">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl md:text-3xl text-forest-dark">
              {t('report.pageTitle', 'Report an NGO for Fraud or Misconduct')}
            </h1>
            <p className="text-xs md:text-sm text-emerald-950/65">
              {t(
                'report.pageSubtitle',
                'Help safeguard migrant workers and community members. Reports are investigated directly by Sahay administrators.'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Notice Card */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex gap-3 items-start text-xs text-amber-900 leading-relaxed shadow-xs">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-950">
            {t('report.disclaimerTitle', 'Confidential Administrator Escalation')}
          </p>
          <p className="mt-0.5 text-amber-900/80">
            {t(
              'report.disclaimerDesc',
              'Please provide truthful, factual information. Your identity is kept confidential from the reported NGO and only accessible to verified Sahay compliance administrators.'
            )}
          </p>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 md:p-8 border border-forest-light/30 shadow-md space-y-6">
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. Select NGO */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-forest-dark uppercase tracking-wider flex items-center gap-1.5" htmlFor="ngoSelect">
            <Building2 className="w-4 h-4 text-primary" /> {t('report.chooseNgo', 'Select NGO to Report')} <span className="text-rose-500">*</span>
          </label>

          {loadingNgos ? (
            <div className="flex items-center gap-2 text-xs text-emerald-950/50 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading registered NGOs...
            </div>
          ) : (
            <select
              id="ngoSelect"
              value={selectedNgoId}
              onChange={(e) => setSelectedNgoId(e.target.value)}
              className="w-full py-3 px-4 bg-bg-nature rounded-xl border border-forest-light/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-forest-dark"
              required
            >
              <option value="">{t('report.selectPlaceholder', '-- Select an NGO --')}</option>
              {ngos.map((n) => (
                <option key={n.ngo_id} value={n.ngo_id}>
                  {n.ngo_name} ({n.cities?.city_name || 'Gujarat'})
                </option>
              ))}
            </select>
          )}

          {selectedNgo && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-bg-nature/70 rounded-xl p-3 border border-forest-light/20 flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <div className="space-y-0.5">
                <span className="font-bold text-forest-dark">{selectedNgo.ngo_name}</span>
                <span className="text-emerald-950/60 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {selectedNgo.address || selectedNgo.cities?.city_name}
                </span>
              </div>
              <Link
                to={`/ngos/${selectedNgo.ngo_id}`}
                target="_blank"
                className="text-primary hover:underline font-semibold flex items-center gap-1"
              >
                {t('report.viewProfile', 'View NGO Profile')} <ExternalLink className="w-3 h-3" />
              </Link>
            </motion.div>
          )}
        </div>

        {/* 2. Violation Category */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-forest-dark uppercase tracking-wider block">
            {t('report.categoryLabel', 'Nature of Complaint / Violation')} <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { id: 'FRAUD', label: 'Financial / Charity Fraud', desc: 'Demanding illegal fees, embezzlement' },
              { id: 'MISCONDUCT', label: 'Misconduct / Harassment', desc: 'Abuse of power or mistreatment' },
              { id: 'FALSE_PROMISES', label: 'Non-delivery of Relief', desc: 'Promised aid or shelter never provided' },
              { id: 'FAKE_DOCUMENTS', label: 'Forged Documents / Registration', desc: 'Invalid NGO Darpan / trust claims' },
              { id: 'DISCRIMINATION', label: 'Discrimination / Exclusion', desc: 'Refusal of aid based on identity' },
              { id: 'OTHER', label: 'Other Serious Concern', desc: 'Other compliance violations' }
            ].map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => setReportType(cat.id)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  reportType === cat.id
                    ? 'border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/20 shadow-xs'
                    : 'border-forest-light/30 bg-bg-nature hover:border-forest-light/60'
                }`}
              >
                <span className={`text-xs font-bold ${reportType === cat.id ? 'text-rose-900' : 'text-forest-dark'}`}>
                  {cat.label}
                </span>
                <span className="text-[11px] text-emerald-950/60 mt-1 leading-tight">{cat.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Detailed Case Explanation */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-forest-dark uppercase tracking-wider flex items-center gap-1.5" htmlFor="reasonInput">
              <FileText className="w-4 h-4 text-primary" /> {t('report.explainCase', 'Explain the Case / Situation')} <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-emerald-950/50">Minimum 15 characters</span>
          </div>
          <textarea
            id="reasonInput"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={5}
            required
            placeholder={t(
              'report.explainPlaceholder',
              'Please provide clear dates, what was promised, what occurred, monetary amounts involved (if any), and names of representatives involved...'
            )}
            className="w-full py-3 px-4 bg-bg-nature rounded-xl border border-forest-light/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-forest-dark resize-y leading-relaxed"
          />
        </div>

        {/* 4. Optional Evidence or Supporting References */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-forest-dark uppercase tracking-wider flex items-center gap-1.5" htmlFor="evidenceInput">
            <Info className="w-4 h-4 text-emerald-950/50" /> {t('report.evidenceOptional', 'Reference Details or Evidence Notes (Optional)')}
          </label>
          <input
            id="evidenceInput"
            type="text"
            value={evidenceNotes}
            onChange={(e) => setEvidenceNotes(e.target.value)}
            placeholder={t(
              'report.evidencePlaceholder',
              'e.g. Transaction receipt reference, WhatsApp chat screenshots, police complaint #...'
            )}
            className="w-full py-2.5 px-4 bg-bg-nature rounded-xl border border-forest-light/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-xs text-forest-dark"
          />
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-forest-light/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-emerald-950/60 max-w-sm">
            {t(
              'report.submissionNote',
              'By submitting, this complaint will be assigned a tracking case in the Admin Console for dispute resolution.'
            )}
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> {t('report.submitting', 'Submitting to Admin...')}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> {t('report.submitButton', 'Submit Report to Admin')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

