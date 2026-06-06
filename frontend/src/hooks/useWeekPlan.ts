import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import type { GeneratedMeal } from '../types/meal';

export interface WeekPlanEntry {
  id: string;
  householdId: string;
  dayOfWeek: string;
  mealType: string;
  mealName: string;
  mealData: string;
  createdAt: number;
}

const WEEK_QUERY_KEY = (householdId: string) => ['meal-plan-week', householdId] as const;

export function useWeekPlan() {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();
  const householdId = session?.householdId ?? '';
  const token = session?.token ?? '';

  const { data: plan = [], isLoading } = useQuery({
    queryKey: WEEK_QUERY_KEY(householdId),
    queryFn: () =>
      apiFetch<WeekPlanEntry[]>(`/api/household/${householdId}/meal-plan/week`, { token }),
    enabled: Boolean(householdId && token),
    staleTime: 60_000,
  });

  const [isGenerating, setIsGenerating] = useState(false);

  async function generateWeek() {
    if (!householdId || !token) return;
    setIsGenerating(true);
    try {
      const result = await apiFetch<WeekPlanEntry[]>(
        `/api/household/${householdId}/meal-plan/week/generate`,
        { method: 'POST', token },
      );
      queryClient.setQueryData(WEEK_QUERY_KEY(householdId), result);
    } finally {
      setIsGenerating(false);
    }
  }

  function getMeal(day: string): GeneratedMeal | null {
    const entry = plan.find((p) => p.dayOfWeek === day);
    if (!entry) return null;
    try {
      return JSON.parse(entry.mealData) as GeneratedMeal;
    } catch {
      return null;
    }
  }

  return {
    plan,
    isLoading,
    isGenerating,
    generateWeek,
    getMeal,
    hasPlan: plan.length > 0,
  };
}
