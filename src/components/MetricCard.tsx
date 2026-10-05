import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon: LucideIcon;
  gradient: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  icon: Icon,
  gradient,
}) => {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 text-white shadow-lg transition-all duration-300 hover:-translate-y-1`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white/80">{title}</p>
          <h3 className="mt-2 text-3xl font-bold tracking-tight">{value}</h3>
          {change && (
            <p className={`mt-2 flex items-center text-xs font-semibold ${isPositive ? 'text-emerald-200' : 'text-rose-200'}`}>
              <span>{isPositive ? '↑' : '↓'} {change}</span>
              <span className="ml-1 text-white/70">গত মাসের তুলনায়</span>
            </p>
          )}
        </div>
        <div className="rounded-xl bg-white/20 p-3.5 backdrop-blur-md">
          <Icon className="h-7 w-7 text-white" />
        </div>
      </div>
      <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
    </div>
  );
};
