import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function StatCard({ title, value, subtitle, icon: Icon, trend, className }) {
  return (
    <Card className={cn("p-5 relative overflow-hidden group hover:shadow-md transition-shadow", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-accent" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1">
          <span className={cn(
            "text-xs font-semibold",
            trend > 0 ? "text-green-600" : "text-destructive"
          )}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-xs text-muted-foreground">vs last month</span>
        </div>
      )}
      <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500" />
    </Card>
  );
}