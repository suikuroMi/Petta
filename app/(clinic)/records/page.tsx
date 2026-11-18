'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/hooks/use-auth';
import { formatAge, formatDateDisplay, getSpeciesEmoji } from '@/lib/format';
import type { HealthRecord, Pet } from '@/types';
import { AppendRecordModal } from '@/components/append-record-modal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, ShieldCheck, Pill, FileText, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

function ClinicalRecordsContent() {
  const searchParams = useSearchParams();
  const initialPetId = searchParams.get('petId');
  const { data: user } = useAuth();

  const [queryText, setQueryText] = useState('');
  const [selectedPetIdState, setSelectedPetIdState] = useState<number | null>(
    initialPetId ? Number(initialPetId) : null
  );
  const [modalOpen, setModalOpen] = useState(false);

  const { data: pets = [], isLoading: petsLoading } = useQuery<Pet[]>({
    queryKey: ['clinic-pets-directory', queryText],
    queryFn: async () => {
      const res = await api.get<Pet[]>('/pets', {
        params: queryText ? { q: queryText } : undefined,
      });
      return res.data;
    },
  });

  const activePetId = selectedPetIdState ?? pets[0]?.pet_id ?? null;

  const { data: pet } = useQuery<Pet>({
    queryKey: ['clinical-pet', activePetId],
    queryFn: async () => (await api.get<Pet>(`/pets/${activePetId}`)).data,
    enabled: !!activePetId,
  });

  const { data: records = [], isLoading: recordsLoading } = useQuery<HealthRecord[]>({
    queryKey: ['clinical-records', activePetId],
    queryFn: async () =>
      (await api.get<HealthRecord[]>(`/pets/${activePetId}/records`)).data,
    enabled: !!activePetId,
  });

  const isVet = user?.role === 'vet';

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">
          Patient Medical &amp; Vaccination Ledger
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Search patients by Pet ID, pet name, owner, or microchip to review history and commit
          clinical entries.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Directory */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Patient Directory</CardTitle>
            <div className="relative pt-1">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-3.5" />
              <Input
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="ID, name, owner, or chip..."
                className="pl-8 h-9 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[520px] overflow-y-auto">
            {petsLoading ? (
              <p className="text-xs text-slate-500 py-4 text-center">Searching patients...</p>
            ) : pets.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No matching pets found.</p>
            ) : (
              pets.map((p) => {
                const selected = p.pet_id === activePetId;
                return (
                  <button
                    key={p.pet_id}
                    type="button"
                    onClick={() => setSelectedPetIdState(p.pet_id)}
                    className={cn(
                      'w-full text-left p-3 rounded-xl border transition-colors cursor-pointer flex items-center gap-3',
                      selected
                        ? 'border-emerald-500 bg-emerald-50/70'
                        : 'border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl shrink-0">
                      {getSpeciesEmoji(p.species)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {p.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          #{p.pet_id}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {p.species} • {p.breed}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        Owner: {p.owner_name}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Right Patient EMR View */}
        <div className="lg:col-span-8 space-y-4">
          {!pet ? (
            <Card className="p-10 text-center text-xs text-slate-500">
              Select a patient from the directory to view their longitudinal medical ledger.
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-3xl shrink-0">
                      {getSpeciesEmoji(pet.species)}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        {pet.name} <span className="text-xs font-mono text-slate-400">#{pet.pet_id}</span>
                      </h2>
                      <p className="text-xs text-slate-500">
                        {pet.species} • {pet.breed} • {pet.sex} • {formatAge(pet.date_of_birth)}
                        {pet.current_weight_kg ? ` • ${pet.current_weight_kg} kg` : ''}
                      </p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        Owner: {pet.owner_name} • Chip: {pet.microchip_id || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <Button size="sm" onClick={() => setModalOpen(true)}>
                    <Plus className="h-3.5 w-3.5" /> Append Medical Record
                  </Button>
                </CardContent>
              </Card>

              {pet.allergies && pet.allergies.toLowerCase() !== 'none known' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Allergy Warning:</strong> {pet.allergies}
                  </span>
                </div>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">
                    Verified Clinical &amp; Vaccine History ({records.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recordsLoading ? (
                    <p className="text-xs text-slate-500 py-4 text-center">Loading ledger...</p>
                  ) : records.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">
                      No historical entries recorded yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {records.map((r) => (
                        <div
                          key={r.record_id}
                          className="p-3.5 border border-slate-200 rounded-xl space-y-2 text-xs"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {r.record_type === 'vaccine' && (
                                <ShieldCheck className="h-4 w-4 text-blue-600" />
                              )}
                              {r.record_type === 'deworming' && (
                                <Pill className="h-4 w-4 text-amber-600" />
                              )}
                              {r.record_type === 'note' && (
                                <FileText className="h-4 w-4 text-slate-600" />
                              )}
                              <span className="font-bold uppercase text-slate-800">
                                {r.record_type}
                              </span>
                              {r.vaccine_name && (
                                <span className="font-semibold text-slate-900">
                                  — {r.vaccine_name}
                                </span>
                              )}
                              {r.diagnosis && (
                                <span className="font-semibold text-slate-900">
                                  — {r.diagnosis}
                                </span>
                              )}
                            </div>
                            <span className="text-slate-400 font-mono">
                              {formatDateDisplay(r.date_administered)}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
                            {r.batch_lot_number && (
                              <span>
                                Lot:{' '}
                                <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                  {r.batch_lot_number}
                                </code>
                              </span>
                            )}
                            {r.next_due_date && (
                              <span>
                                Next Due:{' '}
                                <strong className="text-amber-700">
                                  {formatDateDisplay(r.next_due_date)}
                                </strong>
                              </span>
                            )}
                            {r.weight_kg && <span>Weight: {r.weight_kg} kg</span>}
                            {r.temperature_c && <span>Temp: {r.temperature_c} °C</span>}
                            <span>Vet: {r.vet_name}</span>
                          </div>

                          {(r.clinical_findings || r.treatment_plan || r.notes) && (
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-slate-600 space-y-1">
                              {r.clinical_findings && <p>Findings: {r.clinical_findings}</p>}
                              {r.treatment_plan && <p>Treatment: {r.treatment_plan}</p>}
                              {r.notes && <p>{r.notes}</p>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <AppendRecordModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        defaultPet={pet || null}
        canWrite={isVet}
      />
    </div>
  );
}

export default function ClinicalRecordsManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto p-6 text-center text-xs text-slate-500">
          Loading clinical records portal...
        </div>
      }
    >
      <ClinicalRecordsContent />
    </Suspense>
  );
}
