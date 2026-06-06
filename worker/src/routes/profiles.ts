import type { Context } from 'hono';
import type { Env } from '../env';
import { calculateTDEE, type BodyProfile, type TDEEResult } from '../lib/tdee';

export type Diet = 'omnivore' | 'vegetarian' | 'vegan' | 'pescatarian' | 'keto' | 'paleo' | 'gluten-free';
export type Gender = 'male' | 'female' | 'other';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose' | 'maintain' | 'gain';

export interface PartnerProfile {
  id: string;
  householdId: string;
  slot: 1 | 2;
  name: string;
  diet: Diet;
  allergies: string;
  createdAt: number;
  updatedAt: number;
  weightKg: number | null;
  heightCm: number | null;
  age: number | null;
  gender: Gender | null;
  activityLevel: ActivityLevel | null;
  goal: Goal | null;
  tdee: TDEEResult | null;
}

interface PartnerRow {
  id: string;
  household_id: string;
  slot: number;
  name: string;
  diet: string;
  allergies: string;
  created_at: number;
  updated_at: number;
  weight_kg: number | null;
  height_cm: number | null;
  age: number | null;
  gender: string | null;
  activity_level: string | null;
  goal: string | null;
}

function rowToProfile(row: PartnerRow): PartnerProfile {
  const profile: PartnerProfile = {
    id: row.id,
    householdId: row.household_id,
    slot: row.slot as 1 | 2,
    name: row.name,
    diet: row.diet as Diet,
    allergies: row.allergies,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    weightKg: row.weight_kg,
    heightCm: row.height_cm,
    age: row.age,
    gender: row.gender as Gender | null,
    activityLevel: row.activity_level as ActivityLevel | null,
    goal: row.goal as Goal | null,
    tdee: null,
  };

  if (profile.weightKg && profile.heightCm && profile.age && profile.gender && profile.activityLevel && profile.goal) {
    profile.tdee = calculateTDEE({
      weightKg: profile.weightKg,
      heightCm: profile.heightCm,
      age: profile.age,
      gender: profile.gender,
      activityLevel: profile.activityLevel,
      goal: profile.goal,
    });
  }

  return profile;
}

export async function createPartner(
  db: D1Database,
  householdId: string,
  partnerId: string,
  slot: 1 | 2,
  name: string,
): Promise<PartnerProfile> {
  const now = Date.now();
  await db.prepare(
    `INSERT INTO partners (id, household_id, slot, name, diet, allergies, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'omnivore', '', ?, ?)`,
  )
    .bind(partnerId, householdId, slot, name, now, now)
    .run();

  return {
    id: partnerId,
    householdId,
    slot,
    name,
    diet: 'omnivore',
    allergies: '',
    createdAt: now,
    updatedAt: now,
    weightKg: null,
    heightCm: null,
    age: null,
    gender: null,
    activityLevel: null,
    goal: null,
    tdee: null,
  };
}

export async function getPartners(
  db: D1Database,
  householdId: string,
): Promise<PartnerProfile[]> {
  const { results } = await db.prepare(
    'SELECT * FROM partners WHERE household_id = ? ORDER BY slot ASC',
  )
    .bind(householdId)
    .all<PartnerRow>();
  return (results ?? []).map(rowToProfile);
}

export async function updatePartner(
  db: D1Database,
  partnerId: string,
  updates: { name?: string; diet?: string; allergies?: string; weightKg?: number | null; heightCm?: number | null; age?: number | null; gender?: string | null; activityLevel?: string | null; goal?: string | null },
): Promise<PartnerProfile | null> {
  const now = Date.now();
  const existing = await db.prepare(
    'SELECT * FROM partners WHERE id = ?',
  )
    .bind(partnerId)
    .first<PartnerRow>();

  if (!existing) return null;

  const name = updates.name ?? existing.name;
  const diet = updates.diet ?? existing.diet;
  const allergies = updates.allergies ?? existing.allergies;
  const weightKg = updates.weightKg !== undefined ? updates.weightKg : existing.weight_kg;
  const heightCm = updates.heightCm !== undefined ? updates.heightCm : existing.height_cm;
  const age = updates.age !== undefined ? updates.age : existing.age;
  const gender = updates.gender !== undefined ? updates.gender : existing.gender;
  const activityLevel = updates.activityLevel !== undefined ? updates.activityLevel : existing.activity_level;
  const goal = updates.goal !== undefined ? updates.goal : existing.goal;

  await db.prepare(
    `UPDATE partners SET name = ?, diet = ?, allergies = ?, weight_kg = ?, height_cm = ?, age = ?, gender = ?, activity_level = ?, goal = ?, updated_at = ? WHERE id = ?`,
  )
    .bind(name, diet, allergies, weightKg, heightCm, age, gender, activityLevel, goal, now, partnerId)
    .run();

  return rowToProfile({
    ...existing,
    name,
    diet,
    allergies,
    weight_kg: weightKg,
    height_cm: heightCm,
    age,
    gender,
    activity_level: activityLevel,
    goal,
    updated_at: now,
  });
}

export async function handleGetProfiles(c: Context<{ Bindings: Env }>) {
  const householdId = c.req.param('id') as string;
  const profiles = await getPartners(c.env.DB, householdId);
  return c.json(profiles);
}

export async function handleUpdateProfile(c: Context<{ Bindings: Env }>) {
  const partnerId = c.req.param('partnerId') as string;
  const body = (await c.req.json().catch(() => ({}))) as {
    name?: string;
    diet?: string;
    allergies?: string;
    weightKg?: number | null;
    heightCm?: number | null;
    age?: number | null;
    gender?: string | null;
    activityLevel?: string | null;
    goal?: string | null;
  };

  const profile = await updatePartner(c.env.DB, partnerId, {
    name: body.name?.trim(),
    diet: body.diet,
    allergies: body.allergies,
    weightKg: body.weightKg,
    heightCm: body.heightCm,
    age: body.age,
    gender: body.gender,
    activityLevel: body.activityLevel,
    goal: body.goal,
  });

  if (!profile) return c.json({ error: 'partner_not_found' }, 404);
  return c.json(profile);
}
