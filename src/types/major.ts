export type MajorStatus = 'active' | 'inactive';

export interface Major {
  id: number;
  major_name: string;
  status: MajorStatus;
  created_at?: string;
  updated_at?: string;
}

export interface MajorPayload {
  major_name: string;
  status?: MajorStatus;
}

export interface MajorFilter {
  search?: string;
  status?: string;
}