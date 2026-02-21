"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { FiCheck } from "react-icons/fi";

interface ToastContextType {
  toast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const [key, setKey] = useState(0);

  const toast = useCallback((msg: string) => {
    setMessage(msg);
    setVisible(true);
    setKey((k) => k + 1);
    setTimeout(() => setVisible(false), 2200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {visible && (
        <div key={key} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-toast">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-zinc-800/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/40">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <FiCheck size={14} className="text-emerald-400" />
            </div>
            <span className="text-sm font-medium text-zinc-200">{message}</span>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
