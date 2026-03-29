import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: {
    value: string;
    up?: boolean;
    neutral?: boolean;
  };
  onClick?: () => void;
}

export default function MetricCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-primary-600',
  iconBg = 'bg-primary-50',
  trend,
  onClick,
}: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-primary-200 transition-all' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          {trend && (
            <p
              className={`mt-1 flex items-center gap-1 text-xs font-medium ${
                trend.neutral
                  ? 'text-slate-500'
                  : trend.up
                  ? 'text-green-600'
                  : 'text-red-500'
              }`}
            >
              {!trend.neutral &&
                (trend.up ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                ))}
              {trend.value}
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}
