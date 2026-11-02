export interface Teacher {
  id: number;
  nip: string | null;
  name: string;
  gender: 'L' | 'P';
  max_jp_per_week: number;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface TeacherPayload {
  nip?: string | null;
  name: string;
  gender: 'L' | 'P';
  max_jp_per_week: number;
  status?: 'active' | 'inactive';
}

export interface TeacherFilter {
  search?: string;
  status?: string;
}