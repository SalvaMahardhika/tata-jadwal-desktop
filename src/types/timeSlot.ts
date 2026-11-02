export type DayOfWeek = 'senin' | 'selasa' | 'rabu' | 'kamis' | 'jumat' | 'sabtu';

export interface TimeSlotProfile {
  id: number;
  academic_year_id: number;
  name: string;
  description?: string | null;
  is_default?: boolean;
  time_slots_count?: number;
  classes_count?: number;
  academic_year?: {
    id: number;
    name: string;
    semester?: string;
  };
  time_slots?: TimeSlot[];
  classes?: Array<{
    id: number;
    class_name: string;
    time_slot_profile_id?: number | null;
    grade?: { id: number; name: string };
    major?: { id: number; name: string };
    time_slot_profile?: { id: number; name: string } | null;
  }>;
  created_at?: string;
  updated_at?: string;
}

export interface TimeSlotProfilePayload {
  academic_year_id: number;
  name: string;
  description?: string | null;
  is_default?: boolean;
}

export interface AssignProfileToClassesPayload {
  class_ids: number[];
}

export interface DuplicateProfilePayload {
  target_academic_year_id: number;
  new_name?: string | null;
}

export interface TimeSlot {
  id: number;
  time_slot_profile_id: number;
  day: DayOfWeek;
  period_number: number;
  label?: string | null;
  start_time: string;
  end_time: string;
  is_break: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TimeSlotPayload {
  time_slot_profile_id?: number;
  day: DayOfWeek;
  period_number: number;
  label?: string | null;
  start_time: string;
  end_time: string;
  is_break: boolean;
}

export interface TimeSlotFilter {
  time_slot_profile_id?: number | null;
  day?: string;
  is_break?: string | boolean;
}

export interface BreakConfig {
  after_period: number;
  duration: number;
  label?: string;
}

export interface GenerateTimeSlotPayload {
  time_slot_profile_id?: number;
  start_time: string;
  period_duration: number;
  days: DayOfWeek[];
  periods_per_day: Record<string, number>;
  breaks: BreakConfig[];
  overwrite?: boolean;
}