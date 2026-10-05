import React, { useEffect, useState } from 'react';
import { Logo } from './Logo';

export const SplashLoader: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [animateOut, setAnimateOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimateOut(true);
      setTimeout(onComplete, 400); // 400ms fade out transition
    }, 900); // 900ms display duration
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 transition-opacity duration-400 ${animateOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="animate-in zoom-in-95 duration-500">
        <Logo size="lg" />
      </div>
      <p className="mt-4 text-xs font-medium tracking-widest text-slate-400 uppercase animate-pulse">
        Financial Command Center
      </p>
    </div>
  );
};
