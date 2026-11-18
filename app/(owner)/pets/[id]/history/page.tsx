'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatAge, formatDateDisplay, getSpeciesEmoji } from '@/lib/format';
import type { HealthRecord, Pet, RecordType } from '@/types';
import { Button } from '@/components/ui/button';
import { ShieldCheck, AlertTriangle, Printer, Plus, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type FilterTab = 'all' | RecordType;

export default function PetHealthPassportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: petId } = use(params);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const { data: pet, isLoading: petLoading } = useQuery<Pet>({
    queryKey: ['pet', petId],
    queryFn: async () => (await api.get<Pet>(`/pets/${petId}`)).data,
  });

  const { data: records = [], isLoading: recordsLoading } = useQuery<HealthRecord[]>({
    queryKey: ['health-records', petId],
    queryFn: async () => (await api.get<HealthRecord[]>(`/pets/${petId}/records`)).data,
  });

  if (petLoading || recordsLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 text-center text-xs text-slate-500">
        Loading verified pet health ledger...
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="max-w-5xl mx-auto p-6 text-center text-sm text-red-600">
        Pet profile not found or inaccessible.
      </div>
    );
  }

  const vaccinesCount = records.filter((r) => r.record_type === 'vaccine').length;
  const dewormingsCount = records.filter((r) => r.record_type === 'deworming').length;
  const notesCount = records.filter((r) => r.record_type === 'note').length;

  const visibleRecords =
    activeTab === 'all' ? records : records.filter((r) => r.record_type === activeTab);

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'all', label: 'All Entries', count: records.length },
    { id: 'vaccine', label: 'Vaccinations', count: vaccinesCount },
    { id: 'deworming', label: 'Deworming', count: dewormingsCount },
    { id: 'note', label: 'Clinical Notes', count: notesCount },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
      <Link
        href="/pets"
        className="no-print text-xs font-semibold text-slate-500 hover:text-emerald-600 inline-flex items-center gap-1"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to My Pets
      </Link>

      {/* Print-Only Header */}
      <div className="hidden print:block border-b border-slate-300 pb-3 mb-4">
        <div className="flex justify-between items-center">
          <div className="text-lg font-bold text-emerald-700">🐾 Petta Digital Vaccination Card</div>
          <div className="text-xs text-slate-500">Generated {new Date().toLocaleDateString()}</div>
        </div>
      </div>

      {/* Pet Profile Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-3xl shadow-inner shrink-0">
            {getSpeciesEmoji(pet.species)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900">{pet.name}</h1>
              <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                Active Profile
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              {pet.species} • {pet.breed} • {pet.sex} • {formatAge(pet.date_of_birth)}
              {pet.current_weight_kg ? ` • ${pet.current_weight_kg} kg` : ''}
            </p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Microchip: {pet.microchip_id ? `#${pet.microchip_id}` : 'Not Registered'}
            </p>
          </div>
        </div>

        <div className="no-print w-full md:w-auto flex flex-col sm:flex-row gap-2">
          <Link href={`/appointments/book?petId=${pet.pet_id}`} className="w-full md:w-auto">
            <Button size="sm" className="w-full">
              <Plus className="h-3.5 w-3.5" /> Book Appointment
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            className="w-full md:w-auto"
            onClick={() => window.print()}
          >
            <Printer className="h-3.5 w-3.5" /> Download Ledger (PDF)
          </Button>
        </div>
      </div>

      {/* Allergy Alert if any */}
      {pet.allergies && pet.allergies.toLowerCase() !== 'none known' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            <strong className="font-bold">Known Allergy / Sensitivity:</strong> {pet.allergies}
          </span>
        </div>
      )}

      {/* Immutable Ledger Seal */}
      <div className="flex items-center gap-2 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
        <span>
          <strong>Verified Immutable Ledger:</strong> Clinical vitals, diagnoses, and vaccine
          batch numbers are digitally signed by licensed attending veterinarians and cannot be
          altered retroactively.
        </span>
      </div>

      {/* Category Filter Tabs */}
      <div className="no-print flex gap-2 overflow-x-auto pb-1 text-xs border-b border-slate-200">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-3.5 py-2 whitespace-nowrap transition-colors cursor-pointer',
                isActive
                  ? 'font-semibold text-emerald-700 border-b-2 border-emerald-600'
                  : 'text-slate-500 hover:text-slate-800'
              )}
            >
              {tab.label} ({tab.count})
            </button>
          );
        })}
      </div>

      {/* Ledger Timeline */}
      {visibleRecords.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
          No medical records recorded under this category yet.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleRecords.map((r) => {
            if (r.record_type === 'vaccine') {
              return (
                <article
                  key={r.record_id}
                  className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-sm hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1.5 border-b border-slate-100 pb-2.5 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        VACCINATION
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {r.vaccine_name}
                        {r.manufacturer ? ` (${r.manufacturer})` : ''}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      Administered: {formatDateDisplay(r.date_administered)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">
                        Batch / Lot #
                      </span>
                      <span className="font-mono text-slate-800 font-semibold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                        {r.batch_lot_number || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">
                        Clinic
                      </span>
                      <span className="text-slate-800 font-medium mt-0.5 block">
                        {r.clinic_name || 'Verified Partner Clinic'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">
                        Attending Vet
                      </span>
                      <span className="text-slate-800 font-medium mt-0.5 block">
                        {r.vet_name || `Vet #${r.vet_id}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">
                        Next Booster Due
                      </span>
                      <span className="text-amber-700 font-bold mt-0.5 block">
                        {r.next_due_date ? formatDateDisplay(r.next_due_date) : 'As advised'}
                      </span>
                    </div>
                  </div>

                  {(r.notes || r.weight_kg || r.temperature_c) && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                      {r.weight_kg && <span>Weight: <strong>{r.weight_kg} kg</strong></span>}
                      {r.temperature_c && <span>Temp: <strong>{r.temperature_c} °C</strong></span>}
                      {r.dosage_info && <span>Dosage: <strong>{r.dosage_info}</strong></span>}
                      {r.notes && <span className="text-slate-500">{r.notes}</span>}
                    </div>
                  )}
                </article>
              );
            }

            if (r.record_type === 'deworming') {
              return (
                <article
                  key={r.record_id}
                  className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-sm hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1.5 border-b border-slate-100 pb-2.5 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        DEWORMING
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {r.vaccine_name || 'Broad Spectrum Deworming'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      Administered: {formatDateDisplay(r.date_administered)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">
                        Dosage / Weight
                      </span>
                      <span className="text-slate-800 font-medium mt-0.5 block">
                        {r.dosage_info || 'Standard dose'}
                        {r.weight_kg ? ` (${r.weight_kg} kg recorded)` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">
                        Batch / Lot #
                      </span>
                      <span className="font-mono text-slate-800 font-semibold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                        {r.batch_lot_number || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">
                        Clinic / Vet
                      </span>
                      <span className="text-slate-800 font-medium mt-0.5 block">
                        {r.clinic_name} • {r.vet_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">
                        Next Cycle Due
                      </span>
                      <span className="text-emerald-700 font-bold mt-0.5 block">
                        {r.next_due_date ? formatDateDisplay(r.next_due_date) : 'Quarterly'}
                      </span>
                    </div>
                  </div>
                  {r.notes && (
                    <p className="mt-2.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                      {r.notes}
                    </p>
                  )}
                </article>
              );
            }

            return (
              <article
                key={r.record_id}
                className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-sm hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1.5 border-b border-slate-100 pb-2.5 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      CLINICAL NOTE
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {r.diagnosis || 'Clinical Consultation'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    Recorded: {formatDateDisplay(r.date_administered)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs mb-3">
                  <div>
                    <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">
                      Clinic
                    </span>
                    <span className="text-slate-800 font-medium mt-0.5 block">{r.clinic_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">
                      Attending Vet
                    </span>
                    <span className="text-slate-800 font-medium mt-0.5 block">{r.vet_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">
                      Weight
                    </span>
                    <span className="text-slate-800 font-medium mt-0.5 block">
                      {r.weight_kg ? `${r.weight_kg} kg` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">
                      Temperature
                    </span>
                    <span className="text-slate-800 font-medium mt-0.5 block">
                      {r.temperature_c ? `${r.temperature_c} °C` : '—'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs bg-slate-50 border border-slate-200/70 rounded-lg p-3">
                  {r.clinical_findings && (
                    <p>
                      <strong className="text-slate-700">Findings:</strong>{' '}
                      <span className="text-slate-600">{r.clinical_findings}</span>
                    </p>
                  )}
                  {r.treatment_plan && (
                    <p>
                      <strong className="text-slate-700">Treatment Plan:</strong>{' '}
                      <span className="text-slate-600">{r.treatment_plan}</span>
                    </p>
                  )}
                  {r.notes && (
                    <p>
                      <strong className="text-slate-700">Notes:</strong>{' '}
                      <span className="text-slate-600">{r.notes}</span>
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
