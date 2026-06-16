import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();

  // Entity automation trigger: fired when a new FinancialReport is created
  if (body.event?.type === 'create' && body.event?.entity_name === 'FinancialReport') {
    const rec = body.data;
    if (!rec || rec.status !== 'extracting') return Response.json({ skipped: true });
    const fileUrls = JSON.parse(rec.file_urls || '[]');
    const fileNames = JSON.parse(rec.file_names || '[]');
    body = { mode: 'financial_report', file_urls: fileUrls, file_names: fileNames, report_id: rec.id };
  }

  if (body.mode === 'financial_report') {
    const fileUrls = body.file_urls || [];
    const fileNames = body.file_names || [];
    const reportId = body.report_id;
    if (!fileUrls.length) return Response.json({ error: 'No files' }, { status: 400 });
    await base44.asServiceRole.entities.FinancialReport.update(reportId, { status: 'extracting' });

    const extractPrompt = 'You are an expert accountant. Extract ALL financial transactions from this document. For each transaction return: transaction_date (YYYY-MM-DD or null), account_name (or UNCLASSIFIED), account_code, debit_amount (number or null), credit_amount (number or null), description, vendor_or_customer, category (one of: assets liabilities equity revenue cogs operating_expenses other_income other_expenses unclassified), confidence (0-1), needs_review (true if confidence<0.85 or key field missing), review_reason. Also return: total_debits, total_credits, chart_of_accounts (object grouping account names by category). NEVER fabricate — set null + needs_review=true if uncertain.';
    const schema = { type: 'object', properties: { transactions: { type: 'array', items: { type: 'object' } }, total_debits: { type: 'number' }, total_credits: { type: 'number' }, chart_of_accounts: { type: 'object' } } };

    // Process each file in parallel — one fast LLM call per file
    const results = await Promise.all(fileUrls.map(function(url) {
      return base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: extractPrompt,
        file_urls: [url],
        model: 'gemini_3_flash',
        response_json_schema: schema,
      }).catch(function(e) { return { transactions: [], total_debits: 0, total_credits: 0, chart_of_accounts: {} }; });
    }));

    // Merge all results
    const txs = results.flatMap(function(r) { return r.transactions || []; });
    const mergedChart = results.reduce(function(acc, r) { return Object.assign(acc, r.chart_of_accounts || {}); }, {});
    const totalDebits = results.reduce(function(s, r) { return s + (r.total_debits || 0); }, 0);
    const totalCredits = results.reduce(function(s, r) { return s + (r.total_credits || 0); }, 0);

    const reviewCount = txs.filter(function(t) { return t.needs_review; }).length;
    const mappedCount = txs.filter(function(t) { return !t.needs_review && t.category !== 'unclassified'; }).length;
    const unclassifiedCount = txs.filter(function(t) { return t.category === 'unclassified'; }).length;
    const issues = [];
    if (unclassifiedCount > 0) issues.push({ type: 'unclassified', severity: 'low', message: unclassifiedCount + ' transaction(s) unclassified' });

    await base44.asServiceRole.entities.FinancialReport.update(reportId, {
      status: reviewCount > 0 ? 'review' : 'completed',
      transactions_raw: JSON.stringify(txs),
      transactions_reviewed: JSON.stringify(txs),
      validation_issues: JSON.stringify(issues),
      chart_of_accounts: JSON.stringify(mergedChart),
      total_debits: totalDebits,
      total_credits: totalCredits,
      transaction_count: txs.length,
      mapped_count: mappedCount,
      review_count: reviewCount,
    });
    return Response.json({ success: true, transaction_count: txs.length, needs_review: reviewCount, mapped_count: mappedCount, validation_issues: issues.length });
  }

  if (body.mode === 'generate_reports') {
    const reportId = body.report_id;
    const dateFrom = body.date_from || null;
    const dateTo = body.date_to || null;
    let records = [];
    try { records = await base44.asServiceRole.entities.FinancialReport.filter({ id: reportId }); } catch(e) {}
    if (!records || !records.length) return Response.json({ error: 'Report not found' }, { status: 404 });
    const rec = records[0];
    const all = JSON.parse(rec.transactions_reviewed || rec.transactions_raw || '[]');
    const txs = all.filter(function(t) {
      const d = t.transaction_date || t.posting_date;
      if (!d) return true;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
    const acctMap = {};
    txs.forEach(function(tx) {
      const n = tx.account_name || 'Unclassified';
      if (!acctMap[n]) acctMap[n] = { account_name: n, account_code: tx.account_code || null, category: tx.category || 'unclassified', transactions: [], debit_total: 0, credit_total: 0, opening_balance: 0, closing_balance: 0 };
      acctMap[n].transactions.push(tx);
      acctMap[n].debit_total += (tx.debit_amount || 0);
      acctMap[n].credit_total += (tx.credit_amount || 0);
    });
    Object.values(acctMap).forEach(function(a) {
      a.transactions.sort(function(x, y) { return (x.transaction_date||'') < (y.transaction_date||'') ? -1 : 1; });
      a.closing_balance = a.opening_balance + a.debit_total - a.credit_total;
    });
    const tD = txs.reduce(function(s,t){ return s+(t.debit_amount||0); },0);
    const tC = txs.reduce(function(s,t){ return s+(t.credit_amount||0); },0);
    const gl = { generated_at: new Date().toISOString(), date_from: dateFrom, date_to: dateTo, total_debits: tD, total_credits: tC, accounts: Object.values(acctMap), transaction_count: txs.length };
    const lines = function(cat, useCredit) { const g={}; txs.filter(function(t){return t.category===cat;}).forEach(function(t){const k=t.account_name||'Unclassified'; if(!g[k])g[k]={account:k,amount:0}; g[k].amount+=useCredit?(t.credit_amount||0):(t.debit_amount||0);}); return Object.values(g); };
    const rev = txs.filter(function(t){return t.category==='revenue';}).reduce(function(s,t){return s+(t.credit_amount||0);},0);
    const cogs = txs.filter(function(t){return t.category==='cogs';}).reduce(function(s,t){return s+(t.debit_amount||0);},0);
    const gp = rev - cogs;
    const opex = txs.filter(function(t){return t.category==='operating_expenses';}).reduce(function(s,t){return s+(t.debit_amount||0);},0);
    const noi = gp - opex;
    const oi = txs.filter(function(t){return t.category==='other_income';}).reduce(function(s,t){return s+(t.credit_amount||0);},0);
    const oe = txs.filter(function(t){return t.category==='other_expenses';}).reduce(function(s,t){return s+(t.debit_amount||0);},0);
    const np = noi + oi - oe;
    const pl = { generated_at: new Date().toISOString(), date_from: dateFrom, date_to: dateTo, revenue: rev, revenue_lines: lines('revenue',true), cogs, cogs_lines: lines('cogs',false), gross_profit: gp, gross_margin_pct: rev>0?((gp/rev)*100).toFixed(1):null, operating_expenses: opex, operating_expense_lines: lines('operating_expenses',false), net_operating_income: noi, other_income: oi, other_income_lines: lines('other_income',true), other_expenses: oe, other_expense_lines: lines('other_expenses',false), net_profit: np, transaction_count: txs.length };
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.FinancialReport.update(reportId, { gl_report: JSON.stringify(gl), pl_report: JSON.stringify(pl), status: 'completed', gl_generated_at: now, pl_generated_at: now });
    return Response.json({ success: true, gl_report: gl, pl_report: pl });
  }

  // Original single-file pipeline mode
  const { file_url, document_type, client_name, document_name } = body;
  if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });
  const extractionPrompt = `You are a financial data extraction AI for a Canadian CPA firm. Analyze this financial document (${document_type}: "${document_name}" for client "${client_name}") and extract ALL financial data. Return JSON with: document_summary, period_start (YYYY-MM-DD), period_end, total_amount (number), currency, transactions (array of {date,description,amount,category,vendor_or_source,reference}), summary_by_category ({revenue,expense,transfer,tax,payroll,other}), anomalies (array of {severity,type,description,transaction_index,amount}), accounting_entries (array of {debit_account,credit_account,amount,description,date}). Flag duplicates, unusual amounts, missing info, large cash over $10k.`;
  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt: extractionPrompt, file_urls: [file_url], model: 'claude_sonnet_4_6', response_json_schema: { type: 'object', properties: { document_summary: {type:'string'}, period_start: {type:'string'}, period_end: {type:'string'}, total_amount: {type:'number'}, currency: {type:'string'}, transactions: {type:'array',items:{type:'object'}}, summary_by_category: {type:'object'}, anomalies: {type:'array',items:{type:'object'}}, accounting_entries: {type:'array',items:{type:'object'}} } } });
  const anomalyCount = (result.anomalies || []).length;
  const needsReview = anomalyCount > 0 || (result.anomalies || []).some(function(a) { return a.severity === 'high'; });
  return Response.json({ extracted_data: JSON.stringify({ document_summary: result.document_summary, period_start: result.period_start, period_end: result.period_end, total_amount: result.total_amount, currency: result.currency, transactions: result.transactions || [], summary_by_category: result.summary_by_category || {}, accounting_entries: result.accounting_entries || [] }), anomalies: JSON.stringify(result.anomalies || []), anomaly_count: anomalyCount, total_amount: result.total_amount || 0, transaction_count: (result.transactions || []).length, period_start: result.period_start || null, period_end: result.period_end || null, status: needsReview ? 'needs_review' : 'completed' });
});