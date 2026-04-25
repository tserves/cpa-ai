import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertTriangle } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

const priorityStyles = {
  urgent: 'bg-destructive/10 text-destructive border-destructive/20',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-accent/10 text-accent-foreground border-accent/20',
  low: 'bg-secondary text-secondary-foreground border-border',
};

export default function UpcomingDeadlines({ filings }) {
  const upcoming = filings
    .filter(f => f.status !== 'filed' && f.status !== 'assessed' && f.due_date)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 6);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent" />
          Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No upcoming deadlines</p>
        )}
        {upcoming.map((filing) => {
          const daysUntil = filing.due_date ? differenceInDays(parseISO(filing.due_date), new Date()) : null;
          const isOverdue = daysUntil !== null && daysUntil < 0;
          return (
            <div key={filing.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{filing.client_name || 'Unknown Client'}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {filing.filing_type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{filing.tax_year}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                {filing.due_date && (
                  <>
                    <p className="text-xs font-medium">{format(parseISO(filing.due_date), 'MMM d, yyyy')}</p>
                    <p className={`text-[10px] flex items-center justify-end gap-1 ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                      {isOverdue && <AlertTriangle className="w-3 h-3" />}
                      {isOverdue ? `${Math.abs(daysUntil)}d overdue` : `${daysUntil}d left`}
                    </p>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}