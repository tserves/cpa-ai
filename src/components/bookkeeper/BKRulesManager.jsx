import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Zap, Check, X, BookOpen } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const CAT_LABELS = {
  revenue: 'Revenue', other_income: 'Other Income', cogs: 'Cost of Goods Sold',
  bank_charges: 'Bank Charges', rent: 'Rent', payroll: 'Payroll', insurance: 'Insurance',
  utilities: 'Utilities', software: 'Software & Subscriptions', advertising: 'Advertising & Marketing',
  telecom: 'Telecommunications', vehicle: 'Vehicle Expenses', travel: 'Travel',
  meals: 'Meals & Entertainment', professional_fees: 'Professional Fees',
  office_expenses: 'Office Expenses', repairs: 'Repairs & Maintenance',
  interest_expense: 'Interest Expense', taxes: 'Taxes', owner_drawings: 'Owner Drawings',
  transfer: 'Transfer', cc_payment: 'CC Payment', loan_payment: 'Loan Payment',
  cash_withdrawal: 'Cash Withdrawal', uncategorized: 'Uncategorized',
};
const CATEGORIES = Object.keys(CAT_LABELS);

const MATCH_LABELS = { any: 'Any field', description: 'Description', vendor_or_customer: 'Vendor name' };

const BADGE_COLORS = {
  revenue: 'bg-green-100 text-green-700', other_income: 'bg-emerald-100 text-emerald-700',
  cogs: 'bg-orange-100 text-orange-700', bank_charges: 'bg-slate-100 text-slate-700',
  rent: 'bg-purple-100 text-purple-700', payroll: 'bg-blue-100 text-blue-700',
  software: 'bg-violet-100 text-violet-700', advertising: 'bg-pink-100 text-pink-700',
  meals: 'bg-rose-100 text-rose-700', professional_fees: 'bg-indigo-100 text-indigo-700',
  uncategorized: 'bg-red-100 text-red-700',
};

function AddRuleRow({ onAdd, onCancel }) {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [matchField, setMatchField] = useState('any');

  const handleAdd = () => {
    if (!keyword.trim() || !category) return;
    onAdd({ keyword: keyword.trim(), category, match_field: matchField, account_name: CAT_LABELS[category] || category });
    setKeyword(''); setCategory(''); setMatchField('any');
  };

  return (
    <tr className="bg-primary/5 border-t">
      <td className="px-3 py-2">
        <Input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="e.g. Rogers, Starbucks, AWS…" className="h-7 text-xs" onKeyDown={e => e.key === 'Enter' && handleAdd()} autoFocus />
      </td>
      <td className="px-3 py-2">
        <Select value={matchField} onValueChange={setMatchField}>
          <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(MATCH_LABELS).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-7 text-xs w-48"><SelectValue placeholder="Select category…" /></SelectTrigger>
          <SelectContent>{CATEGORIES.filter(c => c !== 'uncategorized').map(c => <SelectItem key={c} value={c} className="text-xs">{CAT_LABELS[c]}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <Button size="icon" className="h-6 w-6" onClick={handleAdd} disabled={!keyword.trim() || !category}><Check className="w-3 h-3" /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onCancel}><X className="w-3 h-3" /></Button>
        </div>
      </td>
    </tr>
  );
}

export default function BKRulesManager({ transactions, onTransactionsUpdate }) {
  const [adding, setAdding] = useState(false);
  const [applying, setApplying] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['categorization-rules'],
    queryFn: () => base44.entities.CategorizationRule.list('-priority,-created_date'),
  });

  const handleAdd = async (ruleData) => {
    const user = await base44.auth.me();
    await base44.entities.CategorizationRule.create({ ...ruleData, created_by: user.email || user.full_name, times_applied: 0 });
    queryClient.invalidateQueries({ queryKey: ['categorization-rules'] });
    setAdding(false);
    toast({ title: '✅ Rule saved', description: `"${ruleData.keyword}" → ${CAT_LABELS[ruleData.category]}`, duration: 5000 });
  };

  const handleDelete = async (id) => {
    await base44.entities.CategorizationRule.delete(id);
    queryClient.invalidateQueries({ queryKey: ['categorization-rules'] });
    toast({ title: 'Rule deleted', duration: 5000 });
  };

  // Apply all saved rules to current transactions in memory
  const handleApplyRules = async () => {
    if (!rules.length || !transactions.length) return;
    setApplying(true);

    let appliedCount = 0;
    const ruleHitCounts = {}; // rule id -> count
    const updated = transactions.map(tx => {
      // Skip already-categorized non-uncategorized transactions (unless they are flagged as needing review)
      if (tx.category && tx.category !== 'uncategorized' && !tx.needs_review) return tx;

      const text = {
        any: `${tx.description || ''} ${tx.vendor_or_customer || ''}`.toLowerCase(),
        description: (tx.description || '').toLowerCase(),
        vendor_or_customer: (tx.vendor_or_customer || '').toLowerCase(),
      };

      // Sort rules by priority desc
      const sorted = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
      for (const rule of sorted) {
        const haystack = text[rule.match_field] || text.any;
        if (haystack.includes(rule.keyword.toLowerCase())) {
          ruleHitCounts[rule.id] = (ruleHitCounts[rule.id] || 0) + 1;
          appliedCount++;
          return {
            ...tx,
            category: rule.category,
            account_name: rule.account_name || CAT_LABELS[rule.category] || rule.category,
            auto_mapped: true,
            needs_review: false,
            rule_applied: rule.keyword,
          };
        }
      }
      return tx;
    });

    // Persist updated hit counts
    await Promise.all(
      Object.entries(ruleHitCounts).map(([id, count]) => {
        const rule = rules.find(r => r.id === id);
        return base44.entities.CategorizationRule.update(id, { times_applied: (rule?.times_applied || 0) + count });
      })
    );

    onTransactionsUpdate(updated);
    setApplying(false);
    queryClient.invalidateQueries({ queryKey: ['categorization-rules'] });
    toast({ title: `✅ Rules applied — ${appliedCount} transaction${appliedCount !== 1 ? 's' : ''} recategorized`, duration: 5000 });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Categorization Rules</h3>
          <Badge className="bg-muted text-muted-foreground border-0 text-[10px]">{rules.length} saved rule{rules.length !== 1 ? 's' : ''}</Badge>
        </div>
        <div className="flex gap-2">
          {transactions.length > 0 && rules.length > 0 && (
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleApplyRules} disabled={applying}>
              {applying ? <><span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> Applying…</> : <><Zap className="w-3.5 h-3.5" /> Apply Rules to Transactions</>}
            </Button>
          )}
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setAdding(true)} disabled={adding}>
            <Plus className="w-3.5 h-3.5" /> Add Rule
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Rules match keywords against transaction descriptions and vendor names, then auto-assign a category. Higher-priority rules are checked first. Hit <strong>Apply Rules</strong> to recategorize current transactions instantly.
      </p>

      {/* Rules table */}
      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-left min-w-[500px]">
          <thead className="bg-muted/40">
            <tr>
              {['Keyword / Vendor', 'Match Field', 'Category', 'Used', ''].map(h => (
                <th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {adding && <AddRuleRow onAdd={handleAdd} onCancel={() => setAdding(false)} />}
            {isLoading ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-xs text-muted-foreground">Loading rules…</td></tr>
            ) : rules.length === 0 && !adding ? (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-xs text-muted-foreground">
                No rules yet — click <strong>Add Rule</strong> to create your first keyword rule.
              </td></tr>
            ) : (
              rules.map(rule => (
                <tr key={rule.id} className="border-t hover:bg-muted/10">
                  <td className="px-3 py-2">
                    <span className="text-xs font-mono font-semibold bg-muted px-2 py-0.5 rounded">{rule.keyword}</span>
                    {rule.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{rule.notes}</p>}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{MATCH_LABELS[rule.match_field] || 'Any field'}</td>
                  <td className="px-3 py-2">
                    <Badge className={`${BADGE_COLORS[rule.category] || 'bg-muted text-muted-foreground'} border-0 text-[10px]`}>
                      {CAT_LABELS[rule.category] || rule.category}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground font-mono">{rule.times_applied || 0}×</td>
                  <td className="px-3 py-2">
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(rule.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Quick-add from uncategorized hint */}
      {transactions.filter(t => !t.category || t.category === 'uncategorized').length > 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          💡 <strong>{transactions.filter(t => !t.category || t.category === 'uncategorized').length}</strong> uncategorized transactions — add rules for common vendors above then click <em>Apply Rules</em> to auto-classify them.
        </p>
      )}
    </div>
  );
}