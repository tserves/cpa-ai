import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CATEGORY_RULES = [
  { keywords: ['sales revenue','service revenue','invoice payment','client payment','customer payment','payment received','fees earned','billing','retainer','deposit'], category: 'revenue', account: 'Service Revenue', pl_include: true },
  { keywords: ['interest income','interest earned','dividend','gain on sale','refund received','cashback'], category: 'other_income', account: 'Other Income', pl_include: true },
  { keywords: ['cost of goods','cogs','direct cost','job cost','contractor','subcontractor','material','supplies used'], category: 'cogs', account: 'Cost of Goods Sold', pl_include: true },
  { keywords: ['bank fee','service charge','monthly fee','nsf','wire fee','bank charge','transaction fee','account fee','merchant fee','payment processing','interac fee','e-transfer fee'], category: 'bank_charges', account: 'Bank Charges', pl_include: true },
  { keywords: ['rent','lease payment','property management','commercial lease'], category: 'rent', account: 'Rent', pl_include: true },
  { keywords: ['salary','payroll','wages','payroll tax','employee','benefits','remittance'], category: 'payroll', account: 'Payroll', pl_include: true },
  { keywords: ['insurance premium','insurance payment','policy payment'], category: 'insurance', account: 'Insurance', pl_include: true },
  { keywords: ['hydro','electricity','water bill','natural gas','energy bill','utility','enbridge','ontario hydro'], category: 'utilities', account: 'Utilities', pl_include: true },
  { keywords: ['software','subscription','saas','adobe','microsoft 365','google workspace','quickbooks','xero','license fee','app subscription','slack','zoom'], category: 'software', account: 'Office Expenses', pl_include: true },
  { keywords: ['facebook ads','google ads','advertising','marketing','promotion','media buy','seo','social media'], category: 'advertising', account: 'Advertising & Marketing', pl_include: true },
  { keywords: ['telephone','internet','phone bill','mobile','telecom','cell plan','rogers','bell','telus','shaw'], category: 'telecom', account: 'Telecommunications', pl_include: true },
  { keywords: ['fuel','gas station','petro','esso','shell','gasoline','petro-canada'], category: 'vehicle', account: 'Vehicle Expenses', pl_include: true },
  { keywords: ['vehicle','auto insurance','car payment','car lease','auto lease'], category: 'vehicle', account: 'Vehicle Expenses', pl_include: true },
  { keywords: ['airfare','hotel','accommodation','uber','taxi','flight','travel expense','mileage','via rail'], category: 'travel', account: 'Travel', pl_include: true },
  { keywords: ['restaurant','dining','meals','food delivery','catering','tim hortons','starbucks','doordash'], category: 'meals', account: 'Meals & Entertainment', pl_include: true },
  { keywords: ['legal fee','accounting fee','professional fee','consultant','advisor fee','audit','bookkeeping'], category: 'professional_fees', account: 'Professional Fees', pl_include: true },
  { keywords: ['office supply','stationery','office expense','staples','bestbuy','amazon office'], category: 'office_expenses', account: 'Office Expenses', pl_include: true },
  { keywords: ['repair','maintenance','cleaning','janitorial','plumber','electrician'], category: 'repairs', account: 'Repairs & Maintenance', pl_include: true },
  { keywords: ['interest expense','loan interest','finance charge','financing','overdraft interest'], category: 'interest_expense', account: 'Professional Fees', pl_include: true },
  { keywords: ['gst','hst','pst','vat','tax remittance','tax payment to cra','cra payment'], category: 'taxes', account: 'Taxes', pl_include: false },
  { keywords: ['owner draw','personal withdrawal','shareholder draw','owner withdrawal'], category: 'owner_drawings', account: 'Owner Drawings', pl_include: false },
  { keywords: ['transfer to','transfer from','internal transfer','inter-account','sweep','tfr'], category: 'transfer', account: 'Transfers Between Accounts', pl_include: false },
  { keywords: ['credit card payment','visa payment','mastercard payment','amex payment','cc payment','card payment'], category: 'cc_payment', account: 'Credit Card Payment', pl_include: false },
  { keywords: ['loan payment','mortgage payment','line of credit payment','loc payment'], category: 'loan_payment', account: 'Loan Payments', pl_include: false },
  { keywords: ['atm withdrawal','cash withdrawal','cash advance','atm'], category: 'cash_withdrawal', account: 'Cash Withdrawal', pl_include: false },
];

const REVIEW_FLAGS = [
  { pattern: /e.?transfer|etransfer|interac e/i, reason: 'E-Transfer — confirm business purpose and payee' },
  { pattern: /\batm\b|cash withdrawal|cash advance/i, reason: 'ATM/Cash — confirm business use' },
  { pattern: /credit card payment|visa pmt|mastercard pmt|amex pmt/i, reason: 'Credit card payment — avoid double-counting' },
  { pattern: /transfer (to|from)|inter.?account|tfr/i, reason: 'Interbank transfer — confirm not a real expense' },
  { pattern: /loan payment|mortgage|line of credit/i, reason: 'Financing payment — split principal vs interest' },
  { pattern: /personal|owner|draw|private use/i, reason: 'Possible personal transaction — review carefully' },
];

function categorize(tx) {
  const text = ((tx.description || '') + ' ' + (tx.raw_text || '') + ' ' + (tx.vendor_or_customer || '')).toLowerCase();
  let out = { ...tx, needs_review: false, review_reason: null };

  // Step 1: Try to categorize first using our rules
  let categorized = false;
  if (!out.category || out.category === 'unclassified' || out.category === 'uncategorized') {
    for (const rule of CATEGORY_RULES) {
      if (rule.keywords.some(k => text.includes(k))) {
        out = { ...out, category: rule.category, account_name: out.account_name || rule.account, pl_include: rule.pl_include, auto_mapped: true };
        categorized = true;
        break;
      }
    }
  } else {
    categorized = true; // AI already assigned a valid category
  }

  // Step 2: Only flag for review if truly ambiguous — not just because it's a transfer/payment category
  const SAFE_CATS = ['transfer','cc_payment','loan_payment','cash_withdrawal','taxes','owner_drawings','bank_charges'];
  const isSafeCat = SAFE_CATS.includes(out.category);

  if (!isSafeCat) {
    for (const flag of REVIEW_FLAGS) {
      if (flag.pattern.test(text)) {
        out = { ...out, needs_review: true, review_reason: flag.reason };
        break;
      }
    }
  }

  // Large debits (>$10k) always warrant a look, unless already in a safe category
  if ((out.debit_amount || 0) > 10000 && !isSafeCat && !out.needs_review) {
    out = { ...out, needs_review: true, review_reason: 'Large debit — verify business purpose' };
  }

  // Only flag uncategorized if we couldn't map it
  if (!categorized) {
    return { ...out, category: 'uncategorized', account_name: 'Uncategorized', pl_include: false, needs_review: true, review_reason: out.review_reason || 'Could not auto-categorize' };
  }

  return out;
}

function detectDuplicates(txs) {
  const seen = new Map();
  return txs.map(tx => {
    const key = `${tx.transaction_date}|${tx.debit_amount}|${tx.credit_amount}|${(tx.description || '').substring(0, 25).toLowerCase()}`;
    if (seen.has(key)) {
      return { ...tx, is_duplicate: true, needs_review: true, review_reason: tx.review_reason || 'Possible duplicate transaction' };
    }
    seen.set(key, true);
    return tx;
  });
}

const CLASSIFY_SCHEMA = {
  type: 'object',
  properties: {
    document_type: { type: 'string' },
    confidence_score: { type: 'number' },
    institution_name: { type: 'string' },
    account_number_masked: { type: 'string' },
    company_name: { type: 'string' },
    period_start: { type: 'string' },
    period_end: { type: 'string' },
    classification_reason: { type: 'string' },
    needs_review: { type: 'boolean' },
    review_reason: { type: 'string' },
  }
};

const EXTRACT_SCHEMA = {
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
    currency: { type: 'string' },
    confidence_score: { type: 'number' },
    transactions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tx_id: { type: 'string' },
          transaction_date: { type: 'string', description: 'YYYY-MM-DD' },
          posting_date: { type: 'string' },
          description: { type: 'string' },
          vendor_or_customer: { type: 'string' },
          reference_number: { type: 'string' },
          cheque_number: { type: 'string' },
          debit_amount: { type: 'number', description: 'Money OUT / withdrawal / charge — positive number or null' },
          credit_amount: { type: 'number', description: 'Money IN / deposit / payment received — positive number or null' },
          running_balance: { type: 'number' },
          tax_amount: { type: 'number' },
          source_file: { type: 'string' },
          source_page: { type: 'number' },
          confidence: { type: 'number' },
          needs_review: { type: 'boolean' },
          review_reason: { type: 'string' },
          category: { type: 'string' },
        }
      }
    },
  }
};

async function classifyFile(base44, url, fileName) {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  const prompt = `You are an expert financial document classifier. Analyze this document and classify it.

File name: "${fileName}"
File extension: "${ext}"

Classify into one of these types:
bank_statement, credit_card_statement, invoice, receipt, payroll_report, loan_statement, sales_report, expense_report, tax_report, vendor_statement, customer_statement, accounting_export, gl_export, pl_statement, balance_sheet, trial_balance, unknown

Return JSON:
- document_type: one of the types above
- confidence_score: 0-100
- institution_name: bank/institution name if detectable, else null
- account_number_masked: last 4 digits only if visible, else null
- company_name: company name if visible, else null
- period_start: YYYY-MM-DD if detectable, else null
- period_end: YYYY-MM-DD if detectable, else null
- classification_reason: brief explanation of why you classified it this way
- needs_review: true if confidence < 70 or document is unclear
- review_reason: specific reason if needs_review is true, else null`;

  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Classification timeout')), 60000));
  const classifyPromise = base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt, file_urls: [url], model: 'gemini_3_flash', response_json_schema: CLASSIFY_SCHEMA,
  });
  return await Promise.race([classifyPromise, timeoutPromise]);
}

async function extractFile(base44, url, fileName, fileIndex, docType) {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  const isImage = ['png','jpg','jpeg','tiff','webp'].includes(ext);
  const isPDF = ext === 'pdf';
  const isExcel = ['xlsx','xls'].includes(ext);
  const isCSV = ext === 'csv';
  const fileType = isExcel ? 'Excel spreadsheet' : isCSV ? 'CSV file' : isPDF ? 'PDF document' : isImage ? 'scanned image/document' : 'financial document';

  // Use gemini_3_1_pro for full OCR on scanned PDFs and images; gemini_3_flash for structured files
  const model = (isImage || isPDF) ? 'gemini_3_1_pro' : 'gemini_3_flash';

  const prompt = `You are an expert CPA and bookkeeper with OCR capability. Extract ALL financial transactions from this ${fileType}: "${fileName}".
Document type: ${docType || 'financial document'}

${isImage || isPDF ? `IMPORTANT: This may be a scanned document. Use full OCR to read every character. Do not skip any row, even if text appears faint, rotated, or partially legible. Flag low-legibility items with needs_review=true.` : ''}

Return JSON with:
- document_type, institution_name, account_number_masked (last 4 only), company_name, accounting_basis (cash|accrual|unknown)
- period_start/period_end: YYYY-MM-DD
- opening_balance, closing_balance, statement_total_credits, statement_total_debits (numbers or null)
- currency: ISO code (default CAD), confidence_score: 0-100
- transactions: array of ALL rows, each with:
  tx_id: "F${fileIndex}-TX-NNN" (sequential NNN padded to 3 digits)
  transaction_date: YYYY-MM-DD
  posting_date: YYYY-MM-DD or null
  description: full description as written on statement
  vendor_or_customer: extracted merchant/payee/payer name or null
  reference_number: cheque number, reference, or authorization number or null
  cheque_number: cheque number if present, else null
  debit_amount: positive number (money OUT / withdrawal / charge) or null
  credit_amount: positive number (money IN / deposit / payment) or null
  running_balance: running balance after this transaction or null
  tax_amount: GST/HST/tax portion if visible or null
  source_file: "${fileName}"
  source_page: page number where this row appeared or null
  confidence: 0.0-1.0 (your extraction confidence for this row — most clear transactions should be 0.9+)
  needs_review: ONLY set true if the amount is illegible, direction (debit vs credit) is genuinely unclear, or the row is partially cut off. DO NOT flag for review just because the category is unknown.
  review_reason: specific reason only if needs_review is true, else null
  category: best-guess from: revenue|other_income|cogs|bank_charges|rent|payroll|insurance|utilities|software|advertising|telecom|vehicle|travel|meals|professional_fees|office_expenses|repairs|interest_expense|taxes|owner_drawings|transfer|cc_payment|loan_payment|cash_withdrawal|uncategorized

EXTRACTION RULES:
- Extract EVERY transaction row without exception
- Skip only pure header, footer, or page-break rows
- Deposits / credits / payments IN = credit_amount
- Withdrawals / charges / payments OUT = debit_amount
- Most transactions have a clear direction — only set needs_review=true for genuinely ambiguous amounts or illegible OCR
- NEVER fabricate amounts you cannot read; set needs_review=true only in that case
- Preserve exact description text as it appears on the document
- Set confidence >= 0.9 for clearly readable rows, 0.7-0.9 for slightly unclear, below 0.7 only for seriously degraded text`;

  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${fileName}`)), 120000));
  const extractPromise = base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt, file_urls: [url], model, response_json_schema: EXTRACT_SCHEMA,
  });
  const result = await Promise.race([extractPromise, timeoutPromise]);

  const txs = detectDuplicates((result.transactions || []).map(tx => categorize(tx)));
  return { ...result, transactions: txs, file_name: fileName, ocr_model: model };
}

function reconcileFile(fileResult, allTxs) {
  const fileTxs = allTxs.filter(t => t.source_file === fileResult.file_name);
  const calcCredits = fileTxs.reduce((s, t) => s + (t.credit_amount || 0), 0);
  const calcDebits = fileTxs.reduce((s, t) => s + (t.debit_amount || 0), 0);
  const netActivity = calcCredits - calcDebits;
  const warnings = [];
  const duplicates = fileTxs.filter(t => t.is_duplicate).length;
  const reviewItems = fileTxs.filter(t => t.needs_review && !t.is_duplicate).length;
  const unmatchedDebits = fileTxs.filter(t => t.debit_amount && !t.credit_amount).length;
  const unmatchedCredits = fileTxs.filter(t => t.credit_amount && !t.debit_amount).length;

  let status, difference = null, calculatedClosing = null;

  if (fileResult.opening_balance != null && fileResult.closing_balance != null) {
    // Full balance reconciliation
    calculatedClosing = fileResult.opening_balance + calcCredits - calcDebits;
    difference = Math.abs(calculatedClosing - fileResult.closing_balance);
    if (difference < 0.02) {
      status = 'reconciled';
    } else if (difference < 50) {
      status = 'partially_reconciled';
      warnings.push(`Small balance mismatch of $${difference.toFixed(2)} — may be rounding or missing transaction`);
    } else {
      status = 'not_reconciled';
      warnings.push(`Balance mismatch: calculated closing $${calculatedClosing.toFixed(2)} vs stated $${fileResult.closing_balance.toFixed(2)} (diff $${difference.toFixed(2)})`);
    }
  } else if (fileResult.closing_balance != null && fileResult.opening_balance == null) {
    // Only closing balance — compute net
    status = fileTxs.length > 0 ? 'partially_reconciled' : 'not_reconciled';
    warnings.push('Opening balance not detected — net activity reconciliation only');
  } else if (fileTxs.length > 0) {
    // No balances — reconcile on transaction totals only
    status = duplicates > 0 ? 'partially_reconciled' : 'reconciled';
    warnings.push('No statement balances detected — reconciled by transaction totals');
  } else {
    status = 'not_reconciled';
    warnings.push('No transactions extracted from this file');
  }

  if (duplicates > 0) warnings.push(`${duplicates} possible duplicate transaction(s) detected`);
  if (reviewItems > 0) warnings.push(`${reviewItems} transaction(s) flagged for review`);

  // Statement vs extracted comparison
  const stmtCredits = fileResult.statement_total_credits;
  const stmtDebits = fileResult.statement_total_debits;
  if (stmtCredits != null && Math.abs(stmtCredits - calcCredits) > 0.02) {
    warnings.push(`Credit total mismatch: statement $${stmtCredits.toFixed(2)} vs extracted $${calcCredits.toFixed(2)}`);
    if (status === 'reconciled') status = 'partially_reconciled';
  }
  if (stmtDebits != null && Math.abs(stmtDebits - calcDebits) > 0.02) {
    warnings.push(`Debit total mismatch: statement $${stmtDebits.toFixed(2)} vs extracted $${calcDebits.toFixed(2)}`);
    if (status === 'reconciled') status = 'partially_reconciled';
  }

  return {
    file_name: fileResult.file_name,
    document_type: fileResult.document_type,
    institution_name: fileResult.institution_name,
    account_number_masked: fileResult.account_number_masked,
    period_start: fileResult.period_start,
    period_end: fileResult.period_end,
    opening_balance: fileResult.opening_balance,
    closing_balance: fileResult.closing_balance,
    calculated_closing: calculatedClosing,
    statement_total_credits: stmtCredits,
    statement_total_debits: stmtDebits,
    total_credits: calcCredits,
    total_debits: calcDebits,
    net_activity: netActivity,
    difference,
    status,
    transaction_count: fileTxs.length,
    unmatched_debits: unmatchedDebits,
    unmatched_credits: unmatchedCredits,
    confidence_score: fileResult.confidence_score || 0,
    warnings,
    duplicate_count: duplicates,
    review_count: reviewItems,
  };
}

function buildGL(txs) {
  const m = {};
  txs.forEach(tx => {
    const n = tx.account_name || 'Uncategorized';
    if (!m[n]) m[n] = { account_name: n, category: tx.category || 'uncategorized', pl_include: tx.pl_include !== false, transactions: [], debit_total: 0, credit_total: 0 };
    m[n].transactions.push(tx);
    m[n].debit_total += (tx.debit_amount || 0);
    m[n].credit_total += (tx.credit_amount || 0);
  });
  Object.values(m).forEach(a => {
    a.net_balance = a.debit_total - a.credit_total;
    let r = 0;
    a.transactions = a.transactions.sort((x, y) => (x.transaction_date || '') < (y.transaction_date || '') ? -1 : 1).map(tx => {
      r += (tx.debit_amount || 0) - (tx.credit_amount || 0);
      return { ...tx, running_balance_gl: r };
    });
  });
  return { generated_at: new Date().toISOString(), total_debits: txs.reduce((s, t) => s + (t.debit_amount || 0), 0), total_credits: txs.reduce((s, t) => s + (t.credit_amount || 0), 0), accounts: Object.values(m).sort((a, b) => a.account_name.localeCompare(b.account_name)), transaction_count: txs.length };
}

function buildPL(txs) {
  const OPEX = ['bank_charges','rent','payroll','insurance','utilities','software','advertising','telecom','vehicle','travel','meals','professional_fees','office_expenses','repairs','interest_expense'];
  const EXCL = ['transfer','cc_payment','loan_payment','owner_drawings','taxes','cash_withdrawal'];
  const filtered = txs.filter(t => t.pl_include !== false && !EXCL.includes(t.category));
  const sum = (cats, field) => filtered.filter(t => cats.includes(t.category)).reduce((s, t) => s + (t[field] || 0), 0);
  const lines = (cats, field) => { const g = {}; filtered.filter(t => cats.includes(t.category)).forEach(t => { const k = t.account_name || t.category; if (!g[k]) g[k] = { account: k, amount: 0, count: 0 }; g[k].amount += (t[field] || 0); g[k].count++; }); return Object.values(g).sort((a, b) => b.amount - a.amount); };
  const rev = sum(['revenue'], 'credit_amount'), cogs = sum(['cogs'], 'debit_amount'), gp = rev - cogs, opex = sum(OPEX, 'debit_amount'), noi = gp - opex, oi = sum(['other_income'], 'credit_amount'), np = noi + oi;
  const months = {};
  filtered.forEach(tx => { if (!tx.transaction_date) return; const mo = tx.transaction_date.substring(0, 7); if (!months[mo]) months[mo] = { month: mo, revenue: 0, cogs: 0, gross_profit: 0, opex: 0, net_income: 0 }; if (tx.category === 'revenue') months[mo].revenue += (tx.credit_amount || 0); if (tx.category === 'cogs') months[mo].cogs += (tx.debit_amount || 0); if (OPEX.includes(tx.category)) months[mo].opex += (tx.debit_amount || 0); });
  Object.values(months).forEach(m => { m.gross_profit = m.revenue - m.cogs; m.net_income = m.gross_profit - m.opex; });
  return { generated_at: new Date().toISOString(), included_count: filtered.length, excluded_count: txs.length - filtered.length, review_count: txs.filter(t => t.needs_review).length, revenue: rev, revenue_lines: lines(['revenue'], 'credit_amount'), cogs, cogs_lines: lines(['cogs'], 'debit_amount'), gross_profit: gp, gross_margin_pct: rev > 0 ? ((gp / rev) * 100).toFixed(1) : '0.0', operating_expenses: opex, operating_expense_lines: lines(OPEX, 'debit_amount'), net_operating_income: noi, other_income: oi, net_profit: np, monthly_data: Object.values(months).sort((a, b) => a.month > b.month ? 1 : -1), transaction_count: filtered.length };
}

function buildTrialBalance(txs) {
  const m = {};
  txs.forEach(tx => { const n = tx.account_name || 'Uncategorized'; if (!m[n]) m[n] = { account_name: n, category: tx.category || 'uncategorized', debit_total: 0, credit_total: 0 }; m[n].debit_total += (tx.debit_amount || 0); m[n].credit_total += (tx.credit_amount || 0); });
  const accounts = Object.values(m).map(a => ({ ...a, net_balance: a.debit_total - a.credit_total }));
  const td = accounts.reduce((s, a) => s + a.debit_total, 0), tc = accounts.reduce((s, a) => s + a.credit_total, 0);
  return { generated_at: new Date().toISOString(), accounts, total_debits: td, total_credits: tc, is_balanced: Math.abs(td - tc) < 0.01 };
}

function buildMonthlySummary(txs) {
  const months = {};
  txs.forEach(tx => { if (!tx.transaction_date) return; const m = tx.transaction_date.substring(0, 7); if (!months[m]) months[m] = { month: m, total_debits: 0, total_credits: 0, transaction_count: 0, review_count: 0, duplicate_count: 0 }; months[m].total_debits += (tx.debit_amount || 0); months[m].total_credits += (tx.credit_amount || 0); months[m].transaction_count++; if (tx.needs_review) months[m].review_count++; if (tx.is_duplicate) months[m].duplicate_count++; });
  return { generated_at: new Date().toISOString(), months: Object.values(months).sort((a, b) => a.month > b.month ? 1 : -1) };
}

function buildReviewItems(txs) {
  const items = txs.filter(t => t.needs_review).map(t => ({ tx_id: t.tx_id, transaction_date: t.transaction_date, description: t.description, vendor_or_customer: t.vendor_or_customer, debit_amount: t.debit_amount, credit_amount: t.credit_amount, suggested_category: t.category || 'uncategorized', account_name: t.account_name, review_reason: t.review_reason || 'Flagged for review', source_file: t.source_file, confidence: t.confidence, is_duplicate: t.is_duplicate || false, recommended_action: t.is_duplicate ? 'Verify and delete if duplicate' : 'Review and confirm category' }));
  return { generated_at: new Date().toISOString(), count: items.length, items };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { mode } = body;

    // ── CLASSIFY: AI classify all uploaded files ──
    if (mode === 'classify') {
      const { session_id, file_urls, file_names } = body;
      if (!session_id || !file_urls?.length) return Response.json({ error: 'Missing session_id or file_urls' }, { status: 400 });

      const auditEntry = { action: 'classification_started', timestamp: new Date().toISOString(), file_count: file_names.length };

      await base44.asServiceRole.entities.BookKeeperSession.update(session_id, {
        status: 'classifying',
        audit_trail: JSON.stringify([auditEntry])
      });

      const classifyWithTimeout = async (url, name, index) => {
        try {
          const result = await classifyFile(base44, url, name);
          return { index, file_name: name, file_url: url, ...result, status: result.needs_review ? 'needs_review' : result.confidence_score >= 70 ? 'ready' : 'low_confidence' };
        } catch (e) {
          return { index, file_name: name, file_url: url, document_type: 'unknown', confidence_score: 0, needs_review: true, review_reason: e.message, status: 'needs_review' };
        }
      };

      const classifications = await Promise.all(file_urls.map((url, i) => classifyWithTimeout(url, file_names[i], i)));

      const audit = [auditEntry, { action: 'classification_completed', timestamp: new Date().toISOString(), results: classifications.map(c => ({ file: c.file_name, type: c.document_type, confidence: c.confidence_score })) }];

      await base44.asServiceRole.entities.BookKeeperSession.update(session_id, {
        status: 'review',
        file_classifications: JSON.stringify(classifications),
        audit_trail: JSON.stringify(audit),
      });

      return Response.json({ success: true, classifications });
    }

    // ── EXTRACT_ALL: extract all approved files in parallel ──
    if (mode === 'extract_all') {
      const { session_id, file_urls, file_names, file_classifications } = body;
      if (!session_id || !file_urls?.length) return Response.json({ error: 'Missing session_id or file_urls' }, { status: 400 });

      let progress = file_names.map((name, i) => ({ name, index: i, status: 'pending', tx_count: 0 }));
      await base44.asServiceRole.entities.BookKeeperSession.update(session_id, { status: 'extracting', file_progress: JSON.stringify(progress) });

      const extractWithProgress = async (url, name, index) => {
        progress[index].status = 'processing';
        await base44.asServiceRole.entities.BookKeeperSession.update(session_id, { file_progress: JSON.stringify(progress) });
        const docType = file_classifications?.[index]?.document_type || null;
        try {
          const result = await extractFile(base44, url, name, index, docType);
          progress[index].status = 'done';
          progress[index].tx_count = result.transactions.length;
          progress[index].confidence = result.confidence_score;
          await base44.asServiceRole.entities.BookKeeperSession.update(session_id, { file_progress: JSON.stringify(progress) });
          return { success: true, result, transactions: result.transactions };
        } catch (e) {
          progress[index].status = 'failed';
          progress[index].error = e.message;
          await base44.asServiceRole.entities.BookKeeperSession.update(session_id, { file_progress: JSON.stringify(progress) });
          return { success: false, error: e.message, file_name: name, transactions: [] };
        }
      };

      const results = await Promise.all(file_urls.map((url, i) => extractWithProgress(url, file_names[i], i)));
      const allTxs = results.flatMap(r => r.transactions);
      const fileResults = results.map(r => r.success ? r.result : { file_name: r.file_name, transactions: [], confidence_score: 0, error: r.error });
      const completedCount = results.filter(r => r.success).length;

      if (completedCount === 0) {
        await base44.asServiceRole.entities.BookKeeperSession.update(session_id, { status: 'failed' });
        return Response.json({ error: 'All files failed extraction' }, { status: 500 });
      }

      // Reconcile + build all reports
      const bankRecon = fileResults.map(fr => reconcileFile(fr, allTxs));
      const totalDebits = allTxs.reduce((s, t) => s + (t.debit_amount || 0), 0);
      const totalCredits = allTxs.reduce((s, t) => s + (t.credit_amount || 0), 0);
      const reviewCount = allTxs.filter(t => t.needs_review).length;
      const duplicateCount = allTxs.filter(t => t.is_duplicate).length;
      const uncatCount = allTxs.filter(t => !t.category || t.category === 'uncategorized').length;
      // Matched = categorized + not a duplicate (review flags are advisory, not blocking)
      const matchedCount = allTxs.filter(t => t.category && t.category !== 'uncategorized' && !t.is_duplicate).length;
      const avgConf = completedCount > 0 ? Math.round(fileResults.filter(r => !r.error).reduce((s, r) => s + (r.confidence_score || 0), 0) / completedCount) : 0;
      const companyName = fileResults.find(r => r.company_name)?.company_name || null;
      const currency = fileResults.find(r => r.currency)?.currency || 'CAD';
      const dateFrom = fileResults.map(r => r.period_start).filter(Boolean).sort()[0] || null;
      const dateTo = fileResults.map(r => r.period_end).filter(Boolean).sort().reverse()[0] || null;

      const reconSummary = {
        total_files: fileResults.length,
        reconciled_files: bankRecon.filter(r => r.status === 'reconciled').length,
        unreconciled_files: bankRecon.filter(r => r.status !== 'reconciled').length,
        total_matched: matchedCount,
        total_unmatched: uncatCount,
        total_duplicates: duplicateCount,
        total_review_flagged: reviewCount,
        completion_pct: allTxs.length > 0 ? Math.round((matchedCount / allTxs.length) * 100) : 0,
      };

      const auditRec = await base44.asServiceRole.entities.BookKeeperSession.get(session_id);
      const audit = JSON.parse(auditRec?.audit_trail || '[]');
      audit.push({ action: 'extraction_completed', timestamp: new Date().toISOString(), transaction_count: allTxs.length, files_succeeded: completedCount, files_failed: results.length - completedCount });

      await base44.asServiceRole.entities.BookKeeperSession.update(session_id, {
        status: 'review',
        file_progress: JSON.stringify(progress),
        transactions_raw: JSON.stringify(allTxs),
        bank_reconciliation: JSON.stringify(bankRecon),
        reconciliation_results: JSON.stringify(reconSummary),
        gl_report: JSON.stringify(buildGL(allTxs)),
        pl_report: JSON.stringify(buildPL(allTxs)),
        trial_balance: JSON.stringify(buildTrialBalance(allTxs)),
        transaction_summary: JSON.stringify(buildMonthlySummary(allTxs)),
        review_items_report: JSON.stringify(buildReviewItems(allTxs)),
        reports_generated: JSON.stringify(['gl', 'pl', 'trial_balance', 'monthly_summary', 'review_items']),
        total_debits: totalDebits,
        total_credits: totalCredits,
        transaction_count: allTxs.length,
        matched_count: matchedCount,
        unmatched_count: reviewCount,
        duplicate_count: duplicateCount,
        review_count: reviewCount,
        uncategorized_count: uncatCount,
        confidence_score: avgConf,
        company_name: companyName,
        currency,
        date_from: dateFrom,
        date_to: dateTo,
        audit_trail: JSON.stringify(audit),
      });

      return Response.json({ success: true, transaction_count: allTxs.length, review_count: reviewCount, completed_files: completedCount, has_failures: results.some(r => !r.success) });
    }

    // ── REGENERATE: rebuild reports from reviewed transactions ──
    if (mode === 'regenerate') {
      const { session_id, report_types, date_from, date_to } = body;
      const rec = await base44.asServiceRole.entities.BookKeeperSession.get(session_id);
      if (!rec) return Response.json({ error: 'Session not found' }, { status: 404 });
      let txs = JSON.parse(rec.transactions_reviewed || rec.transactions_raw || '[]');
      if (date_from) txs = txs.filter(t => !t.transaction_date || t.transaction_date >= date_from);
      if (date_to) txs = txs.filter(t => !t.transaction_date || t.transaction_date <= date_to);
      const updates = { status: 'completed', reports_generated: JSON.stringify(report_types) };
      if (report_types.includes('gl')) updates.gl_report = JSON.stringify(buildGL(txs));
      if (report_types.includes('pl')) updates.pl_report = JSON.stringify(buildPL(txs));
      if (report_types.includes('trial_balance')) updates.trial_balance = JSON.stringify(buildTrialBalance(txs));
      if (report_types.includes('monthly_summary')) updates.transaction_summary = JSON.stringify(buildMonthlySummary(txs));
      if (report_types.includes('review_items')) updates.review_items_report = JSON.stringify(buildReviewItems(txs));
      await base44.asServiceRole.entities.BookKeeperSession.update(session_id, updates);
      return Response.json({ success: true, generated: report_types });
    }

    // ── RECONCILE_PERIOD: reconcile transactions for a specific period ──
    if (mode === 'reconcile_period') {
      const { session_id, period_type, period_value, date_from, date_to } = body;
      const rec = await base44.asServiceRole.entities.BookKeeperSession.get(session_id);
      if (!rec) return Response.json({ error: 'Session not found' }, { status: 404 });

      let allTxs = JSON.parse(rec.transactions_reviewed || rec.transactions_raw || '[]');
      const fileMetadata = JSON.parse(rec.file_metadata || '[]');

      // Filter by date range
      let from = date_from, to = date_to;
      if (!from && !to && period_value) {
        if (period_type === 'monthly') {
          from = `${period_value}-01`;
          const [y, m] = period_value.split('-').map(Number);
          const last = new Date(y, m, 0).getDate();
          to = `${period_value}-${String(last).padStart(2, '0')}`;
        } else if (period_type === 'quarterly') {
          const [y, q] = period_value.split('-Q');
          const qNum = parseInt(q);
          const startMonth = (qNum - 1) * 3 + 1;
          const endMonth = qNum * 3;
          from = `${y}-${String(startMonth).padStart(2, '0')}-01`;
          const last = new Date(parseInt(y), endMonth, 0).getDate();
          to = `${y}-${String(endMonth).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
        } else if (period_type === 'yearly') {
          from = `${period_value}-01-01`;
          to = `${period_value}-12-31`;
        }
      }

      const txs = (from || to)
        ? allTxs.filter(t => {
            if (!t.transaction_date) return true; // include undated txs in all periods
            if (from && t.transaction_date < from) return false;
            if (to && t.transaction_date > to) return false;
            return true;
          })
        : allTxs;

      const totalCredits = txs.reduce((s, t) => s + (t.credit_amount || 0), 0);
      const totalDebits = txs.reduce((s, t) => s + (t.debit_amount || 0), 0);
      const netActivity = totalCredits - totalDebits;
      const reviewCount = txs.filter(t => t.needs_review).length;
      const duplicateCount = txs.filter(t => t.is_duplicate).length;
      const uncatCount = txs.filter(t => !t.category || t.category === 'uncategorized').length;
      const matchedCount = txs.filter(t => t.category && t.category !== 'uncategorized' && !t.is_duplicate).length;

      // Per-account breakdown
      const accountBreakdown = {};
      txs.forEach(tx => {
        const key = tx.account_name || 'Uncategorized';
        if (!accountBreakdown[key]) accountBreakdown[key] = { account_name: key, category: tx.category || 'uncategorized', debit_total: 0, credit_total: 0, count: 0 };
        accountBreakdown[key].debit_total += (tx.debit_amount || 0);
        accountBreakdown[key].credit_total += (tx.credit_amount || 0);
        accountBreakdown[key].count++;
      });

      // Per-file breakdown for the period
      const fileBreakdown = {};
      txs.forEach(tx => {
        const key = tx.source_file || 'Unknown';
        if (!fileBreakdown[key]) fileBreakdown[key] = { file_name: key, debit_total: 0, credit_total: 0, count: 0, review_count: 0 };
        fileBreakdown[key].debit_total += (tx.debit_amount || 0);
        fileBreakdown[key].credit_total += (tx.credit_amount || 0);
        fileBreakdown[key].count++;
        if (tx.needs_review) fileBreakdown[key].review_count++;
      });

      // Per-month breakdown within period
      const monthlyBreakdown = {};
      txs.forEach(tx => {
        if (!tx.transaction_date) return;
        const mo = tx.transaction_date.substring(0, 7);
        if (!monthlyBreakdown[mo]) monthlyBreakdown[mo] = { month: mo, debit_total: 0, credit_total: 0, count: 0, net: 0 };
        monthlyBreakdown[mo].debit_total += (tx.debit_amount || 0);
        monthlyBreakdown[mo].credit_total += (tx.credit_amount || 0);
        monthlyBreakdown[mo].count++;
      });
      Object.values(monthlyBreakdown).forEach(m => { m.net = m.credit_total - m.debit_total; });

      // Category breakdown
      const categoryBreakdown = {};
      txs.forEach(tx => {
        const cat = tx.category || 'uncategorized';
        if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { category: cat, account_name: tx.account_name || cat, debit_total: 0, credit_total: 0, count: 0 };
        categoryBreakdown[cat].debit_total += (tx.debit_amount || 0);
        categoryBreakdown[cat].credit_total += (tx.credit_amount || 0);
        categoryBreakdown[cat].count++;
      });

      // Warnings
      const warnings = [];
      if (duplicateCount > 0) warnings.push(`${duplicateCount} possible duplicate transaction(s) in this period`);
      if (uncatCount > 0) warnings.push(`${uncatCount} uncategorized transaction(s) need classification`);
      if (reviewCount > 0) warnings.push(`${reviewCount} transaction(s) flagged for review`);

      const reconPct = txs.length > 0 ? Math.round((matchedCount / txs.length) * 100) : 0;

      return Response.json({
        success: true,
        period_type,
        period_value,
        date_from: from,
        date_to: to,
        transaction_count: txs.length,
        total_credits: totalCredits,
        total_debits: totalDebits,
        net_activity: netActivity,
        matched_count: matchedCount,
        review_count: reviewCount,
        duplicate_count: duplicateCount,
        uncategorized_count: uncatCount,
        reconciliation_pct: reconPct,
        status: duplicateCount > 0 || reconPct < 80 ? 'needs_attention' : 'reconciled',
        warnings,
        account_breakdown: Object.values(accountBreakdown).sort((a, b) => (b.debit_total + b.credit_total) - (a.debit_total + a.credit_total)),
        file_breakdown: Object.values(fileBreakdown),
        monthly_breakdown: Object.values(monthlyBreakdown).sort((a, b) => a.month > b.month ? 1 : -1),
        category_breakdown: Object.values(categoryBreakdown).sort((a, b) => (b.debit_total + b.credit_total) - (a.debit_total + a.credit_total)),
        transactions: txs,
      });
    }

    return Response.json({ error: 'Unknown mode' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});