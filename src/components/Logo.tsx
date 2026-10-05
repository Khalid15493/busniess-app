import React from 'react';
import { Activity } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const iconSizes = {
    sm: 'h-6 w-6 p-1.5',
    md: 'h-9 w-9 p-2',
    lg: 'h-12 w-12 p-3',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className="flex items-center gap-2.5">
      <div className={`rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/20 ${iconSizes[size]}`}>
        <Activity className="h-full w-full" />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={`font-extrabold tracking-tight text-slate-900 dark:text-white ${textSizes[size]}`}>
            Business<span className="text-indigo-600 dark:text-indigo-400">Pulse</span>
          </span>
        </div>
      )}
    </div>
  );
};
