import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg px-4 transition-colors duration-300">
          <div className="max-w-md w-full glass p-8 rounded-3xl shadow-xl text-center border border-red-500/20">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500 animate-pulse">
              <AlertTriangle size={32} />
            </div>
            
            <h1 className="text-2xl font-bold font-sans mb-3 text-gray-900 dark:text-white">
              Something went wrong
            </h1>
            
            <p className="text-gray-600 dark:text-dark-muted mb-6 text-sm">
              We apologize for the inconvenience. An unexpected interface rendering issue occurred.
            </p>

            {this.state.error && (
              <pre className="text-left bg-gray-100 dark:bg-slate-900/50 p-4 rounded-xl text-xs font-mono text-red-500 dark:text-red-400 overflow-x-auto mb-6 border border-gray-200 dark:border-slate-800 max-h-32">
                {this.state.error.toString()}
              </pre>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 py-3 px-5 rounded-2xl font-medium text-white bg-primary-500 hover:bg-primary-600 shadow-glow hover:shadow-lg transition-all duration-300 transform active:scale-95"
              >
                <RefreshCw size={18} />
                Reload Page
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 py-3 px-5 rounded-2xl font-medium text-gray-700 dark:text-dark-text bg-white dark:bg-dark-card hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-dark-border transition-all duration-300 transform active:scale-95"
              >
                <Home size={18} />
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
