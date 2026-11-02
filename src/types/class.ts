import type { AcademicYear } from './academicYear';
import type { Major } from './major';

export type ClassStatus = 'active' | 'inactive';

export interface GradeOption {
  id: number;
  grade_name: string;
  sequence?: number;
}

export interface TeacherOption {
  id: number;
  name: string;
  nip?: string | null;
}

export interface ClassItem {
  id: number;
  class_name: string;
  grade_id: number;
  major_id?: number | null;
  academic_year_id: number;
  homeroom_teacher_id?: number | null;
  time_slot_profile_id?: number | null;
  status: ClassStatus;
  created_at?: string;
  updated_at?: string;
  // Relasi
  grade?: GradeOption;
  major?: Major;
  academic_year?: AcademicYear;
  homeroom_teacher?: TeacherOption;
  time_slot_profile?: { id: number; name: string } | null;
}

export interface ClassPayload {
  class_name: string;
  grade_id: number | string;
  major_id?: number | string | null;
  academic_year_id: number | string;
  homeroom_teacher_id?: number | string | null;
  status?: ClassStatus;
}

export interface ClassFilter {
  search?: string;
  academic_year_id?: string | number;
  grade_id?: string | number;
  status?: string;
}