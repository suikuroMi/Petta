'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '@/lib/api';
import { formatAge, formatDateDisplay, getSpeciesEmoji } from '@/lib/format';
import type { Pet } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Calendar,
  Hash,
  ArrowRight,
  AlertCircle,
  Pencil,
  Trash2,
  Scale,
  AlertTriangle,
} from 'lucide-react';

interface PetFormState {
  name: string;
  species: string;
  breed: string;
  sex: 'Male' | 'Female' | 'Unknown';
  date_of_birth: string;
  current_weight_kg: string;
  allergies: string;
  microchip_id: string;
}

const EMPTY_FORM: PetFormState = {
  name: '',
  species: 'Canine',
  breed: '',
  sex: 'Male',
  date_of_birth: '',
  current_weight_kg: '',
  allergies: '',
  microchip_id: '',
};

export default function MyPetsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [formState, setFormState] = useState<PetFormState>(EMPTY_FORM);
  const [serverError, setServerError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const { data: pets = [], isLoading } = useQuery<Pet[]>({
    queryKey: ['my-pets'],
    queryFn: async () => (await api.get<Pet[]>('/pets')).data,
  });

  const openCreateModal = () => {
    setEditingPet(null);
    setFormState(EMPTY_FORM);
    setServerError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (pet: Pet) => {
    setEditingPet(pet);
    setFormState({
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      sex: pet.sex || 'Unknown',
      date_of_birth: pet.date_of_birth,
      current_weight_kg: pet.current_weight_kg ? String(pet.current_weight_kg) : '',
      allergies: pet.allergies || '',
      microchip_id: pet.microchip_id || '',
    });
    setServerError(null);
    setIsModalOpen(true);
  };

  const savePetMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...formState,
        current_weight_kg: formState.current_weight_kg
          ? Number(formState.current_weight_kg)
          : undefined,
      };
      if (editingPet) {
        return (await api.patch(`/pets/${editingPet.pet_id}`, payload)).data;
      }
      return (await api.post('/pets', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-pets'] });
      setIsModalOpen(false);
    },
    onError: (err) => {
      setServerError(getApiErrorMessage(err, 'Failed to save pet profile'));
    },
  });

  const deletePetMutation = useMutation({
    mutationFn: async (petId: number) => {
      return (await api.delete(`/pets/${petId}`)).data;
    },
    onSuccess: () => {
      setBannerError(null);
      queryClient.invalidateQueries({ queryKey: ['my-pets'] });
    },
    onError: (err) => {
      setBannerError(getApiErrorMessage(err, 'Could not delete pet profile'));
    },
  });

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">My Pets</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage registered companion profiles and access their verified health ledgers.
          </p>
        </div>

        <Button size="sm" onClick={openCreateModal}>
          <Plus className="h-4 w-4" /> Register Pet
        </Button>
      </div>

      {bannerError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{bannerError}</span>
          </div>
          <button
            type="button"
            className="text-xs font-bold underline cursor-pointer"
            onClick={() => setBannerError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-xs text-slate-500">Loading pet profiles...</div>
      ) : pets.length === 0 ? (
        <Card className="text-center py-14">
          <CardContent className="space-y-3">
            <div className="text-4xl">🐾</div>
            <p className="text-base font-bold text-slate-900">No pets registered yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Register your dog or cat to store microchip IDs, allergy alerts, and digital
              vaccination records.
            </p>
            <Button size="sm" onClick={openCreateModal}>
              <Plus className="h-4 w-4" /> Add Your First Pet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {pets.map((pet) => (
            <Card key={pet.pet_id} className="p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-3xl shrink-0">
                      {getSpeciesEmoji(pet.species)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-slate-900">{pet.name}</h2>
                        <Badge variant="default">Active Profile</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {pet.species} • {pet.breed} • {pet.sex} • {formatAge(pet.date_of_birth)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEditModal(pet)}
                      title="Edit Pet Profile"
                    >
                      <Pencil className="h-3.5 w-3.5 text-slate-500" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 hover:bg-red-50"
                      onClick={() => deletePetMutation.mutate(pet.pet_id)}
                      title="Delete Pet Profile"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1.5 text-xs text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="h-3.5 w-3.5" /> Date of Birth
                    </span>
                    <span className="font-semibold">{formatDateDisplay(pet.date_of_birth)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Scale className="h-3.5 w-3.5" /> Recorded Weight
                    </span>
                    <span className="font-semibold">
                      {pet.current_weight_kg ? `${pet.current_weight_kg} kg` : 'Not recorded'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Hash className="h-3.5 w-3.5" /> Microchip
                    </span>
                    <span className="font-mono font-semibold text-slate-800">
                      {pet.microchip_id || 'Not registered'}
                    </span>
                  </div>
                  {pet.allergies && pet.allergies.toLowerCase() !== 'none known' && (
                    <div className="pt-1.5 border-t border-slate-200/70 flex items-center justify-between text-amber-800">
                      <span className="font-semibold">Allergy Alert:</span>
                      <span className="font-bold">{pet.allergies}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link href={`/appointments/book?petId=${pet.pet_id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    + Book Visit
                  </Button>
                </Link>
                <Link href={`/pets/${pet.pet_id}/history`}>
                  <Button size="sm" className="w-full">
                    Health Ledger <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Pet Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPet ? `Edit ${editingPet.name}` : 'Register New Pet'}</DialogTitle>
          </DialogHeader>

          {serverError && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setServerError(null);
              savePetMutation.mutate();
            }}
            className="space-y-3.5 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Pet Name *</Label>
              <Input
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                placeholder="e.g. Milo"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Species *</Label>
                <Select
                  value={formState.species}
                  onValueChange={(val) => setFormState({ ...formState, species: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Canine">Canine (Dog)</SelectItem>
                    <SelectItem value="Feline">Feline (Cat)</SelectItem>
                    <SelectItem value="Avian">Avian (Bird)</SelectItem>
                    <SelectItem value="Rabbit">Rabbit</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Sex *</Label>
                <Select
                  value={formState.sex}
                  onValueChange={(val: 'Male' | 'Female' | 'Unknown') =>
                    setFormState({ ...formState, sex: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Breed *</Label>
                <Input
                  value={formState.breed}
                  onChange={(e) => setFormState({ ...formState, breed: e.target.value })}
                  placeholder="e.g. Golden Retriever"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formState.current_weight_kg}
                  onChange={(e) =>
                    setFormState({ ...formState, current_weight_kg: e.target.value })
                  }
                  placeholder="e.g. 28.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Date of Birth *</Label>
                <Input
                  type="date"
                  value={formState.date_of_birth}
                  onChange={(e) => setFormState({ ...formState, date_of_birth: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Microchip ID</Label>
                <Input
                  value={formState.microchip_id}
                  onChange={(e) => setFormState({ ...formState, microchip_id: e.target.value })}
                  placeholder="e.g. 9851-4100-..."
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Known Allergies</Label>
              <Input
                value={formState.allergies}
                onChange={(e) => setFormState({ ...formState, allergies: e.target.value })}
                placeholder="e.g. Chicken protein, sulfonamides, or None known"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={savePetMutation.isPending}>
                {savePetMutation.isPending
                  ? 'Saving...'
                  : editingPet
                  ? 'Save Changes'
                  : 'Save Pet Profile'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
