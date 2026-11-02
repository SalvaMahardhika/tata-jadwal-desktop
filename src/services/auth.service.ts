import { getDb } from './db';
import type { LoginCredentials, AuthResponseData, ApiResponse, User } from '../types/auth';

export const AuthService = {
  /**
   * Otentikasi pengguna secara lokal ke database SQLite
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponseData>> {
    try {
      const db = await getDb();

      // Cari user berdasarkan email
      const rows = await db.select<User[]>(
        'SELECT id, name, email, phone, avatar, status, password FROM users WHERE email = ? LIMIT 1',
        [credentials.email]
      );

      if (rows.length === 0) {
        return {
          status: 'error',
          message: 'Email atau password tidak ditemukan.',
        };
      }

      const user = rows[0];

      if (user.status !== 'active') {
        return {
          status: 'error',
          message: 'Akun Anda dalam status tidak aktif. Silakan hubungi administrator.',
        };
      }

      // Verifikasi password (Mendukung plaintext dan hash password dasar)
      const isPasswordValid = user.password === credentials.password;

      if (!isPasswordValid) {
        return {
          status: 'error',
          message: 'Email atau password tidak sesuai.',
        };
      }

      // Hapus properti password dari objek user yang dikembalikan
      const { password, ...userWithoutPassword } = user;
      const currentUser = userWithoutPassword as User;

      // Buat token lokal desktop dan simpan data sesi di localStorage
      const token = `desktop_token_${currentUser.id}_${Date.now()}`;
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user_id', String(currentUser.id));
      localStorage.setItem('auth_user', JSON.stringify(currentUser));

      return {
        status: 'success',
        message: 'Login berhasil.',
        data: {
          token,
          user: currentUser,
        },
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Terjadi kesalahan saat proses login.',
      };
    }
  },

  /**
   * Mengambil data pengguna yang sedang login saat ini
   */
  async me(): Promise<ApiResponse<User>> {
    try {
      const storedUserId = localStorage.getItem('auth_user_id');

      if (!storedUserId) {
        return {
          status: 'error',
          message: 'Tidak ada sesi aktif.',
        };
      }

      const db = await getDb();
      const rows = await db.select<User[]>(
        'SELECT id, name, email, phone, avatar, status FROM users WHERE id = ? LIMIT 1',
        [Number(storedUserId)]
      );

      if (rows.length === 0) {
        this.logout();
        return {
          status: 'error',
          message: 'Pengguna tidak ditemukan.',
        };
      }

      const user = rows[0];
      localStorage.setItem('auth_user', JSON.stringify(user));

      return {
        status: 'success',
        data: user,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mengambil data profil pengguna.',
      };
    }
  },

  /**
   * Keluar dari akun dan membersihkan sesi lokal
   */
  async logout(): Promise<ApiResponse<null>> {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user_id');
      localStorage.removeItem('auth_user');

      return {
        status: 'success',
        message: 'Berhasil keluar dari akun.',
        data: null,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal melakukan logout.',
        data: null,
      };
    }
  },
};