import React from 'react';
import { Cpu } from 'lucide-react';

interface LoadingIndicatorProps {
  models: string[];
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ models }) => (
  <div className="flex flex-col gap-2 p-3 bg-[#121214] border border-[#27272a] rounded-lg max-w-[85%] animate-pulse">
    <div className="flex items-center gap-2">
      <Cpu size={14} className="text-red-500" />
      <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">
        {models.join(' + ')} • Generating
      </span>
    </div>
    <div className="flex gap-1">
      <div className="w-1.5 h-1.5 bg-red-500/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-1.5 h-1.5 bg-red-500/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-1.5 h-1.5 bg-red-500/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  </div>
);
