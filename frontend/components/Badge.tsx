import clsx from 'clsx';

interface BadgeProps {
  value: string;
  type?: 'severity' | 'approval' | 'status';
  className?: string;
}

const severityClass: Record<string, string> = {
  critical: 'badge-critical',
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
};

const approvalClass: Record<string, string> = {
  pending: 'badge-pending',
  approved: 'badge-approved',
  rejected: 'badge-rejected',
};

const statusClass: Record<string, string> = {
  awaiting_approval: 'badge-pending',
  contained: 'badge-approved',
  rejected: 'badge-rejected',
  open: 'badge-medium',
  closed: 'badge-low',
};

export default function Badge({ value, type = 'severity', className }: BadgeProps) {
  const normalised = (value || '').toLowerCase();
  let cls = '';
  if (type === 'severity') cls = severityClass[normalised] || 'badge-medium';
  else if (type === 'approval') cls = approvalClass[normalised] || 'badge-pending';
  else if (type === 'status') cls = statusClass[normalised] || 'badge-medium';

  return (
    <span
      className={clsx(
        'inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide',
        cls,
        className
      )}
    >
      {value || 'unknown'}
    </span>
  );
}
