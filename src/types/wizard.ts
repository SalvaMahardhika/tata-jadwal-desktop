import type { ClassItem, TeacherOption } from './class';
import type { Subject } from './subject';

export interface TimeSlot {
  id: number;
  time_slot_profile_id?: number;
  day: 'senin' | 'selasa' | 'rabu' | 'kamis' | 'jumat' | 'sabtu';
  period_number: number;
  label?: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ClassSubjectTeacherDetail {
  id: number;
  class_subject_id: number;
  teacher_id: number;
  jp?: number; // Jatah alokasi JP spesifik individu guru
  class_subject?: {
    id: number;
    class_id: number;
    subject_id: number;
    total_jp: number;
    max_jp_per_day: number;
    subject?: Subject;
  };
  teacher?: TeacherOption;
}

export interface ScheduleItem {
  id: number;
  academic_year_id: number;
  class_id: number;
  time_slot_id: number;
  class_subject_teacher_id: number | null;
  is_locked: boolean;
  custom_activity: string | null;
  status: 'draft' | 'published';
  created_by: number;
  class_subject_teacher?: ClassSubjectTeacherDetail | null;
  time_slot?: TimeSlot;
  class?: ClassItem;
}

export interface SubjectBalance {
  class_subject_id: number;
  subject_code: string;
  subject_name: string;
  color_code: string;
  teachers: string;
  target_jp: number;
  assigned_jp: number;
  remaining_jp: number;
  status: 'balanced' | 'under' | 'over';
}

export interface ClassMatrixData {
  class: ClassItem;
  time_slots: TimeSlot[];
  schedules: Record<number, ScheduleItem>; // Key by time_slot_id
  balance: SubjectBalance[];
}

export interface TeacherMatrixData {
  teacher: TeacherOption;
  time_slots: TimeSlot[];
  schedules: Record<number, ScheduleItem>; // Key by schedule id
  total_assigned_jp: number;
}

export interface MasterMatrixData {
  classes: ClassItem[];
  time_slots: TimeSlot[];
  matrix: Record<number, Record<number, ScheduleItem>>; // [class_id][time_slot_id]
}

export interface GenerateSchedulePayload {
  academic_year_id: number;
  class_id?: number | null;
  max_period_number?: number | null;
}

export interface LockSlotPayload {
  academic_year_id: number;
  class_id: number;
  time_slot_id: number;
  is_locked: boolean;
  custom_activity?: string | null;
  class_subject_teacher_id?: number | null;
}

export interface ManualAssignPayload {
  academic_year_id: number;
  class_id: number;
  time_slot_id: number;
  class_subject_teacher_id?: number | null;
  custom_activity?: string | null;
  is_locked?: boolean;
  apply_to_all_classes?: boolean;
}

export interface ClearSlotPayload {
  academic_year_id: number;
  class_id: number;
  time_slot_id: number;
  clear_all_classes?: boolean;
}

export interface ResetSchedulePayload {
  academic_year_id: number;
  class_id?: number | null;
}

export interface PublishSchedulePayload {
  academic_year_id: number;
  class_id?: number | null;
}

export interface UnpublishSchedulePayload {
  academic_year_id: number;
  class_id?: number | null;
}

export interface GenerateResult {
  success: boolean;
  unplaced_count: number;
  unplaced_details: Array<{
    class_id: number;
    class_name: string;
    class_subject_id: number;
    size?: number;
  }>;
}