import { getDb } from './db';
import type { User, UserPayload, UserFilter } from '../types/user';
import type { ApiResponse } from '../types/auth';

export const UserService = {
  /**
   * Mengambil semua data pengguna dengan filter (pencarian nama/email/phone, status)
   */
  async getAll(params?: UserFilter): Promise<ApiResponse<User[]>> {
    try {
      const db = await getDb();
      let query = 'SELECT id, name, email, email_verified_at, phone, avatar, status, created_at, updated_at FROM users WHERE 1=1';
      const queryParams: any[] = [];

      if (params?.search) {
        query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
        queryParams.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
      }

      if (params?.status) {
        query += ' AND status = ?';
        queryParams.push(params.status);
      }

      query += ' ORDER BY id DESC';

      const rows = await db.select<User[]>(query, queryParams);

      return {
        status: 'success',
        data: rows,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mengambil data pengguna.',
      };
    }
  },

  /**
   * Mengambil detail pengguna berdasarkan ID
   */
  async getById(id: number): Promise<ApiResponse<User>> {
    try {
      const db = await getDb();
      const rows = await db.select<User[]>(
        'SELECT id, name, email, email_verified_at, phone, avatar, status, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
        [id]
      );

      if (rows.length === 0) {
        return {
          status: 'error',
          message: 'Pengguna tidak ditemukan.',
        };
      }

      return {
        status: 'success',
        data: rows[0],
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mengambil detail pengguna.',
      };
    }
  },

  /**
   * Menambahkan pengguna baru ke SQLite
   */
  async create(payload: UserPayload): Promise<ApiResponse<User>> {
    try {
      const db = await getDb();

      // Cek apakah email sudah terdaftar
      const existing = await db.select<any[]>('SELECT id FROM users WHERE email = ? LIMIT 1', [payload.email]);
      if (existing.length > 0) {
        return {
          status: 'error',
          message: 'Email sudah terdaftar.',
        };
      }

      const result = await db.execute(
        `INSERT INTO users (name, email, password, phone, avatar, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          payload.name,
          payload.email,
          payload.password || 'password123',
          payload.phone ?? null,
          payload.avatar ?? null,
          payload.status ?? 'active',
        ]
      );

      return await this.getById(result.lastInsertId);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal menambahkan pengguna baru.',
      };
    }
  },

  /**
   * Memperbarui data pengguna
   */
  async update(id: number, payload: UserPayload): Promise<ApiResponse<User>> {
    try {
      const db = await getDb();

      // Cek keunikan email jika email diubah
      if (payload.email) {
        const existing = await db.select<any[]>(
          'SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1',
          [payload.email, id]
        );
        if (existing.length > 0) {
          return {
            status: 'error',
            message: 'Email sudah digunakan oleh pengguna lain.',
          };
        }
      }

      // Perbarui dengan/tanpa perubahan password
      if (payload.password && payload.password.trim() !== '') {
        await db.execute(
          `UPDATE users 
           SET name = ?, email = ?, password = ?, phone = ?, avatar = ?, status = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            payload.name,
            payload.email,
            payload.password,
            payload.phone ?? null,
            payload.avatar ?? null,
            payload.status ?? 'active',
            id,
          ]
        );
      } else {
        await db.execute(
          `UPDATE users 
           SET name = ?, email = ?, phone = ?, avatar = ?, status = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            payload.name,
            payload.email,
            payload.phone ?? null,
            payload.avatar ?? null,
            payload.status ?? 'active',
            id,
          ]
        );
      }

      return await this.getById(id);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal memperbarui data pengguna.',
      };
    }
  },

  /**
   * Menghapus pengguna berdasarkan ID
   */
  async delete(id: number): Promise<ApiResponse<null>> {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM users WHERE id = ?', [id]);

      return {
        status: 'success',
        message: 'Pengguna berhasil dihapus.',
        data: null,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal menghapus pengguna.',
        data: null,
      };
    }
  },
};