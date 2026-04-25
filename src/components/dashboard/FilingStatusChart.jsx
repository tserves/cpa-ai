import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { BarChart3 } from 'lucide-react';

const STATUS_COLORS = {
  not_started: '#94a3b8',
  in_progress: '#3b82f6',
  under_review: '#f59e0b',
  filed: '#10b981',
  assessed: '#059669',
  reassessed: '#ef4444',
};

const STATUS_LABELS = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  under_review: 'Under Review',
  filed: 'Filed',
  assessed: 'Assessed',
  reassessed: 'Reassessed',
};

export default function FilingStatusChart({ filings }) {
  const statusCounts = filings.reduce((acc, f) => {
    const s = f.status || 'not_started';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(statusCounts).map(([key, value]) => ({
    name: STATUS_LABELS[key] || key,
    value,
    color: STATUS_COLORS[key] || '#94a3b8',
  }));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent" />
            Filing Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">No filings data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-accent" />
          Filing Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              dataKey="value"
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}