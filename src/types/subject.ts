export interface Subject {
  id: number;
  subject_code: string;
  subject_name: string;
  color_code?: string | null;
  category?: string | null;
  passing_grade?: number | null;
  status: 'active' | 'inactive';
  is_joint_subject?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SubjectPayload {
  subject_code: string;
  subject_name: string;
  color_code?: string | null;
  category?: string | null;
  passing_grade?: number | null;
  status?: 'active' | 'inactive';
  is_joint_subject?: boolean;
}

export interface SubjectFilter {
  search?: string;
  category?: string;
  status?: string;
  is_joint_subject?: string;
}