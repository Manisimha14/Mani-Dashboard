import React from 'react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';

interface PerformanceRadarProps {
  radarData: {
    subject: string;
    A: number;
  }[];
  itemAnim: any;
}

export default function PerformanceRadar({ radarData, itemAnim }: PerformanceRadarProps) {
  return (
    <motion.div variants={itemAnim} className="glass-card p-6 flex flex-col items-center">
      <h3 className="font-bold text-white mb-4 text-xs uppercase tracking-widest self-start">Performance Breakdown</h3>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
            <PolarGrid stroke="rgba(255,255,255,0.05)" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700 }} />
            <Radar name="Performance" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
