import type { Category, GroceryItem } from '../types/grocery';

const STORAGE_KEY = 'cfs.offline.queue';

export interface QueuedAction {
  id: string;
  type: 'addItem';
  payload: { name: string; category: Category };
  timestamp: number;
}

export function loadQueue(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedAction[];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedAction[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function pushToQueue(action: Omit<QueuedAction, 'id' | 'timestamp'>): void {
  const queue = loadQueue();
  queue.push({ ...action, id: crypto.randomUUID(), timestamp: Date.now() });
  saveQueue(queue);
}

export function clearQueue(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getQueueLength(): number {
  return loadQueue().length;
}

export async function drainQueue(
  householdId: string,
  token: string,
  onItemAdded: (item: GroceryItem) => void,
): Promise<void> {
  const queue = loadQueue();
  if (queue.length === 0) return;

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';

  while (queue.length > 0) {
    const action = queue[0];
    if (!action) break;

    try {
      const res = await fetch(`${baseUrl}/api/household/${householdId}/items`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: action.payload.name,
          category: action.payload.category,
          addedByPartnerId: 'offline',
          addedByPartnerSlot: 1,
        }),
      });

      if (res.ok) {
        const item = (await res.json()) as GroceryItem;
        onItemAdded(item);
        queue.shift();
        saveQueue(queue);
      } else {
        break;
      }
    } catch {
      break;
    }
  }
}
