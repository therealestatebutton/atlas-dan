import { getStatusColor, formatLeadType } from '../lib/utils';

interface BadgeProps {
  variant?: 'status' | 'type' | 'default';
  value: string;
  className?: string;
}

export function Badge({ variant = 'default', value, className = '' }: BadgeProps) {
  let colorClass = 'bg-slate-100 text-slate-800';

  if (variant === 'status') {
    colorClass = getStatusColor(value);
  } else if (variant === 'type') {
    colorClass = 'bg-blue-100 text-blue-800';
  }

  const displayValue = variant === 'type' ? formatLeadType(value) : value;

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${colorClass} ${className}`}>
      {displayValue}
    </span>
  );
}
