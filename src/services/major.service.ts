import { getDb } from './db';
import type { Major, MajorPayload, MajorFilter } from '../types/major';
import type { ApiResponse } from '../types/auth';

export const MajorService = {
  /**
   * Mengambil semua data jurusan dengan filter pencarian dan status
   */
  async getAll(params?: MajorFilter): Promise<ApiResponse<Major[]>> {
    try {
      const db = await getDb();
      let query = 'SELECT * FROM majors WHERE 1=1';
      const queryParams: any[] = [];

      if (params?.search) {
        query += ' AND major_name LIKE ?';
        queryParams.push(`%${params.search}%`);
      }

      if (params?.status) {
        query += ' AND status = ?';
        queryParams.push(params.status);
      }

      query += ' ORDER BY major_name ASC';

      const rows = await db.select<Major[]>(query, queryParams);

      return {
        status: 'success',
        data: rows,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mengambil data jurusan.',
      };
    }
  },

  /**
   * Mengambil detail jurusan berdasarkan ID
   */
  async getById(id: number): Promise<ApiResponse<Major>> {
    try {
      const db = await getDb();
      const rows = await db.select<Major[]>('SELECT * FROM majors WHERE id = ? LIMIT 1', [id]);

      if (rows.length === 0) {
        return {
          status: 'error',
          message: 'Data jurusan tidak ditemukan.',
        };
      }

      return {
        status: 'success',
        data: rows[0],
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mengambil detail jurusan.',
      };
    }
  },

  /**
   * Menambahkan jurusan baru
   */
  async create(payload: MajorPayload): Promise<ApiResponse<Major>> {
    try {
      const db = await getDb();
      const result = await db.execute(
        `INSERT INTO majors (major_name, status) VALUES (?, ?)`,
        [payload.major_name, payload.status ?? 'active']
      );

      return await this.getById(result.lastInsertId);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal menambahkan jurusan.',
      };
    }
  },

  /**
   * Memperbarui data jurusan
   */
  async update(id: number, payload: MajorPayload): Promise<ApiResponse<Major>> {
    try {
      const db = await getDb();
      await db.execute(
        `UPDATE majors 
         SET major_name = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [payload.major_name, payload.status ?? 'active', id]
      );

      return await this.getById(id);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal memperbarui data jurusan.',
      };
    }
  },

  /**
   * Menghapus jurusan berdasarkan ID
   */
  async delete(id: number): Promise<ApiResponse<null>> {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM majors WHERE id = ?', [id]);

      return {
        status: 'success',
        message: 'Jurusan berhasil dihapus.',
        data: null,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal menghapus jurusan.',
        data: null,
      };
    }
  },
};