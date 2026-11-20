'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
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
  source?: string;
}

const SAMPLE_PROMPTS = [
  'Pwede ba magbigay ng kanin at manok sa aso kong may konting diarrhea?',
  'Gaano kadalas dapat paliguan yung Shih Tzu? Parang nangangati skin niya.',
  'Nangingisay yung aso ko tapos nakakain ng dark chocolate!',
];

export default function CareAssistantPage() {
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
      text: 'Kumusta! I am the Petta AI Care Assistant (powered by fine-tuned Qwen2.5-3B + Petta safety guardrails). Ask me pet wellness, nutrition, or hygiene questions in English, Taglish, or Filipino dialects.',
    },
  ]);

  const activePet =
    pets.find((p) => String(p.pet_id) === selectedPetId) || pets[0] || null;

  const chatMutation = useMutation({
    mutationFn: async (query: string) => {
      const history = messages
        .filter((m) => m.id !== 'intro')
        .slice(-6)
        .map((m) => ({
          role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
          content: m.text,
        }));

      const res = await api.post<{
        reply: string;
        urgent: boolean;
        source: string;
      }>('/assistant', {
        pet_id: activePet?.pet_id,
        message: query,
        history,
      });
      return res.data;
    },
    onSuccess: (data) => {
      msgSeqRef.current += 1;
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${msgSeqRef.current}`,
          sender: 'assistant',
          text: data.reply,
          urgent: data.urgent,
          source: data.source,
        },
      ]);
    },
    onError: () => {
      msgSeqRef.current += 1;
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${msgSeqRef.current}`,
          sender: 'assistant',
          text: 'Could not reach the Petta AI assistant right now. Please try again in a moment.',
        },
      ]);
    },
  });

  const handleSend = (promptText?: string) => {
    const query = (promptText ?? input).trim();
    if (!query || chatMutation.isPending) return;

    msgSeqRef.current += 1;
    setMessages((prev) => [
      ...prev,
      {
        id: `u-${msgSeqRef.current}`,
        sender: 'user',
        text: query,
      },
    ]);

    if (!promptText) setInput('');
    chatMutation.mutate(query);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-[clamp(0.75rem,3vw,1.5rem)] py-[clamp(1rem,2.5vh,1.75rem)] space-y-[clamp(0.75rem,2vh,1.25rem)] overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[clamp(1.25rem,4vw,1.75rem)] font-bold text-slate-900 leading-tight">
              AI Care Assistant
            </h1>
            <Badge variant="default">Qwen2.5-3B + Safety Guardrails</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Non-diagnostic pet-care guidance in English &amp; Taglish with automatic emergency triage.
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
          <span className="font-bold">Clinical Safety Boundary:</span> This assistant does not
          diagnose diseases or prescribe controlled medications. Emergency symptoms are flagged
          immediately for in-person veterinary care.
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-slate-100 py-3.5 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bot className="h-4 w-4 text-emerald-600" />
            Petta Care Chat
            {activePet && (
              <span className="text-xs font-normal text-slate-500">
                • Context: {activePet.name} ({activePet.breed})
              </span>
            )}
          </CardTitle>
          <span className="text-[11px] font-mono text-slate-400">
            MinamiYuki1/petta-qwen2.5-3b-lora
          </span>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          <div className="space-y-3 min-h-[30vh] max-h-[50dvh] overflow-y-auto pr-1">
            {messages.map((m) => (
              <div
                key={m.id}
                className={m.sender === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                <div
                  className={
                    m.sender === 'user'
                      ? 'max-w-[min(85%,28rem)] rounded-xl px-3.5 py-2.5 text-xs bg-emerald-600 text-white whitespace-pre-wrap'
                      : m.urgent
                      ? 'max-w-[min(92%,32rem)] rounded-xl px-3.5 py-3 text-xs bg-red-50 border border-red-200 text-red-900 space-y-2 whitespace-pre-wrap'
                      : 'max-w-[min(92%,32rem)] rounded-xl px-3.5 py-2.5 text-xs bg-slate-100 text-slate-800 whitespace-pre-wrap'
                  }
                >
                  {m.urgent && (
                    <div className="flex items-center gap-1.5 font-bold text-red-700">
                      <AlertTriangle className="h-4 w-4" /> Immediate Veterinary Attention Advised
                    </div>
                  )}
                  <p className="leading-relaxed">{m.text}</p>
                  {m.urgent && (
                    <Link href="/appointments/book" className="inline-block pt-1">
                      <Button size="sm" variant="destructive">
                        Book Urgent Clinic Visit →
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}

            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="rounded-xl px-3.5 py-2.5 text-xs bg-slate-100 text-slate-500 italic">
                  Petta AI is typing...
                </div>
              </div>
            )}
          </div>

          {/* Sample Prompt Chips */}
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mr-1">
              <Sparkles className="h-3 w-3" /> Try asking:
            </span>
            {SAMPLE_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={chatMutation.isPending}
                onClick={() => handleSend(q)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

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
              placeholder="Ask in English, Taglish, or Filipino..."
              disabled={chatMutation.isPending}
            />
            <Button type="submit" size="sm" disabled={chatMutation.isPending || !input.trim()}>
              <Send className="h-3.5 w-3.5" /> Send
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
