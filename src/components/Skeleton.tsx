import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

export default function Skeleton({ className = '', width, height, circle }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: width || '100%',
        height: height || '20px',
        borderRadius: circle ? '50%' : '8px',
      }}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="glass-card p-5 space-y-3">
      <Skeleton width="40px" height="40px" />
      <Skeleton width="60%" height="28px" />
      <Skeleton width="40%" height="12px" />
    </div>
  );
}

export function InsightSkeleton() {
  return (
    <div className="glass-card p-4 flex gap-4">
      <Skeleton width="40px" height="40px" />
      <div className="flex-1 space-y-2">
        <Skeleton width="40%" height="16px" />
        <Skeleton width="90%" height="12px" />
      </div>
    </div>
  );
}
