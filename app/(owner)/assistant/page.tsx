'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatAge, getSpeciesEmoji } from '@/lib/format';
import type { Pet } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Bot, Send, ShieldAlert, Sparkles } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  urgent?: boolean;
}

const SAMPLE_PROMPTS = [
  'How often should I brush my Golden Retriever?',
  'Safe ear cleaning routine after bath time',
  'My pet is having seizures and difficulty breathing',
];

export default function CareAssistantPlaceholderPage() {
  const { data: pets = [] } = useQuery<Pet[]>({
    queryKey: ['my-pets'],
    queryFn: async () => (await api.get<Pet[]>('/pets')).data,
  });

  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [input, setInput] = useState('');
  const msgSeqRef = useRef(0);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'intro',
      sender: 'assistant',
      text: 'Welcome to the Petta Guarded AI Care Assistant UI shell. Full LLM integration, domain training, and RAG knowledge grounding are scheduled for Phase 2. You can preview the emergency red-flag triage workflow and pet-context layout below.',
    },
  ]);

  const activePet =
    pets.find((p) => String(p.pet_id) === selectedPetId) || pets[0] || null;

  const handleSend = (promptText?: string) => {
    const query = (promptText ?? input).trim();
    if (!query) return;

    const lower = query.toLowerCase();
    const isUrgent =
      lower.includes('seizure') ||
      lower.includes('bleeding') ||
      lower.includes('breathing') ||
      lower.includes('toxin') ||
      lower.includes('poison');

    msgSeqRef.current += 1;
    const seq = msgSeqRef.current;

    const userMsg: ChatMessage = {
      id: `u-${seq}`,
      sender: 'user',
      text: query,
    };

    const replyMsg: ChatMessage = isUrgent
      ? {
          id: `a-${seq}`,
          sender: 'assistant',
          urgent: true,
          text: `EMERGENCY ESCALATION PREVIEW: Your message mentions urgent red-flag symptoms${
            activePet ? ` for ${activePet.name}` : ''
          }. When Phase 2 AI Guardrails are active, Petta immediately halts home-care suggestions and directs you to book an urgent veterinary visit or contact an emergency clinic.`,
        }
      : {
          id: `a-${seq}`,
          sender: 'assistant',
          text: `Phase 2 AI Placeholder: Once the Gemini API wrapper and veterinary care dataset are connected${
            activePet
              ? ` (contextualized for ${activePet.name} — ${activePet.species}, ${activePet.breed})`
              : ''
          }, this assistant will provide safe, non-diagnostic hygiene, diet, and wellness guidance with a mandatory veterinary disclaimer.`,
        };

    setMessages((prev) => [...prev, userMsg, replyMsg]);
    if (!promptText) setInput('');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
              AI Care Assistant
            </h1>
            <Badge variant="secondary">Phase 2 — Training Pending</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Guarded non-diagnostic home-care literacy UI shell with clinical escalation rules.
          </p>
        </div>

        {pets.length > 0 && (
          <div className="w-full sm:w-64">
            <Select
              value={activePet ? String(activePet.pet_id) : ''}
              onValueChange={setSelectedPetId}
            >
              <SelectTrigger className="h-9 text-xs bg-white">
                <SelectValue placeholder="Select pet context" />
              </SelectTrigger>
              <SelectContent>
                {pets.map((p) => (
                  <SelectItem key={p.pet_id} value={String(p.pet_id)}>
                    {getSpeciesEmoji(p.species)} {p.name} ({p.species} • {formatAge(p.date_of_birth)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Safety Guardrail Banner */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
        <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Clinical Safety Boundary (CS318 Sec. 1.5 &amp; 3.2.3):</span>{' '}
          This assistant does not diagnose illnesses or prescribe medications. Model training and
          API integration will be implemented in the next phase; emergency keyword triage preview is
          active below.
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-slate-100 py-3.5 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bot className="h-4 w-4 text-emerald-600" />
            Care Chat Preview
            {activePet && (
              <span className="text-xs font-normal text-slate-500">
                • Context: {activePet.name} ({activePet.breed})
              </span>
            )}
          </CardTitle>
          <span className="text-[11px] font-mono text-slate-400">UI Shell</span>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          <div className="space-y-3 min-h-[260px] max-h-[380px] overflow-y-auto pr-1">
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.sender === 'user' ? 'flex justify-end' : 'flex justify-start'
                }
              >
                <div
                  className={
                    m.sender === 'user'
                      ? 'max-w-[82%] rounded-xl px-3.5 py-2.5 text-xs bg-emerald-600 text-white'
                      : m.urgent
                      ? 'max-w-[88%] rounded-xl px-3.5 py-3 text-xs bg-red-50 border border-red-200 text-red-900 space-y-2'
                      : 'max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs bg-slate-100 text-slate-800'
                  }
                >
                  {m.urgent && (
                    <div className="flex items-center gap-1.5 font-bold text-red-700">
                      <AlertTriangle className="h-4 w-4" /> Immediate Veterinary Attention Advised
                    </div>
                  )}
                  <p className="leading-relaxed">{m.text}</p>
                  {m.urgent && (
                    <Link href="/appointments/book" className="inline-block">
                      <Button size="sm" variant="destructive">
                        Book Urgent Clinic Visit →
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Sample Prompt Chips */}
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mr-1">
              <Sparkles className="h-3 w-3" /> Test UI flow:
            </span>
            {SAMPLE_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSend(q)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a home care question (Phase 2 model hookup pending)..."
            />
            <Button type="submit" size="sm">
              <Send className="h-3.5 w-3.5" /> Send
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
