export type UserStatus = 'active' | 'inactive';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  status: UserStatus;
  created_at?: string;
  updated_at?: string;
}

export interface UserPayload {
  name: string;
  email: string;
  password?: string;
  phone?: string | null;
  avatar?: string | null;
  status?: UserStatus;
}

export interface UserFilter {
  search?: string;
  status?: string;
}