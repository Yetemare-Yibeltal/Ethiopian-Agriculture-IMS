'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface ToastContextType {
  toasts: Toast[];
  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
  };
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

// ─── Context ──────────────────────────────────────────────
const ToastContext = createContext<ToastContextType | null>(null);

// ─── Toast Config ─────────────────────────────────────────
interface ToastConfig {
  icon: React.ReactNode;
  borderColor: string;
  iconColor: string;
  bgColor: string;
}

const toastConfig: Record<ToastType, ToastConfig> = {
  success: {
    icon: <CheckCircle size={18} />,
    borderColor: 'rgba(74, 222, 128, 0.3)',
    iconColor: '#4ade80',
    bgColor: 'rgba(74, 222, 128, 0.08)',
  },
  error: {
    icon: <XCircle size={18} />,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    iconColor: '#f87171',
    bgColor: 'rgba(248, 113, 113, 0.08)',
  },
  warning: {
    icon: <AlertTriangle size={18} />,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    iconColor: '#fbbf24',
    bgColor: 'rgba(251, 191, 36, 0.08)',
  },
  info: {
    icon: <Info size={18} />,
    borderColor: 'rgba(96, 165, 250, 0.3)',
    iconColor: '#60a5fa',
    bgColor: 'rgba(96, 165, 250, 0.08)',
  },
};

// ─── Provider ─────────────────────────────────────────────
interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (type: ToastType, title: string, message?: string, duration = 5000) => {
      const id = `toast-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const newToast: Toast = { id, type, title, message, duration };

      setToasts((prev) => {
        const updated = [...prev, newToast];
        return updated.slice(-5);
      });

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    },
    [],
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const toast = {
    success: (title: string, message?: string) =>
      addToast('success', title, message),
    error: (title: string, message?: string) =>
      addToast('error', title, message, 8000),
    warning: (title: string, message?: string) =>
      addToast('warning', title, message, 6000),
    info: (title: string, message?: string) => addToast('info', title, message),
  };

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss, dismissAll }}>
      {children}

      <div
        className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2"
        aria-live="polite"
        aria-atomic="false"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            const config = toastConfig[t.type];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 100, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.9 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="pointer-events-auto"
              >
                <div
                  style={{
                    background: 'rgba(6, 13, 24, 0.95)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: `1px solid ${config.borderColor}`,
                    borderLeft: `3px solid ${config.iconColor}`,
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  }}
                >
                  <div
                    style={{
                      color: config.iconColor,
                      flexShrink: 0,
                      marginTop: '1px',
                    }}
                  >
                    {config.icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.9)',
                        marginBottom: t.message ? '3px' : 0,
                        lineHeight: 1.4,
                      }}
                    >
                      {t.title}
                    </p>
                    {t.message && (
                      <p
                        style={{
                          fontSize: '12px',
                          color: 'rgba(255,255,255,0.5)',
                          lineHeight: 1.5,
                        }}
                      >
                        {t.message}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => dismiss(t.id)}
                    style={{
                      color: 'rgba(255,255,255,0.3)',
                      flexShrink: 0,
                      padding: '2px',
                      borderRadius: '4px',
                      transition: 'color 0.2s',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(255,255,255,0.3)';
                    }}
                    aria-label="Dismiss notification"
                  >
                    <X size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────
export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider.');
  }
  return context;
}

export default ToastProvider;
S;
