import React from 'react';

// Breathing glass pulse animations
export const ShimmerStyles = () => (
  <style>{`
    @keyframes breathing-pulse {
      0% {
        opacity: 0.2;
        background-color: rgba(255, 255, 255, 0.03);
        border-color: rgba(255, 255, 255, 0.02);
      }
      50% {
        opacity: 0.45;
        background-color: rgba(255, 255, 255, 0.07);
        border-color: rgba(255, 255, 255, 0.05);
      }
      100% {
        opacity: 0.2;
        background-color: rgba(255, 255, 255, 0.03);
        border-color: rgba(255, 255, 255, 0.02);
      }
    }
    .animate-breathing {
      animation: breathing-pulse 1.8s infinite ease-in-out;
    }
    .loading-pulse-circle {
      position: relative;
    }
    .loading-pulse-circle::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.05);
      animation: breathing-pulse 1.8s infinite ease-in-out;
    }
  `}</style>
);

interface ShimmerBlockProps {
  className?: string;
  height?: string;
  width?: string;
  radius?: string;
}

export function ShimmerBlock({ className = '', height = '20px', width = '100%', radius = '12px' }: ShimmerBlockProps) {
  return (
    <div 
      className={`animate-breathing border ${className}`}
      style={{
        height,
        width,
        borderRadius: radius,
      }}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// LEETCODE FORGE SKELETON
// ──────────────────────────────────────────────────────────────────────────────
export function LeetCodeSkeleton() {
  return (
    <div className="max-w-6xl space-y-6">
      <ShimmerStyles />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <ShimmerBlock height="32px" width="220px" radius="8px" />
          <ShimmerBlock height="16px" width="160px" radius="6px" />
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <ShimmerBlock height="32px" width="90px" radius="16px" />
          <ShimmerBlock height="36px" width="130px" radius="16px" />
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Stats and Charts (1 Col) */}
        <div className="space-y-6 lg:col-span-1">
          {/* Circular solve count capsule */}
          <div className="glass-card p-6 border-white/[0.03] space-y-4">
            <div className="flex justify-between items-center">
              <ShimmerBlock height="18px" width="100px" radius="6px" />
              <ShimmerBlock height="18px" width="40px" radius="6px" />
            </div>
            <div className="flex justify-center py-4">
              <div className="w-32 h-32 rounded-full loading-pulse-circle flex items-center justify-center">
                <div className="space-y-2 text-center">
                  <ShimmerBlock height="24px" width="50px" className="mx-auto" radius="6px" />
                  <ShimmerBlock height="12px" width="40px" className="mx-auto" radius="4px" />
                </div>
              </div>
            </div>
            {/* Diff breakdown bars */}
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <ShimmerBlock height="14px" width="60px" radius="4px" />
                    <ShimmerBlock height="14px" width="30px" radius="4px" />
                  </div>
                  <ShimmerBlock height="8px" width="100%" radius="999px" />
                </div>
              ))}
            </div>
          </div>

          {/* Topic Distribution */}
          <div className="glass-card p-6 border-white/[0.03] space-y-4">
            <ShimmerBlock height="18px" width="130px" radius="6px" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <ShimmerBlock height="16px" width="70px" radius="4px" />
                  <ShimmerBlock height="8px" className="flex-1" radius="999px" />
                  <ShimmerBlock height="16px" width="20px" radius="4px" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Filters & Problems Log List (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters Bar */}
          <div className="glass-card p-4 border-white/[0.03] flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-[200px]">
              <ShimmerBlock height="36px" width="100%" radius="12px" />
            </div>
            <div className="flex items-center gap-2">
              <ShimmerBlock height="36px" width="80px" radius="12px" />
              <ShimmerBlock height="36px" width="80px" radius="12px" />
            </div>
          </div>

          {/* Problems Log List */}
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="glass-card p-4 border-white/[0.03] flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <ShimmerBlock height="18px" width="180px" radius="6px" />
                    <ShimmerBlock height="16px" width="60px" radius="4px" />
                  </div>
                  <div className="flex items-center gap-3">
                    <ShimmerBlock height="14px" width="100px" radius="4px" />
                    <ShimmerBlock height="14px" width="80px" radius="4px" />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ShimmerBlock height="32px" width="32px" radius="10px" />
                  <ShimmerBlock height="32px" width="32px" radius="10px" />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// HEALTH HUB SKELETON
// ──────────────────────────────────────────────────────────────────────────────
export function HealthSkeleton() {
  return (
    <div className="max-w-6xl space-y-6">
      <ShimmerStyles />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShimmerBlock height="40px" width="40px" radius="16px" />
          <div className="space-y-2">
            <ShimmerBlock height="24px" width="140px" radius="8px" />
            <ShimmerBlock height="14px" width="180px" radius="6px" />
          </div>
        </div>

        {/* Quick KPIs on mobile */}
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar py-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-2.5 rounded-2xl flex items-center gap-3 border-white/[0.03] min-w-[120px] shrink-0">
              <ShimmerBlock height="32px" width="32px" radius="50%" />
              <div className="space-y-1.5 flex-1">
                <ShimmerBlock height="10px" width="50px" radius="4px" />
                <ShimmerBlock height="14px" width="60px" radius="4px" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs list skeleton */}
      <div className="flex gap-1 p-1 glass-card rounded-2xl w-full md:w-fit overflow-x-auto no-scrollbar">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <ShimmerBlock key={i} height="36px" width="90px" radius="12px" className="shrink-0" />
        ))}
      </div>

      {/* Tab body content skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Large summary card */}
        <div className="glass-card p-6 border-white/[0.03] lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <ShimmerBlock height="20px" width="150px" radius="6px" />
            <ShimmerBlock height="20px" width="100px" radius="6px" />
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-2 text-center">
                <ShimmerBlock height="14px" width="60px" className="mx-auto" radius="4px" />
                <ShimmerBlock height="24px" width="80px" className="mx-auto" radius="6px" />
                <ShimmerBlock height="8px" width="100%" radius="999px" />
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <ShimmerBlock height="16px" width="180px" radius="6px" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map(i => (
                <div key={i} className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 flex items-center gap-4">
                  <ShimmerBlock height="40px" width="40px" radius="12px" />
                  <div className="space-y-1.5 flex-1">
                    <ShimmerBlock height="14px" width="80px" radius="4px" />
                    <ShimmerBlock height="12px" width="120px" radius="4px" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side panel skeleton */}
        <div className="glass-card p-6 border-white/[0.03] lg:col-span-1 space-y-6">
          <div className="flex items-center gap-2">
            <ShimmerBlock height="18px" width="130px" radius="6px" />
          </div>

          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-2">
                <div className="flex justify-between items-center">
                  <ShimmerBlock height="14px" width="80px" radius="4px" />
                  <ShimmerBlock height="14px" width="40px" radius="4px" />
                </div>
                <ShimmerBlock height="8px" width="100%" radius="999px" />
                <div className="flex justify-between">
                  <ShimmerBlock height="10px" width="40px" radius="4px" />
                  <ShimmerBlock height="10px" width="50px" radius="4px" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
