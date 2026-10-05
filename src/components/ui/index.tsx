import { type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-slate-800/80 rounded-xl shadow-sm border border-slate-700/50 ${className}`}>
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export function StatCard({ label, value, icon, variant = 'default' }: StatCardProps) {
  const variants = {
    default: 'bg-slate-700/60 text-slate-300',
    success: 'bg-emerald-500/15 text-emerald-400',
    warning: 'bg-amber-500/15 text-amber-400',
    danger: 'bg-red-500/15 text-red-400',
    info: 'bg-blue-500/15 text-blue-400',
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400 truncate">{label}</p>
          <p className="text-lg font-bold text-slate-100 mt-1 truncate">{value}</p>
        </div>
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${variants[variant]}`}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

export function Badge({
  children,
  variant = 'default',
}: {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const variants = {
    default: 'bg-slate-700 text-slate-300',
    success: 'bg-emerald-500/20 text-emerald-400',
    warning: 'bg-amber-500/20 text-amber-400',
    danger: 'bg-red-500/20 text-red-400',
    info: 'bg-blue-500/20 text-blue-400',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
}

interface ListItemProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onClick?: () => void;
  showChevron?: boolean;
}

export function ListItem({
  title,
  subtitle,
  right,
  onClick,
  showChevron = false,
}: ListItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-slate-700/40 transition-colors border-b border-slate-700/30 last:border-b-0"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-200 truncate">{title}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
      {showChevron && onClick && (
        <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0" />
      )}
    </button>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  type = 'button',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700',
    secondary: 'bg-slate-700 text-slate-200 border border-slate-600 hover:bg-slate-600',
    danger: 'bg-red-600 text-white hover:bg-red-500',
    ghost: 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-base',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Input({
  label,
  error,
  ...props
}: {
  label?: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-slate-300">{label}</label>
      )}
      <input
        {...props}
        className={`px-3.5 py-2.5 text-sm border rounded-lg outline-none transition-colors bg-slate-700/50 text-slate-100 placeholder-slate-500 ${
          error
            ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500'
            : 'border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
        } ${props.className ?? ''}`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function Select({
  label,
  error,
  children,
  ...props
}: {
  label?: string;
  error?: string;
  children: ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-slate-300">{label}</label>
      )}
      <select
        {...props}
        className={`px-3.5 py-2.5 text-sm border rounded-lg outline-none transition-colors bg-slate-700/50 text-slate-100 ${
          error
            ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500'
            : 'border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
        } ${props.className ?? ''}`}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function Textarea({
  label,
  error,
  ...props
}: {
  label?: string;
  error?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-slate-300">{label}</label>
      )}
      <textarea
        {...props}
        className={`px-3.5 py-2.5 text-sm border rounded-lg outline-none transition-colors resize-none bg-slate-700/50 text-slate-100 placeholder-slate-500 ${
          error
            ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500'
            : 'border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
        } ${props.className ?? ''}`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
