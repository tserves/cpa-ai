import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { file_url, document_type, client_name, document_name } = await req.json();

  if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

  // Step 1: Extract financial data using AI vision
  const extractionPrompt = `You are a financial data extraction AI for a Canadian CPA firm.
Analyze this financial document (${document_type}: "${document_name}" for client "${client_name}") and extract ALL financial data.

Return a JSON with this exact structure:
{
  "document_summary": "brief description of what this document is",
  "period_start": "YYYY-MM-DD or null",
  "period_end": "YYYY-MM-DD or null",
  "total_amount": number (net total or balance, 0 if not applicable),
  "currency": "CAD",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "transaction description",
      "amount": number (negative for debits/expenses, positive for credits/income),
      "category": "one of: revenue, expense, transfer, tax, payroll, other",
      "vendor_or_source": "vendor or payer name if visible",
      "reference": "cheque/invoice/ref number if present"
    }
  ],
  "summary_by_category": {
    "revenue": number,
    "expense": number,
    "transfer": number,
    "tax": number,
    "payroll": number,
    "other": number
  },
  "anomalies": [
    {
      "severity": "low|medium|high",
      "type": "duplicate|unusual_amount|missing_info|round_number|unusual_vendor|date_gap|large_cash|other",
      "description": "clear explanation of the anomaly",
      "transaction_index": number or null,
      "amount": number or null
    }
  ],
  "accounting_entries": [
    {
      "debit_account": "account name",
      "credit_account": "account name",
      "amount": number,
      "description": "journal entry description",
      "date": "YYYY-MM-DD"
    }
  ]
}

Be thorough — flag: duplicate transactions, unusually large/small amounts, round-number amounts over $1000, missing dates or descriptions, gaps in statement dates, unusual vendors, large cash transactions over $10,000 (FINTRAC).`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: extractionPrompt,
    file_urls: [file_url],
    model: 'claude_sonnet_4_6',
    response_json_schema: {
      type: 'object',
      properties: {
        document_summary: { type: 'string' },
        period_start: { type: 'string' },
        period_end: { type: 'string' },
        total_amount: { type: 'number' },
        currency: { type: 'string' },
        transactions: { type: 'array', items: { type: 'object' } },
        summary_by_category: { type: 'object' },
        anomalies: { type: 'array', items: { type: 'object' } },
        accounting_entries: { type: 'array', items: { type: 'object' } }
      }
    }
  });

  const anomalyCount = (result.anomalies || []).length;
  const needsReview = anomalyCount > 0 || (result.anomalies || []).some(a => a.severity === 'high');

  return Response.json({
    extracted_data: JSON.stringify({
      document_summary: result.document_summary,
      period_start: result.period_start,
      period_end: result.period_end,
      total_amount: result.total_amount,
      currency: result.currency,
      transactions: result.transactions || [],
      summary_by_category: result.summary_by_category || {},
      accounting_entries: result.accounting_entries || []
    }),
    anomalies: JSON.stringify(result.anomalies || []),
    anomaly_count: anomalyCount,
    total_amount: result.total_amount || 0,
    transaction_count: (result.transactions || []).length,
    period_start: result.period_start || null,
    period_end: result.period_end || null,
    status: needsReview ? 'needs_review' : 'completed'
  });
});