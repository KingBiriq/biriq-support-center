import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "Something went wrong", message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center bg-red-50/50 rounded-xl border border-red-100">
      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500 mb-3">
        <AlertCircle size={20} />
      </div>
      <h3 className="text-sm font-semibold text-red-800 mb-1">{title}</h3>
      <p className="text-sm text-red-600 max-w-sm mb-4 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center text-xs font-medium text-red-700 bg-white border border-red-200 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors shadow-sm"
        >
          <RefreshCw size={14} className="mr-1.5" />
          Try Again
        </button>
      )}
    </div>
  );
}
