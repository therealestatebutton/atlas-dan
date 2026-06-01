export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin">
        <div className="h-8 w-8 border-4 border-slate-200 border-t-blue-600 rounded-full" />
      </div>
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-32 bg-slate-200 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-32 bg-slate-200 rounded-lg" />
        <div className="h-32 bg-slate-200 rounded-lg" />
      </div>
      <div className="h-64 bg-slate-200 rounded-lg" />
    </div>
  );
}
