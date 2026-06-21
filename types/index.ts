export type Stage = 'ttc' | 'pregnant' | 'postpartum';
export type BabyGender = 'male' | 'female' | 'unknown';
export type Priority = 'low' | 'medium' | 'high';
export type UserRole = 'mother' | 'partner';
export type BabyLogType = 'feeding' | 'sleep' | 'diaper' | 'handoff';

export interface Household {
  id: string;
  invite_code: string;
  due_date: string | null;
  stage: Stage;
  baby_name: string | null;
  baby_gender: BabyGender | null;
  baby_dob: string | null;
  created_at: string;
}

export interface AppUser {
  id: string;
  household_id: string;
  role: UserRole;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface HealthLog {
  id: string;
  household_id: string;
  user_id: string;
  logged_at: string;
  symptoms: string[] | null;
  mood: string | null;
  energy_level: number | null;
  notes: string | null;
  weight_kg: number | null;
}

export interface Todo {
  id: string;
  household_id: string;
  created_by: string;
  title: string;
  is_done: boolean;
  due_date: string | null;
  priority: Priority;
  source: 'manual' | 'ai';
  created_at: string;
}

export interface Appointment {
  id: string;
  household_id: string;
  created_by?: string | null;
  title: string;
  appointment_date: string;
  location: string | null;
  notes: string | null;
  google_event_id: string | null;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  household_id: string;
  author_id: string;
  week_number: number;
  content: string;
  milestone_tag: string | null;
  media_urls: string[] | null;
  created_at: string;
}

export interface BabyLog {
  id: string;
  household_id: string;
  user_id: string;
  log_type: BabyLogType;
  logged_at: string;
  details: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
}

export interface KickSession {
  id: string;
  household_id: string;
  started_at: string;
  ended_at: string | null;
  kick_count: number;
  duration_secs: number | null;
  notes: string | null;
}

export interface ContractionSession {
  id: string;
  household_id: string;
  started_at: string;
  contractions: object[];
  notes: string | null;
}
