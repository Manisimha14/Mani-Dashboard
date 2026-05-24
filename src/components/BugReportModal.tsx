import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useSoundFX } from '../hooks/useSoundFX';
import { getAppVersion } from '../lib/appVersion';
import Modal from './Modal';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import {
  Bug,
  Sparkles,
  Heart,
  Timer,
  RefreshCw,
  HelpCircle,
  Camera,
  Check,
  AlertTriangle,
  Loader2,
  Trash2
} from 'lucide-react';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type IssueType = 'Bug' | 'Feature Request' | 'UX Improvement' | 'Performance Issue' | 'Wrong Data Sync' | 'Other';
type SeverityType = 'Minor' | 'Medium' | 'Critical';

const ISSUE_TYPES: { type: IssueType; label: string; description: string; icon: any; color: string }[] = [
  {
    type: 'Bug',
    label: 'Bug Report',
    description: 'Something is broken, not loading, or crashing.',
    icon: Bug,
    color: 'from-rose-500/20 to-red-500/10 text-red-400 border-red-500/30 hover:border-red-500/50'
  },
  {
    type: 'Feature Request',
    label: 'Feature Request',
    description: 'Suggest a new tool, panel, or gamification metric.',
    icon: Sparkles,
    color: 'from-fuchsia-500/20 to-violet-500/10 text-fuchsia-400 border-fuchsia-500/30 hover:border-fuchsia-500/50'
  },
  {
    type: 'UX Improvement',
    label: 'UX / Design',
    description: 'Aesthetics, layouts, margins, or dark mode alignment.',
    icon: Heart,
    color: 'from-pink-500/20 to-rose-500/10 text-pink-400 border-pink-500/30 hover:border-pink-500/50'
  },
  {
    type: 'Performance Issue',
    label: 'Performance',
    description: 'Slow queries, delays, high lag, or stuttering animations.',
    icon: Timer,
    color: 'from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30 hover:border-cyan-500/50'
  },
  {
    type: 'Wrong Data Sync',
    label: 'Data Sync / Ext',
    description: 'LeetCode solves or Focus sessions not syncing to Life OS.',
    icon: RefreshCw,
    color: 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30 hover:border-amber-500/50'
  },
  {
    type: 'Other',
    label: 'General / Other',
    description: 'General feedback, queries, or ideas.',
    icon: HelpCircle,
    color: 'from-slate-500/20 to-slate-500/10 text-slate-400 border-slate-500/30 hover:border-slate-500/50'
  }
];

export default function BugReportModal({ isOpen, onClose }: BugReportModalProps) {
  const { user } = useAuth();
  const { play } = useSoundFX();

  // Form States
  const [issueType, setIssueType] = useState<IssueType>('Bug');
  const [severity, setSeverity] = useState<SeverityType>('Minor');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [attachScreenshot, setAttachScreenshot] = useState(true);

  // Screenshot Capture States
  const [screenshotBlob, setScreenshotBlob] = useState<Blob | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Auto-capture screenshot on mount/open if requested
  useEffect(() => {
    if (isOpen && attachScreenshot && !screenshotPreview && !capturing) {
      // Small timeout to allow the modal to initiate opening and let us capture the background
      const timer = setTimeout(() => {
        handleCaptureScreenshot();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, attachScreenshot]);

  const handleCaptureScreenshot = async () => {
    setCapturing(true);
    try {
      // Hide active modals, dialogs, overlays, toast containers, and floaters to get a clean dashboard screenshot
      const elementsToHide = document.querySelectorAll(
        '[role="dialog"], .fixed.z-\\[200\\], #modal-backdrop, .fixed.z-50, #toast-container, .toaster'
      );

      const originalStyles = new Map<Element, string>();
      elementsToHide.forEach((el) => {
        originalStyles.set(el, (el as HTMLElement).style.visibility);
        (el as HTMLElement).style.visibility = 'hidden';
      });

      // Capture screenshot using html2canvas
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#0a0b16',
        scale: 0.85, // compact compression scale
      });

      // Restore visibility
      elementsToHide.forEach((el) => {
        (el as HTMLElement).style.visibility = originalStyles.get(el) || '';
      });

      canvas.toBlob((blob) => {
        if (blob) {
          setScreenshotBlob(blob);
          setScreenshotPreview(canvas.toDataURL('image/png'));
        }
      }, 'image/png');
    } catch (error) {
      console.error('[BugReportModal] Screenshot capture failed:', error);
      toast.error('Failed to capture canvas screenshot.');
    } finally {
      setCapturing(false);
    }
  };

  const clearScreenshot = () => {
    setScreenshotBlob(null);
    setScreenshotPreview(null);
  };

  const getDiagnostics = () => {
    const connection = navigator.onLine ? 'online' : 'offline';
    const appVersion = getAppVersion();
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';

    return {
      browser: navigator.userAgent,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      window_size: `${window.innerWidth}x${window.innerHeight}`,
      connection,
      url: window.location.href,
      theme,
      app_version: appVersion,
      os: navigator.platform,
      language: navigator.language,
      timestamp: new Date().toISOString(),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be signed in to submit reports.');
      return;
    }

    if (!title.trim() || !description.trim()) {
      toast.error('Please enter a title and a description.');
      return;
    }

    setSubmitting(true);
    let screenshotUrl = null;

    try {
      // 1. Upload screenshot if exists
      if (attachScreenshot && screenshotBlob) {
        const fileExt = 'png';
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('bug-reports')
          .upload(fileName, screenshotBlob, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.warn('[BugReportModal] Storage upload blocked, continuing without attachment:', uploadError);
          toast.error('Screenshot upload failed. Submitting report without attachment.');
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('bug-reports')
            .getPublicUrl(fileName);
          screenshotUrl = publicUrl;
        }
      }

      // 2. Call secure database RPC
      const diagnostics = includeDiagnostics ? getDiagnostics() : {};
      
      const { data, error } = await supabase.rpc('submit_bug_report', {
        type: issueType,
        severity,
        title: title.trim(),
        description: description.trim(),
        metadata: diagnostics,
        screenshot_url: screenshotUrl,
      });

      if (error) {
        throw error;
      }

      toast.success('Issue reported successfully! Our team will audit it.', { icon: '🚀' });
      play('success');
      
      // Reset form
      setTitle('');
      setDescription('');
      clearScreenshot();
      onClose();
    } catch (error: any) {
      console.error('[BugReportModal] Submission failed:', error);
      play('error');
      if (error.message?.includes('429') || error.details?.includes('quota')) {
        toast.error('Daily quota exceeded. Max 10 reports allowed every 24 hours.', { duration: 5000 });
      } else {
        toast.error(error.message || 'Server error. Failed to save report.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Report Issue & Feedback" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5 text-left max-h-[80vh] overflow-y-auto pr-1">
        {/* Step 1: Selection Cards for Issue Type */}
        <div>
          <label className="text-xs font-black uppercase tracking-wider text-white/50 block mb-2.5">
            Select Issue Category
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {ISSUE_TYPES.map((item) => {
              const IconComponent = item.icon;
              const isSelected = issueType === item.type;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => {
                    play('click');
                    setIssueType(item.type);
                  }}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left bg-gradient-to-br transition-all duration-300 relative overflow-hidden group ${
                    isSelected
                      ? `${item.color} border-violet-500/60 shadow-[0_0_15px_rgba(139,92,246,0.15)] scale-[1.02]`
                      : 'bg-white/[0.02] border-white/5 text-white/60 hover:bg-white/[0.04] hover:text-white hover:scale-[1.01]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className={`p-1.5 rounded-lg ${
                        isSelected ? 'bg-white/10' : 'bg-white/5 group-hover:bg-white/10'
                      } transition-colors`}
                    >
                      <IconComponent size={14} className={isSelected ? 'animate-pulse-subtle' : ''} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider text-white">
                      {item.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/40 leading-normal font-medium">
                    {item.description}
                  </p>
                  
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(139,92,246,0.8)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Severity Selector & Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-white/50 block mb-2.5">
              Severity Level
            </label>
            <div className="flex bg-white/[0.02] border border-white/5 rounded-xl p-1 gap-1">
              {(['Minor', 'Medium', 'Critical'] as SeverityType[]).map((level) => {
                const isSelected = severity === level;
                let activeColor = 'bg-violet-600 text-white';
                if (level === 'Medium') activeColor = 'bg-amber-600 text-white';
                if (level === 'Critical') activeColor = 'bg-rose-600 text-white animate-pulse-subtle';

                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => {
                      play('click');
                      setSeverity(level);
                    }}
                    className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all duration-300 uppercase tracking-wider ${
                      isSelected
                        ? `${activeColor} shadow-md`
                        : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="report-title" className="text-xs font-black uppercase tracking-wider text-white/50 block mb-2.5">
              Issue Headline / Summary
            </label>
            <input
              id="report-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., LeetCode XP did not update on submission"
              className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.04] transition-all"
            />
          </div>
        </div>

        {/* Step 3: Detailed Description */}
        <div>
          <label htmlFor="report-desc" className="text-xs font-black uppercase tracking-wider text-white/50 block mb-2.5">
            Describe the Problem
          </label>
          <textarea
            id="report-desc"
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell us what you did, what you expected, and what happened instead. Be as detailed as you like..."
            className="w-full bg-white/[0.02] border border-white/5 rounded-xl p-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.04] transition-all resize-none leading-relaxed"
          />
        </div>

        {/* Step 4: Toggles & Attachment Previews */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/[0.01] border border-white/5 rounded-xl p-4">
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white/70">
              Diagnostic Controls
            </h4>

            {/* Diagnostic Logs Toggle */}
            <label className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={includeDiagnostics}
                onChange={(e) => {
                  play('click');
                  setIncludeDiagnostics(e.target.checked);
                }}
                className="mt-0.5 rounded border-white/10 bg-white/5 text-violet-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-white/80 group-hover:text-white transition-colors">
                  Attach System Diagnostics
                </span>
                <p className="text-[10px] text-white/40 leading-normal">
                  OS, browser engine, display size, connection speed, and active page path.
                </p>
              </div>
            </label>

            {/* Screenshot Toggle */}
            <label className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={attachScreenshot}
                onChange={(e) => {
                  play('click');
                  setAttachScreenshot(e.target.checked);
                  if (e.target.checked) {
                    handleCaptureScreenshot();
                  } else {
                    clearScreenshot();
                  }
                }}
                className="mt-0.5 rounded border-white/10 bg-white/5 text-violet-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-white/80 group-hover:text-white transition-colors">
                  Capture Background Screenshot
                </span>
                <p className="text-[10px] text-white/40 leading-normal">
                  Grabs a pixel representation of the dashboard state behind this dialog.
                </p>
              </div>
            </label>
          </div>

          {/* Screenshot Preview Box */}
          <div className="flex flex-col items-center justify-center border border-dashed border-white/5 rounded-xl p-2.5 relative bg-black/20 min-h-[110px]">
            {capturing ? (
              <div className="flex flex-col items-center gap-1.5">
                <Loader2 size={18} className="animate-spin text-violet-400" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">
                  Capturing Active Page...
                </span>
              </div>
            ) : screenshotPreview ? (
              <div className="relative group w-full h-full min-h-[90px] rounded-lg overflow-hidden flex items-center justify-center">
                <img
                  src={screenshotPreview}
                  alt="Captured Canvas Preview"
                  className="w-full h-auto max-h-[120px] object-cover rounded-lg brightness-[0.7] group-hover:brightness-[0.9] blur-[0.3px] transition-all"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-all duration-300">
                  <button
                    type="button"
                    onClick={handleCaptureScreenshot}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all shadow-md"
                    title="Recapture Screenshot"
                  >
                    <Camera size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={clearScreenshot}
                    className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/20 text-rose-300 transition-all shadow-md"
                    title="Remove Screenshot"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="absolute bottom-1 right-1 bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-mono text-white/40">
                  {screenshotBlob ? `${(screenshotBlob.size / 1024).toFixed(1)} KB` : ''}
                </div>
              </div>
            ) : (
              <div className="text-center p-2">
                <AlertTriangle size={16} className="mx-auto text-white/20 mb-1" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/30 block">
                  No Screen Capture Attached
                </span>
                {attachScreenshot && (
                  <button
                    type="button"
                    onClick={handleCaptureScreenshot}
                    className="text-[9px] text-violet-400 hover:text-violet-300 underline font-black uppercase mt-1 block mx-auto"
                  >
                    Try Re-capturing
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2.5 border-t border-white/5">
          <div className="text-[10px] text-white/30 font-mono">
            Platform Engine Version: v{getAppVersion()}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                play('click');
                onClose();
              }}
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-bold text-xs uppercase tracking-wider transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || capturing}
              className={`px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.35)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] active:scale-95 transition-all ${
                (submitting || capturing) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>File Report</span>
                  <Check size={13} />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
