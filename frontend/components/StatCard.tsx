import clsx from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: string;
  icon?: string;
  accentBar?: 'blue' | 'red' | 'yellow' | 'green' | 'purple';
}

export default function StatCard({
  title,
  value,
  subtitle,
  accent = 'text-blue-400',
  icon,
  accentBar,
}: StatCardProps) {
  return (
    <div className={clsx('glass-card p-5 bs-stat-card', accentBar && `bs-stat-card-${accentBar}`)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="bs-section-label mb-1">{title}</p>
          <p className={clsx('text-3xl font-bold mt-1 tracking-tight', accent)}>{value}</p>
          {subtitle && <p className="text-[#4a5f7a] text-xs mt-1.5">{subtitle}</p>}
        </div>
        {icon && (
          <span className={clsx('text-xl opacity-40 mt-0.5', accent)} aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}
