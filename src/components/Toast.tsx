import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  const isSuccess = type === 'success';

  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-lg animate-in slide-in-from-bottom-5 ${
      isSuccess ? 'border-emerald-200 bg-emerald-50/90 text-emerald-900' : 'border-rose-200 bg-rose-50/90 text-rose-900'
    }`}>
      {isSuccess ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-rose-600" />}
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="ml-2 rounded-lg p-1 hover:bg-black/5">
        <X className="h-4 w-4 text-gray-500" />
      </button>
    </div>
  );
};
