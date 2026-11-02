import { getDb } from './db';
import type { Grade, GradePayload } from '../types/grade';
import type { ApiResponse } from '../types/auth';

export const GradeService = {
  /**
   * Mengambil semua data tingkat/jenjang (grades) dengan opsi pencarian, diurutkan berdasarkan sequence
   */
  async getAll(search?: string): Promise<ApiResponse<Grade[]>> {
    try {
      const db = await getDb();
      let query = 'SELECT * FROM grades';
      const params: any[] = [];

      if (search) {
        query += ' WHERE grade_name LIKE ?';
        params.push(`%${search}%`);
      }

      query += ' ORDER BY sequence ASC, id ASC';

      const rows = await db.select<Grade[]>(query, params);

      return {
        status: 'success',
        data: rows,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mengambil data tingkat/jenjang.',
      };
    }
  },

  /**
   * Mengambil detail tingkat berdasarkan ID
   */
  async getById(id: number): Promise<ApiResponse<Grade>> {
    try {
      const db = await getDb();
      const rows = await db.select<Grade[]>('SELECT * FROM grades WHERE id = ? LIMIT 1', [id]);

      if (rows.length === 0) {
        return {
          status: 'error',
          message: 'Tingkat/jenjang tidak ditemukan.',
        };
      }

      return {
        status: 'success',
        data: rows[0],
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mengambil detail tingkat/jenjang.',
      };
    }
  },

  /**
   * Menambahkan tingkat/jenjang baru
   */
  async create(payload: GradePayload): Promise<ApiResponse<Grade>> {
    try {
      const db = await getDb();
      const result = await db.execute(
        `INSERT INTO grades (grade_name, sequence) VALUES (?, ?)`,
        [payload.grade_name, payload.sequence]
      );

      return await this.getById(result.lastInsertId);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal menambahkan tingkat/jenjang.',
      };
    }
  },

  /**
   * Memperbarui data tingkat/jenjang
   */
  async update(id: number, payload: GradePayload): Promise<ApiResponse<Grade>> {
    try {
      const db = await getDb();
      await db.execute(
        `UPDATE grades 
         SET grade_name = ?, sequence = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [payload.grade_name, payload.sequence, id]
      );

      return await this.getById(id);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal memperbarui tingkat/jenjang.',
      };
    }
  },

  /**
   * Menghapus tingkat/jenjang berdasarkan ID
   */
  async delete(id: number): Promise<ApiResponse<null>> {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM grades WHERE id = ?', [id]);

      return {
        status: 'success',
        message: 'Tingkat/jenjang berhasil dihapus.',
        data: null,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal menghapus tingkat/jenjang.',
        data: null,
      };
    }
  },
};