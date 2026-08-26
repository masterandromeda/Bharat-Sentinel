interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: string; // tailwind color class
  icon?: string;
}

export default function StatCard({ title, value, subtitle, accent = 'text-blue-400', icon }: StatCardProps) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#64748b] text-xs uppercase tracking-wide font-medium">{title}</p>
          <p className={`text-3xl font-bold mt-1 ${accent}`}>{value}</p>
          {subtitle && <p className="text-[#64748b] text-xs mt-1">{subtitle}</p>}
        </div>
        {icon && (
          <span className={`text-2xl opacity-60 ${accent}`}>{icon}</span>
        )}
      </div>
    </div>
  );
}
