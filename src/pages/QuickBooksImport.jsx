import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Users, BarChart2, CreditCard, CheckCircle, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

const IMPORT_TYPES = [
  {
    id: 'clients',
    label: 'Client / Customer List',
    description: 'Import contact info from QuickBooks customer export',
    icon: Users,
    instructions: [
      'In QuickBooks, go to Reports → Customer Contact List',
      'Click Export → Export to Excel / CSV',
      'Upload that file here',
    ],
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'financials',
    label: 'Financial Reports',
    description: 'P&L or Balance Sheet exported from QuickBooks',
    icon: BarChart2,
    instructions: [
      'In QuickBooks, go to Reports → P&L or Balance Sheet',
      'Click Export → Export to Excel',
      'Upload that file here',
    ],
    color: 'bg-green-50 text-green-700 border-green-200',
  },
  {
    id: 'transactions',
    label: 'Transactions',
    description: 'Invoices and expenses exported from QuickBooks',
    icon: CreditCard,
    instructions: [
      'In QuickBooks, go to Reports → Transaction List by Date',
      'Click Export → Export to Excel / CSV',
      'Upload that file here',
    ],
    color: 'bg-purple-50 text-purple-700 border-purple-200',
  },
];

export default function QuickBooksImport() {
  const [selectedType, setSelectedType] = useState(null);
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('select'); // select | upload | processing | results
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  const handleImport = async () => {
    if (!file || !selectedType) return;
    setStep('processing');
    setError(null);

    // Upload file first
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    // Build prompt based on type
    let prompt = '';
    let schema = {};

    if (selectedType === 'clients') {
      prompt = `You are parsing a QuickBooks customer/client export file. Extract all client records from the data in this file.
For each client, extract: name, email, phone, address. 
Map "Customer" or "Name" columns to "name". Map "Email" to "email". Map "Phone" or "Mobile" to "phone". Map "Billing Address" or "Address" to "address".
Return only clients that have at least a name. Return an empty array if none found.`;
      schema = {
        type: 'object',
        properties: {
          records: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
                address: { type: 'string' },
              },
            },
          },
          summary: { type: 'string' },
        },
      };
    } else if (selectedType === 'financials') {
      prompt = `You are parsing a QuickBooks financial report (P&L or Balance Sheet). 
Extract the key financial line items and their values. Group them by section (e.g. Income, Expenses, Assets, Liabilities).
Return a structured summary of the financial data.`;
      schema = {
        type: 'object',
        properties: {
          report_type: { type: 'string' },
          period: { type: 'string' },
          sections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                section: { type: 'string' },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      label: { type: 'string' },
                      amount: { type: 'number' },
                    },
                  },
                },
                total: { type: 'number' },
              },
            },
          },
          summary: { type: 'string' },
        },
      };
    } else {
      prompt = `You are parsing a QuickBooks transaction export. Extract all transaction records.
For each transaction extract: date, type (invoice/expense/payment/etc), description or memo, amount, and customer/vendor name if available.
Return all transactions found.`;
      schema = {
        type: 'object',
        properties: {
          records: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string' },
                type: { type: 'string' },
                description: { type: 'string' },
                amount: { type: 'number' },
                party: { type: 'string' },
              },
            },
          },
          summary: { type: 'string' },
        },
      };
    }

    const parsed = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [file_url],
      response_json_schema: schema,
    });

    // For clients: save to database
    if (selectedType === 'clients' && parsed.records?.length > 0) {
      const toCreate = parsed.records.map(r => ({
        name: r.name,
        email: r.email || '',
        phone: r.phone || '',
        address: r.address || '',
        type: 'individual',
        status: 'active',
      }));
      await base44.entities.Client.bulkCreate(toCreate);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    }

    setResults({ type: selectedType, data: parsed });
    setStep('results');
  };

  const reset = () => {
    setSelectedType(null);
    setFile(null);
    setStep('select');
    setResults(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold">QuickBooks Import</h1>
        <p className="text-sm text-muted-foreground mt-1">Import data exported from QuickBooks into SOC Ai</p>
      </div>

      {/* Step: Select Type */}
      {step === 'select' && (
        <div className="space-y-4">
          <p className="text-sm font-medium">What do you want to import?</p>
          <div className="grid gap-3">
            {IMPORT_TYPES.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => { setSelectedType(t.id); setStep('upload'); }}
                  className={`flex items-start gap-4 p-4 rounded-xl border text-left hover:shadow-md transition-all ${selectedType === t.id ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className={`p-2 rounded-lg border ${t.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{t.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step: Upload */}
      {step === 'upload' && selectedType && (() => {
        const typeInfo = IMPORT_TYPES.find(t => t.id === selectedType);
        const Icon = typeInfo.icon;
        return (
          <div className="space-y-5">
            <button onClick={() => setStep('select')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg border ${typeInfo.color}`}><Icon className="w-5 h-5" /></div>
                  <CardTitle className="text-base">{typeInfo.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">How to export from QuickBooks</p>
                  <ol className="space-y-1">
                    {typeInfo.instructions.map((step, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span className="font-bold text-primary">{i + 1}.</span> {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary hover:bg-muted/40 transition-all"
                >
                  <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                  {file ? (
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium">Drop your CSV or Excel file here</p>
                      <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                <Button onClick={handleImport} disabled={!file} className="w-full">
                  <FileText className="w-4 h-4 mr-2" /> Import Data
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Step: Processing */}
      {step === 'processing' && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="font-medium">Analyzing your QuickBooks file...</p>
          <p className="text-sm text-muted-foreground">This may take a few seconds</p>
        </div>
      )}

      {/* Step: Results */}
      {step === 'results' && results && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-sm text-green-800">Import Successful</p>
              {results.data.summary && <p className="text-xs text-green-700 mt-0.5">{results.data.summary}</p>}
            </div>
          </div>

          {/* Clients result */}
          {results.type === 'clients' && results.data.records && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  {results.data.records.length} Clients Imported
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {results.data.records.slice(0, 10).map((r, i) => (
                    <div key={i} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{r.name}</p>
                        {r.email && <p className="text-xs text-muted-foreground">{r.email}</p>}
                      </div>
                      {r.phone && <p className="text-xs text-muted-foreground">{r.phone}</p>}
                    </div>
                  ))}
                  {results.data.records.length > 10 && (
                    <p className="text-xs text-muted-foreground pt-3">...and {results.data.records.length - 10} more</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Financials result */}
          {results.type === 'financials' && results.data.sections && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  {results.data.report_type || 'Financial Report'} {results.data.period && `— ${results.data.period}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {results.data.sections.map((section, i) => (
                  <div key={i}>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">{section.section}</p>
                    <div className="divide-y">
                      {section.items?.map((item, j) => (
                        <div key={j} className="py-1.5 flex justify-between text-sm">
                          <span>{item.label}</span>
                          <span className="font-medium">${item.amount?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    {section.total !== undefined && (
                      <div className="flex justify-between text-sm font-bold mt-1 pt-1 border-t">
                        <span>Total {section.section}</span>
                        <span>${section.total?.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Transactions result */}
          {results.type === 'transactions' && results.data.records && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{results.data.records.length} Transactions Found</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {results.data.records.slice(0, 15).map((r, i) => (
                    <div key={i} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] capitalize">{r.type}</Badge>
                          <p className="text-sm truncate">{r.description || r.party || '—'}</p>
                        </div>
                        {r.date && <p className="text-xs text-muted-foreground mt-0.5">{r.date}</p>}
                      </div>
                      <p className={`text-sm font-medium whitespace-nowrap ${r.amount < 0 ? 'text-destructive' : ''}`}>
                        ${Math.abs(r.amount || 0).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  {results.data.records.length > 15 && (
                    <p className="text-xs text-muted-foreground pt-3">...and {results.data.records.length - 15} more</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Button variant="outline" onClick={reset} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" /> Import Another File
          </Button>
        </div>
      )}
    </div>
  );
}