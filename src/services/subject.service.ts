import { getDb } from './db';
import type { Subject, SubjectPayload, SubjectFilter } from '../types/subject';
import type { ApiResponse } from '../types/auth';

export const SubjectService = {
  /**
   * Mengambil semua data mata pelajaran dengan filter (pencarian, kategori, status)
   */
  async getAll(params?: SubjectFilter): Promise<ApiResponse<Subject[]>> {
    try {
      const db = await getDb();
      let query = 'SELECT * FROM subjects WHERE 1=1';
      const queryParams: any[] = [];

      if (params?.search) {
        query += ' AND (subject_name LIKE ? OR subject_code LIKE ?)';
        queryParams.push(`%${params.search}%`, `%${params.search}%`);
      }

      if (params?.category) {
        query += ' AND category = ?';
        queryParams.push(params.category);
      }

      if (params?.status) {
        query += ' AND status = ?';
        queryParams.push(params.status);
      }

      query += ' ORDER BY subject_code ASC, subject_name ASC';

      const rows = await db.select<any[]>(query, queryParams);

      const data: Subject[] = rows.map((row) => ({
        ...row,
        is_joint_subject: Boolean(row.is_joint_subject),
      }));

      return {
        status: 'success',
        data,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mengambil data mata pelajaran.',
      };
    }
  },

  /**
   * Mengambil detail mata pelajaran berdasarkan ID
   */
  async getById(id: number): Promise<ApiResponse<Subject>> {
    try {
      const db = await getDb();
      const rows = await db.select<any[]>('SELECT * FROM subjects WHERE id = ? LIMIT 1', [id]);

      if (rows.length === 0) {
        return {
          status: 'error',
          message: 'Mata pelajaran tidak ditemukan.',
        };
      }

      const data: Subject = {
        ...rows[0],
        is_joint_subject: Boolean(rows[0].is_joint_subject),
      };

      return {
        status: 'success',
        data,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mengambil detail mata pelajaran.',
      };
    }
  },

  /**
   * Menambahkan mata pelajaran baru
   */
  async create(payload: SubjectPayload): Promise<ApiResponse<Subject>> {
    try {
      const db = await getDb();
      const isJointSubject = payload.is_joint_subject ? 1 : 0;

      const result = await db.execute(
        `INSERT INTO subjects (
          subject_code, subject_name, color_code, category, 
          passing_grade, status, is_joint_subject
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.subject_code,
          payload.subject_name,
          payload.color_code ?? '#3B82F6',
          payload.category ?? 'wajib',
          payload.passing_grade ?? 75,
          payload.status ?? 'active',
          isJointSubject,
        ]
      );

      return await this.getById(result.lastInsertId);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal menambahkan mata pelajaran.',
      };
    }
  },

  /**
   * Memperbarui data mata pelajaran
   */
  async update(id: number, payload: SubjectPayload): Promise<ApiResponse<Subject>> {
    try {
      const db = await getDb();
      const isJointSubject = payload.is_joint_subject ? 1 : 0;

      await db.execute(
        `UPDATE subjects 
         SET subject_code = ?, subject_name = ?, color_code = ?, category = ?, 
             passing_grade = ?, status = ?, is_joint_subject = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [
          payload.subject_code,
          payload.subject_name,
          payload.color_code ?? '#3B82F6',
          payload.category ?? 'wajib',
          payload.passing_grade ?? 75,
          payload.status ?? 'active',
          isJointSubject,
          id,
        ]
      );

      return await this.getById(id);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal memperbarui data mata pelajaran.',
      };
    }
  },

  /**
   * Menghapus mata pelajaran berdasarkan ID
   */
  async delete(id: number): Promise<ApiResponse<null>> {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM subjects WHERE id = ?', [id]);

      return {
        status: 'success',
        message: 'Mata pelajaran berhasil dihapus.',
        data: null,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal menghapus mata pelajaran.',
        data: null,
      };
    }
  },
};