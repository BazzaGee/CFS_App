import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfiles, type Diet, type Gender, type ActivityLevel, type Goal, type PartnerProfile } from '../hooks/useProfiles';
import { useAuthStore } from '../stores/authStore';
import { linkWithPartner } from '../hooks/useAuth';

const DIETS: readonly Diet[] = ['omnivore', 'vegetarian', 'vegan', 'pescatarian', 'keto', 'paleo', 'gluten-free'] as const;
const GENDERS: readonly Gender[] = ['male', 'female', 'other'] as const;
const ACTIVITY_LEVELS: readonly ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active'] as const;
const GOALS: readonly Goal[] = ['lose', 'maintain', 'gain'] as const;

const DIET_LABELS: Record<Diet, string> = {
  omnivore: 'No restrictions',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  pescatarian: 'Pescatarian',
  keto: 'Keto',
  paleo: 'Paleo',
  'gluten-free': 'Gluten-free',
};

const GENDER_LABELS: Record<Gender, string> = { male: 'Male', female: 'Female', other: 'Other' };
const ACTIVITY_LABELS: Record<ActivityLevel, string> = { sedentary: 'Sedentary', light: 'Light exercise', moderate: 'Moderate exercise', active: 'Active', very_active: 'Very active' };
const GOAL_LABELS: Record<Goal, string> = { lose: 'Lose weight', maintain: 'Maintain weight', gain: 'Gain muscle', none: 'Just eat well' };

export default function ProfilesTab() {
  const navigate = useNavigate();
  const { isLoading, myProfile, otherProfile, updateProfile } = useProfiles();
  const setSession = useAuthStore((s) => s.setSession);
  const clear = useAuthStore((s) => s.clear);
  const [editing, setEditing] = useState(false);
  const [editingBody, setEditingBody] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDiet, setFormDiet] = useState<Diet>('omnivore');
  const [formAllergies, setFormAllergies] = useState('');
  const [formWeight, setFormWeight] = useState('');
  const [formHeight, setFormHeight] = useState('');
  const [formAge, setFormAge] = useState('');
  const [formGender, setFormGender] = useState<Gender>('male');
  const [formActivity, setFormActivity] = useState<ActivityLevel>('sedentary');
  const [formGoal, setFormGoal] = useState<Goal>('maintain');
  const [saving, setSaving] = useState(false);
  const [linkCode, setLinkCode] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  async function handleLink() {
    const code = linkCode.replace(/\D/g, '').trim();
    if (!/^\d{6}$/.test(code)) {
      setLinkError('Enter a 6-digit code.');
      return;
    }
    setLinkError(null);
    setLinking(true);
    try {
      const currentToken = useAuthStore.getState().session?.token;
      if (!currentToken) {
        setLinkError('Not signed in. Please restart the app.');
        return;
      }
      const result = await linkWithPartner(code, currentToken);
      setSession(result);
      navigate('/', { replace: true });
    } catch (err) {
      setLinkError(err instanceof Error && 'message' in err ? err.message : 'Could not link. Check the code and try again.');
    } finally {
      setLinking(false);
    }
  }

  function startEdit(profile: PartnerProfile) {
    setFormName(profile.name);
    setFormDiet(profile.diet);
    setFormAllergies(profile.allergies);
    setFormWeight(profile.weightKg?.toString() ?? '');
    setFormHeight(profile.heightCm?.toString() ?? '');
    setFormAge(profile.age?.toString() ?? '');
    setFormGender(profile.gender ?? 'male');
    setFormActivity(profile.activityLevel ?? 'sedentary');
    setFormGoal(profile.goal ?? 'maintain');
    setEditing(true);
    setEditingBody(false);
  }

  async function handleSave() {
    if (!myProfile) return;
    setSaving(true);
    try {
      await updateProfile(myProfile.id, {
        name: formName.trim() || myProfile.name,
        diet: formDiet,
        allergies: formAllergies.trim(),
        weightKg: formWeight ? parseFloat(formWeight) : null,
        heightCm: formHeight ? parseFloat(formHeight) : null,
        age: formAge ? parseInt(formAge) : null,
        gender: formGender,
        activityLevel: formActivity,
        goal: formGoal,
      });
      setEditing(false);
      setEditingBody(false);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-text-secondary text-sm">Loading profiles…</p>
      </div>
    );
  }

  if (!myProfile) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-text-secondary text-sm">No profile found. Try refreshing.</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 space-y-8">
      <div>
        <h1 className="text-text-primary text-3xl font-semibold tracking-tight">
          Who are we cooking for?
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Set your preferences and body stats so meals work for both of you.
        </p>
      </div>

      <ProfileCard
        profile={myProfile}
        isYou
        onEdit={() => startEdit(myProfile)}
        editing={editing}
        editingBody={editingBody}
        saving={saving}
        formName={formName}
        formDiet={formDiet}
        formAllergies={formAllergies}
        formWeight={formWeight}
        formHeight={formHeight}
        formAge={formAge}
        formGender={formGender}
        formActivity={formActivity}
        formGoal={formGoal}
        onFormNameChange={setFormName}
        onFormDietChange={setFormDiet}
        onFormAllergiesChange={setFormAllergies}
        onFormWeightChange={setFormWeight}
        onFormHeightChange={setFormHeight}
        onFormAgeChange={setFormAge}
        onFormGenderChange={setFormGender}
        onFormActivityChange={setFormActivity}
        onFormGoalChange={setFormGoal}
        onToggleBody={() => setEditingBody(!editingBody)}
        onSave={handleSave}
        onCancel={() => { setEditing(false); setEditingBody(false); }}
      />

      {otherProfile && (
        <ProfileCard profile={otherProfile} isYou={false} />
      )}

      {!otherProfile && (
        <section className="bg-white border border-border rounded-2xl p-6">
          <h3 className="text-text-primary text-lg font-semibold mb-4">Link with your partner</h3>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            If you both set up separately, enter your partner's code here to join their kitchen.
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="link-code" className="text-text-secondary text-xs font-medium tracking-wide block mb-2">
                Your partner's invite code
              </label>
              <input
                id="link-code"
                type="text"
                value={linkCode}
                onChange={(e) => {
                  setLinkCode(e.target.value);
                  if (linkError) setLinkError(null);
                }}
                placeholder="Enter 6-digit code"
                maxLength={6}
                inputMode="numeric"
                className="w-full bg-cream border border-border rounded-xl px-4 py-3 text-text-primary text-lg tracking-[0.3em] text-center placeholder:text-text-secondary/50 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-colors"
              />
            </div>

            {linkError && (
              <p className="text-error text-sm" role="alert">
                {linkError}
              </p>
            )}

            <button
              type="button"
              onClick={handleLink}
              disabled={linking}
              className="w-full bg-sage text-white font-medium py-3 px-6 rounded-xl hover:bg-sage-dark active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {linking ? 'Linking…' : 'Link kitchens'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function ProfileCard({
  profile,
  isYou,
  onEdit,
  editing,
  editingBody,
  saving,
  formName,
  formDiet,
  formAllergies,
  formWeight,
  formHeight,
  formAge,
  formGender,
  formActivity,
  formGoal,
  onFormNameChange,
  onFormDietChange,
  onFormAllergiesChange,
  onFormWeightChange,
  onFormHeightChange,
  onFormAgeChange,
  onFormGenderChange,
  onFormActivityChange,
  onFormGoalChange,
  onToggleBody,
  onSave,
  onCancel,
}: {
  profile: PartnerProfile;
  isYou: boolean;
  onEdit?: () => void;
  editing?: boolean;
  editingBody?: boolean;
  saving?: boolean;
  formName?: string;
  formDiet?: Diet;
  formAllergies?: string;
  formWeight?: string;
  formHeight?: string;
  formAge?: string;
  formGender?: Gender;
  formActivity?: ActivityLevel;
  formGoal?: Goal;
  onFormNameChange?: (v: string) => void;
  onFormDietChange?: (v: Diet) => void;
  onFormAllergiesChange?: (v: string) => void;
  onFormWeightChange?: (v: string) => void;
  onFormHeightChange?: (v: string) => void;
  onFormAgeChange?: (v: string) => void;
  onFormGenderChange?: (v: Gender) => void;
  onFormActivityChange?: (v: ActivityLevel) => void;
  onFormGoalChange?: (v: Goal) => void;
  onToggleBody?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
}) {
  const dotColor = profile.slot === 1 ? 'bg-sage' : 'bg-terracotta';

  return (
    <section className="bg-white border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${dotColor}`} aria-hidden />
          <h2 className="text-text-primary text-lg font-semibold">
            {isYou ? 'You' : profile.name}
          </h2>
        </div>
        {isYou && !editing && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-sage text-sm font-medium hover:text-sage-dark transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="profile-name" className="text-text-secondary text-xs font-medium tracking-wide block mb-2">
              Name
            </label>
            <input
              id="profile-name"
              type="text"
              value={formName}
              onChange={(e) => onFormNameChange?.(e.target.value)}
              className="w-full bg-cream border border-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="profile-diet" className="text-text-secondary text-xs font-medium tracking-wide block mb-2">
              Dietary preference
            </label>
            <select
              id="profile-diet"
              value={formDiet}
              onChange={(e) => onFormDietChange?.(e.target.value as Diet)}
              className="w-full bg-cream border border-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-colors appearance-none"
            >
              {DIETS.map((d) => (
                <option key={d} value={d}>
                  {DIET_LABELS[d]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="profile-allergies" className="text-text-secondary text-xs font-medium tracking-wide block mb-2">
              Allergies
            </label>
            <input
              id="profile-allergies"
              type="text"
              value={formAllergies}
              onChange={(e) => onFormAllergiesChange?.(e.target.value)}
              placeholder="peanuts, shellfish, dairy…"
              className="w-full bg-cream border border-border rounded-xl px-4 py-3 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-colors"
            />
          </div>

          {!editingBody ? (
            <button
              type="button"
              onClick={onToggleBody}
              className="text-sage text-sm font-medium hover:text-sage-dark transition-colors"
            >
              + Set body profile for adaptive cooking
            </button>
          ) : (
            <div className="space-y-4 pt-2 border-t border-border">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="profile-weight" className="text-text-secondary text-xs font-medium tracking-wide block mb-2">
                    Weight (kg)
                  </label>
                  <input
                    id="profile-weight"
                    type="number"
                    value={formWeight}
                    onChange={(e) => onFormWeightChange?.(e.target.value)}
                    placeholder="70"
                    className="w-full bg-cream border border-border rounded-xl px-4 py-3 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="profile-height" className="text-text-secondary text-xs font-medium tracking-wide block mb-2">
                    Height (cm)
                  </label>
                  <input
                    id="profile-height"
                    type="number"
                    value={formHeight}
                    onChange={(e) => onFormHeightChange?.(e.target.value)}
                    placeholder="170"
                    className="w-full bg-cream border border-border rounded-xl px-4 py-3 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="profile-age" className="text-text-secondary text-xs font-medium tracking-wide block mb-2">
                    Age
                  </label>
                  <input
                    id="profile-age"
                    type="number"
                    value={formAge}
                    onChange={(e) => onFormAgeChange?.(e.target.value)}
                    placeholder="30"
                    className="w-full bg-cream border border-border rounded-xl px-4 py-3 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="profile-gender" className="text-text-secondary text-xs font-medium tracking-wide block mb-2">
                    Gender
                  </label>
                  <select
                    id="profile-gender"
                    value={formGender}
                    onChange={(e) => onFormGenderChange?.(e.target.value as Gender)}
                    className="w-full bg-cream border border-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-colors appearance-none"
                  >
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>{GENDER_LABELS[g]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="profile-activity" className="text-text-secondary text-xs font-medium tracking-wide block mb-2">
                  Activity level
                </label>
                <select
                  id="profile-activity"
                  value={formActivity}
                  onChange={(e) => onFormActivityChange?.(e.target.value as ActivityLevel)}
                  className="w-full bg-cream border border-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-colors appearance-none"
                >
                  {ACTIVITY_LEVELS.map((a) => (
                    <option key={a} value={a}>{ACTIVITY_LABELS[a]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="profile-goal" className="text-text-secondary text-xs font-medium tracking-wide block mb-2">
                  Goal
                </label>
                <select
                  id="profile-goal"
                  value={formGoal}
                  onChange={(e) => onFormGoalChange?.(e.target.value as Goal)}
                  className="w-full bg-cream border border-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-colors appearance-none"
                >
                  {GOALS.map((g) => (
                    <option key={g} value={g}>{GOAL_LABELS[g]}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="flex-1 bg-sage text-white font-medium py-3 px-6 rounded-xl hover:bg-sage-dark active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-cream text-text-secondary font-medium py-3 px-6 rounded-xl border border-border hover:bg-cream-dark transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-text-secondary text-xs tracking-wide uppercase">Diet</p>
            <p className="text-text-primary text-base font-medium">
              {DIET_LABELS[profile.diet]}
            </p>
          </div>
          <div>
            <p className="text-text-secondary text-xs tracking-wide uppercase">Allergies</p>
            <p className="text-text-primary text-base">
              {profile.allergies || 'None'}
            </p>
          </div>
          {profile.tdee && (
            <>
              <div className="pt-3 border-t border-border">
                <p className="text-text-secondary text-xs tracking-wide uppercase">Body profile</p>
                <p className="text-text-primary text-sm mt-1">
                  {profile.weightKg}kg · {profile.heightCm}cm · {profile.age}y · {profile.gender} · {ACTIVITY_LABELS[profile.activityLevel!]}
                </p>
                <p className="text-sage text-sm font-medium mt-1">
                  Goal: {GOAL_LABELS[profile.goal!]} · Target: {profile.tdee.targetCalories} cal/day
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
