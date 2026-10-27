export function StatGrid({ items }: { items: { label: string; value: React.ReactNode; title?: string }[] }) {
  return (
    <div className="stat-grid">
      {items.map((s) => (
        <div className="stat" key={s.label} title={s.title}>
          <div className="v">{s.value}</div>
          <div className="l">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

export function Bars({ rows, label }: { rows: { label: string; value: number }[]; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="bars" role="table" aria-label={label}>
      {rows.map((r) => (
        <div className="bar-row" role="row" key={r.label}>
          <span role="cell">{r.label}</span>
          <span role="cell" className="bar-track" aria-hidden="true"><span className="bar-fill" style={{ width: `${(r.value / max) * 100}%`, display: 'block' }} /></span>
          <span role="cell" className="n">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Questions per exam year, as an accessible SVG column chart with a data table fallback. */
export function YearChart({ data }: { data: { year: number; count: number }[] }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.count));
  const w = Math.max(240, data.length * 34);
  const h = 120;
  const bw = Math.min(24, w / data.length - 8);
  return (
    <figure className="year-chart" style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${w} ${h + 20}`} role="img" aria-label={`Questions per year: ${data.map((d) => `${d.year}: ${d.count}`).join(', ')}`}>
        {data.map((d, i) => {
          const x = (i + 0.5) * (w / data.length) - bw / 2;
          const bh = (d.count / max) * (h - 16);
          return (
            <g key={d.year}>
              <rect className="bar" x={x} y={h - bh} width={bw} height={bh} rx={2} />
              <text x={x + bw / 2} y={h - bh - 3} textAnchor="middle">{d.count}</text>
              <text x={x + bw / 2} y={h + 14} textAnchor="middle">{d.year}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="sr-only">Questions per exam year</figcaption>
    </figure>
  );
}
