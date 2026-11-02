import { getDb } from './db';
import type { AcademicYear, AcademicYearPayload } from '../types/academicYear';
import type { ApiResponse } from '../types/auth';

export const AcademicYearService = {
  /**
   * Mengambil semua data tahun ajaran (dengan opsi pencarian)
   */
  async getAll(search?: string): Promise<ApiResponse<AcademicYear[]>> {
    try {
      const db = await getDb();
      let query = 'SELECT * FROM academic_years';
      const params: any[] = [];

      if (search) {
        query += ' WHERE name LIKE ?';
        params.push(`%${search}%`);
      }

      query += ' ORDER BY id DESC';

      const rows = await db.select<any[]>(query, params);

      const data: AcademicYear[] = rows.map((row) => ({
        ...row,
        is_active: Boolean(row.is_active),
      }));

      return {
        status: 'success',
        data,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mengambil data tahun ajaran.',
      };
    }
  },

  /**
   * Mengambil detail tahun ajaran berdasarkan ID
   */
  async getById(id: number): Promise<ApiResponse<AcademicYear>> {
    try {
      const db = await getDb();
      const rows = await db.select<any[]>('SELECT * FROM academic_years WHERE id = ?', [id]);

      if (rows.length === 0) {
        return {
          status: 'error',
          message: 'Tahun ajaran tidak ditemukan.',
        };
      }

      const data: AcademicYear = {
        ...rows[0],
        is_active: Boolean(rows[0].is_active),
      };

      return {
        status: 'success',
        data,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mengambil detail tahun ajaran.',
      };
    }
  },

  /**
   * Menambahkan tahun ajaran baru
   */
  async create(payload: AcademicYearPayload): Promise<ApiResponse<AcademicYear>> {
    try {
      const db = await getDb();
      const isActive = payload.is_active ? 1 : 0;

      // Jika diset aktif, nonaktifkan tahun ajaran lainnya terlebih dahulu
      if (isActive === 1) {
        await db.execute('UPDATE academic_years SET is_active = 0');
      }

      const result = await db.execute(
        `INSERT INTO academic_years (name, semester, start_date, end_date, is_active) 
         VALUES (?, ?, ?, ?, ?)`,
        [payload.name, payload.semester, payload.start_date, payload.end_date, isActive]
      );

      return await this.getById(result.lastInsertId);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal menambahkan tahun ajaran.',
      };
    }
  },

  /**
   * Memperbarui data tahun ajaran
   */
  async update(id: number, payload: AcademicYearPayload): Promise<ApiResponse<AcademicYear>> {
    try {
      const db = await getDb();
      const isActive = payload.is_active ? 1 : 0;

      if (isActive === 1) {
        await db.execute('UPDATE academic_years SET is_active = 0 WHERE id != ?', [id]);
      }

      await db.execute(
        `UPDATE academic_years 
         SET name = ?, semester = ?, start_date = ?, end_date = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [payload.name, payload.semester, payload.start_date, payload.end_date, isActive, id]
      );

      return await this.getById(id);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal memperbarui tahun ajaran.',
      };
    }
  },

  /**
   * Menghapus tahun ajaran berdasarkan ID
   */
  async delete(id: number): Promise<ApiResponse<null>> {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM academic_years WHERE id = ?', [id]);

      return {
        status: 'success',
        message: 'Tahun ajaran berhasil dihapus.',
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal menghapus tahun ajaran.',
      };
    }
  },

  /**
   * Mengatur 1 tahun ajaran menjadi aktif (dan menonaktifkan yang lain)
   */
  async setActive(id: number): Promise<ApiResponse<AcademicYear>> {
    try {
      const db = await getDb();

      // Menonaktifkan semua tahun ajaran
      await db.execute('UPDATE academic_years SET is_active = 0');

      // Mengaktifkan tahun ajaran terpilih
      await db.execute(
        'UPDATE academic_years SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );

      return await this.getById(id);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mengaktifkan tahun ajaran.',
      };
    }
  },
};