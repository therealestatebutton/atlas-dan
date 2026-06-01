import { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  error?: string | null;
  onRetry?: () => void;
}

export function ErrorBoundary({ children, error, onRetry }: ErrorBoundaryProps) {
  if (error) {
    return (
      <div className="p-6">
        <div className="card p-6 border-red-200 bg-red-50">
          <div className="flex items-start gap-4">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-1" size={24} />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-1">Error</h3>
              <p className="text-red-700 text-sm mb-4">{error}</p>
              {onRetry && (
                <button onClick={onRetry} className="btn btn-secondary text-sm">
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
