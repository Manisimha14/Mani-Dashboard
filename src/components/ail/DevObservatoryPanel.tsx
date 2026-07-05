import React, { useMemo } from 'react';
import { telemetryService } from '../../platform/observability/telemetry';
import { pluginRegistry } from '../../platform/plugin-registry/pluginRegistry';
import { Activity, BarChart, Server, CheckSquare, Zap, Cpu } from 'lucide-react';

interface MetricRowProps {
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
}

const MetricRow = React.memo(function MetricRow({ label, value, subValue, color = 'text-emerald-400' }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-white/50">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-mono font-bold ${color}`}>{value}</span>
        {subValue && <span className="text-[10px] text-white/30 block font-mono">{subValue}</span>}
      </div>
    </div>
  );
});

export default function DevObservatoryPanel() {
  const technical = useMemo(() => telemetryService.getTechnical(), []);
  const product = useMemo(() => telemetryService.getProduct(), []);
  const plugins = useMemo(() => pluginRegistry.getPlugins(), []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
      {/* Col 1: Platform Technical Performance */}
      <div className="glass-card p-5 border-emerald-500/10">
        <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
          <Server size={14} className="text-emerald-400" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Technical Metrics</h4>
        </div>
        <MetricRow label="Event Replay Speed" value={`${technical.replayDurationMs.toFixed(2)} ms`} subValue="Lower is better" />
        <MetricRow label="Snapshot Creation" value={`${technical.snapshotCreationTimeMs} ms`} subValue="Target < 5ms" />
        <MetricRow label="Command Execution" value={`${technical.commandExecutionTimeMs} ms`} subValue="AIL Pipeline" />
        <MetricRow label="Sync Queue Latency" value={`${technical.syncLatencyMs} ms`} subValue="Cloud connection latency" />
        <MetricRow label="Database Payload" value={`${(technical.storageSizeBytes / 1024).toFixed(2)} KB`} subValue="Local sandbox size" />
        <MetricRow label="Upcaster Migrators" value={`${technical.upcasterCount}`} subValue="Event schemas versioned" />
        <MetricRow label="Dead Letter Queue" value={`${technical.dlqLength}`} subValue="Subscriber error logs" color={technical.dlqLength > 0 ? 'text-red-400' : 'text-emerald-400'} />
      </div>

      {/* Col 2: Product Sprints & Analytics */}
      <div className="glass-card p-5 border-cyan-500/10">
        <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
          <BarChart size={14} className="text-cyan-400" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Product Analytics</h4>
        </div>
        <MetricRow label="Recommendation Acceptance" value={`${product.recommendationAcceptanceRate}%`} color="text-cyan-400" />
        <MetricRow label="Prediction Accuracy" value={`${product.predictionAccuracy}%`} color="text-cyan-400" />
        <MetricRow label="Voice Command success" value={`${product.voiceCommandSuccessRate}%`} color="text-cyan-400" />
        <MetricRow label="Average Logging Time" value={`${product.averageLoggingTimeSeconds}s`} color="text-cyan-400" />
        <MetricRow label="Log Undo frequency" value={`${product.undoFrequency}`} color="text-amber-400" />
        <MetricRow label="Dismissal Rate" value={`${product.dismissalRate}%`} color="text-amber-400" />
      </div>

      {/* Col 3: Plugin Registry Capabilities Discovery */}
      <div className="glass-card p-5 border-violet-500/10">
        <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
          <Cpu size={14} className="text-violet-400" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">Plugin Discovery Registry</h4>
        </div>
        <div className="space-y-4">
          {plugins.map(p => (
            <div key={p.id} className="p-3 bg-white/[0.01] border border-white/5 rounded-lg">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-white">{p.name}</span>
                <span className="text-[8px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full uppercase font-black">v{p.version}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-[8px] uppercase tracking-wider font-bold">
                <span className={p.capabilities.commands ? 'text-violet-400' : 'text-white/20'}>• CMD</span>
                <span className={p.capabilities.events ? 'text-violet-400' : 'text-white/20'}>• EVT</span>
                <span className={p.capabilities.insights ? 'text-violet-400' : 'text-white/20'}>• INS</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
