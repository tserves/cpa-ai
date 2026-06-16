import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Smart category mapping rules — keyword → category
const CATEGORY_RULES = [
  { keywords: ['rent', 'lease', 'property'], category: 'operating_expenses', account: 'Rent Expense' },
  { keywords: ['salary', 'payroll', 'wages', 'payroll tax', 'employee'], category: 'operating_expenses', account: 'Salaries & Wages' },
  { keywords: ['bank fee', 'service charge', 'monthly fee', 'nsf', 'wire fee', 'bank charge'], category: 'operating_expenses', account: 'Bank Charges' },
  { keywords: ['interest expense', 'loan interest', 'mortgage interest'], category: 'operating_expenses', account: 'Interest Expense' },
  { keywords: ['insurance'], category: 'operating_expenses', account: 'Insurance Expense' },
  { keywords: ['office supply', 'supplies', 'stationery'], category: 'operating_expenses', account: 'Office Supplies' },
  { keywords: ['software', 'subscription', 'saas', 'adobe', 'microsoft', 'google workspace', 'quickbooks', 'xero'], category: 'operating_expenses', account: 'Software & Subscriptions' },
  { keywords: ['advertising', 'marketing', 'facebook ads', 'google ads', 'promotion'], category: 'operating_expenses', account: 'Advertising & Marketing' },
  { keywords: ['telephone', 'internet', 'phone', 'mobile', 'telecom'], category: 'operating_expenses', account: 'Telephone & Internet' },
  { keywords: ['utilities', 'hydro', 'electricity', 'water', 'gas'], category: 'operating_expenses', account: 'Utilities' },
  { keywords: ['travel', 'airfare', 'hotel', 'accommodation', 'uber', 'taxi', 'flight'], category: 'operating_expenses', account: 'Travel Expense' },
  { keywords: ['meals', 'entertainment', 'restaurant', 'dining'], category: 'operating_expenses', account: 'Meals & Entertainment' },
  { keywords: ['professional fee', 'legal', 'accounting', 'consulting', 'advisor'], category: 'operating_expenses', account: 'Professional Fees' },
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
  return 'unknown';
}

function buildExtractionPrompt(fileName, fileType) {
  const base = `You are an expert CPA and financial data extraction AI. Extract ALL financial transactions from this ${fileType} document "${fileName}".

Return a JSON object with:
- document_summary: string describing the document type, institution, and period
- period_start: YYYY-MM-DD or null
- period_end: YYYY-MM-DD or null  
- opening_balance: number or null (for bank statements)
- closing_balance: number or null (for bank statements)
- currency: string (default "CAD")
- transactions: array of transaction objects
- total_debits: sum of all debit amounts
- total_credits: sum of all credit amounts
- chart_of_accounts: object grouping account_names by category
- statement_type: one of "bank_statement","credit_card","invoice","payroll","accounting_export","other"

Each transaction object must include:
- transaction_date: YYYY-MM-DD or null
- posting_date: YYYY-MM-DD or null
- description: string
- vendor_or_customer: string or null
- reference_number: string or null
- debit_amount: positive number or null
- credit_amount: positive number or null
- balance: running balance after transaction, or null
- account_name: best-guess account name
- account_code: string or null
- category: one of "assets","liabilities","equity","revenue","cogs","operating_expenses","other_income","other_expenses","unclassified"
- tax_amount: number or null
- payment_method: string or null
- source_file: "${fileName}"
- source_page: page or row number if determinable, else null
- confidence: 0.0-1.0 (how certain you are about this transaction)
- needs_review: true if confidence < 0.85 OR any key field (date, amount) is missing OR unclear debit/credit direction
- review_reason: string explaining why needs_review is true, or null

CRITICAL RULES:
- NEVER fabricate amounts or dates. If unclear, set to null and needs_review=true
- For bank statements: deposits/credits go to credit_amount, withdrawals/debits go to debit_amount
- Detect duplicates: flag transactions with same date+amount+description as needs_review with review_reason "Possible duplicate"
- If a transaction is a bank fee, auto-categorize as operating_expenses
- Preserve exact amounts as shown — do not round
- Extract EVERY row, not just summaries`;
  return base;
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

async function extractSingleFile(base44, url, fileName, fileIndex, totalFiles) {
  const fileType = detectFileType(fileName);
  const prompt = buildExtractionPrompt(fileName, fileType);
  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    file_urls: [url],
    model: 'gemini_3_flash',
    response_json_schema: EXTRACTION_SCHEMA,
  });

  // Apply smart mapping to unclassified transactions
  const txs = (result.transactions || []).map(applySmartMapping);

  // Detect duplicates within this file
  const seen = new Map();
  const deduped = txs.map(tx => {
    const key = `${tx.transaction_date}|${tx.debit_amount}|${tx.credit_amount}|${tx.description}`;
    if (seen.has(key)) {
      return { ...tx, needs_review: true, review_reason: 'Possible duplicate transaction' };
    }
    seen.set(key, true);
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
    opening_balance: result.opening_balance || null,
    closing_balance: result.closing_balance || null,
    statement_type: result.statement_type || 'other',
    file_name: fileName,
    file_index: fileIndex,
  };
}

function runValidation(txs, fileResults) {
  const issues = [];
  const reviewCount = txs.filter(t => t.needs_review).length;
  const unclassified = txs.filter(t => t.category === 'unclassified').length;
  const missingDate = txs.filter(t => !t.transaction_date).length;
  const missingAmount = txs.filter(t => !t.debit_amount && !t.credit_amount).length;
  const totalDebits = txs.reduce((s, t) => s + (t.debit_amount || 0), 0);
  const totalCredits = txs.reduce((s, t) => s + (t.credit_amount || 0), 0);

  if (unclassified > 0) issues.push({ type: 'unclassified', severity: 'medium', message: `${unclassified} transaction(s) could not be auto-categorized` });
  if (missingDate > 0) issues.push({ type: 'missing_date', severity: 'high', message: `${missingDate} transaction(s) have no date` });
  if (missingAmount > 0) issues.push({ type: 'missing_amount', severity: 'high', message: `${missingAmount} transaction(s) have no amount` });
  if (reviewCount > 0) issues.push({ type: 'needs_review', severity: 'medium', message: `${reviewCount} transaction(s) flagged for review` });

  // Check bank statement balance reconciliation
  for (const fr of fileResults) {
    if (fr.opening_balance != null && fr.closing_balance != null) {
      const fileTxs = txs.filter(t => t.source_file === fr.file_name);
      const fileCredits = fileTxs.reduce((s, t) => s + (t.credit_amount || 0), 0);
      const fileDebits = fileTxs.reduce((s, t) => s + (t.debit_amount || 0), 0);
      const computedClosing = fr.opening_balance + fileCredits - fileDebits;
      const diff = Math.abs(computedClosing - fr.closing_balance);
      if (diff > 0.05) {
        issues.push({ type: 'balance_mismatch', severity: 'high', message: `${fr.file_name}: Balance mismatch of $${diff.toFixed(2)} (expected closing $${fr.closing_balance?.toFixed(2)})` });
      }
    }
  }

  return { issues, totalDebits, totalCredits };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    let body = await req.json();

    // Entity automation trigger
    if (body.event?.type === 'create' && body.event?.entity_name === 'FinancialReport') {
      const rec = body.data;
      if (!rec || rec.status !== 'extracting') return Response.json({ skipped: true });
      const fileUrls = JSON.parse(rec.file_urls || '[]');
      const fileNames = JSON.parse(rec.file_names || '[]');
      body = { mode: 'financial_report', file_urls: fileUrls, file_names: fileNames, report_id: rec.id };
    }

    // ── MODE: financial_report ──────────────────────────────────────────────
    if (body.mode === 'financial_report') {
      const fileUrls = body.file_urls || [];
      const fileNames = body.file_names || [];
      const reportId = body.report_id;
      if (!fileUrls.length) return Response.json({ error: 'No files' }, { status: 400 });

      // Mark extracting + init file_progress
      const initialProgress = fileNames.map((name, i) => ({ name, index: i, status: 'pending', file_type: detectFileType(name) }));
      await base44.asServiceRole.entities.FinancialReport.update(reportId, {
        status: 'extracting',
        file_progress: JSON.stringify(initialProgress),
      });

      const allFileResults = [];
      const BATCH_SIZE = 3;

      for (let i = 0; i < fileUrls.length; i += BATCH_SIZE) {
        const batchIndexes = [];
        for (let j = i; j < Math.min(i + BATCH_SIZE, fileUrls.length); j++) batchIndexes.push(j);

        // Mark batch as processing
        const progressUpdate = initialProgress.map((p, idx) => {
          if (batchIndexes.includes(idx)) return { ...p, status: 'processing' };
          return p;
        });
        await base44.asServiceRole.entities.FinancialReport.update(reportId, { file_progress: JSON.stringify(progressUpdate) });

        // Process batch in parallel
        const batchPromises = batchIndexes.map(idx =>
          extractSingleFile(base44, fileUrls[idx], fileNames[idx], idx, fileUrls.length)
            .catch(e => ({ transactions: [], total_debits: 0, total_credits: 0, chart_of_accounts: {}, file_name: fileNames[idx], file_index: idx, error: e.message }))
        );
        const batchResults = await Promise.all(batchPromises);

        // Mark batch done
        batchResults.forEach((r, bi) => {
          const idx = batchIndexes[bi];
          initialProgress[idx] = { ...initialProgress[idx], status: r.error ? 'failed' : 'done', tx_count: (r.transactions || []).length, error: r.error || null };
        });
        allFileResults.push(...batchResults);

        // Save partial progress + partial transactions
        const partialTxs = allFileResults.flatMap(r => r.transactions || []);
        await base44.asServiceRole.entities.FinancialReport.update(reportId, {
          file_progress: JSON.stringify(initialProgress),
          transactions_raw: JSON.stringify(partialTxs),
          transaction_count: partialTxs.length,
        });
      }

      // Final merge
      const txs = allFileResults.flatMap(r => r.transactions || []);
      const mergedChart = allFileResults.reduce((acc, r) => Object.assign(acc, r.chart_of_accounts || {}), {});
      const { issues, totalDebits, totalCredits } = runValidation(txs, allFileResults);

      const reviewCount = txs.filter(t => t.needs_review).length;
      const mappedCount = txs.filter(t => !t.needs_review && t.category !== 'unclassified').length;
      const autoApproved = txs.filter(t => !t.needs_review).length;

      const fileMetadata = allFileResults.map(r => ({
        file_name: r.file_name,
        statement_type: r.statement_type,
        period_start: r.period_start,
        period_end: r.period_end,
        opening_balance: r.opening_balance,
        closing_balance: r.closing_balance,
        document_summary: r.document_summary,
        tx_count: (r.transactions || []).length,
        error: r.error || null,
      }));

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
        file_metadata: JSON.stringify(fileMetadata),
        auto_approved_count: autoApproved,
      });

      return Response.json({ success: true, transaction_count: txs.length, needs_review: reviewCount, auto_approved: autoApproved, validation_issues: issues.length });
    }

    // ── MODE: generate_reports ──────────────────────────────────────────────
    if (body.mode === 'generate_reports') {
      const reportId = body.report_id;
      const dateFrom = body.date_from || null;
      const dateTo = body.date_to || null;
      const periodView = body.period_view || 'all'; // monthly | quarterly | yearly | all

      const records = await base44.asServiceRole.entities.FinancialReport.filter({ id: reportId });
      if (!records || !records.length) return Response.json({ error: 'Report not found' }, { status: 404 });
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
        let running = a.opening_balance;
        a.transactions = a.transactions.map(tx => {
          running += (tx.debit_amount || 0) - (tx.credit_amount || 0);
          return { ...tx, running_balance: running };
        });
        a.closing_balance = running;
      });

      const tD = txs.reduce((s, t) => s + (t.debit_amount || 0), 0);
      const tC = txs.reduce((s, t) => s + (t.credit_amount || 0), 0);
      const gl = { generated_at: new Date().toISOString(), date_from: dateFrom, date_to: dateTo, total_debits: tD, total_credits: tC, accounts: Object.values(acctMap), transaction_count: txs.length };

      // Build P&L
      const lines = (cat, useCredit) => {
        const g = {};
        txs.filter(t => t.category === cat).forEach(t => {
          const k = t.account_name || 'Unclassified';
          if (!g[k]) g[k] = { account: k, amount: 0, transactions: [] };
          g[k].amount += useCredit ? (t.credit_amount || 0) : (t.debit_amount || 0);
          g[k].transactions.push(t);
        });
        return Object.values(g);
      };

      const rev = txs.filter(t => t.category === 'revenue').reduce((s, t) => s + (t.credit_amount || 0), 0);
      const cogs = txs.filter(t => t.category === 'cogs').reduce((s, t) => s + (t.debit_amount || 0), 0);
      const gp = rev - cogs;
      const opex = txs.filter(t => t.category === 'operating_expenses').reduce((s, t) => s + (t.debit_amount || 0), 0);
      const noi = gp - opex;
      const oi = txs.filter(t => t.category === 'other_income').reduce((s, t) => s + (t.credit_amount || 0), 0);
      const oe = txs.filter(t => t.category === 'other_expenses').reduce((s, t) => s + (t.debit_amount || 0), 0);
      const np = noi + oi - oe;

      // Monthly breakdown
      const monthlyData = {};
      txs.forEach(tx => {
        const d = tx.transaction_date || tx.posting_date;
        if (!d) return;
        const month = d.substring(0, 7);
        if (!monthlyData[month]) monthlyData[month] = { revenue: 0, cogs: 0, opex: 0, other_income: 0, other_expenses: 0 };
        if (tx.category === 'revenue') monthlyData[month].revenue += (tx.credit_amount || 0);
        if (tx.category === 'cogs') monthlyData[month].cogs += (tx.debit_amount || 0);
        if (tx.category === 'operating_expenses') monthlyData[month].opex += (tx.debit_amount || 0);
        if (tx.category === 'other_income') monthlyData[month].other_income += (tx.credit_amount || 0);
        if (tx.category === 'other_expenses') monthlyData[month].other_expenses += (tx.debit_amount || 0);
      });

      const pl = {
        generated_at: new Date().toISOString(), date_from: dateFrom, date_to: dateTo,
        revenue: rev, revenue_lines: lines('revenue', true),
        cogs, cogs_lines: lines('cogs', false),
        gross_profit: gp, gross_margin_pct: rev > 0 ? ((gp / rev) * 100).toFixed(1) : null,
        operating_expenses: opex, operating_expense_lines: lines('operating_expenses', false),
        net_operating_income: noi,
        other_income: oi, other_income_lines: lines('other_income', true),
        other_expenses: oe, other_expense_lines: lines('other_expenses', false),
        net_profit: np, transaction_count: txs.length,
        monthly_data: monthlyData,
      };

      const now = new Date().toISOString();
      await base44.asServiceRole.entities.FinancialReport.update(reportId, {
        gl_report: JSON.stringify(gl), pl_report: JSON.stringify(pl),
        status: 'completed', gl_generated_at: now, pl_generated_at: now,
      });
      return Response.json({ success: true, gl_report: gl, pl_report: pl });
    }

    return Response.json({ error: 'Unknown mode' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});