'use client';

import Link from 'next/link';
import { useAuth, getHomeRouteForRole } from '@/lib/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CalendarCheck,
  ShieldCheck,
  Stethoscope,
  Users,
  Bot,
  ArrowRight,
  Building2,
  ClipboardList,
} from 'lucide-react';

const SEEDED_ACCOUNTS = [
  {
    role: 'Pet Owner',
    name: 'Maria Santos',
    email: 'maria.santos@petta.local',
    desc: 'Owns Milo & Luna. View digital vaccine ledgers, book real-time clinic slots, and track reminders.',
    icon: Users,
    accent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    role: 'Attending Veterinarian',
    name: 'Dr. Renz Cruz, DVM',
    email: 'dr.renz@healthypaws.vet',
    desc: 'Consult checked-in patients, review allergy alerts, and commit immutable vaccine batch records.',
    icon: Stethoscope,
    accent: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    role: 'Clinic Staff',
    name: 'Marco Villanueva',
    email: 'marco.staff@healthypaws.vet',
    desc: 'Triage pending requests, manage check-ins & walk-ins, and configure clinic slot capacities.',
    icon: ClipboardList,
    accent: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    role: 'System Admin',
    name: 'Petta Platform Admin',
    email: 'admin@petta.local',
    desc: 'Verify partner veterinary clinics and onboard new facilities into the booking network.',
    icon: Building2,
    accent: 'bg-slate-100 text-slate-700 border-slate-200',
  },
];

export default function LandingPage() {
  const { data: user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-3.5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-emerald-600 tracking-tight flex items-center gap-1.5">
            🐾 Petta
          </span>
          <Badge variant="default" className="hidden sm:inline-flex">
            CS318 Working Prototype
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <Link href={getHomeRouteForRole(user.role)}>
              <Button size="sm">
                Open {user.role.toUpperCase()} Portal <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button size="sm" variant="outline">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Create Account</Button>
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-10 space-y-12">
        <section className="bg-white border border-slate-200 rounded-2xl p-6 md:p-10 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <Badge variant="default">Centralized Pet Health &amp; Clinic Operations</Badge>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Digital Vaccine Ledgers &amp; Capacity-Controlled Veterinary Booking
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              Petta replaces fragmented paper booklets and walk-in queues with an immutable
              vaccination batch ledger, real-time clinic slot quotas, and role-based clinical
              workflows for owners, veterinarians, and reception staff.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              {user ? (
                <Link href={getHomeRouteForRole(user.role)}>
                  <Button size="lg">
                    Continue to Portal <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button size="lg">
                      Sign In to Petta <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button size="lg" variant="outline">
                      Create Account
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-900">Immutable Vaccination Ledger</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Batch/Lot traceability, manufacturer metadata, and printable pet health cards.
                </p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <CalendarCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-900">ACID Slot Capacity Engine</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time hourly quotas prevent overbooking; cancellations immediately free slots.
                </p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <Bot className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-900">
                  AI Care Assistant (Phase 2 Ready)
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  UI shell &amp; emergency triage layout included; model training &amp; RAG planned next.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Seeded Accounts Directory (requires real login) */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Seeded Role Accounts</h2>
            <p className="text-xs text-slate-500">
              Authentication is required before viewing pet records or clinic queues. Sign in with
              any seeded account below (password:{' '}
              <code className="font-mono bg-slate-200/70 px-1.5 py-0.5 rounded">password123</code>)
              or register a new account.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SEEDED_ACCOUNTS.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.email} className="flex flex-col justify-between">
                  <CardHeader className="pb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${item.accent}`}
                      >
                        {item.role}
                      </span>
                      <Icon className="h-4 w-4 text-slate-500" />
                    </div>
                    <CardTitle className="text-base">{item.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                      <p className="text-[11px] font-mono text-slate-400 truncate">{item.email}</p>
                    </div>
                    <Link href={`/login?email=${encodeURIComponent(item.email)}`} className="block">
                      <Button size="sm" variant="outline" className="w-full">
                        Sign In as {item.role}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
