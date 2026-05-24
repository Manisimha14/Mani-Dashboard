import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Key, Laptop, Plus, Trash2, ShieldAlert, 
  Check, Copy, Fingerprint, RefreshCw, Unlink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface ExtensionKeyRecord {
  id: string;
  device_name: string;
  revoked: boolean;
  last_used_at: string | null;
  created_at: string;
}

export default function ExtensionSettings() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ExtensionKeyRecord[]>([]);
  const [deviceName, setDeviceName] = useState('');
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch active extension keys
  const fetchActiveKeys = async () => {
    if (!user) return;
    setLoadingKeys(true);
    try {
      const { data, error } = await supabase
        .from('extension_keys')
        .select('id, device_name, revoked, last_used_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKeys(data || []);
    } catch (err: any) {
      console.error('Error fetching connected devices:', err);
    } finally {
      setLoadingKeys(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchActiveKeys();
    }
  }, [user]);

  // Create a new Scoped Extension Key
  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!deviceName.trim()) {
      toast.error('Please enter a device/browser description.');
      return;
    }

    setGenerating(true);
    setGeneratedToken(null);
    try {
      // Call secure stored procedure
      const { data, error } = await supabase.rpc('create_extension_token', {
        device_name: deviceName.trim()
      });

      if (error) throw error;

      setGeneratedToken(data);
      setDeviceName('');
      toast.success('Zero-trust connection token created!');
      fetchActiveKeys();
    } catch (err: any) {
      toast.error(`Key creation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Revoke an active key
  const handleRevokeKey = async (id: string) => {
    if (!confirm('Are you sure you want to permanently revoke this device? The companion extension on this device will immediately lose write access.')) return;
    
    try {
      const { error } = await supabase
        .from('extension_keys')
        .update({ revoked: true })
        .eq('id', id);

      if (error) throw error;
      toast.success('Device authorization revoked.');
      fetchActiveKeys();
    } catch (err: any) {
      toast.error(`Revocation failed: ${err.message}`);
    }
  };

  // Secure DOM Event Handshake trigger
  const handleHandshake = () => {
    if (!generatedToken) return;

    // Dispatch custom same-origin event that the extension reads
    window.dispatchEvent(
      new CustomEvent('antigravity-extension-init', {
        detail: { token: generatedToken }
      })
    );

    toast.success('Token securely handshaked with extension! 🛡️');
  };

  const handleCopy = () => {
    if (!generatedToken) return;
    navigator.clipboard.writeText(generatedToken);
    setCopied(true);
    toast.success('Token copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-white/5 pb-3">
        <Fingerprint className="text-violet-400" size={18} />
        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Secure Extension Bridge</h4>
          <p className="text-[10px] text-white/30 tracking-tight mt-0.5">
            Configure sandboxed connection keys for the Antigravity Companion Browser Extension.
          </p>
        </div>
      </div>

      {/* --- Generation Panel --- */}
      <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/[0.03] space-y-4">
        <form onSubmit={handleGenerateKey} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 space-y-1.5 w-full">
            <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">
              Authorize Device / Browser Description
            </label>
            <input 
              type="text" 
              placeholder="e.g. Chrome on Home Macbook, Firefox Work PC"
              value={deviceName}
              onChange={e => setDeviceName(e.target.value)}
              className="w-full input-glass px-3 py-2 text-xs focus:ring-1 focus:ring-violet-500/50"
            />
          </div>
          <button
            type="submit"
            disabled={generating}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            {generating ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
            Generate Scoped Token
          </button>
        </form>

        {/* --- Generated Token Output --- */}
        <AnimatePresence>
          {generatedToken && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 space-y-3"
            >
              <div className="flex items-center gap-2 text-violet-400">
                <ShieldAlert size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  SANDBOXED CONNECTION KEY GENERATED
                </span>
              </div>
              <p className="text-[10px] text-white/40 leading-relaxed font-medium">
                This single-purpose token permits event-logging only. It cannot be used to read your data or access your profile. Copy it manually or click the handshake button to sync automatically.
              </p>

              <div className="flex items-center gap-2">
                <div className="flex-1 font-mono text-[10px] bg-black/40 border border-white/5 px-3 py-2 rounded-lg text-white select-all break-all">
                  {generatedToken}
                </div>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all flex-shrink-0"
                  title="Copy to clipboard"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1.5">
                <button
                  onClick={handleHandshake}
                  className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-violet-500/30"
                >
                  <RefreshCw size={12} />
                  Secure Auto-Handshake with Companion
                </button>
                <button
                  onClick={() => setGeneratedToken(null)}
                  className="py-2 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/55 text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- Connected Keys List --- */}
      <div className="space-y-2.5">
        <div className="text-[9px] font-black text-white/30 uppercase tracking-widest px-1">
          Connected Companion Devices ({keys.filter(k => !k.revoked).length})
        </div>

        {loadingKeys ? (
          <div className="text-center py-6 text-xs text-white/20">Loading connected devices...</div>
        ) : keys.length === 0 ? (
          <div className="text-center py-8 rounded-2xl bg-white/[0.01] border border-dashed border-white/5 text-xs text-white/20">
            No companion devices connected. Describe a device above to begin.
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div 
                key={k.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  k.revoked 
                    ? 'bg-red-950/5 border-red-950/20 opacity-35' 
                    : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    k.revoked ? 'bg-red-500/10 text-red-500/40' : 'bg-violet-500/10 text-violet-400'
                  }`}>
                    <Laptop size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      {k.device_name}
                      {k.revoked && (
                        <span className="text-[8px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/30 px-1 rounded">
                          REVOKED
                        </span>
                      )}
                    </div>
                    <div className="text-[8px] text-white/20 tracking-wider uppercase mt-1 font-bold">
                      {k.last_used_at 
                        ? `Active: ${new Date(k.last_used_at).toLocaleDateString()}` 
                        : 'Never synced yet'}
                    </div>
                  </div>
                </div>

                {!k.revoked && (
                  <button
                    onClick={() => handleRevokeKey(k.id)}
                    className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/25 hover:border-red-500/40 transition-all flex items-center gap-1 text-[9px] font-black uppercase tracking-wider"
                    title="Revoke connection key"
                  >
                    <Unlink size={12} />
                    <span>Disconnect</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
