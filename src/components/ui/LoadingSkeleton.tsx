export function LoadingSkeleton({ lines = 3, className = "" }: { lines?: number, className?: string }) {
  return (
    <div className={`animate-pulse space-y-4 p-4 w-full ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          <div className="rounded-full bg-slate-200 h-10 w-10 shrink-0"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-slate-200 rounded w-5/6"></div>
              <div className="h-3 bg-slate-200 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
