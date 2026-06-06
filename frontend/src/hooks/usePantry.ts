import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, getWsBaseUrl } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import type { PantryItem, PartnerSlot, SyncEvent } from '../types/grocery';

export type ConnectionState = 'idle' | 'connecting' | 'open' | 'closed';

const QUERY_KEY = (householdId: string) => ['pantry', householdId] as const;

export function usePantry() {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  const householdId = session?.householdId ?? '';
  const token = session?.token ?? '';
  const partnerId = session?.partner.id ?? '';
  const partnerSlot: PartnerSlot = session?.partner.slot ?? 1;

  const itemsQuery = useQuery({
    queryKey: QUERY_KEY(householdId),
    queryFn: () =>
      apiFetch<PantryItem[]>(`/api/household/${householdId}/pantry`, { token }),
    enabled: Boolean(householdId && token),
    staleTime: 0,
  });

  const [connState, setConnState] = useState<ConnectionState>('idle');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const reconnectAttempt = useRef(0);

  const applyEvent = useCallback(
    (event: SyncEvent) => {
      queryClient.setQueryData<PantryItem[]>(QUERY_KEY(householdId), (old) => {
        if (!old) return old;
        if (event.type === 'pantry_added') {
          if (old.some((i) => i.id === event.item.id)) return old;
          return [...old, event.item];
        }
        if (event.type === 'pantry_deleted') {
          return old.filter((i) => i.id !== event.id);
        }
        return old;
      });
    },
    [queryClient, householdId],
  );

  useEffect(() => {
    if (!householdId || !token || !partnerId) {
      setConnState('idle');
      return;
    }
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      setConnState('connecting');
      const params = new URLSearchParams({
        token,
        partnerId,
        slot: String(partnerSlot),
      });
      const url = `${getWsBaseUrl()}/api/household/${householdId}/ws?${params.toString()}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        reconnectAttempt.current = 0;
        setConnState('open');
      };
      ws.onclose = () => {
        if (cancelled) return;
        setConnState('closed');
        const delay = Math.min(30_000, 1000 * 2 ** Math.min(reconnectAttempt.current, 5));
        reconnectAttempt.current += 1;
        reconnectTimer.current = window.setTimeout(connect, delay);
      };
      ws.onerror = () => {
        ws.close();
      };
      ws.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as SyncEvent;
          applyEvent(event);
        } catch {
        }
      };
    }

    connect();
    return () => {
      cancelled = true;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnState('idle');
    };
  }, [householdId, token, partnerId, partnerSlot, applyEvent]);

  const addMutation = useMutation({
    mutationFn: (input: { name: string; quantity: string }) =>
      apiFetch<PantryItem>(`/api/household/${householdId}/pantry`, {
        method: 'POST',
        body: {
          name: input.name.trim(),
          quantity: input.quantity.trim(),
          addedByPartnerId: partnerId,
          addedByPartnerSlot: partnerSlot,
        },
        token,
      }),
    onSuccess: (item) => {
      queryClient.setQueryData<PantryItem[]>(QUERY_KEY(householdId), (old) => {
        if (!old) return [item];
        if (old.some((i) => i.id === item.id)) return old;
        return [...old, item];
      });
    },
  });

  const addBulkMutation = useMutation({
    mutationFn: (input: { items: Array<{ name: string; quantity: string }> }) =>
      apiFetch<PantryItem[]>(`/api/household/${householdId}/pantry/bulk`, {
        method: 'POST',
        body: {
          items: input.items,
          addedByPartnerId: partnerId,
          addedByPartnerSlot: partnerSlot,
        },
        token,
      }),
    onSuccess: (items) => {
      queryClient.setQueryData<PantryItem[]>(QUERY_KEY(householdId), (old) => {
        if (!old) return items;
        const existingIds = new Set(old.map((i) => i.id));
        const newItems = items.filter((i) => !existingIds.has(i.id));
        return [...old, ...newItems];
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string; deleted: true }>(`/api/household/${householdId}/pantry/${id}`, {
        method: 'DELETE',
        token,
      }),
    onSuccess: (res) => {
      queryClient.setQueryData<PantryItem[]>(QUERY_KEY(householdId), (old) => {
        if (!old) return old;
        return old.filter((i) => i.id !== res.id);
      });
    },
  });

  return {
    items: itemsQuery.data ?? [],
    isLoading: itemsQuery.isLoading,
    addItem: addMutation.mutate,
    addBulk: addBulkMutation.mutate,
    deleteItem: deleteMutation.mutate,
    isAdding: addMutation.isPending,
    connectionState: connState,
  };
}
