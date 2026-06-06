import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

const QUERY_KEY = (householdId: string) => ['regulars', householdId] as const;

export function useRegulars() {
  const session = useAuthStore((s) => s.session);
  const householdId = session?.householdId ?? '';
  const token = session?.token ?? '';

  const { data: regulars = [] } = useQuery({
    queryKey: QUERY_KEY(householdId),
    queryFn: () =>
      apiFetch<Array<{ name: string; count: number }>>(`/api/household/${householdId}/regulars`, { token }),
    enabled: Boolean(householdId && token),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  return { regulars, hasRegulars: regulars.length > 0 };
}
