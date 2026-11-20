'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '@/lib/api';
import type { Pet, RecordType } from '@/types';
import { addMonthsToDate } from '@/lib/format';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppendRecordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPet?: Pet | null;
  defaultApptId?: number | null;
  canWrite?: boolean;
  onSuccess?: () => void;
}

function AppendRecordForm({
  onOpenChange,
  defaultPet = null,
  defaultApptId = null,
  canWrite = true,
  onSuccess,
}: Omit<AppendRecordModalProps, 'open'>) {
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedPetId, setSelectedPetId] = useState<string>(
    defaultPet ? String(defaultPet.pet_id) : ''
  );
  const [recordType, setRecordType] = useState<RecordType>('vaccine');
  const [vaccineName, setVaccineName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [batchLotNumber, setBatchLotNumber] = useState('');
  const [dosageInfo, setDosageInfo] = useState('');
  const [dateAdministered, setDateAdministered] = useState(todayStr);
  const [nextDueDate, setNextDueDate] = useState(addMonthsToDate(todayStr, 12));
  const [weightKg, setWeightKg] = useState(
    defaultPet?.current_weight_kg ? String(defaultPet.current_weight_kg) : ''
  );
  const [temperatureC, setTemperatureC] = useState('');
  const [clinicalFindings, setClinicalFindings] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [notes, setNotes] = useState('');
  const [completeAppt, setCompleteAppt] = useState(Boolean(defaultApptId));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: pets = [] } = useQuery<Pet[]>({
    queryKey: ['clinic-all-pets'],
    queryFn: async () => (await api.get<Pet[]>('/pets')).data,
    enabled: !defaultPet,
  });

  const handleTypeChange = (next: RecordType) => {
    setRecordType(next);
    if (next === 'vaccine') {
      setNextDueDate(addMonthsToDate(dateAdministered, 12));
    } else if (next === 'deworming') {
      setNextDueDate(addMonthsToDate(dateAdministered, 3));
    } else {
      setNextDueDate('');
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const petId = Number(selectedPetId || defaultPet?.pet_id);
      if (!petId) throw new Error('Please select a patient');

      const res = await api.post('/records', {
        pet_id: petId,
        appt_id: defaultApptId || undefined,
        record_type: recordType,
        date_administered: dateAdministered,
        vaccine_name: vaccineName || undefined,
        manufacturer: manufacturer || undefined,
        batch_lot_number: batchLotNumber || undefined,
        dosage_info: dosageInfo || undefined,
        next_due_date: nextDueDate || undefined,
        weight_kg: weightKg ? Number(weightKg) : undefined,
        temperature_c: temperatureC ? Number(temperatureC) : undefined,
        clinical_findings: clinicalFindings || undefined,
        diagnosis: diagnosis || undefined,
        treatment_plan: treatmentPlan || undefined,
        notes: notes || undefined,
        complete_appointment: completeAppt && Boolean(defaultApptId),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['clinical-records'] });
      queryClient.invalidateQueries({ queryKey: ['health-records'] });
      queryClient.invalidateQueries({ queryKey: ['my-pets'] });
      queryClient.invalidateQueries({ queryKey: ['clinic-all-pets'] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err) => {
      setErrorMsg(getApiErrorMessage(err, 'Failed to commit health record'));
    },
  });

  const activePet =
    defaultPet || pets.find((p) => String(p.pet_id) === selectedPetId) || null;

  return (
    <>
      <DialogHeader className="border-b border-slate-100 pb-3">
        <DialogTitle className="text-base font-bold text-slate-900">
          Append Health Record
        </DialogTitle>
        <DialogDescription className="text-xs text-slate-500">
          {activePet
            ? `Patient: ${activePet.name} (${activePet.species} • ${activePet.breed})${
                activePet.microchip_id ? ` • Chip #${activePet.microchip_id}` : ''
              }`
            : 'Immutable clinical entry written directly to the verified pet ledger.'}
        </DialogDescription>
      </DialogHeader>

      {!canWrite && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Veterinarian Sign-Off Required:</span> Only licensed
            Attending Veterinarians can insert official clinical diagnoses and vaccine batch
            records. Sign in as <span className="font-semibold">Dr. Renz Cruz, DVM</span> to commit
            entries.
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setErrorMsg(null);
          mutation.mutate();
        }}
        className="space-y-4 text-xs"
      >
        {!defaultPet && (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Select Patient *</Label>
            <Select value={selectedPetId} onValueChange={setSelectedPetId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Choose registered patient..." />
              </SelectTrigger>
              <SelectContent>
                {pets.map((p) => (
                  <SelectItem key={p.pet_id} value={String(p.pet_id)}>
                    #{p.pet_id} — {p.name} ({p.species} • {p.owner_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">Record Type</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'vaccine' as const, label: 'Vaccine' },
              { value: 'deworming' as const, label: 'Deworming' },
              { value: 'note' as const, label: 'Surgery / Note' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleTypeChange(opt.value)}
                className={cn(
                  'p-2 rounded-lg font-semibold text-center border transition-colors cursor-pointer',
                  recordType === opt.value
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {(recordType === 'vaccine' || recordType === 'deworming') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                {recordType === 'vaccine' ? 'Vaccine Name *' : 'Dewormer / Product *'}
              </Label>
              <Input
                value={vaccineName}
                onChange={(e) => setVaccineName(e.target.value)}
                placeholder={
                  recordType === 'vaccine'
                    ? 'e.g. DHPPi+L Booster'
                    : 'e.g. Endogard Broad Spectrum'
                }
                required={recordType === 'vaccine'}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Batch / Lot Number {recordType === 'vaccine' ? '*' : ''}
              </Label>
              <Input
                value={batchLotNumber}
                onChange={(e) => setBatchLotNumber(e.target.value)}
                placeholder="e.g. VAC-2026-9981B"
                className="font-mono"
                required={recordType === 'vaccine'}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Manufacturer</Label>
              <Input
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Zoetis / Virbac"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Dosage / Route</Label>
              <Input
                value={dosageInfo}
                onChange={(e) => setDosageInfo(e.target.value)}
                placeholder={recordType === 'vaccine' ? 'e.g. 1.0 mL SC' : 'e.g. 1 Chewable Tab'}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">Date Administered *</Label>
            <Input
              type="date"
              value={dateAdministered}
              onChange={(e) => setDateAdministered(e.target.value)}
              required
            />
          </div>
          {recordType !== 'note' && (
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                {recordType === 'vaccine' ? 'Next Booster Due' : 'Next Cycle Due'}
              </Label>
              <Input
                type="date"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">Weight (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="e.g. 28.5"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">Temperature (°C)</Label>
            <Input
              type="number"
              step="0.1"
              value={temperatureC}
              onChange={(e) => setTemperatureC(e.target.value)}
              placeholder="e.g. 38.5"
            />
          </div>
        </div>

        {recordType === 'note' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Clinical Findings</Label>
              <Input
                value={clinicalFindings}
                onChange={(e) => setClinicalFindings(e.target.value)}
                placeholder="Physical exam findings..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Diagnosis</Label>
              <Input
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Assessment / diagnosis..."
              />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-700">
            Clinical Observation &amp; Treatment Notes
          </Label>
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Weight at visit, clinical observation, post-care instructions..."
          />
        </div>

        {recordType === 'note' && (
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">Treatment Plan / Rx</Label>
            <Textarea
              rows={2}
              value={treatmentPlan}
              onChange={(e) => setTreatmentPlan(e.target.value)}
              placeholder="Prescriptions, dosage frequency, follow-up instructions..."
            />
          </div>
        )}

        {defaultApptId && (
          <label className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={completeAppt}
              onChange={(e) => setCompleteAppt(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span className="font-semibold text-emerald-900">
              Mark Appointment #{defaultApptId} as COMPLETED after committing record
            </span>
          </label>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Immutable ledger entry
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!canWrite || mutation.isPending}>
              {mutation.isPending ? 'Committing...' : 'Commit to Ledger'}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}

export function AppendRecordModal({
  open,
  onOpenChange,
  defaultPet = null,
  defaultApptId = null,
  canWrite = true,
  onSuccess,
}: AppendRecordModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(calc(100vw-2rem),36rem)] max-h-[85dvh] overflow-y-auto">
        {open && (
          <AppendRecordForm
            key={`${defaultPet?.pet_id ?? 'none'}-${defaultApptId ?? 'none'}`}
            onOpenChange={onOpenChange}
            defaultPet={defaultPet}
            defaultApptId={defaultApptId}
            canWrite={canWrite}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
