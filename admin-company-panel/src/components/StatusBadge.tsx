import React from 'react';

type StatusType =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'ACTIVE'
  | 'LOCKED'
  | 'REMOVED'
  | 'ACTIVE'
  | 'OVERDUE'
  | 'EXPIRED'
  | 'PENDING'
  | 'PAID'
  | 'CANCELLED'
  | 'BEFORE_DUE'
  | 'ON_DUE'
  | 'AFTER_DUE'
  | 'AFTER_EXPIRY'
  | string;

const config: Record<string, { label: string; classes: string }> = {
  // Company status
  PENDING_APPROVAL: { label: 'Pending', classes: 'bg-yellow-100 text-yellow-800' },
  APPROVED:         { label: 'Approved', classes: 'bg-blue-100 text-blue-700' },
  ACTIVE:           { label: 'Active', classes: 'bg-green-100 text-green-800' },
  REJECTED:         { label: 'Rejected', classes: 'bg-red-100 text-red-700' },
  LOCKED:           { label: 'Locked', classes: 'bg-red-100 text-red-800' },
  REMOVED:          { label: 'Removed', classes: 'bg-gray-100 text-gray-600' },
  // Subscription / Invoice
  OVERDUE:          { label: 'Overdue', classes: 'bg-orange-100 text-orange-800' },
  EXPIRED:          { label: 'Expired', classes: 'bg-red-100 text-red-800' },
  PENDING:          { label: 'Pending', classes: 'bg-yellow-100 text-yellow-800' },
  PAID:             { label: 'Paid', classes: 'bg-green-100 text-green-800' },
  CANCELLED:        { label: 'Cancelled', classes: 'bg-gray-100 text-gray-600' },
  // Reminder
  BEFORE_DUE:       { label: 'Before Due', classes: 'bg-blue-100 text-blue-700' },
  ON_DUE:           { label: 'On Due', classes: 'bg-yellow-100 text-yellow-800' },
  AFTER_DUE:        { label: 'After Due', classes: 'bg-orange-100 text-orange-800' },
  AFTER_EXPIRY:     { label: 'After Expiry', classes: 'bg-red-100 text-red-700' },
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
}

export default function StatusBadge({ status, className = '', size }: StatusBadgeProps) {
  const cfg = config[status] || { label: status, classes: 'bg-gray-100 text-gray-600' };
  const sizeClass = size === 'xs' ? 'text-[10px] px-1.5 py-0' : '';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.classes} ${sizeClass} ${className}`}
    >
      {cfg.label}
    </span>
  );
}
