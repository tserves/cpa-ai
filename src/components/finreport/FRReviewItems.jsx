import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Search, Copy } from 'lucide-react';

const CAT_COLORS = {
  transfer: 'bg-blue-100 text-blue-700', cc_payment: 'bg-purple-100 text-purple-700',
  loan_payment: 'bg-orange-100 text-orange-700', owner_draw: 'bg-pink-100 text-pink-700',
  cash_withdrawal: 'bg-amber-100 text-amber-700', unclassified: 'bg-red-100 text-red-700',
};

export default function FRReviewItems({ report }) {
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState('all');

  if (!report?.items?.length) return (
    <div className="text-center py-10 text-sm text-muted-foreground">No review items — all transactions are categorized.</div>
  );

  const filtered = report.items.filter(item => {
    if (reasonFilter !== 'all' && item.review_reason !== reasonFilter) return false;
    if (search && !`${item.description} ${item.vendor_or_customer} ${item.review_reason}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setReasonFilter('all')} className={`text-xs px-3 py-1 rounded-full border transition-colors ${reasonFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}>
          All ({report.items.length})
        </button>
        {report.by_reason?.map((r, i) => (
          <button key={i} onClick={() => setReasonFilter(prev => prev === r.reason ? 'all' : r.reason)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${reasonFilter === r.reason ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}>
            {r.reason.split('—')[0].trim()} ({r.count})
          </button>
        ))}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input className="pl-9 h-8 text-xs" placeholder="Search review items…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} of {report.items.length} items</p>
      <div className="space-y-2">
        {filtered.map((item, i) => (
          <div key={i} className={`rounded-xl border p-3 space-y-2 ${item.is_duplicate ? 'border-red-200 bg-red-50' : 'bg-card'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{item.description || item.vendor_or_customer || 'No description'}</p>
                  <p className="text-[10px] text-muted-foreground">{item.transaction_date} · {item.source_file}{item.source_page ? ` · p.${item.source_page}` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {item.debit_amount > 0 && <span className="text-xs font-mono font-bold text-red-600">${item.debit_amount.toFixed(2)}</span>}
                {item.credit_amount > 0 && <span className="text-xs font-mono font-bold text-green-600">${item.credit_amount.toFixed(2)}</span>}
                <Badge className={`text-[9px] border-0 ${CAT_COLORS[item.suggested_category] || 'bg-gray-100 text-gray-700'}`}>
                  {(item.account_name || item.suggested_category || 'unclassified').replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5">
                <p className="text-[9px] font-semibold text-amber-700 uppercase">Reason</p>
                <p className="text-[10px] text-amber-800">{item.review_reason}</p>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1.5">
                <p className="text-[9px] font-semibold text-blue-700 uppercase">Recommended Action</p>
                <p className="text-[10px] text-blue-800">{item.recommended_action}</p>
              </div>
            </div>
            {item.raw_text && item.raw_text !== item.description && (
              <p className="text-[10px] text-muted-foreground italic truncate">Raw: {item.raw_text}</p>
            )}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              {item.confidence != null && <span>Confidence: {Math.round((item.confidence || 0) * 100)}%</span>}
              {item.is_duplicate && <Badge className="text-[9px] bg-red-100 text-red-700 border-0">Possible Duplicate</Badge>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}