import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const fileUrls = body.file_urls || [];
    const fileNames = body.file_names || [];
    const reportId = body.report_id;
    if (!fileUrls.length) return Response.json({ error: 'No files' }, { status: 400 });
    await base44.asServiceRole.entities.FinancialReport.update(reportId, { status: 'extracting' });
    const prompt = `You are an expert accountant. Extract ALL financial transactions from these ${fileUrls.length} document(s): ${fileNames.join(', ')}.

For each transaction return: transaction_date (YYYY-MM-DD or null), posting_date, account_name (or "UNCLASSIFIED"), account_code, debit_amount (number or null), credit_amount (number or null), description, vendor_or_customer, invoice_number, reference_number, tax_amount, payment_method, department, project, category (one of: assets, liabilities, equity, revenue, cogs, operating_expenses, other_income, other_expenses, unclassified), confidence (0-1), needs_review (true if confidence < 0.85 or key fields missing), review_reason.

Also return: opening_balance, closing_balance, period_start, period_end, document_currency (default CAD), source_document_type, total_debits, total_credits, validation (object with: debit_credit_balanced bool, balance_reconciles bool, duplicate_transactions array of index pairs, missing_dates array of indices, missing_accounts array of indices, unclassified_count number), chart_of_accounts (object grouping account names by category), document_summary string.

NEVER fabricate data. Set null + needs_review=true if uncertain.`;
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: fileUrls,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          transactions: { type: 'array', items: { type: 'object' } },
          opening_balance: { type: 'number' },
          closing_balance: { type: 'number' },
          period_start: { type: 'string' },
          period_end: { type: 'string' },
          document_currency: { type: 'string' },
          source_document_type: { type: 'string' },
          total_debits: { type: 'number' },
          total_credits: { type: 'number' },
          validation: { type: 'object' },
          chart_of_accounts: { type: 'object' },
          document_summary: { type: 'string' }
        }
      }
    });
    const transactions = result.transactions || [];
    const needsReview = transactions.filter(function(t) { return t.needs_review; }).length;
    const mapped = transactions.filter(function(t) { return !t.needs_review && t.category !== 'unclassified'; }).length;
    const issues = [];
    const v = result.validation || {};
    if (!v.debit_credit_balanced) issues.push({ type: 'imbalance', severity: 'high', message: 'Debits do not equal credits' });
    if (!v.balance_reconciles && result.opening_balance != null) issues.push({ type: 'balance_mismatch', severity: 'high', message: 'Balance does not reconcile' });
    if (v.unclassified_count > 0) issues.push({ type: 'unclassified', severity: 'low', message: v.unclassified_count + ' transaction(s) unclassified' });
    (v.missing_dates || []).forEach(function(idx) { issues.push({ type: 'missing_date', severity: 'medium', message: 'Transaction #' + (idx + 1) + ' missing date', index: idx }); });
    (v.missing_accounts || []).forEach(function(idx) { issues.push({ type: 'missing_account', severity: 'medium', message: 'Transaction #' + (idx + 1) + ' missing account', index: idx }); });
    (v.duplicate_transactions || []).forEach(function(pair) { issues.push({ type: 'duplicate', severity: 'medium', message: 'Possible duplicate at indices ' + pair[0] + ' and ' + pair[1] }); });
    await base44.asServiceRole.entities.FinancialReport.update(reportId, {
      status: needsReview > 0 ? 'review' : 'completed',
      transactions_raw: JSON.stringify(transactions),
      transactions_reviewed: JSON.stringify(transactions),
      validation_issues: JSON.stringify(issues),
      chart_of_accounts: JSON.stringify(result.chart_of_accounts || {}),
      total_debits: result.total_debits || 0,
      total_credits: result.total_credits || 0,
      transaction_count: transactions.length,
      mapped_count: mapped,
      review_count: needsReview
    });
    return Response.json({ success: true, transaction_count: transactions.length, needs_review: needsReview, mapped_count: mapped, validation_issues: issues.length });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});