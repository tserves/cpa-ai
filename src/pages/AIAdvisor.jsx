import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

const QUICK_PROMPTS = [
  "What are the T1 filing deadlines for 2025?",
  "How does GST/HST work for small businesses?",
  "What are the capital gains inclusion rate changes?",
  "Explain the TFSA contribution limits for 2025",
  "What are common T2 corporate deductions?",
  "How do I handle payroll remittances to CRA?",
];

export default function AIAdvisor() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text) => {
    const userMsg = text || input;
    if (!userMsg.trim()) return;

    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const conversationContext = newMessages.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n');

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert Canadian CPA tax advisor AI assistant. You specialize in Canadian tax law, CRA regulations, Income Tax Act, GST/HST, payroll, corporate tax, personal tax, and accounting best practices in Canada.

Always provide accurate, helpful advice specific to Canadian tax law. Reference specific CRA forms, sections of the Income Tax Act, and deadlines when relevant. If you're unsure about something, say so and recommend consulting with a CPA.

Use Canadian spelling and terminology. Format your responses with markdown for readability.

Conversation so far:
${conversationContext}

Respond to the user's latest message helpfully and professionally.`,
      add_context_from_internet: true,
    });

    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] lg:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-accent" />
          AI Tax Advisor
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Ask questions about Canadian tax law, CRA regulations, and accounting</p>
      </div>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-accent" />
              </div>
              <h2 className="text-lg font-display font-semibold mb-2">Canadian Tax AI Assistant</h2>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                I can help with CRA deadlines, tax planning, GST/HST, payroll, corporate & personal tax, and more.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl w-full">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    className="text-left text-xs p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-accent/30 transition-all text-muted-foreground hover:text-foreground"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-accent" />
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3",
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>
                    {msg.role === 'user' ? (
                      <p className="text-sm">{msg.content}</p>
                    ) : (
                      <ReactMarkdown className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-accent" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="border-t border-border p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about Canadian tax law..."
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !input.trim()} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}