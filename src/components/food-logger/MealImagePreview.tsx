import React from 'react';
import { Camera } from 'lucide-react';

type MealImagePreviewProps = {
  url: string;
};

export function MealImagePreview({ url }: MealImagePreviewProps) {
  return (
    <div className="relative w-full h-48 overflow-hidden">
      <img 
        src={url} 
        alt="Captured meal preview" 
        className="w-full h-full object-cover animate-fade-in"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
      
      <div className="absolute bottom-4 left-6 flex items-center space-x-2 bg-zinc-900/80 border border-zinc-800/80 px-3 py-1 rounded-full text-[10px] text-cyan-400 font-semibold tracking-wider uppercase">
        <Camera size={12} />
        <span>Verified Food Capture</span>
      </div>
    </div>
  );
}
