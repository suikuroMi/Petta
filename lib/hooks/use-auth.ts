'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { User, UserRole } from '@/types';

export function getHomeRouteForRole(role: UserRole): string {
  switch (role) {
    case 'vet':
    case 'staff':
      return '/dashboard';
    case 'admin':
      return '/clinics';
    case 'owner':
    default:
      return '/overview';
  }
}

export function useAuth() {
  return useQuery<User | null>({
    queryKey: ['auth-me'],
    queryFn: async () => {
      try {
        const res = await api.get<{ user: User | null }>('/auth/me');
        return res.data.user;
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(['auth-me'], null);
      router.push('/login');
    },
  });
}
