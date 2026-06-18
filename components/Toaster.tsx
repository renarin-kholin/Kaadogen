import React, { useEffect, useState } from 'react';
import { ToastItem, subscribeToasts, dismissToast } from '../utils/toast';
import { CheckCircleIcon, AlertCircleIcon } from './Icons';

const STYLES: Record<ToastItem['type'], { accent: string; icon: React.ReactNode }> = {
  success: { accent: '#DFFF50', icon: <CheckCircleIcon className="w-4 h-4" /> },
  error: { accent: '#F87171', icon: <AlertCircleIcon className="w-4 h-4" /> },
  warning: { accent: '#FBBF24', icon: <AlertCircleIcon className="w-4 h-4" /> },
  info: { accent: '#9CA3AF', icon: <AlertCircleIcon className="w-4 h-4" /> },
};

export const Toaster: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-[360px]">
      {toasts.map((t) => {
        const style = STYLES[t.type];
        return (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 bg-[#2C2C2C] border border-[#383838] rounded-md shadow-2xl px-4 py-3 text-sm text-gray-100 animate-[kaadogen-toast-in_0.18s_ease-out]"
            style={{ borderLeft: `3px solid ${style.accent}` }}
          >
            <span style={{ color: style.accent }} className="mt-0.5 shrink-0">
              {style.icon}
            </span>
            <span className="flex-1 leading-snug break-words">{t.message}</span>
            <button
              onClick={() => dismissToast(t.id)}
              className="text-gray-500 hover:text-white shrink-0 leading-none text-xs mt-0.5"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
};
