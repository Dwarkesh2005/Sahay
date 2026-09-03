import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  Loader2,
  ArrowLeft,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { adminService } from '../services/api';
import type { NGODocVerification, NGOVerificationDocument, NGOVerificationField } from '../types';

export const AdminVerificationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [verif, setVerif] = useState<NGODocVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Modals for actions
  const [modalAction, setModalAction] = useState<'APPROVE' | 'REJECT' | 'REQUEST_CORRECTION' | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Document preview url state
  const [viewingDocId, setViewingDocId] = useState<number | null>(null);

  const fetchDetail = async () => {
    if (!id) return;
    try {
      const res = await adminService.getVerificationById(parseInt(id, 10));
      setVerif(res.verification);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to load verification case details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenDoc = async (docId: number) => {
    if (!id) return;
    setViewingDocId(docId);
    try {
      const res = await adminService.getDocumentSignedUrl(parseInt(id, 10), docId);
      if (res.signedUrl) {
        window.open(res.signedUrl, '_blank');
      }
    } catch {
      alert('Failed to generate secure viewing link.');
    } finally {
      setViewingDocId(null);
    }
  };

  const handleReprocess = async () => {
    if (!id) return;
    if (!confirm('Re-run automated OCR and field matching for this NGO?')) return;
    setLoading(true);
    try {
      await adminService.reprocessVerification(parseInt(id, 10));
      fetchDetail();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reprocess.');
      setLoading(false);
    }
  };

  const handleConfirmDecision = async () => {
    if (!id) return;
    if ((modalAction === 'REJECT' || modalAction === 'REQUEST_CORRECTION') && (!reasonInput || reasonInput.trim().length < 5)) {
      alert('A detailed explanation is mandatory (at least 5 characters).');
      return;
    }

    setSubmittingAction(true);
    try {
      const verifId = parseInt(id, 10);
      if (modalAction === 'APPROVE') {
        await adminService.approveVerification(verifId, reasonInput || 'Approved by administrator after reviewing verification evidence.');
      } else if (modalAction === 'REJECT') {
        await adminService.rejectVerification(verifId, reasonInput.trim());
      } else if (modalAction === 'REQUEST_CORRECTION') {
        await adminService.requestCorrection(verifId, reasonInput.trim());
      }
      setModalAction(null);
      setReasonInput('');
      fetchDetail();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record decision.');
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!verif) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-forest-dark">Verification Case Not Found</h2>
        <p className="text-sm text-emerald-950/60">{errorMsg || 'Could not locate the requested verification record.'}</p>
        <button
          onClick={() => navigate('/admin')}
          className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl"
        >
          Return to Admin Dashboard
        </button>
      </div>
    );
  }

  const ngo = verif.ngos;
  const docs = verif.documents || [];
  const fields = verif.fields || [];
  const issues = verif.issues || [];
  const auditLogs = verif.audit_logs || [];

  const getMatchIcon = (res: string) => {
    switch (res) {
      case 'MATCH':
        return <span className="inline-flex items-center gap-1 text-emerald-700 font-bold"><CheckCircle className="w-4 h-4" /> Match</span>;
      case 'PARTIAL_MATCH':
        return <span className="inline-flex items-center gap-1 text-amber-700 font-bold"><AlertTriangle className="w-4 h-4" /> ~ Partial</span>;
      case 'MISMATCH':
        return <span className="inline-flex items-center gap-1 text-rose-700 font-bold"><XCircle className="w-4 h-4" /> ✗ Mismatch</span>;
      case 'LOW_CONFIDENCE':
        return <span className="inline-flex items-center gap-1 text-yellow-700 font-bold"><AlertTriangle className="w-4 h-4" /> ⚠ Low Confidence</span>;
      case 'NOT_FOUND':
        return <span className="inline-flex items-center gap-1 text-gray-400 font-medium"><HelpCircle className="w-4 h-4" /> ? Not Found</span>;
      default:
        return <span className="text-gray-400">N/A</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Back navigation & header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-forest-dark mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Admin Console
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display font-extrabold text-2xl md:text-3xl text-forest-dark">
              {ngo?.ngo_name || 'NGO Verification Review'}
            </h1>
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
              verif.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
              verif.status === 'NEEDS_CORRECTION' ? 'bg-amber-100 text-amber-800 border-amber-300' :
              verif.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 border-rose-300' :
              'bg-blue-100 text-blue-800 border-blue-300'
            }`}>
              Status: {verif.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-xs text-emerald-950/60 mt-1">
            Submitted: {verif.submitted_at ? new Date(verif.submitted_at).toLocaleString() : 'N/A'} • Case #{verif.verification_id}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleReprocess}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-forest-light/40 text-forest-dark hover:bg-bg-nature text-xs font-semibold transition-all"
            title="Re-run OCR and matching"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-Screen
          </button>

          {verif.status !== 'APPROVED' && (
            <button
              onClick={() => { setModalAction('APPROVE'); setReasonInput(''); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all"
            >
              <ShieldCheck className="w-4 h-4" /> Approve NGO
            </button>
          )}

          <button
            onClick={() => { setModalAction('REQUEST_CORRECTION'); setReasonInput(''); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all"
          >
            <Clock className="w-4 h-4" /> Request Correction
          </button>

          <button
            onClick={() => { setModalAction('REJECT'); setReasonInput(''); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all"
          >
            <ShieldAlert className="w-4 h-4" /> Reject Case
          </button>
        </div>
      </div>

      {/* Grid: Left NGO Info + Score, Right Evidence & Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: NGO Profile & Document Consistency Card */}
        <div className="space-y-6">
          {/* Consistency Card */}
          <div className="bg-white rounded-3xl p-6 border border-forest-light/20 shadow-sm space-y-4 text-center">
            <p className="text-xs text-emerald-950/50 uppercase tracking-wider font-semibold">
              Automated Document Consistency
            </p>
            <div className="relative inline-flex items-center justify-center">
              <div className="w-28 h-28 rounded-full border-8 border-forest-light/30 flex items-center justify-center">
                <span className="font-display font-extrabold text-3xl text-primary">
                  {verif.screening_score ?? 0}%
                </span>
              </div>
            </div>
            <p className="text-xs text-emerald-950/70 font-medium">
              {verif.screening_score && verif.screening_score >= 90
                ? 'Strong document consistency with NGO profile.'
                : verif.screening_score && verif.screening_score >= 70
                ? 'Good consistency with minor discrepancies.'
                : 'Attention needed: significant differences detected.'}
            </p>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-forest-light/15 text-xs">
              <div className="p-2 bg-emerald-50 rounded-xl">
                <p className="font-bold text-emerald-700">{verif.total_matches}</p>
                <p className="text-[10px] text-emerald-900/60">Matches</p>
              </div>
              <div className="p-2 bg-rose-50 rounded-xl">
                <p className="font-bold text-rose-700">{verif.total_mismatches}</p>
                <p className="text-[10px] text-rose-900/60">Mismatches</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-xl">
                <p className="font-bold text-gray-700">{verif.total_not_found}</p>
                <p className="text-[10px] text-gray-900/60">Missing</p>
              </div>
            </div>
          </div>

          {/* Submitted NGO Details */}
          <div className="bg-white rounded-3xl p-6 border border-forest-light/20 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-base text-forest-dark border-b border-forest-light/15 pb-2">
              Submitted NGO Information
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-emerald-950/50 font-medium">Organization Name</p>
                <p className="font-semibold text-forest-dark text-sm mt-0.5">{ngo?.ngo_name}</p>
              </div>
              <div>
                <p className="text-emerald-950/50 font-medium">Registration Number</p>
                <p className="font-mono font-semibold text-forest-dark mt-0.5">{ngo?.registration_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-emerald-950/50 font-medium">Permanent Account Number (PAN)</p>
                <p className="font-mono font-semibold text-forest-dark mt-0.5">{ngo?.pan || 'N/A'}</p>
              </div>
              <div>
                <p className="text-emerald-950/50 font-medium">Address & City</p>
                <p className="font-medium text-forest-dark mt-0.5">
                  {ngo?.address}, {ngo?.cities?.city_name || ''}
                </p>
              </div>
              <div>
                <p className="text-emerald-950/50 font-medium">Contact Person</p>
                <p className="font-medium text-forest-dark mt-0.5">
                  {ngo?.contact_person} ({ngo?.phone_number || 'N/A'})
                </p>
              </div>
              <div>
                <p className="text-emerald-950/50 font-medium">Email</p>
                <p className="font-medium text-forest-dark mt-0.5">{ngo?.email}</p>
              </div>
            </div>
          </div>

          {/* Flagged Issues */}
          {issues.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-rose-200 shadow-sm space-y-3">
              <h3 className="font-display font-bold text-base text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" /> Flagged Issues ({issues.length})
              </h3>
              <div className="space-y-2 text-xs">
                {issues.map((iss: any) => (
                  <div key={iss.issue_id} className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-rose-900">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-200 text-rose-800 mr-2 uppercase">
                      {iss.severity}
                    </span>
                    <span className="font-medium">{iss.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Uploaded Documents & Field Comparison Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Uploaded Documents List */}
          <div className="bg-white rounded-3xl p-6 border border-forest-light/20 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-base text-forest-dark border-b border-forest-light/15 pb-2">
              Verification Documents ({docs.length})
            </h3>
            {docs.length === 0 ? (
              <p className="text-xs text-emerald-950/50 py-4 text-center">No documents have been uploaded.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {docs.map((d: NGOVerificationDocument) => (
                  <div
                    key={d.document_id}
                    className="p-3.5 bg-bg-nature rounded-2xl border border-forest-light/30 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-forest-dark capitalize">
                        {d.document_type.replace(/_/g, ' ').toLowerCase()}
                      </p>
                      <p className="text-[11px] text-emerald-950/60 truncate max-w-[170px] mt-0.5">
                        {d.original_filename} (v{d.version})
                      </p>
                      <p className="text-[10px] text-emerald-950/40">
                        OCR Confidence: {d.ocr_confidence ? `${Math.round(d.ocr_confidence * 100)}%` : 'Pending'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleOpenDoc(d.document_id)}
                      disabled={viewingDocId === d.document_id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-forest-dark transition-all disabled:opacity-50"
                    >
                      {viewingDocId === d.document_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />} View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detailed Field Comparison Table */}
          <div className="bg-white rounded-3xl p-6 border border-forest-light/20 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-base text-forest-dark border-b border-forest-light/15 pb-2">
              Side-by-Side Information Comparison
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-bg-nature border-b border-forest-light/20">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-semibold text-forest-dark/80">Field</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-forest-dark/80">Submitted by NGO</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-forest-dark/80">Extracted from Document</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-forest-dark/80">Result</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-forest-dark/80">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest-light/10">
                  {fields.map((f: NGOVerificationField) => (
                    <tr key={f.field_id} className="hover:bg-bg-nature/40 transition-colors">
                      <td className="px-3 py-3 font-semibold text-forest-dark capitalize">
                        {f.field_name.replace(/_/g, ' ')}
                      </td>
                      <td className="px-3 py-3 text-emerald-950/70 font-mono text-[11px] max-w-[140px] truncate">
                        {f.submitted_value || <span className="text-gray-400 italic">None</span>}
                      </td>
                      <td className="px-3 py-3 text-emerald-950/70 font-mono text-[11px] max-w-[140px] truncate">
                        {f.extracted_value || <span className="text-gray-400 italic">Not found</span>}
                      </td>
                      <td className="px-3 py-3">{getMatchIcon(f.match_result)}</td>
                      <td className="px-3 py-3 text-emerald-950/60 font-mono">
                        {f.confidence ? `${Math.round(f.confidence * 100)}%` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Trail Timeline */}
          {auditLogs.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-forest-light/20 shadow-sm space-y-3">
              <h3 className="font-display font-bold text-base text-forest-dark border-b border-forest-light/15 pb-2">
                Verification Audit History
              </h3>
              <div className="space-y-2 text-xs">
                {auditLogs.map((log: any) => (
                  <div key={log.log_id} className="p-3 bg-bg-nature rounded-xl border border-forest-light/20 flex items-start justify-between">
                    <div>
                      <span className="font-bold text-forest-dark">{log.action}</span>
                      <p className="text-emerald-950/70 mt-0.5">{log.reason}</p>
                    </div>
                    <span className="text-[10px] text-emerald-950/40 shrink-0 ml-4">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Decision Confirmation Modal */}
      {modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-forest-light/20"
          >
            <h3 className="font-display font-bold text-lg text-forest-dark">
              {modalAction === 'APPROVE' && 'Approve NGO Verification'}
              {modalAction === 'REJECT' && 'Reject NGO Verification'}
              {modalAction === 'REQUEST_CORRECTION' && 'Request Document Correction'}
            </h3>

            <p className="text-xs text-emerald-950/70">
              {modalAction === 'APPROVE' &&
                'This will grant the NGO the official Verified badge. Please enter any approval remarks or certificate reference numbers.'}
              {modalAction === 'REJECT' &&
                'Please specify the reason for rejection. This explanation will be permanently recorded in the audit log.'}
              {modalAction === 'REQUEST_CORRECTION' &&
                'Please clearly specify which document or fields need correction so the NGO can re-upload the required evidence.'}
            </p>

            <textarea
              rows={4}
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder={
                modalAction === 'APPROVE'
                  ? 'Optional approval remarks...'
                  : 'Specify reason (mandatory, at least 5 characters)...'
              }
              className="w-full p-3 bg-bg-nature border border-forest-light/40 rounded-xl text-xs outline-none focus:border-primary resize-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setModalAction(null)}
                disabled={submittingAction}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-forest-dark hover:bg-bg-nature"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDecision}
                disabled={submittingAction}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 ${
                  modalAction === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  modalAction === 'REJECT' ? 'bg-rose-600 hover:bg-rose-700' :
                  'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {submittingAction ? 'Recording Decision...' : 'Confirm Decision'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
