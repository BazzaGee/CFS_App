import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AppNotification {
  id: string;
  partnerName: string;
  partnerSlot: 1 | 2;
  action: string;
  itemName: string;
  timestamp: number;
  read: boolean;
  eventType: string;
  eventFingerprint: string;
}

const MAX_NOTIFICATIONS = 50;
const DEDUP_WINDOW_MS = 5000;

interface NotificationState {
  notifications: AppNotification[];
  toastQueue: AppNotification[];
  _recentFingerprints: Array<{ fp: string; ts: number }>;

  unreadCount: () => number;
  addNotification: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
  dismissToast: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      toastQueue: [],
      _recentFingerprints: [],

      unreadCount: () => get().notifications.filter((n) => !n.read).length,

      addNotification: (n) => {
        const state = get();
        const now = Date.now();

        const cleaned = state._recentFingerprints.filter(
          (f) => now - f.ts < DEDUP_WINDOW_MS,
        );
        if (cleaned.some((f) => f.fp === n.eventFingerprint)) return;
        cleaned.push({ fp: n.eventFingerprint, ts: now });

        const id = crypto.randomUUID();
        const notification: AppNotification = {
          ...n,
          id,
          timestamp: now,
          read: false,
        };

        const notifications = [notification, ...state.notifications].slice(
          0,
          MAX_NOTIFICATIONS,
        );

        set({
          notifications,
          toastQueue: [...state.toastQueue, notification],
          _recentFingerprints: cleaned,
        });
      },

      markAsRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
        })),

      markAllRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),

      clear: () => set({ notifications: [], toastQueue: [], _recentFingerprints: [] }),

      dismissToast: (id) =>
        set((s) => ({
          toastQueue: s.toastQueue.filter((n) => n.id !== id),
        })),
    }),
    {
      name: 'cfs.notifications',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        notifications: state.notifications,
      }),
    },
  ),
);
