import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS } from '@/lib/constants';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

const AXIS = { stroke: '#94a3b8', fontSize: 12 };
const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  boxShadow: '0 10px 30px -12px rgba(15,23,42,.25)',
  fontSize: 12,
};

export interface SeriesDef {
  key: string;
  label: string;
  color?: string;
}

/** Card wrapper giving every chart the same title, padding and height. */
export function ChartCard({
  title,
  subtitle,
  action,
  children,
  height = 280,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  height?: number;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div style={{ width: '100%', height }}>{children}</div>
    </Card>
  );
}

/** Grouped or stacked bar chart — attendance per day, marks per subject, fees per class. */
export function BarSeries<T extends object>({
  data,
  xKey,
  series,
  stacked = false,
  height = '100%',
  valueSuffix = '',
}: {
  data: T[];
  xKey: string;
  series: SeriesDef[];
  stacked?: boolean;
  height?: number | string;
  valueSuffix?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
        <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: number, name: string) => [`${value}${valueSuffix}`, name]}
          cursor={{ fill: 'rgba(37,99,235,0.06)' }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        {series.map((def, index) => (
          <Bar
            key={def.key}
            dataKey={def.key}
            name={def.label}
            stackId={stacked ? 'a' : undefined}
            fill={def.color ?? CHART_COLORS[index % CHART_COLORS.length]}
            radius={stacked ? 0 : [4, 4, 0, 0]}
            maxBarSize={38}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Smooth area trend — attendance percentage across the week. */
export function AreaTrend<T extends object>({
  data,
  xKey,
  series,
  height = '100%',
  valueSuffix = '',
}: {
  data: T[];
  xKey: string;
  series: SeriesDef[];
  height?: number | string;
  valueSuffix?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
        <defs>
          {series.map((def, index) => (
            <linearGradient key={def.key} id={`grad-${def.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={def.color ?? CHART_COLORS[index]} stopOpacity={0.35} />
              <stop offset="95%" stopColor={def.color ?? CHART_COLORS[index]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
        <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: number, name: string) => [`${value}${valueSuffix}`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        {series.map((def, index) => (
          <Area
            key={def.key}
            type="monotone"
            dataKey={def.key}
            name={def.label}
            stroke={def.color ?? CHART_COLORS[index % CHART_COLORS.length]}
            strokeWidth={2}
            fill={`url(#grad-${def.key})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Donut chart — fee status split, submission split, subject spread. */
export function DonutChart({
  data,
  colors = CHART_COLORS,
  height = '100%',
}: {
  data: Array<{ label: string; value: number }>;
  colors?: string[];
  height?: number | string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: number, name: string) => [
            `${value} (${total ? Math.round((value / total) * 100) : 0}%)`,
            name,
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Pie data={data} dataKey="value" nameKey="label" innerRadius={62} outerRadius={92} paddingAngle={2}>
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={colors[index % colors.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Percentage comparison bars (marks by class, subject averages) in a fixed-height box. */
export function ComparisonBars<T extends object>({
  data,
  series,
  xKey,
  className,
  valueSuffix = '%',
}: {
  data: T[];
  series: SeriesDef[];
  xKey: string;
  className?: string;
  valueSuffix?: string;
}) {
  return (
    <div className={cn('h-72', className)}>
      <BarSeries data={data} xKey={xKey} series={series} height="100%" valueSuffix={valueSuffix} />
    </div>
  );
}
