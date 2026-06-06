import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, getWsBaseUrl } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import type { Category, GroceryItem, PartnerSlot, SyncEvent } from '../types/grocery';
import { drainQueue, pushToQueue, getQueueLength } from '../lib/offlineQueue';

export type ConnectionState = 'idle' | 'connecting' | 'open' | 'closed';

const QUERY_KEY = (householdId: string) => ['grocery', householdId] as const;

export function useGroceryList() {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  const householdId = session?.householdId ?? '';
  const token = session?.token ?? '';
  const partnerId = session?.partner.id ?? '';
  const partnerSlot: PartnerSlot = session?.partner.slot ?? 1;

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueLen, setQueueLen] = useState(getQueueLength());

  useEffect(() => {
    function onOnline() {
      setIsOnline(true);
      setQueueLen(getQueueLength());
    }
    function onOffline() {
      setIsOnline(false);
      setQueueLen(getQueueLength());
    }
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const itemsQuery = useQuery({
    queryKey: QUERY_KEY(householdId),
    queryFn: () =>
      apiFetch<GroceryItem[]>(`/api/household/${householdId}/items`, { token }),
    enabled: Boolean(householdId && token),
    staleTime: 0,
  });

  const [connState, setConnState] = useState<ConnectionState>('idle');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const reconnectAttempt = useRef(0);
  const drainingRef = useRef(false);

  const applyEvent = useCallback(
    (event: SyncEvent) => {
      queryClient.setQueryData<GroceryItem[]>(QUERY_KEY(householdId), (old) => {
        if (!old) return old;
        if (event.type === 'item_added') {
          if (old.some((i) => i.id === event.item.id)) return old;
          return [...old, event.item];
        }
        if (event.type === 'item_toggled') {
          return old.map((i) => (i.id === event.item.id ? event.item : i));
        }
        if (event.type === 'item_deleted') {
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
        if (navigator.onLine && !drainingRef.current) {
          drainingRef.current = true;
          drainQueue(householdId, token, (item) => {
            queryClient.setQueryData<GroceryItem[]>(QUERY_KEY(householdId), (old) => {
              if (!old) return [item];
              if (old.some((i) => i.id === item.id)) return old;
              return [...old, item];
            });
          }).finally(() => {
            drainingRef.current = false;
            setQueueLen(getQueueLength());
          });
        }
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
  }, [householdId, token, partnerId, partnerSlot, applyEvent, queryClient]);

  const addMutation = useMutation({
    mutationFn: (input: { name: string; category: Category }) => {
      if (!isOnline) {
        pushToQueue({ type: 'addItem', payload: { name: input.name.trim(), category: input.category } });
        setQueueLen(getQueueLength());
        return Promise.resolve({ id: `queued-${Date.now()}`, householdId, name: input.name.trim(), category: input.category, isChecked: false, addedByPartnerId: partnerId, addedByPartnerSlot: partnerSlot, createdAt: Date.now(), updatedAt: Date.now() } as GroceryItem);
      }
      return apiFetch<GroceryItem>(`/api/household/${householdId}/items`, {
        method: 'POST',
        body: {
          name: input.name.trim(),
          category: input.category,
          addedByPartnerId: partnerId,
          addedByPartnerSlot: partnerSlot,
        },
        token,
      });
    },
    onSuccess: (item) => {
      queryClient.setQueryData<GroceryItem[]>(QUERY_KEY(householdId), (old) => {
        if (!old) return [item];
        if (old.some((i) => i.id === item.id)) return old;
        return [...old, item];
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<GroceryItem>(`/api/household/${householdId}/items/${id}/toggle`, {
        method: 'PATCH',
        token,
      }),
    onSuccess: (item) => {
      queryClient.setQueryData<GroceryItem[]>(QUERY_KEY(householdId), (old) => {
        if (!old) return old;
        return old.map((i) => (i.id === item.id ? item : i));
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string; deleted: true }>(`/api/household/${householdId}/items/${id}`, {
        method: 'DELETE',
        token,
      }),
    onSuccess: (res) => {
      queryClient.setQueryData<GroceryItem[]>(QUERY_KEY(householdId), (old) => {
        if (!old) return old;
        return old.filter((i) => i.id !== res.id);
      });
    },
  });

  return {
    items: itemsQuery.data ?? [],
    isLoading: itemsQuery.isLoading,
    addItem: addMutation.mutate,
    toggleItem: toggleMutation.mutate,
    deleteItem: deleteMutation.mutate,
    isAdding: addMutation.isPending,
    connectionState: connState,
    isOnline,
    queuedCount: queueLen,
  };
}
