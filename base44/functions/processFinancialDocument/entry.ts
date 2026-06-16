import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CATEGORY_RULES = [
  { keywords: ['rent', 'lease', 'property'], category: 'operating_expenses', account: 'Rent Expense' },
  { keywords: ['salary', 'payroll', 'wages', 'employee'], category: 'operating_expenses', account: 'Salaries & Wages' },
  { keywords: ['bank fee', 'service charge', 'monthly fee', 'nsf', 'wire fee', 'bank charge'], category: 'operating_expenses', account: 'Bank Charges' },
  { keywords: ['interest expense', 'loan interest', 'mortgage interest'], category: 'operating_expenses', account: 'Interest Expense' },
  { keywords: ['insurance'], category: 'operating_expenses', account: 'Insurance Expense' },
  { keywords: ['office supply', 'supplies', 'stationery'], category: 'operating_expenses', account: 'Office Supplies' },
  { keywords: ['software', 'subscription', 'saas', 'adobe', 'microsoft', 'quickbooks', 'xero'], category: 'operating_expenses', account: 'Software & Subscriptions' },
  { keywords: ['advertising', 'marketing', 'facebook ads', 'google ads', 'promotion'], category: 'operating_expenses', account: 'Advertising & Marketing' },
  { keywords: ['telephone', 'internet', 'phone', 'mobile', 'telecom'], category: 'operating_expenses', account: 'Telephone & Internet' },
  { keywords: ['utilities', 'hydro', 'electricity', 'water', 'gas'], category: 'operating_expenses', account: 'Utilities' },
  { keywords: ['travel', 'airfare', 'hotel', 'accommodation', 'uber', 'taxi', 'flight'], category: 'operating_expenses', account: 'Travel Expense' },
  { keywords: ['meals', 'entertainment', 'restaurant', 'dining'], category: 'operating_expenses', account: 'Meals & Entertainment' },
  { keywords: ['professional fee', 'legal', 'accounting', 'consulting'], category: 'operating_expenses', account: 'Professional Fees' },
  { keywords: ['depreciation', 'amortization'], category: 'operating_expenses', account: 'Depreciation' },
  { keywords: ['gst', 'hst', 'pst', 'tax collected', 'tax remittance'], category: 'liabilities', account: 'GST/HST Payable' },
  { keywords: ['loan payment', 'mortgage payment', 'line of credit', 'repayment'], category: 'liabilities', account: 'Loan Payable' },
  { keywords: ['revenue', 'sales', 'invoice', 'payment received', 'deposit', 'customer payment', 'client payment', 'service fee'], category: 'revenue', account: 'Revenue' },
  { keywords: ['interest income', 'interest earned'], category: 'other_income', account: 'Interest Income' },
  { keywords: ['cost of goods', 'cogs', 'inventory', 'purchases', 'supplier', 'vendor payment'], category: 'cogs', account: 'Cost of Goods Sold' },
  { keywords: ['equipment', 'computer', 'machinery', 'furniture', 'vehicle'], category: 'assets', account: 'Fixed Assets' },
  { keywords: ['transfer', 'inter-account', 'sweep'], category: 'assets', account: 'Bank Transfer' },
];

function applySmartMapping(tx) {
  if (tx.category && tx.category !== 'unclassified') return tx;
  const text = ((tx.description || '') + ' ' + (tx.vendor_or_customer || '')).toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(k => text.includes(k))) {
      return { ...tx, category: rule.category, account_name: tx.account_name || rule.account, auto_mapped: true };
    }
  }
  return tx;
}

function detectFileType(fileName) {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  if (['xlsx', 'xls'].includes(ext)) return 'excel';
  if (ext === 'csv') return 'csv';
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'tiff', 'webp'].includes(ext)) return 'image';
  return 'document';
}

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    document_summary: { type: 'string' },
    period_start: { type: 'string' },
    period_end: { type: 'string' },
    opening_balance: { type: 'number' },
    closing_balance: { type: 'number' },
    currency: { type: 'string' },
    statement_type: { type: 'string' },
    transactions: { type: 'array', items: { type: 'object' } },
    total_debits: { type: 'number' },
    total_credits: { type: 'number' },
    chart_of_accounts: { type: 'object' },
  }
};

async function extractSingleFile(base44, url, fileName) {
  const fileType = detectFileType(fileName);
  const prompt = `You are an expert CPA. Extract ALL financial transactions from this ${fileType} file "${fileName}". Return JSON with: document_summary, period_start (YYYY-MM-DD), period_end (YYYY-MM-DD), opening_balance (number or null), closing_balance (number or null), currency (default "CAD"), statement_type (bank_statement/credit_card/invoice/payroll/accounting_export/other), transactions (array), total_debits, total_credits, chart_of_accounts. Each transaction: transaction_date (YYYY-MM-DD or null), description, vendor_or_customer, reference_number, debit_amount (number or null), credit_amount (number or null), account_name, account_code, category (assets/liabilities/equity/revenue/cogs/operating_expenses/other_income/other_expenses/unclassified), source_file ("${fileName}"), confidence (0-1), needs_review (true if confidence<0.85 or key field missing), review_reason. NEVER fabricate amounts. Extract EVERY row.`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    file_urls: [url],
    model: 'gemini_3_flash',
    response_json_schema: EXTRACTION_SCHEMA,
  });

  const txs = (result.transactions || []).map(applySmartMapping);

  // Dedup within file
  const seen = new Set();
  const deduped = txs.map(tx => {
    const key = `${tx.transaction_date}|${tx.debit_amount}|${tx.credit_amount}|${tx.description}`;
    if (seen.has(key)) return { ...tx, needs_review: true, review_reason: 'Possible duplicate transaction' };
    seen.add(key);
    return tx;
  });

  return {
    transactions: deduped,
    total_debits: result.total_debits || deduped.reduce((s, t) => s + (t.debit_amount || 0), 0),
    total_credits: result.total_credits || deduped.reduce((s, t) => s + (t.credit_amount || 0), 0),
    chart_of_accounts: result.chart_of_accounts || {},
    document_summary: result.document_summary || '',
    period_start: result.period_start || null,
    period_end: result.period_end || null,
    opening_balance: result.opening_balance ?? null,
    closing_balance: result.closing_balance ?? null,
    statement_type: result.statement_type || 'other',
    file_name: fileName,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let body = await req.json();
    let isAutomation = false;

    // Entity automation trigger — no user JWT, use service role directly
    if (body.event?.type === 'create' && body.event?.entity_name === 'FinancialReport') {
      const rec = body.data;
      if (!rec || rec.status !== 'extracting') return Response.json({ skipped: true });
      body = { mode: 'financial_report', file_urls: JSON.parse(rec.file_urls || '[]'), file_names: JSON.parse(rec.file_names || '[]'), report_id: rec.id };
      isAutomation = true;
    }

    // For non-automation calls, verify auth
    if (!isAutomation) {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── financial_report: extract all files in parallel ──────────────────────
    if (body.mode === 'financial_report') {
      const fileUrls = body.file_urls || [];
      const fileNames = body.file_names || [];
      const reportId = body.report_id;
      if (!fileUrls.length) return Response.json({ error: 'No files' }, { status: 400 });

      // Init progress
      const progress = fileNames.map((name, i) => ({ name, index: i, status: 'processing', file_type: detectFileType(name) }));
      await base44.asServiceRole.entities.FinancialReport.update(reportId, {
        status: 'extracting',
        file_progress: JSON.stringify(progress),
      });

      // Extract ALL files in parallel — no batching
      const results = await Promise.all(
        fileUrls.map((url, i) =>
          extractSingleFile(base44, url, fileNames[i])
            .then(r => { progress[i].status = 'done'; progress[i].tx_count = r.transactions.length; return r; })
            .catch(e => { progress[i].status = 'failed'; progress[i].error = e.message; return { transactions: [], total_debits: 0, total_credits: 0, chart_of_accounts: {}, file_name: fileNames[i], error: e.message }; })
        )
      );

      const txs = results.flatMap(r => r.transactions || []);
      const mergedChart = results.reduce((acc, r) => Object.assign(acc, r.chart_of_accounts || {}), {});
      const totalDebits = results.reduce((s, r) => s + (r.total_debits || 0), 0);
      const totalCredits = results.reduce((s, r) => s + (r.total_credits || 0), 0);

      const reviewCount = txs.filter(t => t.needs_review).length;
      const mappedCount = txs.filter(t => !t.needs_review && t.category !== 'unclassified').length;
      const autoApproved = txs.filter(t => !t.needs_review).length;
      const unclassified = txs.filter(t => t.category === 'unclassified').length;
      const missingDate = txs.filter(t => !t.transaction_date).length;

      const issues = [];
      if (unclassified > 0) issues.push({ type: 'unclassified', severity: 'medium', message: `${unclassified} transaction(s) could not be auto-categorized` });
      if (missingDate > 0) issues.push({ type: 'missing_date', severity: 'high', message: `${missingDate} transaction(s) have no date` });
      if (reviewCount > 0) issues.push({ type: 'needs_review', severity: 'medium', message: `${reviewCount} transaction(s) flagged for review` });

      const fileMetadata = results.map(r => ({
        file_name: r.file_name, statement_type: r.statement_type,
        period_start: r.period_start, period_end: r.period_end,
        opening_balance: r.opening_balance, closing_balance: r.closing_balance,
        document_summary: r.document_summary, tx_count: (r.transactions || []).length,
        error: r.error || null,
      }));

      await base44.asServiceRole.entities.FinancialReport.update(reportId, {
        status: reviewCount > 0 ? 'review' : 'completed',
        file_progress: JSON.stringify(progress),
        transactions_raw: JSON.stringify(txs),
        transactions_reviewed: JSON.stringify(txs),
        validation_issues: JSON.stringify(issues),
        chart_of_accounts: JSON.stringify(mergedChart),
        total_debits: totalDebits,
        total_credits: totalCredits,
        transaction_count: txs.length,
        mapped_count: mappedCount,
        review_count: reviewCount,
        auto_approved_count: autoApproved,
        file_metadata: JSON.stringify(fileMetadata),
      });

      return Response.json({ success: true, transaction_count: txs.length, needs_review: reviewCount });
    }

    // ── generate_reports ─────────────────────────────────────────────────────
    if (body.mode === 'generate_reports') {
      const reportId = body.report_id;
      const dateFrom = body.date_from || null;
      const dateTo = body.date_to || null;

      const records = await base44.asServiceRole.entities.FinancialReport.filter({ id: reportId });
      if (!records?.length) return Response.json({ error: 'Report not found' }, { status: 404 });
      const rec = records[0];
      const all = JSON.parse(rec.transactions_reviewed || rec.transactions_raw || '[]');
      const txs = all.filter(t => {
        const d = t.transaction_date || t.posting_date;
        if (!d) return true;
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
        return true;
      });

      // Build GL
      const acctMap = {};
      txs.forEach(tx => {
        const n = tx.account_name || 'Unclassified';
        if (!acctMap[n]) acctMap[n] = { account_name: n, account_code: tx.account_code || null, category: tx.category || 'unclassified', transactions: [], debit_total: 0, credit_total: 0, opening_balance: 0, closing_balance: 0 };
        acctMap[n].transactions.push(tx);
        acctMap[n].debit_total += (tx.debit_amount || 0);
        acctMap[n].credit_total += (tx.credit_amount || 0);
      });
      Object.values(acctMap).forEach(a => {
        a.transactions.sort((x, y) => (x.transaction_date || '') < (y.transaction_date || '') ? -1 : 1);
        let running = 0;
        a.transactions = a.transactions.map(tx => { running += (tx.debit_amount || 0) - (tx.credit_amount || 0); return { ...tx, running_balance: running }; });
        a.closing_balance = running;
      });

      const tD = txs.reduce((s, t) => s + (t.debit_amount || 0), 0);
      const tC = txs.reduce((s, t) => s + (t.credit_amount || 0), 0);
      const gl = { generated_at: new Date().toISOString(), date_from: dateFrom, date_to: dateTo, total_debits: tD, total_credits: tC, accounts: Object.values(acctMap), transaction_count: txs.length };

      // Build P&L
      const lines = (cat, useCredit) => { const g = {}; txs.filter(t => t.category === cat).forEach(t => { const k = t.account_name || 'Unclassified'; if (!g[k]) g[k] = { account: k, amount: 0 }; g[k].amount += useCredit ? (t.credit_amount || 0) : (t.debit_amount || 0); }); return Object.values(g); };
      const rev = txs.filter(t => t.category === 'revenue').reduce((s, t) => s + (t.credit_amount || 0), 0);
      const cogs = txs.filter(t => t.category === 'cogs').reduce((s, t) => s + (t.debit_amount || 0), 0);
      const gp = rev - cogs;
      const opex = txs.filter(t => t.category === 'operating_expenses').reduce((s, t) => s + (t.debit_amount || 0), 0);
      const noi = gp - opex;
      const oi = txs.filter(t => t.category === 'other_income').reduce((s, t) => s + (t.credit_amount || 0), 0);
      const oe = txs.filter(t => t.category === 'other_expenses').reduce((s, t) => s + (t.debit_amount || 0), 0);
      const np = noi + oi - oe;

      const monthlyData = {};
      txs.forEach(tx => {
        const d = tx.transaction_date || tx.posting_date;
        if (!d) return;
        const m = d.substring(0, 7);
        if (!monthlyData[m]) monthlyData[m] = { revenue: 0, cogs: 0, opex: 0, other_income: 0, other_expenses: 0 };
        if (tx.category === 'revenue') monthlyData[m].revenue += (tx.credit_amount || 0);
        if (tx.category === 'cogs') monthlyData[m].cogs += (tx.debit_amount || 0);
        if (tx.category === 'operating_expenses') monthlyData[m].opex += (tx.debit_amount || 0);
        if (tx.category === 'other_income') monthlyData[m].other_income += (tx.credit_amount || 0);
        if (tx.category === 'other_expenses') monthlyData[m].other_expenses += (tx.debit_amount || 0);
      });

      const pl = { generated_at: new Date().toISOString(), date_from: dateFrom, date_to: dateTo, revenue: rev, revenue_lines: lines('revenue', true), cogs, cogs_lines: lines('cogs', false), gross_profit: gp, gross_margin_pct: rev > 0 ? ((gp / rev) * 100).toFixed(1) : null, operating_expenses: opex, operating_expense_lines: lines('operating_expenses', false), net_operating_income: noi, other_income: oi, other_income_lines: lines('other_income', true), other_expenses: oe, other_expense_lines: lines('other_expenses', false), net_profit: np, transaction_count: txs.length, monthly_data: monthlyData };

      const now = new Date().toISOString();
      await base44.asServiceRole.entities.FinancialReport.update(reportId, { gl_report: JSON.stringify(gl), pl_report: JSON.stringify(pl), status: 'completed', gl_generated_at: now, pl_generated_at: now });
      return Response.json({ success: true, gl_report: gl, pl_report: pl });
    }

    return Response.json({ error: 'Unknown mode' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});