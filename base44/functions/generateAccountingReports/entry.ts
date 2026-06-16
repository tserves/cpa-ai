import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CATEGORY_RULES = [
  { keywords: ['revenue', 'sales', 'income', 'fees earned', 'service fee', 'billing', 'invoice', 'payment received', 'customer payment', 'client payment', 'deposit'], category: 'revenue', account: 'Revenue' },
  { keywords: ['interest income', 'interest earned', 'dividend', 'gain on sale'], category: 'other_income', account: 'Other Income' },
  { keywords: ['cost of goods', 'cogs', 'inventory', 'purchases', 'supplier', 'vendor payment', 'material', 'raw material', 'cost of sales'], category: 'cogs', account: 'Cost of Goods Sold' },
  { keywords: ['rent', 'lease', 'property'], category: 'operating_expenses', account: 'Rent Expense' },
  { keywords: ['salary', 'payroll', 'wages', 'payroll tax', 'employee', 'benefits', 'hr'], category: 'operating_expenses', account: 'Salaries & Wages' },
  { keywords: ['bank fee', 'service charge', 'monthly fee', 'nsf', 'wire fee', 'bank charge', 'transaction fee'], category: 'operating_expenses', account: 'Bank Charges' },
  { keywords: ['interest expense', 'loan interest', 'mortgage interest', 'finance charge'], category: 'operating_expenses', account: 'Interest Expense' },
  { keywords: ['insurance'], category: 'operating_expenses', account: 'Insurance Expense' },
  { keywords: ['office supply', 'supplies', 'stationery', 'office expense'], category: 'operating_expenses', account: 'Office Supplies' },
  { keywords: ['software', 'subscription', 'saas', 'adobe', 'microsoft', 'google workspace', 'quickbooks', 'xero', 'license'], category: 'operating_expenses', account: 'Software & Subscriptions' },
  { keywords: ['advertising', 'marketing', 'facebook ads', 'google ads', 'promotion', 'media'], category: 'operating_expenses', account: 'Advertising & Marketing' },
  { keywords: ['telephone', 'internet', 'phone', 'mobile', 'telecom', 'cell'], category: 'operating_expenses', account: 'Telephone & Internet' },
  { keywords: ['utilities', 'hydro', 'electricity', 'water', 'gas', 'energy'], category: 'operating_expenses', account: 'Utilities' },
  { keywords: ['travel', 'airfare', 'hotel', 'accommodation', 'uber', 'taxi', 'flight', 'mileage'], category: 'operating_expenses', account: 'Travel Expense' },
  { keywords: ['meals', 'entertainment', 'restaurant', 'dining', 'food'], category: 'operating_expenses', account: 'Meals & Entertainment' },
  { keywords: ['professional fee', 'legal', 'accounting', 'consulting', 'advisor', 'audit fee'], category: 'operating_expenses', account: 'Professional Fees' },
  { keywords: ['depreciation', 'amortization'], category: 'operating_expenses', account: 'Depreciation' },
  { keywords: ['repairs', 'maintenance', 'cleaning', 'janitorial'], category: 'operating_expenses', account: 'Repairs & Maintenance' },
  { keywords: ['gst', 'hst', 'pst', 'vat', 'tax collected', 'tax remittance', 'sales tax'], category: 'liabilities', account: 'GST/HST Payable' },
  { keywords: ['loan payment', 'mortgage payment', 'line of credit', 'repayment', 'note payable', 'credit line'], category: 'liabilities', account: 'Loan Payable' },
  { keywords: ['accounts payable', 'payable', 'ap '], category: 'liabilities', account: 'Accounts Payable' },
  { keywords: ['accounts receivable', 'receivable', 'ar '], category: 'assets', account: 'Accounts Receivable' },
  { keywords: ['equipment', 'computer', 'machinery', 'furniture', 'vehicle', 'asset purchase', 'capital'], category: 'assets', account: 'Fixed Assets' },
  { keywords: ['transfer', 'inter-account', 'sweep', 'internal transfer'], category: 'assets', account: 'Bank Transfer' },
  { keywords: ['opening balance', 'beginning balance', 'brought forward'], category: 'assets', account: 'Opening Balance' },
  { keywords: ['equity', 'shareholder', 'retained', 'owner draw', 'capital contribution', 'dividend paid'], category: 'equity', account: 'Equity' },
];

const ACCOUNT_TYPE_MAP = {
  revenue: 'Income', other_income: 'Income', cogs: 'Cost of Sales',
  operating_expenses: 'Expense', other_expenses: 'Expense',
  assets: 'Asset', liabilities: 'Liability', equity: 'Equity', unclassified: 'Unclassified'
};

function applySmartMapping(tx) {
  if (tx.category && tx.category !== 'unclassified') return tx;
  const text = ((tx.description || '') + ' ' + (tx.vendor_or_customer || '') + ' ' + (tx.account_name || '')).toLowerCase();
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
    document_type: { type: 'string' },
    company_name: { type: 'string' },
    accounting_basis: { type: 'string' },
    period_start: { type: 'string' },
    period_end: { type: 'string' },
    opening_balance: { type: 'number' },
    closing_balance: { type: 'number' },
    currency: { type: 'string' },
    statement_type: { type: 'string' },
    confidence_score: { type: 'number' },
    transactions: { type: 'array', items: { type: 'object' } },
    total_debits: { type: 'number' },
    total_credits: { type: 'number' },
    chart_of_accounts: { type: 'object' },
  }
};

async function extractSingleFile(base44, url, fileName) {
  const fileType = detectFileType(fileName);
  const prompt = `You are an expert CPA and forensic accountant. Extract ALL financial data from this ${fileType} document "${fileName}" with maximum accuracy.

Analyze the document type first — determine if it is a: bank_statement, credit_card_statement, invoice_listing, journal_export, trial_balance, general_ledger_export, profit_loss_statement, balance_sheet, sales_report, purchase_report, expense_report, payroll_report, or other.

Return a JSON object with:
- document_summary: detailed description of the document, institution, entity, and reporting period
- document_type: one of the types listed above
- company_name: entity/company name if detected, else null
- accounting_basis: "cash", "accrual", or "unknown"
- period_start: YYYY-MM-DD or null
- period_end: YYYY-MM-DD or null
- opening_balance: number or null
- closing_balance: number or null
- currency: ISO code (default "CAD")
- confidence_score: 0-100 overall extraction confidence
- statement_type: "bank_statement" | "credit_card" | "invoice" | "payroll" | "journal" | "trial_balance" | "gl_export" | "pl_statement" | "balance_sheet" | "other"
- transactions: array (see below)
- total_debits: sum of all debit amounts
- total_credits: sum of all credit amounts
- chart_of_accounts: object mapping account_name to category

Each transaction must include ALL of these fields (null if not found):
- transaction_date: YYYY-MM-DD
- posting_date: YYYY-MM-DD
- document_number: string
- invoice_number: string
- vendor_or_customer: string
- account_name: best-guess account name
- account_code: string
- description: string (full memo/narration)
- debit_amount: positive number or null
- credit_amount: positive number or null
- net_amount: number (positive=debit, negative=credit)
- tax_amount: number or null
- currency: string
- department: string or null
- payment_method: string or null
- reference_number: string
- balance: running balance or null
- category: one of "assets","liabilities","equity","revenue","cogs","operating_expenses","other_income","other_expenses","unclassified"
- source_file: "${fileName}"
- source_page: page/row number or null
- confidence: 0.0-1.0
- needs_review: true if confidence < 0.8 OR any key field missing OR ambiguous direction
- review_reason: string or null

CRITICAL RULES:
- NEVER fabricate amounts or dates
- For bank statements: deposits/receipts=credit_amount, withdrawals/payments=debit_amount
- Handle parentheses as negative amounts (credits in expense context)
- Detect and flag duplicate transactions (same date+amount+description)
- For Excel/CSV: read all rows, skip blank/total rows, detect headers even if not on row 1
- For PDFs: extract tables accurately, handle multi-page tables, remove page headers/footers
- For scanned documents: use OCR best effort and set lower confidence scores
- Separate tax amounts (GST/HST/VAT) from net amounts where visible
- Preserve original row reference in source_page
- Extract EVERY transaction row — do NOT skip any`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    file_urls: [url],
    model: 'gemini_3_flash',
    response_json_schema: EXTRACTION_SCHEMA,
  });

  const txs = (result.transactions || []).map(applySmartMapping);

  // Dedup detection
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
    document_type: result.document_type || 'other',
    company_name: result.company_name || null,
    accounting_basis: result.accounting_basis || 'unknown',
    period_start: result.period_start || null,
    period_end: result.period_end || null,
    opening_balance: result.opening_balance ?? null,
    closing_balance: result.closing_balance ?? null,
    statement_type: result.statement_type || 'other',
    confidence_score: result.confidence_score || 50,
    currency: result.currency || 'CAD',
    file_name: fileName,
  };
}

function buildValidationIssues(txs, fileResults) {
  const issues = [];
  const unclassified = txs.filter(t => t.category === 'unclassified').length;
  const missingDate = txs.filter(t => !t.transaction_date).length;
  const missingAmount = txs.filter(t => !t.debit_amount && !t.credit_amount).length;
  const reviewCount = txs.filter(t => t.needs_review).length;
  const totalDebits = txs.reduce((s, t) => s + (t.debit_amount || 0), 0);
  const totalCredits = txs.reduce((s, t) => s + (t.credit_amount || 0), 0);

  if (unclassified > 0) issues.push({ type: 'unclassified', severity: 'medium', message: `${unclassified} transaction(s) could not be auto-categorized — please classify manually` });
  if (missingDate > 0) issues.push({ type: 'missing_date', severity: 'high', message: `${missingDate} transaction(s) are missing a date` });
  if (missingAmount > 0) issues.push({ type: 'missing_amount', severity: 'high', message: `${missingAmount} transaction(s) have no debit or credit amount` });
  if (reviewCount > 0) issues.push({ type: 'needs_review', severity: 'medium', message: `${reviewCount} transaction(s) are low-confidence and need review` });

  const diff = Math.abs(totalDebits - totalCredits);
  if (diff > 0.01) issues.push({ type: 'imbalance', severity: 'high', message: `Debit/credit imbalance of ${diff.toFixed(2)} — verify categorization` });

  for (const fr of fileResults) {
    if (fr.opening_balance != null && fr.closing_balance != null) {
      const fileTxs = txs.filter(t => t.source_file === fr.file_name);
      const credits = fileTxs.reduce((s, t) => s + (t.credit_amount || 0), 0);
      const debits = fileTxs.reduce((s, t) => s + (t.debit_amount || 0), 0);
      const computed = fr.opening_balance + credits - debits;
      const diff = Math.abs(computed - fr.closing_balance);
      if (diff > 0.05) issues.push({ type: 'balance_mismatch', severity: 'high', message: `${fr.file_name}: Balance mismatch of $${diff.toFixed(2)}` });
    }
  }

  return { issues, totalDebits, totalCredits };
}

function buildGL(txs) {
  const acctMap = {};
  txs.forEach(tx => {
    const n = tx.account_name || 'Unclassified';
    if (!acctMap[n]) acctMap[n] = { account_name: n, account_code: tx.account_code || null, category: tx.category || 'unclassified', account_type: ACCOUNT_TYPE_MAP[tx.category] || 'Unclassified', transactions: [], debit_total: 0, credit_total: 0, opening_balance: 0, closing_balance: 0 };
    acctMap[n].transactions.push(tx);
    acctMap[n].debit_total += (tx.debit_amount || 0);
    acctMap[n].credit_total += (tx.credit_amount || 0);
  });
  Object.values(acctMap).forEach(a => {
    a.transactions.sort((x, y) => (x.transaction_date || '') < (y.transaction_date || '') ? -1 : 1);
    let running = a.opening_balance;
    a.transactions = a.transactions.map(tx => { running += (tx.debit_amount || 0) - (tx.credit_amount || 0); return { ...tx, running_balance: running }; });
    a.closing_balance = running;
  });
  const tD = txs.reduce((s, t) => s + (t.debit_amount || 0), 0);
  const tC = txs.reduce((s, t) => s + (t.credit_amount || 0), 0);
  return { generated_at: new Date().toISOString(), total_debits: tD, total_credits: tC, accounts: Object.values(acctMap), transaction_count: txs.length };
}

function buildPL(txs) {
  const sum = (cat, field) => txs.filter(t => t.category === cat).reduce((s, t) => s + (t[field] || 0), 0);
  const lines = (cat, useCredit) => { const g = {}; txs.filter(t => t.category === cat).forEach(t => { const k = t.account_name || 'Unclassified'; if (!g[k]) g[k] = { account: k, amount: 0 }; g[k].amount += useCredit ? (t.credit_amount || 0) : (t.debit_amount || 0); }); return Object.values(g); };
  const rev = sum('revenue', 'credit_amount');
  const cogs = sum('cogs', 'debit_amount');
  const gp = rev - cogs;
  const opex = sum('operating_expenses', 'debit_amount');
  const noi = gp - opex;
  const oi = sum('other_income', 'credit_amount');
  const oe = sum('other_expenses', 'debit_amount');
  const np = noi + oi - oe;
  const monthlyData = {};
  txs.forEach(tx => {
    const d = tx.transaction_date; if (!d) return;
    const m = d.substring(0, 7);
    if (!monthlyData[m]) monthlyData[m] = { revenue: 0, cogs: 0, opex: 0, other_income: 0, other_expenses: 0 };
    if (tx.category === 'revenue') monthlyData[m].revenue += (tx.credit_amount || 0);
    if (tx.category === 'cogs') monthlyData[m].cogs += (tx.debit_amount || 0);
    if (tx.category === 'operating_expenses') monthlyData[m].opex += (tx.debit_amount || 0);
    if (tx.category === 'other_income') monthlyData[m].other_income += (tx.credit_amount || 0);
    if (tx.category === 'other_expenses') monthlyData[m].other_expenses += (tx.debit_amount || 0);
  });
  return { generated_at: new Date().toISOString(), revenue: rev, revenue_lines: lines('revenue', true), cogs, cogs_lines: lines('cogs', false), gross_profit: gp, gross_margin_pct: rev > 0 ? ((gp / rev) * 100).toFixed(1) : '0.0', operating_expenses: opex, operating_expense_lines: lines('operating_expenses', false), net_operating_income: noi, other_income: oi, other_income_lines: lines('other_income', true), other_expenses: oe, other_expense_lines: lines('other_expenses', false), net_profit: np, transaction_count: txs.length, monthly_data: monthlyData };
}

function buildTrialBalance(txs) {
  const acctMap = {};
  txs.forEach(tx => {
    const n = tx.account_name || 'Unclassified';
    if (!acctMap[n]) acctMap[n] = { account_name: n, account_code: tx.account_code || null, category: tx.category || 'unclassified', account_type: ACCOUNT_TYPE_MAP[tx.category] || 'Unclassified', debit_total: 0, credit_total: 0 };
    acctMap[n].debit_total += (tx.debit_amount || 0);
    acctMap[n].credit_total += (tx.credit_amount || 0);
  });
  const accounts = Object.values(acctMap).map(a => ({ ...a, net_balance: a.debit_total - a.credit_total }));
  const totalDebits = accounts.reduce((s, a) => s + a.debit_total, 0);
  const totalCredits = accounts.reduce((s, a) => s + a.credit_total, 0);
  return { generated_at: new Date().toISOString(), accounts, total_debits: totalDebits, total_credits: totalCredits, is_balanced: Math.abs(totalDebits - totalCredits) < 0.01 };
}

function buildTransactionSummary(txs) {
  const byCategory = {};
  txs.forEach(tx => {
    const cat = tx.category || 'unclassified';
    if (!byCategory[cat]) byCategory[cat] = { category: cat, count: 0, total_debit: 0, total_credit: 0 };
    byCategory[cat].count++;
    byCategory[cat].total_debit += (tx.debit_amount || 0);
    byCategory[cat].total_credit += (tx.credit_amount || 0);
  });
  return { generated_at: new Date().toISOString(), total_transactions: txs.length, by_category: Object.values(byCategory), total_debits: txs.reduce((s, t) => s + (t.debit_amount || 0), 0), total_credits: txs.reduce((s, t) => s + (t.credit_amount || 0), 0) };
}

function buildVendorLedger(txs) {
  const vendorMap = {};
  txs.filter(t => t.debit_amount > 0 || t.vendor_or_customer).forEach(tx => {
    const v = tx.vendor_or_customer || 'Unknown Vendor';
    if (!vendorMap[v]) vendorMap[v] = { vendor: v, transactions: [], total_paid: 0, transaction_count: 0 };
    vendorMap[v].transactions.push(tx);
    vendorMap[v].total_paid += (tx.debit_amount || 0);
    vendorMap[v].transaction_count++;
  });
  return { generated_at: new Date().toISOString(), vendors: Object.values(vendorMap).sort((a, b) => b.total_paid - a.total_paid) };
}

function buildCustomerLedger(txs) {
  const custMap = {};
  txs.filter(t => t.credit_amount > 0 || t.category === 'revenue').forEach(tx => {
    const c = tx.vendor_or_customer || 'Unknown Customer';
    if (!custMap[c]) custMap[c] = { customer: c, transactions: [], total_received: 0, transaction_count: 0 };
    custMap[c].transactions.push(tx);
    custMap[c].total_received += (tx.credit_amount || 0);
    custMap[c].transaction_count++;
  });
  return { generated_at: new Date().toISOString(), customers: Object.values(custMap).sort((a, b) => b.total_received - a.total_received) };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let body = await req.json();
    let isAutomation = false;

    // Entity automation trigger
    if (body.event?.type === 'create' && body.event?.entity_name === 'AccountingReport') {
      const rec = body.data;
      if (!rec || rec.status !== 'extracting') return Response.json({ skipped: true });
      body = { mode: 'extract', file_urls: JSON.parse(rec.file_urls || '[]'), file_names: JSON.parse(rec.file_names || '[]'), report_id: rec.id };
      isAutomation = true;
    }

    if (!isAutomation) {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── EXTRACT ──────────────────────────────────────────────────────────────
    if (body.mode === 'extract') {
      const { file_urls: fileUrls, file_names: fileNames, report_id: reportId } = body;
      if (!fileUrls?.length) return Response.json({ error: 'No files' }, { status: 400 });

      const progress = fileNames.map((name, i) => ({ name, index: i, status: 'processing', file_type: detectFileType(name) }));
      await base44.asServiceRole.entities.AccountingReport.update(reportId, { status: 'extracting', file_progress: JSON.stringify(progress) });

      const results = await Promise.all(
        fileUrls.map((url, i) =>
          extractSingleFile(base44, url, fileNames[i])
            .then(r => { progress[i].status = 'done'; progress[i].tx_count = r.transactions.length; progress[i].confidence = r.confidence_score; return r; })
            .catch(e => { progress[i].status = 'failed'; progress[i].error = e.message; return { transactions: [], total_debits: 0, total_credits: 0, chart_of_accounts: {}, file_name: fileNames[i], error: e.message, confidence_score: 0 }; })
        )
      );

      const txs = results.flatMap(r => r.transactions || []);
      const mergedChart = results.reduce((acc, r) => Object.assign(acc, r.chart_of_accounts || {}), {});
      const { issues, totalDebits, totalCredits } = buildValidationIssues(txs, results);
      const reviewCount = txs.filter(t => t.needs_review).length;
      const autoApproved = txs.filter(t => !t.needs_review).length;
      const avgConfidence = results.length > 0 ? Math.round(results.reduce((s, r) => s + (r.confidence_score || 0), 0) / results.length) : 0;
      const companyName = results.find(r => r.company_name)?.company_name || null;
      const currency = results.find(r => r.currency)?.currency || 'CAD';
      const accountingBasis = results.find(r => r.accounting_basis && r.accounting_basis !== 'unknown')?.accounting_basis || 'unknown';
      const dateFrom = results.map(r => r.period_start).filter(Boolean).sort()[0] || null;
      const dateTo = results.map(r => r.period_end).filter(Boolean).sort().reverse()[0] || null;

      const fileMetadata = results.map(r => ({
        file_name: r.file_name, document_type: r.document_type, statement_type: r.statement_type,
        company_name: r.company_name, period_start: r.period_start, period_end: r.period_end,
        opening_balance: r.opening_balance, closing_balance: r.closing_balance,
        document_summary: r.document_summary, tx_count: (r.transactions || []).length,
        confidence_score: r.confidence_score, error: r.error || null,
      }));

      await base44.asServiceRole.entities.AccountingReport.update(reportId, {
        status: 'review',
        file_progress: JSON.stringify(progress),
        transactions_raw: JSON.stringify(txs),
        transactions_reviewed: JSON.stringify(txs),
        validation_issues: JSON.stringify(issues),
        chart_of_accounts: JSON.stringify(mergedChart),
        total_debits: totalDebits,
        total_credits: totalCredits,
        transaction_count: txs.length,
        review_count: reviewCount,
        auto_approved_count: autoApproved,
        confidence_score: avgConfidence,
        file_metadata: JSON.stringify(fileMetadata),
        company_name: companyName,
        currency,
        accounting_basis: accountingBasis,
        date_from: dateFrom,
        date_to: dateTo,
      });

      return Response.json({ success: true, transaction_count: txs.length, needs_review: reviewCount, confidence: avgConfidence });
    }

    // ── GENERATE REPORTS ─────────────────────────────────────────────────────
    if (body.mode === 'generate') {
      const { report_id: reportId, report_types, date_from: dateFrom, date_to: dateTo } = body;
      const records = await base44.asServiceRole.entities.AccountingReport.filter({ id: reportId });
      if (!records?.length) return Response.json({ error: 'Not found' }, { status: 404 });
      const rec = records[0];
      const all = JSON.parse(rec.transactions_reviewed || rec.transactions_raw || '[]');
      const txs = all.filter(t => {
        const d = t.transaction_date || t.posting_date;
        if (!d) return true;
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
        return true;
      });

      const updates = { status: 'completed', reports_generated: JSON.stringify(report_types) };
      const generated = {};

      if (report_types.includes('gl')) { const gl = buildGL(txs); updates.gl_report = JSON.stringify(gl); generated.gl = gl; }
      if (report_types.includes('pl')) { const pl = buildPL(txs); updates.pl_report = JSON.stringify(pl); generated.pl = pl; }
      if (report_types.includes('trial_balance')) { const tb = buildTrialBalance(txs); updates.trial_balance = JSON.stringify(tb); generated.trial_balance = tb; }
      if (report_types.includes('transaction_summary')) { const ts = buildTransactionSummary(txs); updates.transaction_summary = JSON.stringify(ts); generated.transaction_summary = ts; }
      if (report_types.includes('vendor_ledger')) { const vl = buildVendorLedger(txs); updates.vendor_ledger = JSON.stringify(vl); generated.vendor_ledger = vl; }
      if (report_types.includes('customer_ledger')) { const cl = buildCustomerLedger(txs); updates.customer_ledger = JSON.stringify(cl); generated.customer_ledger = cl; }

      await base44.asServiceRole.entities.AccountingReport.update(reportId, updates);
      return Response.json({ success: true, generated: Object.keys(generated) });
    }

    return Response.json({ error: 'Unknown mode' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});