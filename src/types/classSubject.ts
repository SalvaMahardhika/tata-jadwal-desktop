import type { ClassItem } from './class';
import type { Subject } from './subject';
import type { TeacherOption } from './class';

export interface ClassSubjectTeacher {
  id: number;
  class_subject_id: number;
  teacher_id: number;
  jp: number;
  teacher?: TeacherOption;
}

export interface TeacherAssignmentInput {
  teacher_id: number;
  jp: number;
}

export interface ClassSubject {
  id: number;
  class_id: number;
  subject_id: number;
  total_jp: number;
  max_jp_per_day: number;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
  subject?: Subject;
  class_subject_teachers?: ClassSubjectTeacher[];
}

export interface ClassSubjectGroupData {
  class: ClassItem;
  subjects: ClassSubject[];
}

export interface AssignClassSubjectPayload {
  subject_id: number | string;
  total_jp: number | string;
  max_jp_per_day: number | string;
  teachers: TeacherAssignmentInput[];
}

export interface UpdateClassSubjectPayload {
  total_jp: number | string;
  max_jp_per_day: number | string;
  teachers: TeacherAssignmentInput[];
}