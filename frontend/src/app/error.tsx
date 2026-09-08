'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#060d18' }}
    >
      <div className="text-center max-w-md mx-auto px-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}
        >
          <AlertTriangle size={28} style={{ color: '#f87171' }} />
        </div>
        <h2
          className="text-2xl font-bold mb-3"
          style={{ color: 'rgba(255,255,255,0.9)' }}
        >
          Something went wrong
        </h2>
        <p
          className="text-sm mb-8"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          onClick={reset}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold mx-auto"
          style={{
            background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
            color: '#001a0e',
          }}
        >
          <RefreshCw size={15} />
          Try Again
        </button>
      </div>
    </div>
  );
}
