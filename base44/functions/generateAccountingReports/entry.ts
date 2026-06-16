import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CATEGORY_RULES = [
  { keywords: ['sales revenue','service revenue','invoice payment','client payment','customer payment','payment received','fees earned','billing','retainer'], category: 'revenue', account: 'Service Revenue', pl_include: true },
  { keywords: ['interest income','interest earned','dividend','gain on sale','refund received'], category: 'other_income', account: 'Other Income', pl_include: true },
  { keywords: ['cost of goods','cogs','direct cost','job cost','contractor','subcontractor','material','supplies used'], category: 'cogs', account: 'Direct Job Costs', pl_include: true },
  { keywords: ['bank fee','service charge','monthly fee','nsf','wire fee','bank charge','transaction fee','account fee','merchant fee','payment processing','interac fee','e-transfer fee'], category: 'bank_fees', account: 'Bank & Merchant Fees', pl_include: true },
  { keywords: ['rent','lease payment','property management','commercial lease'], category: 'rent', account: 'Rent / Lease', pl_include: true },
  { keywords: ['salary','payroll','wages','payroll tax','employee','benefits','remittance'], category: 'payroll', account: 'Salaries & Wages', pl_include: true },
  { keywords: ['insurance premium','insurance payment','policy payment'], category: 'insurance', account: 'Insurance', pl_include: true },
  { keywords: ['hydro','electricity','water bill','natural gas','energy bill','utility','enbridge','ontario hydro'], category: 'utilities', account: 'Utilities', pl_include: true },
  { keywords: ['software','subscription','saas','adobe','microsoft 365','google workspace','quickbooks','xero','license fee','app subscription','slack','zoom'], category: 'software', account: 'Software & Subscriptions', pl_include: true },
  { keywords: ['facebook ads','google ads','advertising','marketing','promotion','media buy','seo','social media'], category: 'advertising', account: 'Advertising & Marketing', pl_include: true },
  { keywords: ['telephone','internet','phone bill','mobile','telecom','cell plan','rogers','bell','telus','shaw'], category: 'telecom', account: 'Telecommunications', pl_include: true },
  { keywords: ['fuel','gas station','petro','esso','shell','gasoline','petro-canada'], category: 'fuel', account: 'Fuel', pl_include: true },
  { keywords: ['vehicle','auto insurance','car payment','car lease','auto lease'], category: 'vehicle', account: 'Vehicle / Auto Expense', pl_include: true },
  { keywords: ['airfare','hotel','accommodation','uber','taxi','flight','travel expense','mileage','via rail'], category: 'travel', account: 'Travel', pl_include: true },
  { keywords: ['restaurant','dining','meals','food delivery','catering','tim hortons','starbucks','doordash'], category: 'meals', account: 'Meals & Entertainment', pl_include: true },
  { keywords: ['legal fee','accounting fee','professional fee','consultant','advisor fee','audit','bookkeeping'], category: 'professional_fees', account: 'Professional Fees', pl_include: true },
  { keywords: ['office supply','stationery','office expense','staples','bestbuy','amazon office'], category: 'office_supplies', account: 'Office Supplies', pl_include: true },
  { keywords: ['repair','maintenance','cleaning','janitorial','plumber','electrician'], category: 'repairs', account: 'Repairs & Maintenance', pl_include: true },
  { keywords: ['interest expense','loan interest','finance charge','financing','overdraft interest'], category: 'interest_expense', account: 'Interest / Financing Charges', pl_include: true },
  { keywords: ['miscellaneous','misc expense','other expense'], category: 'misc_expense', account: 'Miscellaneous Expense', pl_include: true },
  { keywords: ['owner draw','personal withdrawal','shareholder draw','owner withdrawal'], category: 'owner_draw', account: 'Owner Draw', pl_include: false },
  { keywords: ['owner contribution','capital contribution','shareholder loan in','personal deposit'], category: 'owner_contribution', account: 'Owner Contribution', pl_include: false },
  { keywords: ['transfer to','transfer from','internal transfer','inter-account','sweep','tfr'], category: 'transfer', account: 'Transfers Between Accounts', pl_include: false },
  { keywords: ['credit card payment','visa payment','mastercard payment','amex payment','cc payment','card payment'], category: 'cc_payment', account: 'Credit Card Payment', pl_include: false },
  { keywords: ['loan payment','mortgage payment','line of credit payment','loc payment','vehicle loan'], category: 'loan_payment', account: 'Loan Payment', pl_include: false },
  { keywords: ['atm withdrawal','cash withdrawal','cash advance','atm'], category: 'cash_withdrawal', account: 'Cash Withdrawal', pl_include: false },
  { keywords: ['cheque','check #','chq '], category: 'cheque', account: 'Cheque Payment', pl_include: false },
  { keywords: ['gst','hst','pst','vat','tax remittance','tax payment to cra','cra payment'], category: 'tax_remittance', account: 'Tax Remittance', pl_include: false },
  { keywords: ['asset purchase','equipment purchase','capital purchase','machinery','computer purchase'], category: 'asset_purchase', account: 'Asset Purchase', pl_include: false },
];

const REVIEW_PATTERNS = [
  { pattern: /e.?transfer|etransfer|interac e/i, reason: 'E-Transfer — confirm business purpose and payee' },
  { pattern: /\batm\b|cash withdrawal|cash advance/i, reason: 'ATM/Cash withdrawal — confirm business use' },
  { pattern: /credit card payment|visa pmt|mastercard pmt|amex pmt/i, reason: 'Credit card payment — avoid double-counting expenses' },
  { pattern: /transfer (to|from)|inter.?account|tfr/i, reason: 'Interbank transfer — confirm not a real expense' },
  { pattern: /loan payment|mortgage|line of credit/i, reason: 'Financing payment — split principal vs interest' },
  { pattern: /cheque|chq \d|check #/i, reason: 'Cheque — verify payee and business purpose' },
  { pattern: /personal|owner|draw|private use/i, reason: 'Possible personal transaction — review carefully' },
];

function applySmartMapping(tx) {
  const text = ((tx.description || '') + ' ' + (tx.raw_text || '') + ' ' + (tx.vendor_or_customer || '')).toLowerCase();
  let mapped = { ...tx };
  for (const flag of REVIEW_PATTERNS) {
    if (flag.pattern.test(text) && !mapped.needs_review) {
      mapped = { ...mapped, needs_review: true, review_reason: flag.reason };
    }
  }
  if ((mapped.debit_amount || 0) > 5000 && !mapped.needs_review) {
    mapped = { ...mapped, needs_review: true, review_reason: 'Large debit — verify business purpose' };
  }
  if (mapped.category && mapped.category !== 'unclassified') return mapped;
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(k => text.includes(k))) {
      return { ...mapped, category: rule.category, account_name: mapped.account_name || rule.account, pl_include: rule.pl_include, auto_mapped: true };
    }
  }
  return { ...mapped, needs_review: true, review_reason: mapped.review_reason || 'Could not auto-categorize — please classify manually' };
}

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    document_type: { type: 'string' },
    institution_name: { type: 'string' },
    account_number_masked: { type: 'string' },
    company_name: { type: 'string' },
    accounting_basis: { type: 'string' },
    period_start: { type: 'string' },
    period_end: { type: 'string' },
    opening_balance: { type: 'number' },
    closing_balance: { type: 'number' },
    statement_total_credits: { type: 'number' },
    statement_total_debits: { type: 'number' },
    is_scanned: { type: 'boolean' },
    currency: { type: 'string' },
    confidence_score: { type: 'number' },
    transactions: { type: 'array', items: { type: 'object' } },
  }
};

async function extractFile(base44, url, fileName, fileIndex) {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  const fileType = ['xlsx','xls'].includes(ext) ? 'excel' : ext === 'csv' ? 'csv' : ext === 'pdf' ? 'pdf' : ['png','jpg','jpeg','tiff','webp'].includes(ext) ? 'image' : ['ofx','qbo','qfx'].includes(ext) ? 'ofx' : 'document';

  const prompt = `You are an expert CPA. Extract ALL financial transactions from this ${fileType} file: "${fileName}".

Return JSON with:
- document_type: bank_statement|credit_card_statement|invoice_listing|journal_export|other
- institution_name, account_number_masked (last 4 only), company_name, accounting_basis (cash|accrual|unknown)
- period_start/period_end: YYYY-MM-DD
- opening_balance, closing_balance, statement_total_credits, statement_total_debits (numbers or null)
- is_scanned: boolean, currency: ISO code (default CAD), confidence_score: 0-100
- transactions: array of ALL rows, each with:
  tx_id: "F${fileIndex}-TX-NNN", transaction_date: YYYY-MM-DD, description: string,
  vendor_or_customer: string, cheque_number: string|null,
  debit_amount: positive number (money OUT) or null, credit_amount: positive number (money IN) or null,
  running_balance: number|null, source_file: "${fileName}", confidence: 0.0-1.0,
  needs_review: true if confidence<0.75 or direction ambiguous, review_reason: string|null,
  category: revenue|other_income|cogs|bank_fees|rent|payroll|insurance|utilities|software|advertising|telecom|fuel|vehicle|travel|meals|professional_fees|office_supplies|repairs|interest_expense|misc_expense|owner_draw|owner_contribution|transfer|cc_payment|loan_payment|cash_withdrawal|cheque|tax_remittance|asset_purchase|unclassified

RULES: Extract every row. Deposits=credit_amount, withdrawals=debit_amount. Skip header/footer/summary rows. NEVER fabricate data.`;

  // 90-second timeout using Promise.race - guarantees resolution
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout: ${fileName} exceeded 90 seconds`)), 90000);
  });

  const extractPromise = base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    file_urls: [url],
    model: 'gemini_3_flash',
    response_json_schema: EXTRACTION_SCHEMA,
  });

  const result = await Promise.race([extractPromise, timeoutPromise]);

  const seen = new Set();
  const txs = (result.transactions || []).map(tx => {
    let mapped = applySmartMapping(tx);
    const key = `${tx.transaction_date}|${tx.debit_amount}|${tx.credit_amount}|${(tx.description||'').substring(0,30)}`;
    if (seen.has(key)) mapped = { ...mapped, needs_review: true, review_reason: 'Possible duplicate', is_duplicate: true };
    seen.add(key);
    return mapped;
  });

  return { ...result, transactions: txs, file_name: fileName };
}

function reconcile(fileResult, txs) {
  const fileTxs = txs.filter(t => t.source_file === fileResult.file_name);
  const calcCredits = fileTxs.reduce((s, t) => s + (t.credit_amount || 0), 0);
  const calcDebits = fileTxs.reduce((s, t) => s + (t.debit_amount || 0), 0);
  const warnings = [];
  let status = 'not_reconciled', difference = null, calculatedClosing = null;
  if (fileResult.confidence_score < 55) { status = 'confidence_too_low'; warnings.push(`Low confidence: ${fileResult.confidence_score}%`); }
  else if (fileResult.opening_balance == null) { status = 'missing_opening_balance'; }
  else if (fileResult.closing_balance == null) { status = 'missing_closing_balance'; }
  else {
    calculatedClosing = fileResult.opening_balance + calcCredits - calcDebits;
    difference = Math.abs(calculatedClosing - fileResult.closing_balance);
    status = difference < 0.02 ? 'reconciled' : 'not_reconciled';
    if (difference >= 0.02) warnings.push(`Balance mismatch: $${difference.toFixed(2)}`);
  }
  return { file_name: fileResult.file_name, institution_name: fileResult.institution_name, period_start: fileResult.period_start, period_end: fileResult.period_end, opening_balance: fileResult.opening_balance, closing_balance: fileResult.closing_balance, calculated_closing: calculatedClosing, total_credits: calcCredits, total_debits: calcDebits, difference, status, transaction_count: fileTxs.length, confidence_score: fileResult.confidence_score, warnings };
}

function buildGL(txs) {
  const m = {};
  txs.forEach(tx => {
    const n = tx.account_name || 'Unclassified';
    if (!m[n]) m[n] = { account_name: n, category: tx.category || 'unclassified', pl_include: tx.pl_include !== false, transactions: [], debit_total: 0, credit_total: 0 };
    m[n].transactions.push(tx);
    m[n].debit_total += (tx.debit_amount || 0);
    m[n].credit_total += (tx.credit_amount || 0);
  });
  Object.values(m).forEach(a => { a.net_balance = a.debit_total - a.credit_total; let r = 0; a.transactions = a.transactions.sort((x,y) => (x.transaction_date||'') < (y.transaction_date||'') ? -1 : 1).map(tx => { r += (tx.debit_amount||0) - (tx.credit_amount||0); return { ...tx, running_balance_gl: r }; }); });
  return { generated_at: new Date().toISOString(), total_debits: txs.reduce((s,t) => s+(t.debit_amount||0),0), total_credits: txs.reduce((s,t) => s+(t.credit_amount||0),0), accounts: Object.values(m), transaction_count: txs.length };
}

function buildPL(txs) {
  const OPEX = ['bank_fees','rent','payroll','insurance','utilities','software','advertising','telecom','fuel','vehicle','travel','meals','professional_fees','office_supplies','repairs','interest_expense','misc_expense'];
  const EXCL = ['transfer','cc_payment','loan_payment','owner_draw','owner_contribution','tax_remittance','cash_withdrawal','asset_purchase'];
  const filtered = txs.filter(t => t.pl_include !== false && !EXCL.includes(t.category));
  const sum = (cats, field) => filtered.filter(t => cats.includes(t.category)).reduce((s,t) => s+(t[field]||0),0);
  const lines = (cats, field) => { const g = {}; filtered.filter(t => cats.includes(t.category)).forEach(t => { const k = t.account_name||t.category; if (!g[k]) g[k]={account:k,amount:0,count:0}; g[k].amount+=(t[field]||0); g[k].count++; }); return Object.values(g).sort((a,b) => b.amount-a.amount); };
  const rev = sum(['revenue'],'credit_amount'), cogs = sum(['cogs'],'debit_amount'), gp = rev-cogs, opex = sum(OPEX,'debit_amount'), noi = gp-opex, oi = sum(['other_income'],'credit_amount'), np = noi+oi;
  const months = {};
  filtered.forEach(tx => { if (!tx.transaction_date) return; const mo = tx.transaction_date.substring(0,7); if (!months[mo]) months[mo]={month:mo,revenue:0,cogs:0,gross_profit:0,opex:0,net_income:0}; if (tx.category==='revenue') months[mo].revenue+=(tx.credit_amount||0); if (tx.category==='cogs') months[mo].cogs+=(tx.debit_amount||0); if (OPEX.includes(tx.category)) months[mo].opex+=(tx.debit_amount||0); });
  Object.values(months).forEach(m => { m.gross_profit=m.revenue-m.cogs; m.net_income=m.gross_profit-m.opex; });
  return { generated_at: new Date().toISOString(), included_count: filtered.length, excluded_count: txs.length-filtered.length, review_count: txs.filter(t=>t.needs_review).length, revenue: rev, revenue_lines: lines(['revenue'],'credit_amount'), cogs, cogs_lines: lines(['cogs'],'debit_amount'), gross_profit: gp, gross_margin_pct: rev>0?((gp/rev)*100).toFixed(1):'0.0', operating_expenses: opex, operating_expense_lines: lines(OPEX,'debit_amount'), net_operating_income: noi, other_income: oi, net_profit: np, monthly_data: Object.values(months).sort((a,b)=>a.month>b.month?1:-1), transaction_count: filtered.length };
}

function buildMonthlySummary(txs) {
  const months = {};
  txs.forEach(tx => { if (!tx.transaction_date) return; const m = tx.transaction_date.substring(0,7); if (!months[m]) months[m]={month:m,total_debits:0,total_credits:0,transaction_count:0,review_count:0}; months[m].total_debits+=(tx.debit_amount||0); months[m].total_credits+=(tx.credit_amount||0); months[m].transaction_count++; if (tx.needs_review) months[m].review_count++; });
  return { generated_at: new Date().toISOString(), months: Object.values(months).sort((a,b)=>a.month>b.month?1:-1) };
}

function buildReviewItems(txs) {
  const items = txs.filter(t=>t.needs_review).map(t => ({ tx_id:t.tx_id, transaction_date:t.transaction_date, description:t.description, vendor_or_customer:t.vendor_or_customer, debit_amount:t.debit_amount, credit_amount:t.credit_amount, suggested_category:t.category||'unclassified', account_name:t.account_name, review_reason:t.review_reason||'Flagged for review', source_file:t.source_file, confidence:t.confidence, is_duplicate:t.is_duplicate||false, recommended_action: t.is_duplicate?'Verify and delete if duplicate':'Review and confirm category assignment' }));
  return { generated_at: new Date().toISOString(), count: items.length, items };
}

function buildTrialBalance(txs) {
  const m = {};
  txs.forEach(tx => { const n = tx.account_name||'Unclassified'; if (!m[n]) m[n]={account_name:n,category:tx.category||'unclassified',debit_total:0,credit_total:0}; m[n].debit_total+=(tx.debit_amount||0); m[n].credit_total+=(tx.credit_amount||0); });
  const accounts = Object.values(m).map(a => ({ ...a, net_balance: a.debit_total-a.credit_total }));
  const td = accounts.reduce((s,a)=>s+a.debit_total,0), tc = accounts.reduce((s,a)=>s+a.credit_total,0);
  return { generated_at: new Date().toISOString(), accounts, total_debits: td, total_credits: tc, is_balanced: Math.abs(td-tc)<0.01 };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { mode } = body;

    // ── extract_all: process all files in parallel + auto-generate all reports ──
    if (mode === 'extract_all') {
      const { report_id, file_urls, file_names } = body;
      if (!report_id || !file_urls?.length) return Response.json({ error: 'Missing report_id or file_urls' }, { status: 400 });

      let progress = file_names.map((name, i) => ({ name, index: i, status: 'pending', tx_count: 0 }));
      await base44.asServiceRole.entities.AccountingReport.update(report_id, { status: 'extracting', file_progress: JSON.stringify(progress) });

      // Process all files in parallel for speed
      const extractWithProgress = async (url, name, index) => {
        progress[index].status = 'processing';
        await base44.asServiceRole.entities.AccountingReport.update(report_id, { file_progress: JSON.stringify(progress) });
        try {
          const result = await extractFile(base44, url, name, index);
          progress[index].status = 'done';
          progress[index].tx_count = result.transactions.length;
          progress[index].confidence = result.confidence_score;
          await base44.asServiceRole.entities.AccountingReport.update(report_id, { file_progress: JSON.stringify(progress) });
          return { success: true, result, transactions: result.transactions };
        } catch (e) {
          progress[index].status = 'failed';
          progress[index].error = e.message;
          await base44.asServiceRole.entities.AccountingReport.update(report_id, { file_progress: JSON.stringify(progress) });
          return { success: false, error: e.message, file_name: name, transactions: [] };
        }
      };

      const results = await Promise.all(file_urls.map((url, i) => extractWithProgress(url, file_names[i], i)));
      
      const allTxs = results.flatMap(r => r.transactions);
      const fileResults = results.map(r => r.success ? r.result : { file_name: r.file_name, transactions: [], confidence_score: 0, error: r.error });
      const completedCount = results.filter(r => r.success).length;
      const hasFailures = results.some(r => !r.success);

      if (completedCount === 0) {
        await base44.asServiceRole.entities.AccountingReport.update(report_id, { status: 'failed' });
        return Response.json({ error: 'All files failed extraction', status: 500 });
      }

      // Build reconciliation + all reports
      const reconciliations = fileResults.map(fr => reconcile(fr, allTxs));
      const totalDebits = allTxs.reduce((s,t) => s+(t.debit_amount||0), 0);
      const totalCredits = allTxs.reduce((s,t) => s+(t.credit_amount||0), 0);
      const reviewCount = allTxs.filter(t => t.needs_review).length;
      const avgConfidence = completedCount > 0 ? Math.round(fileResults.filter(r => !r.error).reduce((s,r) => s+(r.confidence_score||0), 0) / completedCount) : 0;
      const companyName = fileResults.find(r => r.company_name)?.company_name || null;
      const currency = fileResults.find(r => r.currency)?.currency || 'CAD';
      const dateFrom = fileResults.map(r => r.period_start).filter(Boolean).sort()[0] || null;
      const dateTo = fileResults.map(r => r.period_end).filter(Boolean).sort().reverse()[0] || null;

      const fileMetadata = fileResults.map(r => ({ file_name: r.file_name, document_type: r.document_type, institution_name: r.institution_name, account_number_masked: r.account_number_masked, company_name: r.company_name, period_start: r.period_start, period_end: r.period_end, opening_balance: r.opening_balance, closing_balance: r.closing_balance, tx_count: r.transactions?.length || 0, confidence_score: r.confidence_score, is_scanned: r.is_scanned, error: r.error || null }));

      await base44.asServiceRole.entities.AccountingReport.update(report_id, {
        status: hasFailures ? 'review' : 'completed',
        file_progress: JSON.stringify(progress),
        file_metadata: JSON.stringify(fileMetadata),
        bank_reconciliation: JSON.stringify(reconciliations),
        gl_report: JSON.stringify(buildGL(allTxs)),
        pl_report: JSON.stringify(buildPL(allTxs)),
        transaction_summary: JSON.stringify(buildMonthlySummary(allTxs)),
        review_items_report: JSON.stringify(buildReviewItems(allTxs)),
        trial_balance: JSON.stringify(buildTrialBalance(allTxs)),
        reports_generated: JSON.stringify(['gl','pl','monthly_summary','review_items','trial_balance']),
        total_debits: totalDebits,
        total_credits: totalCredits,
        transaction_count: allTxs.length,
        review_count: reviewCount,
        auto_approved_count: allTxs.filter(t => !t.needs_review).length,
        confidence_score: avgConfidence,
        company_name: companyName,
        currency,
        date_from: dateFrom,
        date_to: dateTo,
      });

      return Response.json({ 
        success: true, 
        transaction_count: allTxs.length, 
        review_count: reviewCount,
        completed_files: completedCount,
        total_files: file_names.length,
        has_failures: hasFailures,
      });
    }

    // ── generate: re-generate reports from reviewed transactions ──
    if (mode === 'generate') {
      const { report_id, report_types, date_from, date_to } = body;
      const records = await base44.asServiceRole.entities.AccountingReport.filter({ id: report_id });
      if (!records?.length) return Response.json({ error: 'Not found' }, { status: 404 });
      const rec = records[0];
      let txs = JSON.parse(rec.transactions_reviewed || rec.transactions_raw || '[]');
      if (date_from) txs = txs.filter(t => !t.transaction_date || t.transaction_date >= date_from);
      if (date_to) txs = txs.filter(t => !t.transaction_date || t.transaction_date <= date_to);
      const updates = { status: 'completed', reports_generated: JSON.stringify(report_types) };
      if (report_types.includes('gl')) updates.gl_report = JSON.stringify(buildGL(txs));
      if (report_types.includes('pl')) updates.pl_report = JSON.stringify(buildPL(txs));
      if (report_types.includes('monthly_summary')) updates.transaction_summary = JSON.stringify(buildMonthlySummary(txs));
      if (report_types.includes('review_items')) updates.review_items_report = JSON.stringify(buildReviewItems(txs));
      if (report_types.includes('trial_balance')) updates.trial_balance = JSON.stringify(buildTrialBalance(txs));
      await base44.asServiceRole.entities.AccountingReport.update(report_id, updates);
      return Response.json({ success: true, generated: report_types });
    }

    return Response.json({ error: 'Unknown mode' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});