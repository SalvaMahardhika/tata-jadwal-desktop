export type SemesterType = 'odd' | 'even';

export interface AcademicYear {
  id: number;
  name: string;
  semester: SemesterType;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AcademicYearPayload {
  name: string;
  semester: SemesterType;
  start_date: string;
  end_date: string;
  is_active?: boolean;
}