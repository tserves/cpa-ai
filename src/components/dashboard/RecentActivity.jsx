import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const statusColors = {
  todo: 'bg-secondary text-secondary-foreground',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
};

export default function RecentActivity({ tasks }) {
  const recent = [...tasks]
    .sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date))
    .slice(0, 6);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent" />
          Recent Tasks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recent.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No tasks yet</p>
        )}
        {recent.map((task) => (
          <div key={task.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{task.title}</p>
              {task.client_name && (
                <p className="text-xs text-muted-foreground mt-0.5">{task.client_name}</p>
              )}
            </div>
            <Badge className={`${statusColors[task.status] || statusColors.todo} text-[10px] px-1.5`}>
              {(task.status || 'todo').replace('_', ' ')}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}