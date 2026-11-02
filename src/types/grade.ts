export interface Grade {
  id: number;
  grade_name: string;
  sequence: number;
  created_at?: string;
  updated_at?: string;
}

export interface GradePayload {
  grade_name: string;
  sequence: number | string;
}