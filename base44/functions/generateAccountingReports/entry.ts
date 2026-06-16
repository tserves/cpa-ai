import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CATEGORY_RULES = [
  { keywords: ['sales revenue','service revenue','invoice payment','client payment','customer payment','payment received','fees earned','billing','retainer'], category: 'revenue', account: 'Service Revenue', pl_include: true },
  { keywords: ['interest income','interest earned','dividend','gain on sale','refund received'], category: 'other_income', account: 'Other Income', pl_include: true },
  { keywords: ['cost of goods','cogs','direct cost','job cost','contractor','subcontractor','material','supplies used','equipment purchase for job'], category: 'cogs', account: 'Direct Job Costs', pl_include: true },
  { keywords: ['bank fee','service charge','monthly fee','nsf','wire fee','bank charge','transaction fee','account fee','chargeback fee','merchant fee','payment processing','interac fee','e-transfer fee'], category: 'bank_fees', account: 'Bank & Merchant Fees', pl_include: true },
  { keywords: ['rent','lease payment','property management','commercial lease'], category: 'rent', account: 'Rent / Lease', pl_include: true },
  { keywords: ['salary','payroll','wages','payroll tax','employee','benefits','remittance'], category: 'payroll', account: 'Salaries & Wages', pl_include: true },
  { keywords: ['insurance premium','insurance payment','policy payment'], category: 'insurance', account: 'Insurance', pl_include: true },
  { keywords: ['hydro','electricity','water bill','natural gas','energy bill','utility','enbridge','ontario hydro'], category: 'utilities', account: 'Utilities', pl_include: true },
  { keywords: ['software','subscription','saas','adobe','microsoft 365','google workspace','quickbooks','xero','license fee','app subscription','netflix','slack','zoom'], category: 'software', account: 'Software & Subscriptions', pl_include: true },
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
  // Balance sheet / non-P&L
  { keywords: ['owner draw','personal withdrawal','shareholder draw','owner withdrawal'], category: 'owner_draw', account: 'Owner Draw', pl_include: false },
  { keywords: ['owner contribution','capital contribution','shareholder loan in','personal deposit'], category: 'owner_contribution', account: 'Owner Contribution', pl_include: false },
  { keywords: ['transfer to','transfer from','internal transfer','inter-account','sweep','tfr'], category: 'transfer', account: 'Transfers Between Accounts', pl_include: false },
  { keywords: ['credit card payment','visa payment','mastercard payment','amex payment','cc payment','card payment'], category: 'cc_payment', account: 'Credit Card Payment', pl_include: false },
  { keywords: ['loan payment','mortgage payment','line of credit payment','loc payment','vehicle loan'], category: 'loan_payment', account: 'Loan Payment', pl_include: false },
  { keywords: ['atm withdrawal','cash withdrawal','cash advance','atm'], category: 'cash_withdrawal', account: 'Cash Withdrawal', pl_include: false },
  { keywords: ['cheque','check #','chq ','#0','#1','#2','#3','#4','#5','#6','#7','#8','#9'], category: 'cheque', account: 'Cheque Payment', pl_include: false },
  { keywords: ['gst','hst','pst','vat','tax remittance','tax payment to cra','cra payment'], category: 'tax_remittance', account: 'Tax Remittance', pl_include: false },
  { keywords: ['asset purchase','equipment purchase','capital purchase','machinery','computer purchase'], category: 'asset_purchase', account: 'Asset Purchase', pl_include: false },
];

const REVIEW_PATTERNS = [
  { pattern: /e.?transfer|etransfer|interac e/i, reason: 'E-Transfer — confirm business purpose and payee' },
  { pattern: /\batm\b|cash withdrawal|cash advance|cash w\/d/i, reason: 'ATM/Cash withdrawal — confirm business use' },
  { pattern: /credit card payment|visa pmt|mastercard pmt|amex pmt|cc pmt/i, reason: 'Credit card payment — avoid double-counting expenses' },
  { pattern: /transfer (to|from)|inter.?account|tfr/i, reason: 'Interbank transfer — confirm not a real expense' },
  { pattern: /loan payment|mortgage|line of credit|loc pmt/i, reason: 'Financing payment — split principal vs interest' },
  { pattern: /cheque|chq \d|check #/i, reason: 'Cheque — verify payee and business purpose' },
  { pattern: /personal|owner|draw|private use/i, reason: 'Possible personal transaction — review carefully' },
  { pattern: /cash deposit|cash dep/i, reason: 'Cash deposit — confirm source of funds' },
];

function applySmartMapping(tx) {
  const text = ((tx.description || '') + ' ' + (tx.raw_text || '') + ' ' + (tx.vendor_or_customer || '') + ' ' + (tx.account_name || '')).toLowerCase();

  for (const flag of REVIEW_PATTERNS) {
    if (flag.pattern.test(text) && !tx.needs_review) {
      tx = { ...tx, needs_review: true, review_reason: flag.reason };
    }
  }

  // Large unusual debit flag
  if ((tx.debit_amount || 0) > 5000 && !tx.needs_review) {
    tx = { ...tx, needs_review: true, review_reason: 'Large debit — verify business purpose and classification' };
  }

  if (tx.category && tx.category !== 'unclassified' && tx.category !== 'needs_review') return tx;

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(k => text.includes(k))) {
      return { ...tx, category: rule.category, account_name: tx.account_name || rule.account, pl_include: rule.pl_include, auto_mapped: true };
    }
  }
  return { ...tx, needs_review: true, review_reason: tx.review_reason || 'Could not auto-categorize — please classify manually' };
}

function applyUserRules(tx, userRules) {
  for (const rule of (userRules || [])) {
    const text = ((tx.description || '') + ' ' + (tx.vendor_or_customer || '')).toLowerCase();
    if (rule.keyword && text.includes(rule.keyword.toLowerCase())) {
      const catRule = CATEGORY_RULES.find(r => r.category === rule.category);
      return { ...tx, category: rule.category, account_name: rule.account || (catRule?.account || rule.category), pl_include: catRule?.pl_include ?? true, needs_review: false, review_reason: null, user_rule_applied: rule.keyword };
    }
  }
  return tx;
}

function detectFileType(fileName) {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  if (['xlsx', 'xls'].includes(ext)) return 'excel';
  if (ext === 'csv') return 'csv';
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'tiff', 'webp', 'gif'].includes(ext)) return 'image';
  if (['ofx', 'qbo', 'qfx'].includes(ext)) return 'ofx';
  return 'document';
}

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    document_summary: { type: 'string' },
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
    page_count: { type: 'number' },
    is_scanned: { type: 'boolean' },
    currency: { type: 'string' },
    confidence_score: { type: 'number' },
    extraction_warnings: { type: 'array', items: { type: 'string' } },
    transactions: { type: 'array', items: { type: 'object' } },
  }
};

async function extractSingleFile(base44, url, fileName, fileIndex) {
  const fileType = detectFileType(fileName);
  const prompt = `You are an expert CPA and forensic accountant. Extract ALL financial transaction data from this ${fileType} file named "${fileName}".

STEP 1 — DOCUMENT ANALYSIS:
Determine: bank_statement | credit_card_statement | invoice_listing | journal_export | trial_balance | gl_export | pl_statement | balance_sheet | expense_report | payroll_report | other

Return JSON with top-level fields:
- document_summary: detailed description of institution, account, entity, period
- document_type: from list above
- institution_name: bank or institution, null if unknown
- account_number_masked: last 4 digits only, null if not visible
- company_name: business entity name, null if not visible
- accounting_basis: "cash" | "accrual" | "unknown"
- period_start: YYYY-MM-DD or null
- period_end: YYYY-MM-DD or null
- opening_balance: number printed on statement or null
- closing_balance: number printed on statement or null
- statement_total_credits: printed total deposits/credits or null
- statement_total_debits: printed total withdrawals/debits or null
- page_count: total pages if visible, else null
- is_scanned: true if OCR was needed
- currency: ISO code, default "CAD"
- confidence_score: 0-100 overall
- extraction_warnings: array of strings for any issues found
- transactions: array (see below)

STEP 2 — EXTRACT EVERY TRANSACTION:
For each transaction row include ALL fields (null if unavailable):
- tx_id: "F${fileIndex}-TX-001", "F${fileIndex}-TX-002" etc (unique per file)
- transaction_date: YYYY-MM-DD
- posting_date: YYYY-MM-DD or null
- description: cleaned description
- raw_text: exact original text from document
- vendor_or_customer: normalized payee/merchant name
- cheque_number: cheque or reference number, null otherwise
- debit_amount: positive number = money OUT, null otherwise
- credit_amount: positive number = money IN, null otherwise
- running_balance: running balance after transaction, null if not shown
- tax_amount: GST/HST/VAT if separately shown, else null
- currency: ISO code
- source_file: "${fileName}"
- source_page: page number or row number
- confidence: 0.0-1.0 extraction confidence
- needs_review: true if confidence < 0.75 OR key field missing OR direction ambiguous
- review_reason: explanation if needs_review
- category: one of: revenue|other_income|cogs|bank_fees|rent|payroll|insurance|utilities|software|advertising|telecom|fuel|vehicle|travel|meals|professional_fees|office_supplies|repairs|interest_expense|misc_expense|owner_draw|owner_contribution|transfer|cc_payment|loan_payment|cash_withdrawal|cheque|tax_remittance|asset_purchase|unclassified
- account_name: descriptive account name
- pl_include: true for P&L items, false for balance sheet/transfer/personal

LAYOUT HANDLING RULES:
- Separate debit/credit columns: assign correctly
- Single amount column: positive=credit/deposit, negative=debit/withdrawal (verify with running balance direction)
- Running balance: use changes to verify debit vs credit direction
- Multi-page: extract ALL pages, number rows sequentially across pages
- Wrapped descriptions: join into single description field
- Opening/closing balance rows: capture as metadata ONLY, NOT as transactions
- Page headers/footers: SKIP — do not create transactions for these
- Summary rows at bottom: SKIP as transactions, use for statement_total_credits/debits

ACCURACY RULES:
- NEVER fabricate amounts, dates, or transactions
- NEVER skip rows — extract everything
- NEVER guess ambiguous debit/credit direction — flag for review instead
- Deposits/receipts into bank account = credit_amount
- Withdrawals/payments from bank account = debit_amount
- Flag duplicate-looking transactions (same date + amount + description)`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    file_urls: [url],
    model: 'gemini_3_flash',
    response_json_schema: EXTRACTION_SCHEMA,
  });

  const seen = new Set();
  const txs = (result.transactions || []).map(tx => {
    let mapped = applySmartMapping(tx);
    const key = `${tx.transaction_date}|${tx.debit_amount}|${tx.credit_amount}|${(tx.description || '').substring(0, 40)}`;
    if (seen.has(key)) mapped = { ...mapped, needs_review: true, review_reason: 'Possible duplicate transaction', is_duplicate: true };
    seen.add(key);
    return mapped;
  });

  return {
    transactions: txs,
    document_summary: result.document_summary || '',
    document_type: result.document_type || 'other',
    institution_name: result.institution_name || null,
    account_number_masked: result.account_number_masked || null,
    company_name: result.company_name || null,
    accounting_basis: result.accounting_basis || 'unknown',
    period_start: result.period_start || null,
    period_end: result.period_end || null,
    opening_balance: result.opening_balance ?? null,
    closing_balance: result.closing_balance ?? null,
    statement_total_credits: result.statement_total_credits ?? null,
    statement_total_debits: result.statement_total_debits ?? null,
    page_count: result.page_count || null,
    is_scanned: result.is_scanned || false,
    confidence_score: result.confidence_score || 50,
    currency: result.currency || 'CAD',
    extraction_warnings: result.extraction_warnings || [],
    file_name: fileName,
  };
}

function reconcileStatement(fileResult, txs) {
  const fileTxs = txs.filter(t => t.source_file === fileResult.file_name);
  const calcCredits = fileTxs.reduce((s, t) => s + (t.credit_amount || 0), 0);
  const calcDebits = fileTxs.reduce((s, t) => s + (t.debit_amount || 0), 0);
  const warnings = [...(fileResult.extraction_warnings || [])];
  let status = 'not_reconciled';
  let difference = null;
  let calculatedClosing = null;

  if (fileResult.confidence_score < 55) {
    status = 'confidence_too_low';
    warnings.push(`Extraction confidence only ${fileResult.confidence_score}% — manual review required`);
  } else if (fileResult.opening_balance == null) {
    status = 'missing_opening_balance';
    warnings.push('Opening balance not detected in statement');
  } else if (fileResult.closing_balance == null) {
    status = 'missing_closing_balance';
    warnings.push('Closing balance not detected in statement');
  } else {
    calculatedClosing = fileResult.opening_balance + calcCredits - calcDebits;
    difference = Math.abs(calculatedClosing - fileResult.closing_balance);
    if (difference < 0.02) status = warnings.length > 0 ? 'reconciled_with_warnings' : 'reconciled';
    else {
      status = 'not_reconciled';
      warnings.push(`Balance mismatch: calculated $${calculatedClosing.toFixed(2)} vs statement $${fileResult.closing_balance.toFixed(2)} (diff: $${difference.toFixed(2)})`);
    }
  }

  if (fileResult.statement_total_credits != null) {
    const d = Math.abs(calcCredits - fileResult.statement_total_credits);
    if (d > 0.02) warnings.push(`Credit total mismatch: extracted $${calcCredits.toFixed(2)} vs printed $${fileResult.statement_total_credits.toFixed(2)}`);
  }
  if (fileResult.statement_total_debits != null) {
    const d = Math.abs(calcDebits - fileResult.statement_total_debits);
    if (d > 0.02) warnings.push(`Debit total mismatch: extracted $${calcDebits.toFixed(2)} vs printed $${fileResult.statement_total_debits.toFixed(2)}`);
  }

  return {
    file_name: fileResult.file_name,
    institution_name: fileResult.institution_name,
    account_number_masked: fileResult.account_number_masked,
    document_type: fileResult.document_type,
    is_scanned: fileResult.is_scanned,
    page_count: fileResult.page_count,
    period_start: fileResult.period_start,
    period_end: fileResult.period_end,
    opening_balance: fileResult.opening_balance,
    closing_balance: fileResult.closing_balance,
    calculated_closing: calculatedClosing,
    total_credits: calcCredits,
    total_debits: calcDebits,
    statement_total_credits: fileResult.statement_total_credits,
    statement_total_debits: fileResult.statement_total_debits,
    difference,
    status,
    transaction_count: fileTxs.length,
    duplicate_count: fileTxs.filter(t => t.is_duplicate).length,
    review_count: fileTxs.filter(t => t.needs_review).length,
    confidence_score: fileResult.confidence_score,
    warnings,
  };
}

function buildGL(txs) {
  const acctMap = {};
  txs.forEach(tx => {
    const n = tx.account_name || 'Unclassified';
    if (!acctMap[n]) acctMap[n] = { account_name: n, category: tx.category || 'unclassified', pl_include: tx.pl_include !== false, transactions: [], debit_total: 0, credit_total: 0 };
    acctMap[n].transactions.push(tx);
    acctMap[n].debit_total += (tx.debit_amount || 0);
    acctMap[n].credit_total += (tx.credit_amount || 0);
  });
  Object.values(acctMap).forEach(a => {
    a.transactions.sort((x, y) => (x.transaction_date || '') < (y.transaction_date || '') ? -1 : 1);
    let running = 0;
    a.transactions = a.transactions.map(tx => { running += (tx.debit_amount || 0) - (tx.credit_amount || 0); return { ...tx, running_balance_gl: running }; });
    a.net_balance = a.debit_total - a.credit_total;
  });
  return { generated_at: new Date().toISOString(), total_debits: txs.reduce((s, t) => s + (t.debit_amount || 0), 0), total_credits: txs.reduce((s, t) => s + (t.credit_amount || 0), 0), accounts: Object.values(acctMap), transaction_count: txs.length };
}

function buildPL(txs, options = {}) {
  const { include_review = false, include_transfers = false } = options;
  const EXCLUDE_CATS = ['transfer', 'cc_payment', 'loan_payment', 'owner_draw', 'owner_contribution', 'tax_remittance', 'cash_withdrawal', 'asset_purchase', 'cheque'];
  let filtered = txs.filter(t => t.pl_include !== false);
  if (!include_review) filtered = filtered.filter(t => !t.needs_review);
  if (!include_transfers) filtered = filtered.filter(t => !EXCLUDE_CATS.includes(t.category));
  const OPEX_CATS = ['bank_fees', 'rent', 'payroll', 'insurance', 'utilities', 'software', 'advertising', 'telecom', 'fuel', 'vehicle', 'travel', 'meals', 'professional_fees', 'office_supplies', 'repairs', 'interest_expense', 'misc_expense'];
  const sum = (cats, field) => filtered.filter(t => cats.includes(t.category)).reduce((s, t) => s + (t[field] || 0), 0);
  const lines = (cats, field) => { const g = {}; filtered.filter(t => cats.includes(t.category)).forEach(t => { const k = t.account_name || t.category; if (!g[k]) g[k] = { account: k, category: t.category, amount: 0, count: 0 }; g[k].amount += (t[field] || 0); g[k].count++; }); return Object.values(g).sort((a, b) => b.amount - a.amount); };
  const rev = sum(['revenue'], 'credit_amount');
  const cogs = sum(['cogs'], 'debit_amount');
  const gp = rev - cogs;
  const opex = sum(OPEX_CATS, 'debit_amount');
  const noi = gp - opex;
  const oi = sum(['other_income'], 'credit_amount');
  const oe = sum(['misc_expense'], 'debit_amount');
  const np = noi + oi - oe;
  const monthlyData = {};
  filtered.forEach(tx => {
    if (!tx.transaction_date) return;
    const m = tx.transaction_date.substring(0, 7);
    if (!monthlyData[m]) monthlyData[m] = { month: m, revenue: 0, cogs: 0, gross_profit: 0, opex: 0, net_income: 0 };
    if (tx.category === 'revenue') monthlyData[m].revenue += (tx.credit_amount || 0);
    if (tx.category === 'cogs') monthlyData[m].cogs += (tx.debit_amount || 0);
    if (OPEX_CATS.includes(tx.category)) monthlyData[m].opex += (tx.debit_amount || 0);
  });
  Object.values(monthlyData).forEach(m => { m.gross_profit = m.revenue - m.cogs; m.net_income = m.gross_profit - m.opex; });
  return { generated_at: new Date().toISOString(), options_used: options, included_count: filtered.length, excluded_count: txs.length - filtered.length, uncategorized_count: txs.filter(t => !t.category || t.category === 'unclassified').length, review_count: txs.filter(t => t.needs_review).length, revenue: rev, revenue_lines: lines(['revenue'], 'credit_amount'), cogs, cogs_lines: lines(['cogs'], 'debit_amount'), gross_profit: gp, gross_margin_pct: rev > 0 ? ((gp / rev) * 100).toFixed(1) : '0.0', operating_expenses: opex, operating_expense_lines: lines(OPEX_CATS, 'debit_amount'), net_operating_income: noi, other_income: oi, other_income_lines: lines(['other_income'], 'credit_amount'), other_expenses: oe, net_profit: np, monthly_data: Object.values(monthlyData).sort((a, b) => a.month > b.month ? 1 : -1), transaction_count: filtered.length, note: 'Generated from bank statement data only. Non-cash items, accruals, and off-statement transactions not included.' };
}

function buildMonthlySummary(txs) {
  const months = {};
  txs.forEach(tx => {
    if (!tx.transaction_date) return;
    const m = tx.transaction_date.substring(0, 7);
    if (!months[m]) months[m] = { month: m, total_debits: 0, total_credits: 0, transaction_count: 0, review_count: 0, categories: {} };
    months[m].total_debits += (tx.debit_amount || 0);
    months[m].total_credits += (tx.credit_amount || 0);
    months[m].transaction_count++;
    if (tx.needs_review) months[m].review_count++;
    const cat = tx.category || 'unclassified';
    if (!months[m].categories[cat]) months[m].categories[cat] = 0;
    months[m].categories[cat] += (tx.debit_amount || tx.credit_amount || 0);
  });
  return { generated_at: new Date().toISOString(), months: Object.values(months).sort((a, b) => a.month > b.month ? 1 : -1) };
}

function buildReviewItems(txs) {
  const RECOMMENDED = {
    transfer: 'Confirm internal transfer — exclude from P&L',
    cc_payment: 'Verify credit card payment — avoid double-counting',
    loan_payment: 'Split into principal and interest for accuracy',
    owner_draw: 'Classify as owner draw — not a business expense',
    cash_withdrawal: 'Confirm business use — or classify as personal',
    cheque: 'Identify payee and verify business purpose',
    is_duplicate: 'Verify and delete if confirmed duplicate',
  };
  const items = txs.filter(t => t.needs_review).map(t => ({
    tx_id: t.tx_id, transaction_date: t.transaction_date, description: t.description,
    raw_text: t.raw_text, vendor_or_customer: t.vendor_or_customer,
    debit_amount: t.debit_amount, credit_amount: t.credit_amount,
    suggested_category: t.category || 'unclassified', account_name: t.account_name,
    review_reason: t.review_reason || 'Flagged for review',
    source_file: t.source_file, source_page: t.source_page,
    confidence: t.confidence, is_duplicate: t.is_duplicate || false,
    recommended_action: t.is_duplicate ? RECOMMENDED.is_duplicate : (RECOMMENDED[t.category] || 'Review and confirm category assignment'),
    user_notes: t.user_notes || '',
  }));
  const byReason = {};
  items.forEach(i => { const r = i.review_reason || 'Other'; if (!byReason[r]) byReason[r] = 0; byReason[r]++; });
  return { generated_at: new Date().toISOString(), count: items.length, items, by_reason: Object.entries(byReason).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count) };
}

function buildTrialBalance(txs) {
  const acctMap = {};
  txs.forEach(tx => {
    const n = tx.account_name || 'Unclassified';
    if (!acctMap[n]) acctMap[n] = { account_name: n, category: tx.category || 'unclassified', pl_include: tx.pl_include !== false, debit_total: 0, credit_total: 0 };
    acctMap[n].debit_total += (tx.debit_amount || 0);
    acctMap[n].credit_total += (tx.credit_amount || 0);
  });
  const accounts = Object.values(acctMap).map(a => ({ ...a, net_balance: a.debit_total - a.credit_total }));
  const totalDebits = accounts.reduce((s, a) => s + a.debit_total, 0);
  const totalCredits = accounts.reduce((s, a) => s + a.credit_total, 0);
  return { generated_at: new Date().toISOString(), accounts, total_debits: totalDebits, total_credits: totalCredits, is_balanced: Math.abs(totalDebits - totalCredits) < 0.01 };
}

function buildValidationIssues(txs, fileResults) {
  const issues = [];
  const unclassified = txs.filter(t => !t.category || t.category === 'unclassified').length;
  const missingDate = txs.filter(t => !t.transaction_date).length;
  const missingAmount = txs.filter(t => !t.debit_amount && !t.credit_amount).length;
  const reviewCount = txs.filter(t => t.needs_review).length;
  if (unclassified > 0) issues.push({ type: 'unclassified', severity: 'medium', message: `${unclassified} transaction(s) could not be auto-categorized` });
  if (missingDate > 0) issues.push({ type: 'missing_date', severity: 'high', message: `${missingDate} transaction(s) missing a date` });
  if (missingAmount > 0) issues.push({ type: 'missing_amount', severity: 'high', message: `${missingAmount} transaction(s) have no debit or credit amount` });
  if (reviewCount > 0) issues.push({ type: 'needs_review', severity: 'medium', message: `${reviewCount} transaction(s) require manual review` });
  for (const fr of fileResults) {
    if (fr.opening_balance != null && fr.closing_balance != null) {
      const fileTxs = txs.filter(t => t.source_file === fr.file_name);
      const credits = fileTxs.reduce((s, t) => s + (t.credit_amount || 0), 0);
      const debits = fileTxs.reduce((s, t) => s + (t.debit_amount || 0), 0);
      const computed = fr.opening_balance + credits - debits;
      const diff = Math.abs(computed - fr.closing_balance);
      if (diff > 0.05) issues.push({ type: 'balance_mismatch', severity: 'high', message: `${fr.file_name}: Balance mismatch $${diff.toFixed(2)} — computed $${computed.toFixed(2)} vs stated $${fr.closing_balance.toFixed(2)}` });
    }
  }
  return { issues, totalDebits: txs.reduce((s, t) => s + (t.debit_amount || 0), 0), totalCredits: txs.reduce((s, t) => s + (t.credit_amount || 0), 0) };
}

Deno.serve(async (req) => {
  let _reportId = null;
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    _reportId = body.report_id || null;

    if (!['extract_file', 'finalise'].includes(body.mode)) {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (body.mode === 'extract_file') {
      const { file_url, file_name, report_id: reportId, file_index, file_progress: progressIn, existing_transactions: existingTxsRaw, user_rules: userRulesRaw } = body;
      if (!file_url || !reportId) return Response.json({ error: 'Missing file_url or report_id' }, { status: 400 });
      const progress = progressIn ? JSON.parse(progressIn) : [];
      if (progress[file_index]) { progress[file_index].status = 'processing'; await base44.asServiceRole.entities.AccountingReport.update(reportId, { file_progress: JSON.stringify(progress) }); }
      let result;
      try {
        result = await extractSingleFile(base44, file_url, file_name, file_index);
        if (progress[file_index]) { progress[file_index].status = 'done'; progress[file_index].tx_count = result.transactions.length; progress[file_index].confidence = result.confidence_score; }
      } catch (e) {
        result = { transactions: [], file_name, error: e.message, confidence_score: 0, extraction_warnings: [e.message] };
        if (progress[file_index]) { progress[file_index].status = 'failed'; progress[file_index].error = e.message; }
      }
      const userRules = userRulesRaw ? JSON.parse(userRulesRaw) : [];
      const txsWithRules = result.transactions.map(tx => applyUserRules(tx, userRules));
      const existingTxs = existingTxsRaw ? JSON.parse(existingTxsRaw) : [];
      const runningTxs = existingTxs.concat(txsWithRules);
      await base44.asServiceRole.entities.AccountingReport.update(reportId, { file_progress: JSON.stringify(progress), transaction_count: runningTxs.length, transactions_raw: JSON.stringify(runningTxs) });
      return Response.json({ success: true, file_result: { file_name, document_type: result.document_type, institution_name: result.institution_name, account_number_masked: result.account_number_masked, company_name: result.company_name, period_start: result.period_start, period_end: result.period_end, opening_balance: result.opening_balance, closing_balance: result.closing_balance, statement_total_credits: result.statement_total_credits, statement_total_debits: result.statement_total_debits, page_count: result.page_count, is_scanned: result.is_scanned, document_summary: result.document_summary, tx_count: txsWithRules.length, confidence_score: result.confidence_score, error: result.error || null, extraction_warnings: result.extraction_warnings || [] }, transactions: txsWithRules, progress: JSON.stringify(progress) });
    }

    if (body.mode === 'finalise') {
      const { report_id: reportId, all_transactions: allTxsRaw, file_results: fileResultsRaw, file_progress: progressIn } = body;
      if (!reportId) return Response.json({ error: 'Missing report_id' }, { status: 400 });
      const txs = JSON.parse(allTxsRaw || '[]');
      const fileResults = JSON.parse(fileResultsRaw || '[]');
      const progress = JSON.parse(progressIn || '[]');
      const reconciliations = fileResults.map(fr => reconcileStatement(fr, txs));
      const { issues, totalDebits, totalCredits } = buildValidationIssues(txs, fileResults);
      const reviewCount = txs.filter(t => t.needs_review).length;
      const companyName = fileResults.find(r => r.company_name)?.company_name || null;
      const currency = fileResults.find(r => r.currency)?.currency || 'CAD';
      const accountingBasis = fileResults.find(r => r.accounting_basis && r.accounting_basis !== 'unknown')?.accounting_basis || 'unknown';
      const dateFrom = fileResults.map(r => r.period_start).filter(Boolean).sort()[0] || null;
      const dateTo = fileResults.map(r => r.period_end).filter(Boolean).sort().reverse()[0] || null;
      const avgConfidence = fileResults.length > 0 ? Math.round(fileResults.reduce((s, r) => s + (r.confidence_score || 0), 0) / fileResults.length) : 0;
      await base44.asServiceRole.entities.AccountingReport.update(reportId, { status: 'review', file_progress: JSON.stringify(progress), transactions_raw: JSON.stringify(txs), transactions_reviewed: JSON.stringify(txs), validation_issues: JSON.stringify(issues), bank_reconciliation: JSON.stringify(reconciliations), total_debits: totalDebits, total_credits: totalCredits, transaction_count: txs.length, review_count: reviewCount, auto_approved_count: txs.filter(t => !t.needs_review).length, confidence_score: avgConfidence, file_metadata: JSON.stringify(fileResults), company_name: companyName, currency, accounting_basis: accountingBasis, date_from: dateFrom, date_to: dateTo });
      return Response.json({ success: true, transaction_count: txs.length, needs_review: reviewCount });
    }

    if (body.mode === 'generate') {
      const { report_id: reportId, report_types, date_from: dateFrom, date_to: dateTo, options = {} } = body;
      const records = await base44.asServiceRole.entities.AccountingReport.filter({ id: reportId });
      if (!records?.length) return Response.json({ error: 'Not found' }, { status: 404 });
      const rec = records[0];
      const all = JSON.parse(rec.transactions_reviewed || rec.transactions_raw || '[]');
      const txs = all.filter(t => { const d = t.transaction_date; if (!d) return true; if (dateFrom && d < dateFrom) return false; if (dateTo && d > dateTo) return false; return true; });
      const updates = { status: 'completed', reports_generated: JSON.stringify(report_types) };
      if (report_types.includes('gl')) updates.gl_report = JSON.stringify(buildGL(txs));
      if (report_types.includes('pl')) updates.pl_report = JSON.stringify(buildPL(txs, options));
      if (report_types.includes('monthly_summary')) updates.transaction_summary = JSON.stringify(buildMonthlySummary(txs));
      if (report_types.includes('review_items')) updates.review_items_report = JSON.stringify(buildReviewItems(txs));
      if (report_types.includes('trial_balance')) updates.trial_balance = JSON.stringify(buildTrialBalance(txs));
      await base44.asServiceRole.entities.AccountingReport.update(reportId, updates);
      return Response.json({ success: true, generated: report_types });
    }

    if (body.mode === 'save_rule') {
      const { report_id: reportId, rule } = body;
      const records = await base44.asServiceRole.entities.AccountingReport.filter({ id: reportId });
      if (!records?.length) return Response.json({ error: 'Not found' }, { status: 404 });
      const existing = JSON.parse(records[0].categorization_rules || '[]');
      const updated = [...existing.filter(r => r.keyword !== rule.keyword), rule];
      await base44.asServiceRole.entities.AccountingReport.update(reportId, { categorization_rules: JSON.stringify(updated) });
      return Response.json({ success: true, rules: updated });
    }

    return Response.json({ error: 'Unknown mode' }, { status: 400 });
  } catch (error) {
    if (_reportId) { try { const { createClientFromRequest: mk } = await import('npm:@base44/sdk@0.8.31'); await mk(req).asServiceRole.entities.AccountingReport.update(_reportId, { status: 'failed' }); } catch (_) {} }
    return Response.json({ error: error.message }, { status: 500 });
  }
});