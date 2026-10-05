import { type ReactNode } from 'react';

export function Spinner({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <div
      className={`${className} border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin`}
    />
  );
}

export function LoadingPage({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Spinner className="w-8 h-8" />
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-3 w-24 bg-slate-700/60 rounded animate-shimmer mb-2" />
          <div className="h-5 w-32 bg-slate-700/60 rounded animate-shimmer" />
        </div>
        <div className="w-10 h-10 bg-slate-700/60 rounded-lg animate-shimmer" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 divide-y divide-slate-700/30">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4">
          <div className="flex-1">
            <div className="h-4 w-40 bg-slate-700/60 rounded animate-shimmer mb-2" />
            <div className="h-3 w-24 bg-slate-700/60 rounded animate-shimmer" />
          </div>
          <div className="h-5 w-16 bg-slate-700/60 rounded animate-shimmer" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center text-slate-500 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-300 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-xs mb-4">{message}</p>
      {action}
    </div>
  );
}
