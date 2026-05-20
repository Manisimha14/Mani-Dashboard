import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

    public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0b14] flex items-center justify-center p-8 text-center">
          <div className="max-w-md w-full glass-card p-8 rounded-2xl border border-white/10">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-white/60 mb-8 text-sm">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-violet-600/20"
              >
                Reload Dashboard
              </button>
              <button 
                onClick={() => {
                  if (window.confirm('This will clear local settings (not cloud data). Continue?')) {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.replace('/');
                  }
                }}
                className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded-xl transition-colors border border-red-500/20 text-sm"
              >
                Clear Cache & Restart
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
