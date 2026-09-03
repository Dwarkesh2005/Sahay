import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Upload,
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Clock,
  ShieldCheck,
  Loader2,
  Trash2,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
  FileCheck2,
} from 'lucide-react';
import { verificationService, ngoService } from '../services/api';
import type {
  NGODocVerification,
  NGOVerificationDocument,
  DocumentType,
  NGO
} from '../types';

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  REGISTRATION_CERTIFICATE: 'Registration Certificate',
  PAN_DOCUMENT: 'PAN Document',
  TRUST_REGISTRATION: 'Trust Registration Deed',
  SOCIETY_REGISTRATION: 'Society Registration Certificate',
  SECTION_8_CERTIFICATE: 'Section 8 Company Certificate',
  TWELVE_A_CERTIFICATE: '12A Tax Exemption Certificate',
  EIGHTY_G_CERTIFICATE: '80G Certificate',
  ADDRESS_PROOF: 'Official Address Proof (Electricity/Lease/Govt bill)',
  AUTHORIZED_REPRESENTATIVE_PROOF: 'Authorized Representative ID Proof',
  OTHER: 'Other Supporting Document',
};

export const NgoVerificationPage: React.FC = () => {
  const [data, setData] = useState<{ ngo: NGO; verification: NGODocVerification } | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('REGISTRATION_CERTIFICATE');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit NGO PAN if not set
  const [panInput, setPanInput] = useState('');
  const [savingPan, setSavingPan] = useState(false);

  const fetchVerification = async () => {
    try {
      const res = await verificationService.getMyVerification();
      setData(res);
      if (res.ngo?.pan) {
        setPanInput(res.ngo.pan);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to load verification status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerification();
  }, []);

  // Polling if in PROCESSING status
  useEffect(() => {
    if (data?.verification?.status === 'PROCESSING') {
      const interval = setInterval(() => {
        fetchVerification();
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [data?.verification?.status]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('File size exceeds 10MB limit.');
        return;
      }
      setSelectedFile(file);
      setErrorMsg('');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('document_type', selectedDocType);

    try {
      await verificationService.uploadDocument(formData);
      setSuccessMsg('Document uploaded successfully.');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchVerification();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: number) => {
    if (!confirm('Are you sure you want to remove this document?')) return;
    try {
      await verificationService.deleteDocument(docId);
      fetchVerification();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete document.');
    }
  };

  const handleProcess = async () => {
    setProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await verificationService.processVerification();
      setSuccessMsg('Document screening started. Analyzing fields...');
      fetchVerification();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to start document processing.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSavePan = async () => {
    if (!panInput || panInput.length !== 10) {
      alert('PAN must be 10 alphanumeric characters (e.g. ABCDE1234F).');
      return;
    }
    setSavingPan(true);
    try {
      await ngoService.updateMyProfile({ pan: panInput.toUpperCase().trim() });
      fetchVerification();
      alert('PAN updated successfully.');
    } catch {
      alert('Failed to update PAN.');
    } finally {
      setSavingPan(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const verif = data?.verification;
  const ngo = data?.ngo;
  const documents = verif?.documents || [];
  const fields = verif?.fields || [];
  const issues = verif?.issues || [];

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Administrative Verification: Approved
          </div>
        );
      case 'NEEDS_ADMIN_REVIEW':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold">
            <Clock className="w-4 h-4 text-blue-600" /> Document Consistent: Under Admin Review
          </div>
        );
      case 'NEEDS_CORRECTION':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-600" /> Action Required: Correction Requested
          </div>
        );
      case 'PROCESSING':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold">
            <Loader2 className="w-4 h-4 text-purple-600 animate-spin" /> OCR & Document Processing in Progress
          </div>
        );
      case 'REJECTED':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-800 border border-gray-300 text-xs font-bold">
            <XCircle className="w-4 h-4 text-gray-600" /> Verification Rejected
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold">
            <FileText className="w-4 h-4 text-amber-600" /> Documents Required
          </div>
        );
    }
  };

  const getMatchIcon = (res: string) => {
    switch (res) {
      case 'MATCH':
        return <span className="inline-flex items-center gap-1 text-emerald-700 font-bold"><CheckCircle className="w-4 h-4" /> Match</span>;
      case 'PARTIAL_MATCH':
        return <span className="inline-flex items-center gap-1 text-amber-700 font-bold"><Info className="w-4 h-4" /> ~ Partial Match</span>;
      case 'MISMATCH':
        return <span className="inline-flex items-center gap-1 text-rose-700 font-bold"><XCircle className="w-4 h-4" /> ✗ Mismatch</span>;
      case 'LOW_CONFIDENCE':
        return <span className="inline-flex items-center gap-1 text-yellow-700 font-bold"><AlertTriangle className="w-4 h-4" /> ⚠ Low Confidence</span>;
      case 'NOT_FOUND':
        return <span className="inline-flex items-center gap-1 text-gray-500 font-medium"><HelpCircle className="w-4 h-4" /> ? Not Found</span>;
      default:
        return <span className="text-gray-400 text-xs">N/A</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-forest-light/30 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-2xl md:text-3xl text-forest-dark">
              NGO Document Verification
            </h1>
            <p className="text-emerald-950/70 text-sm mt-1">
              Upload organization registration and tax certificates for automated screening and administrator review.
            </p>
          </div>
          <div>{getStatusBadge(verif?.status)}</div>
        </div>

        {/* Status Messages */}
        {verif?.status === 'APPROVED' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-900 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Verified Organization</p>
              <p className="text-xs text-emerald-800 mt-0.5">
                Your submitted documents were reviewed and approved by an authorized administrator. Your profile now features the Verified NGO badge.
              </p>
            </div>
          </div>
        )}

        {verif?.status === 'NEEDS_CORRECTION' && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm text-rose-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-800">
              <AlertTriangle className="w-5 h-5 text-rose-600" /> Action Required: Admin Feedback
            </div>
            <p className="text-xs bg-white/70 p-3 rounded-xl border border-rose-100 font-mono text-rose-900">
              {verif.admin_notes || 'Please correct mismatched details or upload clearer documents.'}
            </p>
            <p className="text-xs text-rose-700">
              Review the mismatch details below, update your information or upload a corrected document, and re-submit.
            </p>
          </div>
        )}

        {verif?.status === 'NEEDS_ADMIN_REVIEW' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-900 flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Document Information Under Review</p>
              <p className="text-xs text-blue-800 mt-0.5">
                Automated document consistency screening completed. An administrator is reviewing the evidence before granting final verification.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Step 1: NGO Organization Data Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-forest-light/20 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-forest-light/15 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-forest-dark">Organization Profile Data</h2>
              <p className="text-xs text-emerald-950/60">This information will be compared against uploaded documents.</p>
            </div>
          </div>
          <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
            ✓ Submitted
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm pt-2">
          <div className="bg-bg-nature p-3.5 rounded-2xl border border-forest-light/20">
            <p className="text-xs text-emerald-950/50 font-medium">Organization Name</p>
            <p className="font-semibold text-forest-dark mt-0.5">{ngo?.ngo_name || 'Not provided'}</p>
          </div>
          <div className="bg-bg-nature p-3.5 rounded-2xl border border-forest-light/20">
            <p className="text-xs text-emerald-950/50 font-medium">Registration Number</p>
            <p className="font-semibold text-forest-dark mt-0.5">{ngo?.registration_number || 'Not provided'}</p>
          </div>
          <div className="bg-bg-nature p-3.5 rounded-2xl border border-forest-light/20">
            <p className="text-xs text-emerald-950/50 font-medium">Permanent Account Number (PAN)</p>
            {ngo?.pan ? (
              <p className="font-semibold text-forest-dark mt-0.5">{ngo.pan}</p>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. ABCDE1234F"
                  value={panInput}
                  onChange={(e) => setPanInput(e.target.value.toUpperCase())}
                  className="w-32 px-2 py-1 bg-white border border-forest-light/40 rounded-lg text-xs font-mono uppercase"
                />
                <button
                  onClick={handleSavePan}
                  disabled={savingPan}
                  className="px-2 py-1 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-forest-dark transition-all"
                >
                  {savingPan ? '...' : 'Save'}
                </button>
              </div>
            )}
          </div>
          <div className="bg-bg-nature p-3.5 rounded-2xl border border-forest-light/20 md:col-span-2">
            <p className="text-xs text-emerald-950/50 font-medium">Registered Address</p>
            <p className="font-semibold text-forest-dark mt-0.5">
              {ngo?.address}, {ngo?.cities?.city_name || ''}
            </p>
          </div>
          <div className="bg-bg-nature p-3.5 rounded-2xl border border-forest-light/20">
            <p className="text-xs text-emerald-950/50 font-medium">Contact Person & Phone</p>
            <p className="font-semibold text-forest-dark mt-0.5">
              {ngo?.contact_person} ({ngo?.phone_number || 'N/A'})
            </p>
          </div>
        </div>
      </div>

      {/* Step 2: Upload Documents */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-forest-light/20 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-forest-light/15 pb-4">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
            2
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-forest-dark">Upload Official Verification Documents</h2>
            <p className="text-xs text-emerald-950/60">
              Documents are stored securely in private storage and analyzed locally. Supported: PDF, JPG, PNG (Max 10MB).
            </p>
          </div>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-bg-nature p-4 md:p-6 rounded-2xl border border-forest-light/30">
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-xs font-bold text-forest-dark block">Document Type</label>
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value as DocumentType)}
              className="w-full px-3 py-2.5 bg-white rounded-xl border border-forest-light/40 text-sm focus:border-primary outline-none"
            >
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-5 space-y-1.5">
            <label className="text-xs font-bold text-forest-dark block">Select File (PDF, PNG, JPG)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="w-full text-xs text-forest-dark file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-forest-dark cursor-pointer"
            />
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-forest-dark text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload Document
            </button>
          </div>
        </form>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" /> {successMsg}
          </div>
        )}

        {/* Uploaded Documents List */}
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm text-forest-dark">
            Uploaded Documents ({documents.length})
          </h3>
          {documents.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-forest-light/40 rounded-2xl p-6">
              <FileText className="w-8 h-8 text-forest-dark/20 mx-auto mb-2" />
              <p className="text-xs text-emerald-950/60">No verification documents uploaded yet.</p>
              <p className="text-[11px] text-emerald-950/40 mt-1">Please upload at least your Registration Certificate and PAN document.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documents.map((doc: NGOVerificationDocument) => (
                <div
                  key={doc.document_id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white border border-forest-light/30 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-forest-light/30 text-primary flex items-center justify-center font-bold">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-forest-dark">
                        {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                      </p>
                      <p className="text-[11px] text-emerald-950/50 truncate max-w-[180px]">
                        {doc.original_filename} (v{doc.version})
                      </p>
                      {doc.quality_issues && (
                        <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-3 h-3" /> {doc.quality_issues}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      doc.status === 'PROCESSED' ? 'bg-emerald-100 text-emerald-800' :
                      doc.status === 'PROCESSING' ? 'bg-purple-100 text-purple-800 animate-pulse' :
                      doc.status === 'FAILED' ? 'bg-rose-100 text-rose-800' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {doc.status}
                    </span>
                    <button
                      onClick={() => handleDelete(doc.document_id)}
                      className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-all"
                      title="Remove document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Process Button */}
        {documents.length > 0 && verif?.status !== 'APPROVED' && (
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
            <div className="text-xs text-emerald-950/70">
              Ready to submit? The system will extract text, normalize data, and compare details against your profile.
            </div>
            <button
              onClick={handleProcess}
              disabled={processing || verif?.status === 'PROCESSING'}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-forest-dark text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 shrink-0"
            >
              {processing || verif?.status === 'PROCESSING' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing Documents...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" /> Start Automated Screening
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Step 3: Screening Report */}
      {fields.length > 0 && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-forest-light/20 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-forest-light/15 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-forest-dark">Document Consistency Report</h2>
                <p className="text-xs text-emerald-950/60">Field-level comparison between submitted profile and uploaded documents.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] text-emerald-950/50 uppercase tracking-wider font-semibold">Consistency Score</p>
                <p className="font-display font-bold text-xl text-primary">{verif?.screening_score ?? 0}%</p>
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 flex items-center justify-center text-xs font-bold text-forest-dark">
                {verif?.screening_score ?? 0}%
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-bg-nature border-b border-forest-light/20">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">Field</th>
                  <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">Submitted by NGO</th>
                  <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">Extracted from Document</th>
                  <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">Result</th>
                  <th className="text-left px-4 py-3 font-semibold text-forest-dark/80">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest-light/10">
                {fields.map((f: any) => (
                  <tr key={f.field_id} className="hover:bg-bg-nature/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-forest-dark capitalize">
                      {f.field_name.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-emerald-950/70 font-mono text-[11px]">
                      {f.submitted_value || <span className="text-gray-400 italic">None</span>}
                    </td>
                    <td className="px-4 py-3 text-emerald-950/70 font-mono text-[11px]">
                      {f.extracted_value || <span className="text-gray-400 italic">Not found</span>}
                    </td>
                    <td className="px-4 py-3">{getMatchIcon(f.match_result)}</td>
                    <td className="px-4 py-3 text-emerald-950/60 max-w-xs">{f.extraction_notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detected Issues */}
          {issues.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Items Requiring Attention ({issues.length})
              </p>
              <ul className="space-y-1.5 text-xs text-amber-900">
                {issues.map((iss: any) => (
                  <li key={iss.issue_id} className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>{iss.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Expandable Audit Log */}
      {verif?.audit_logs && verif.audit_logs.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-forest-light/20 shadow-sm">
          <button
            onClick={() => setShowAuditLogs(!showAuditLogs)}
            className="w-full flex items-center justify-between text-left"
          >
            <div>
              <h3 className="font-display font-bold text-base text-forest-dark">Verification Audit Trail</h3>
              <p className="text-xs text-emerald-950/50">Chronological history of verification actions and reviews.</p>
            </div>
            {showAuditLogs ? <ChevronUp className="w-5 h-5 text-forest-dark/50" /> : <ChevronDown className="w-5 h-5 text-forest-dark/50" />}
          </button>

          <AnimatePresence>
            {showAuditLogs && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-4 space-y-2.5 overflow-hidden"
              >
                {verif.audit_logs.map((log: any) => (
                  <div key={log.log_id} className="text-xs p-3 rounded-xl bg-bg-nature border border-forest-light/20 flex items-start justify-between">
                    <div>
                      <p className="font-bold text-forest-dark">{log.action}</p>
                      <p className="text-emerald-950/70 mt-0.5">{log.reason}</p>
                    </div>
                    <span className="text-[10px] text-emerald-950/40 shrink-0 ml-4">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
