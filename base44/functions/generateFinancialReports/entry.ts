import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const reportId = body.report_id;
    const dateFrom = body.date_from || null;
    const dateTo = body.date_to || null;
    const records = await base44.asServiceRole.entities.FinancialReport.filter({ id: reportId });
    if (!records || !records.length) return Response.json({ error: 'Report not found' }, { status: 404 });
    const rec = records[0];
    const all = JSON.parse(rec.transactions_reviewed || rec.transactions_raw || '[]');
    const filtered = all.filter(function(t) {
      if (!dateFrom && !dateTo) return true;
      const d = t.transaction_date || t.posting_date;
      if (!d) return true;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
    const acctMap = {};
    filtered.forEach(function(tx) {
      const name = tx.account_name || 'Unclassified';
      if (!acctMap[name]) acctMap[name] = { account_name: name, account_code: tx.account_code || null, category: tx.category || 'unclassified', transactions: [], debit_total: 0, credit_total: 0, opening_balance: 0, closing_balance: 0 };
      acctMap[name].transactions.push(tx);
      acctMap[name].debit_total += (tx.debit_amount || 0);
      acctMap[name].credit_total += (tx.credit_amount || 0);
    });
    Object.values(acctMap).forEach(function(a) {
      a.transactions.sort(function(x, y) { return (x.transaction_date || '') < (y.transaction_date || '') ? -1 : 1; });
      a.closing_balance = a.opening_balance + a.debit_total - a.credit_total;
    });
    const totalDebits = filtered.reduce(function(s, t) { return s + (t.debit_amount || 0); }, 0);
    const totalCredits = filtered.reduce(function(s, t) { return s + (t.credit_amount || 0); }, 0);
    const gl_report = { generated_at: new Date().toISOString(), date_from: dateFrom, date_to: dateTo, total_debits: totalDebits, total_credits: totalCredits, accounts: Object.values(acctMap), transaction_count: filtered.length };
    const plLines = function(cat, useCredit) {
      const g = {};
      filtered.filter(function(t) { return t.category === cat; }).forEach(function(t) {
        const k = t.account_name || 'Unclassified';
        if (!g[k]) g[k] = { account: k, amount: 0 };
        g[k].amount += useCredit ? (t.credit_amount || 0) : (t.debit_amount || 0);
      });
      return Object.values(g);
    };
    const revenue = filtered.filter(function(t) { return t.category === 'revenue'; }).reduce(function(s, t) { return s + (t.credit_amount || 0); }, 0);
    const cogs = filtered.filter(function(t) { return t.category === 'cogs'; }).reduce(function(s, t) { return s + (t.debit_amount || 0); }, 0);
    const gross_profit = revenue - cogs;
    const opex = filtered.filter(function(t) { return t.category === 'operating_expenses'; }).reduce(function(s, t) { return s + (t.debit_amount || 0); }, 0);
    const noi = gross_profit - opex;
    const other_income = filtered.filter(function(t) { return t.category === 'other_income'; }).reduce(function(s, t) { return s + (t.credit_amount || 0); }, 0);
    const other_expenses = filtered.filter(function(t) { return t.category === 'other_expenses'; }).reduce(function(s, t) { return s + (t.debit_amount || 0); }, 0);
    const net_profit = noi + other_income - other_expenses;
    const pl_report = { generated_at: new Date().toISOString(), date_from: dateFrom, date_to: dateTo, revenue, revenue_lines: plLines('revenue', true), cogs, cogs_lines: plLines('cogs', false), gross_profit, gross_margin_pct: revenue > 0 ? ((gross_profit / revenue) * 100).toFixed(1) : null, operating_expenses: opex, operating_expense_lines: plLines('operating_expenses', false), net_operating_income: noi, other_income, other_income_lines: plLines('other_income', true), other_expenses, other_expense_lines: plLines('other_expenses', false), net_profit, transaction_count: filtered.length };
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.FinancialReport.update(reportId, { gl_report: JSON.stringify(gl_report), pl_report: JSON.stringify(pl_report), status: 'completed', gl_generated_at: now, pl_generated_at: now });
    return Response.json({ success: true, gl_report, pl_report });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});