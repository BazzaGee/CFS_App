import { useState } from 'react';
import { Sparkles, Clock, Plus, Check, X, CalendarDays, UtensilsCrossed, Bookmark } from 'lucide-react';
import { useMealPlan } from '../hooks/useMealPlan';
import { useRecipes } from '../hooks/useRecipes';
import { useWeekPlan } from '../hooks/useWeekPlan';
import { useGroceryList } from '../hooks/useGroceryList';
import { classify } from '../lib/categories';
import type { GeneratedMeal } from '../types/meal';

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
] as const;

export default function MealPlanTab() {
  const [view, setView] = useState<'single' | 'week' | 'saved'>('single');

  return (
    <div className="px-6 py-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-text-primary text-3xl font-semibold tracking-tight">
            {view === 'single' ? 'What should we cook?' : view === 'saved' ? 'Our recipes' : 'Our week'}
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            {view === 'single'
              ? 'One tap, one dinner suggestion.'
              : view === 'saved'
                ? 'Meals you love, saved for later.'
                : 'Plan the week. Shop once.'}
          </p>
        </div>
        <div className="flex bg-cream-dark rounded-xl p-1">
          <button
            type="button"
            onClick={() => setView('single')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              view === 'single' ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary'
            }`}
          >
            Tonight
          </button>
          <button
            type="button"
            onClick={() => setView('saved')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              view === 'saved' ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary'
            }`}
          >
            Saved
          </button>
          <button
            type="button"
            onClick={() => setView('week')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              view === 'week' ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary'
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {view === 'single' ? <SingleMealView /> : view === 'saved' ? <SavedRecipesView /> : <WeekView />}
    </div>
  );
}

function SingleMealView() {
  const { meal, isGenerating, error, generateMeal, clearMeal } = useMealPlan();
  const { addItem } = useGroceryList();
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  function handleAddMissing(meal: GeneratedMeal) {
    const missing = meal.ingredients.filter((i) => !i.have && !addedItems.has(i.name));
    for (const item of missing) {
      addItem({ name: item.name, category: classify(item.name) });
    }
    setAddedItems((prev) => {
      const next = new Set(prev);
      for (const ing of missing) next.add(ing.name);
      return next;
    });
  }

  if (!meal && !isGenerating) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Sparkles size={28} className="text-sage" />
        </div>
        <p className="text-text-primary text-xl font-semibold mb-2">
          Ready to decide dinner?
        </p>
        <p className="text-text-secondary text-base leading-relaxed max-w-sm mx-auto mb-8">
          We'll look at your pantry and both your preferences, then suggest one meal.
        </p>
        <button
          type="button"
          onClick={generateMeal}
          className="bg-sage text-white font-medium py-4 px-8 rounded-2xl hover:bg-sage-dark active:scale-[0.99] transition-all inline-flex items-center gap-2"
        >
          <Sparkles size={18} />
          Generate a meal
        </button>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <Sparkles size={28} className="text-sage" />
        </div>
        <p className="text-text-primary text-lg font-medium">Thinking of something delicious…</p>
        <p className="text-text-secondary text-sm mt-2">This takes a moment.</p>
      </div>
    );
  }

  if (error && !meal) {
    return (
      <div className="text-center py-16">
        <p className="text-error text-base">{error}</p>
        <button
          type="button"
          onClick={generateMeal}
          className="mt-4 text-sage font-medium hover:text-sage-dark"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!meal) return null;

  return (
    <MealCard meal={meal} onAddMissing={() => handleAddMissing(meal)} onRegenerate={generateMeal} onClear={clearMeal} />
  );
}

function MealCard({
  meal,
  onAddMissing,
  onRegenerate,
  onClear,
}: {
  meal: GeneratedMeal;
  onAddMissing: () => void;
  onRegenerate: () => void;
  onClear: () => void;
}) {
  const [showPlating, setShowPlating] = useState(false);
  const { saveRecipe, isSaving, hasSaved } = useMealSave(meal);
  const missingCount = meal.ingredients.filter((i) => !i.have).length;
  const haveCount = meal.ingredients.filter((i) => i.have).length;

  return (
    <div className="space-y-6">
      <section className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-text-primary text-2xl font-semibold tracking-tight">
                {meal.name}
              </h2>
              <p className="text-text-secondary text-sm mt-1 leading-relaxed">
                {meal.description}
              </p>
            </div>
            <button
              type="button"
              onClick={onClear}
              className="flex-shrink-0 p-1.5 rounded-full text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Dismiss"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1.5 text-text-secondary text-sm">
              <Clock size={14} />
              <span>{meal.timeMinutes} min</span>
            </div>
            <div className="flex items-center gap-1.5 text-sage text-sm font-medium">
              <Check size={14} />
              <span>{haveCount} in pantry</span>
            </div>
            {missingCount > 0 && (
              <div className="flex items-center gap-1.5 text-terracotta text-sm font-medium">
                <Plus size={14} />
                <span>{missingCount} to buy</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 grid grid-cols-4 gap-3 border-b border-border bg-cream/50">
          <div className="text-center">
            <p className="text-text-secondary text-xs uppercase tracking-wide">Calories</p>
            <p className="text-text-primary text-lg font-semibold">{meal.calories}</p>
          </div>
          <div className="text-center">
            <p className="text-text-secondary text-xs uppercase tracking-wide">Protein</p>
            <p className="text-text-primary text-lg font-semibold">{meal.protein}g</p>
          </div>
          <div className="text-center">
            <p className="text-text-secondary text-xs uppercase tracking-wide">Carbs</p>
            <p className="text-text-primary text-lg font-semibold">{meal.carbs}g</p>
          </div>
          <div className="text-center">
            <p className="text-text-secondary text-xs uppercase tracking-wide">Fat</p>
            <p className="text-text-primary text-lg font-semibold">{meal.fat}g</p>
          </div>
        </div>

        <div className="px-6 py-4">
          <h3 className="text-text-secondary text-xs font-medium tracking-[0.2em] uppercase mb-3">
            Ingredients
          </h3>
          <ul className="space-y-2">
            {meal.ingredients.map((ing, i) => (
              <li key={i} className="flex items-center gap-3">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    ing.have ? 'bg-sage' : 'bg-terracotta'
                  }`}
                  aria-hidden
                />
                <span
                  className={`text-base ${
                    ing.have ? 'text-text-primary' : 'text-text-secondary'
                  }`}
                >
                  {ing.quantity && <span className="text-text-secondary">{ing.quantity} </span>}
                  {ing.name}
                </span>
                {!ing.have && (
                  <span className="text-xs text-terracotta font-medium ml-auto">need</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="px-6 py-4">
          <h3 className="text-text-secondary text-xs font-medium tracking-[0.2em] uppercase mb-3">
            Steps
          </h3>
          <ol className="space-y-3">
            {meal.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sage/10 text-sage text-xs font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-text-primary text-sm leading-relaxed pt-0.5">{step}</p>
              </li>
            ))}
          </ol>
        </div>

        {meal.plating && meal.plating.length > 0 && (
          <div className="px-6 py-4 border-t border-border">
            <button
              type="button"
              onClick={() => setShowPlating(!showPlating)}
              className="flex items-center gap-2 text-sage font-medium hover:text-sage-dark transition-colors"
            >
              <UtensilsCrossed size={16} />
              {showPlating ? 'Hide' : 'Show'} plating instructions
            </button>

            {showPlating && (
              <div className="mt-4 grid md:grid-cols-2 gap-4">
                {meal.plating.map((p) => (
                  <PlatingCard key={p.partnerSlot} plating={p} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onAddMissing}
          disabled={missingCount === 0}
          className="flex-1 bg-sage text-white font-medium py-3 px-6 rounded-xl hover:bg-sage-dark active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          Add {missingCount} missing to list
        </button>
        <button
          type="button"
          onClick={saveRecipe}
          disabled={isSaving || hasSaved}
          className={`flex-shrink-0 font-medium py-3 px-4 rounded-xl transition-all flex items-center gap-2 ${
            hasSaved
              ? 'bg-sage/10 text-sage border border-sage/30'
              : 'bg-cream text-text-secondary border border-border hover:bg-cream-dark'
          } disabled:opacity-40`}
        >
          <Bookmark size={16} fill={hasSaved ? 'currentColor' : 'none'} />
          {hasSaved ? 'Saved' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          className="flex-shrink-0 bg-cream text-text-secondary font-medium py-3 px-4 rounded-xl border border-border hover:bg-cream-dark transition-colors flex items-center gap-2"
        >
          <Sparkles size={16} />
          Another
        </button>
      </div>
    </div>
  );
}

function useMealSave(meal: GeneratedMeal) {
  const { recipes, saveRecipe, isSaving } = useRecipes();
  const hasSaved = recipes.some((r) => r.name === meal.name);

  return {
    hasSaved,
    isSaving,
    saveRecipe: () => {
      if (!hasSaved && !isSaving) {
        saveRecipe(meal);
      }
    },
  };
}

function PlatingCard({
  plating,
}: {
  plating: { partnerSlot: number; partnerName: string; targetCalories: number; plate: string; protein: number; carbs: number; fat: number };
}) {
  const dotColor = plating.partnerSlot === 1 ? 'bg-sage' : 'bg-terracotta';
  const borderColor = plating.partnerSlot === 1 ? 'border-sage/30' : 'border-terracotta/30';

  return (
    <div className={`bg-cream/50 border ${borderColor} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-3 h-3 rounded-full ${dotColor}`} aria-hidden />
        <h4 className="text-text-primary text-sm font-semibold">{plating.partnerName}'s plate</h4>
        <span className="ml-auto text-text-secondary text-xs">{plating.targetCalories} cal</span>
      </div>
      <p className="text-text-primary text-sm leading-relaxed mb-2">{plating.plate}</p>
      <div className="flex gap-4 text-xs text-text-secondary">
        <span>P: {plating.protein}g</span>
        <span>C: {plating.carbs}g</span>
        <span>F: {plating.fat}g</span>
      </div>
    </div>
  );
}

function SavedRecipesView() {
  const { recipes, isLoading, hasRecipes, getMeal } = useRecipes();
  const { addItem } = useGroceryList();

  function handleRegenerate(meal: GeneratedMeal) {
    for (const ing of meal.ingredients) {
      if (!ing.have) {
        addItem({ name: ing.name, category: classify(ing.name) });
      }
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <p className="text-text-secondary text-sm">Loading your recipes…</p>
      </div>
    );
  }

  if (!hasRecipes) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Bookmark size={28} className="text-sage" />
        </div>
        <p className="text-text-primary text-xl font-semibold mb-2">
          No saved recipes yet
        </p>
        <p className="text-text-secondary text-base leading-relaxed max-w-sm mx-auto">
          Generate a meal and save the ones you love. They'll appear here for quick access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recipes.map((recipe) => {
        const meal = getMeal(recipe);
        if (!meal) return null;
        return (
          <div
            key={recipe.id}
            className="bg-white border border-border rounded-xl px-5 py-4 flex items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <p className="text-text-primary text-sm font-medium truncate">{meal.name}</p>
              <p className="text-text-secondary text-xs">
                {meal.timeMinutes}min · {meal.calories}cal
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleRegenerate(meal)}
              className="flex-shrink-0 text-sage text-sm font-medium hover:text-sage-dark transition-colors"
            >
              Cook again
            </button>
          </div>
        );
      })}
    </div>
  );
}

function WeekView() {
  const { isGenerating, generateWeek, getMeal, hasPlan } = useWeekPlan();
  const { addItem } = useGroceryList();

  async function handlePopulateList() {
    const allMissing = new Set<string>();
    for (const day of DAYS) {
      const meal = getMeal(day.key);
      if (meal) {
        for (const ing of meal.ingredients) {
          if (!ing.have) allMissing.add(ing.name);
        }
      }
    }
    for (const name of allMissing) {
      addItem({ name, category: classify(name) });
    }
  }

  const totalMissing = new Set<string>();
  for (const day of DAYS) {
    const meal = getMeal(day.key);
    if (meal) {
      for (const ing of meal.ingredients) {
        if (!ing.have) totalMissing.add(ing.name);
      }
    }
  }

  if (!hasPlan && !isGenerating) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CalendarDays size={28} className="text-sage" />
        </div>
        <p className="text-text-primary text-xl font-semibold mb-2">
          Plan the whole week
        </p>
        <p className="text-text-secondary text-base leading-relaxed max-w-sm mx-auto mb-8">
          One tap generates 7 dinners. Missing ingredients go straight to your grocery list.
        </p>
        <button
          type="button"
          onClick={generateWeek}
          disabled={isGenerating}
          className="bg-sage text-white font-medium py-4 px-8 rounded-2xl hover:bg-sage-dark active:scale-[0.99] transition-all inline-flex items-center gap-2 disabled:opacity-50"
        >
          <CalendarDays size={18} />
          Generate the week
        </button>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <CalendarDays size={28} className="text-sage" />
        </div>
        <p className="text-text-primary text-lg font-medium">Planning your week…</p>
        <p className="text-text-secondary text-sm mt-2">This takes a moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3">
        {DAYS.map((day) => {
          const meal = getMeal(day.key);
          return (
            <div
              key={day.key}
              className="bg-white border border-border rounded-xl px-5 py-4 flex items-center gap-4"
            >
              <span className="w-10 text-text-secondary text-sm font-medium text-center">
                {day.label}
              </span>
              {meal ? (
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-medium truncate">{meal.name}</p>
                  <p className="text-text-secondary text-xs">
                    {meal.timeMinutes}min · {meal.calories}cal
                  </p>
                </div>
              ) : (
                <p className="flex-1 text-text-secondary text-sm italic">Not planned</p>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handlePopulateList}
        disabled={totalMissing.size === 0}
        className="w-full bg-sage text-white font-medium py-3 px-6 rounded-xl hover:bg-sage-dark active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Plus size={16} />
        Add {totalMissing.size} missing ingredients to list
      </button>

      <button
        type="button"
        onClick={generateWeek}
        className="w-full bg-cream text-text-secondary font-medium py-3 px-6 rounded-xl border border-border hover:bg-cream-dark transition-colors flex items-center justify-center gap-2"
      >
        <Sparkles size={16} />
        Regenerate the week
      </button>
    </div>
  );
}
