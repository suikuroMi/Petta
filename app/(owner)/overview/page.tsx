'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/hooks/use-auth';
import { formatAge, formatDateDisplay, formatTimeDisplay, getSpeciesEmoji } from '@/lib/format';
import type { Appointment, Pet, ReminderNotification } from '@/types';
import { AppointmentStatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Bell,
  Bot,
  CalendarPlus,
  Heart,
  ArrowRight,
  Calendar,
  MapPin,
} from 'lucide-react';

export default function OwnerOverviewPage() {
  const { data: user } = useAuth();

  const { data: pets = [] } = useQuery<Pet[]>({
    queryKey: ['my-pets'],
    queryFn: async () => (await api.get<Pet[]>('/pets')).data,
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['my-appointments'],
    queryFn: async () => (await api.get<Appointment[]>('/appointments')).data,
  });

  const { data: notifications = [] } = useQuery<ReminderNotification[]>({
    queryKey: ['notifications', user?.user_id],
    queryFn: async () => (await api.get<ReminderNotification[]>('/notifications')).data,
  });

  const upcomingAppts = appointments.filter(
    (a) => a.status !== 'Completed' && a.status !== 'Cancelled'
  );
  const reminderAlerts = notifications.filter((n) => n.type === 'booster' || n.type === 'deworming');

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">
            Welcome back, {user?.full_name.split(' ')[0] || 'Pet Owner'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track your pets&apos; digital health ledgers, upcoming booster reminders, and clinic visits.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/pets">
            <Button size="sm" variant="outline">
              Manage Pets
            </Button>
          </Link>
          <Link href="/appointments/book">
            <Button size="sm">
              <CalendarPlus className="h-4 w-4" /> Book Appointment
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-400">Registered Pets</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{pets.length} Companions</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Active digital health passports</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-400">Upcoming Visits</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {upcomingAppts.length} Scheduled
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Real-time clinic reservations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-400">Preventive Alerts</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {reminderAlerts.length} Due Soon
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Vaccines &amp; deworming cycles</p>
          </CardContent>
        </Card>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Pets & Upcoming Visits */}
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Heart className="h-4 w-4 text-emerald-600" /> My Pets
              </CardTitle>
              <Link href="/pets" className="text-xs font-semibold text-emerald-600 hover:underline">
                View All
              </Link>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {pets.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">
                  No pets registered yet. Add your first pet to start tracking vaccinations.
                </p>
              ) : (
                pets.map((pet) => (
                  <div
                    key={pet.pet_id}
                    className="p-3 border border-slate-200 rounded-xl flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center text-2xl shrink-0">
                        {getSpeciesEmoji(pet.species)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{pet.name}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {pet.species}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {pet.breed} • {formatAge(pet.date_of_birth)}
                          {pet.current_weight_kg ? ` • ${pet.current_weight_kg} kg` : ''}
                        </p>
                      </div>
                    </div>
                    <Link href={`/pets/${pet.pet_id}/history`}>
                      <Button size="sm" variant="outline">
                        Ledger <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-emerald-600" /> Active Appointments
              </CardTitle>
              <Link
                href="/appointments"
                className="text-xs font-semibold text-emerald-600 hover:underline"
              >
                Manage All
              </Link>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {upcomingAppts.length === 0 ? (
                <div className="text-center py-6 space-y-2">
                  <p className="text-xs text-slate-500">No upcoming clinic appointments.</p>
                  <Link href="/appointments/book">
                    <Button size="sm">Book Clinic Visit</Button>
                  </Link>
                </div>
              ) : (
                upcomingAppts.slice(0, 4).map((appt) => (
                  <div
                    key={appt.appt_id}
                    className="p-3 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">
                          {appt.pet_name} — {appt.service_type}
                        </span>
                        <AppointmentStatusBadge status={appt.status} />
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" /> {appt.clinic_name}
                      </p>
                    </div>
                    <div className="text-xs font-mono font-semibold text-slate-700">
                      {formatDateDisplay(appt.schedule_date)} • {formatTimeDisplay(appt.time_slot)}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Preventive Reminders & AI Care Assistant Phase 2 Card */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bell className="h-4 w-4 text-amber-600" /> Booster &amp; Care Reminders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-500">Everything is up to date.</p>
              ) : (
                notifications.slice(0, 5).map((n) => (
                  <div
                    key={n.notification_id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">{n.title}</span>
                      {n.due_date && (
                        <span className="text-[10px] font-mono font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          {formatDateDisplay(n.due_date)}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 leading-relaxed">{n.message}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-emerald-900">
                <Bot className="h-4 w-4 text-emerald-600" /> AI Care Assistant (Phase 2)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-emerald-950/80">
              <p className="leading-relaxed">
                The UI shell and emergency escalation layout are ready. Model training, clinical
                guardrails, and Gemini RAG integration will be built in the next milestone.
              </p>
              <Link href="/assistant" className="block">
                <Button size="sm" variant="outline" className="w-full bg-white">
                  Preview Care Assistant UI <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
