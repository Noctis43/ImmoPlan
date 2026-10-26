import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PerformanceData {
  titre: string;
  nb_vues: number;
  nb_likes: number;
  visites?: number;
}

interface PerformanceChartProps {
  data: PerformanceData[];
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="dashboard-chart__tooltip">
      <p className="dashboard-chart__tooltip-title">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="dashboard-chart__tooltip-row" style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export function PerformanceChart({ data }: PerformanceChartProps) {
  const truncated = data.map((d) => ({ ...d, titre: d.titre.length > 18 ? d.titre.slice(0, 18) + '…' : d.titre }));
  return (
    <section className="dashboard-panel dashboard-panel--chart">
      <div className="dashboard-panel__header">
        <h3 className="dashboard-panel__title">Performances par annonce</h3>
        <span className="dashboard-panel__meta">{truncated.length} annonces</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={truncated} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="titre" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: 12 }} />
          <Bar dataKey="nb_vues" name="Vues" fill="#F5A623" radius={[6, 6, 0, 0]} />
          <Bar dataKey="nb_likes" name="Likes" fill="#00D4AA" radius={[6, 6, 0, 0]} />
          <Bar dataKey="visites" name="Visites" fill="#4D9FFF" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
