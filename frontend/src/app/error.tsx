'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full text-center border border-white/20">
        <div className="text-6xl mb-4">💔</div>
        <h1 className="text-2xl font-bold text-white mb-4">
          Oops! Something went wrong
        </h1>
        <p className="text-white/80 mb-6">
          We're experiencing a temporary issue. Please try again.
        </p>
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] hover:from-[#ff5252] hover:to-[#ff7043] text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-white/20 hover:bg-white/30 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300"
          >
            Go Home
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="text-white/60 cursor-pointer">Error Details</summary>
            <pre className="mt-2 text-xs text-white/60 bg-black/20 p-3 rounded overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
