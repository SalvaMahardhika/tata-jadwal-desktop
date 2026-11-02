import { getDb } from './db';
import type { ClassItem, ClassPayload, ClassFilter } from '../types/class';
import type { ApiResponse } from '../types/auth';

export const ClassService = {
  /**
   * Mengambil semua data kelas dengan filter (pencarian, tahun ajaran, tingkat, status)
   */
  async getAll(params?: ClassFilter): Promise<ApiResponse<ClassItem[]>> {
    try {
      const db = await getDb();
      let query = `
        SELECT 
          c.*,
          g.grade_name,
          g.sequence as grade_sequence,
          m.major_name,
          ay.name as academic_year_name,
          ay.semester as academic_year_semester,
          t.name as homeroom_teacher_name,
          tsp.name as time_slot_profile_name
        FROM classes c
        LEFT JOIN grades g ON c.grade_id = g.id
        LEFT JOIN majors m ON c.major_id = m.id
        LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
        LEFT JOIN teachers t ON c.homeroom_teacher_id = t.id
        LEFT JOIN time_slot_profiles tsp ON c.time_slot_profile_id = tsp.id
        WHERE 1=1
      `;
      const queryParams: any[] = [];

      if (params?.search) {
        query += ` AND c.class_name LIKE ?`;
        queryParams.push(`%${params.search}%`);
      }

      if (params?.academic_year_id) {
        query += ` AND c.academic_year_id = ?`;
        queryParams.push(params.academic_year_id);
      }

      if (params?.grade_id) {
        query += ` AND c.grade_id = ?`;
        queryParams.push(params.grade_id);
      }

      if (params?.status) {
        query += ` AND c.status = ?`;
        queryParams.push(params.status);
      }

      query += ` ORDER BY g.sequence ASC, c.class_name ASC`;

      const rows = await db.select<any[]>(query, queryParams);

      const data: ClassItem[] = rows.map((row) => ({
        id: row.id,
        class_name: row.class_name,
        grade_id: row.grade_id,
        major_id: row.major_id,
        academic_year_id: row.academic_year_id,
        time_slot_profile_id: row.time_slot_profile_id,
        homeroom_teacher_id: row.homeroom_teacher_id,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        grade: row.grade_name ? { id: row.grade_id, grade_name: row.grade_name, sequence: row.grade_sequence } : undefined,
        major: row.major_name ? { id: row.major_id, major_name: row.major_name, status: 'active' } : undefined,
        academic_year: row.academic_year_name ? { id: row.academic_year_id, name: row.academic_year_name, semester: row.academic_year_semester } : undefined,
        homeroom_teacher: row.homeroom_teacher_name ? { id: row.homeroom_teacher_id, name: row.homeroom_teacher_name } : undefined,
        time_slot_profile: row.time_slot_profile_name ? { id: row.time_slot_profile_id, name: row.time_slot_profile_name } : undefined,
      }));

      return {
        status: 'success',
        data,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mengambil data kelas.',
      };
    }
  },

  /**
   * Mengambil detail kelas berdasarkan ID
   */
  async getById(id: number): Promise<ApiResponse<ClassItem>> {
    try {
      const db = await getDb();
      const rows = await db.select<any[]>(`
        SELECT 
          c.*,
          g.grade_name,
          g.sequence as grade_sequence,
          m.major_name,
          ay.name as academic_year_name,
          ay.semester as academic_year_semester,
          t.name as homeroom_teacher_name,
          tsp.name as time_slot_profile_name
        FROM classes c
        LEFT JOIN grades g ON c.grade_id = g.id
        LEFT JOIN majors m ON c.major_id = m.id
        LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
        LEFT JOIN teachers t ON c.homeroom_teacher_id = t.id
        LEFT JOIN time_slot_profiles tsp ON c.time_slot_profile_id = tsp.id
        WHERE c.id = ?
        LIMIT 1
      `, [id]);

      if (rows.length === 0) {
        return {
          status: 'error',
          message: 'Data kelas tidak ditemukan.',
        };
      }

      const row = rows[0];
      const data: ClassItem = {
        id: row.id,
        class_name: row.class_name,
        grade_id: row.grade_id,
        major_id: row.major_id,
        academic_year_id: row.academic_year_id,
        time_slot_profile_id: row.time_slot_profile_id,
        homeroom_teacher_id: row.homeroom_teacher_id,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        grade: row.grade_name ? { id: row.grade_id, grade_name: row.grade_name, sequence: row.grade_sequence } : undefined,
        major: row.major_name ? { id: row.major_id, major_name: row.major_name, status: 'active' } : undefined,
        academic_year: row.academic_year_name ? { id: row.academic_year_id, name: row.academic_year_name, semester: row.academic_year_semester } : undefined,
        homeroom_teacher: row.homeroom_teacher_name ? { id: row.homeroom_teacher_id, name: row.homeroom_teacher_name } : undefined,
        time_slot_profile: row.time_slot_profile_name ? { id: row.time_slot_profile_id, name: row.time_slot_profile_name } : undefined,
      };

      return {
        status: 'success',
        data,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mengambil detail kelas.',
      };
    }
  },

  /**
   * Menambahkan kelas baru
   */
  async create(payload: ClassPayload): Promise<ApiResponse<ClassItem>> {
    try {
      const db = await getDb();
      const result = await db.execute(
        `INSERT INTO classes (
          class_name, grade_id, major_id, academic_year_id, 
          time_slot_profile_id, homeroom_teacher_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.class_name,
          payload.grade_id,
          payload.major_id ?? null,
          payload.academic_year_id,
          payload.time_slot_profile_id ?? null,
          payload.homeroom_teacher_id ?? null,
          payload.status ?? 'active',
        ]
      );

      return await this.getById(result.lastInsertId);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal menambahkan kelas baru.',
      };
    }
  },

  /**
   * Memperbarui data kelas
   */
  async update(id: number, payload: ClassPayload): Promise<ApiResponse<ClassItem>> {
    try {
      const db = await getDb();
      await db.execute(
        `UPDATE classes 
         SET class_name = ?, grade_id = ?, major_id = ?, academic_year_id = ?,
             time_slot_profile_id = ?, homeroom_teacher_id = ?, status = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          payload.class_name,
          payload.grade_id,
          payload.major_id ?? null,
          payload.academic_year_id,
          payload.time_slot_profile_id ?? null,
          payload.homeroom_teacher_id ?? null,
          payload.status ?? 'active',
          id,
        ]
      );

      return await this.getById(id);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal memperbarui data kelas.',
      };
    }
  },

  /**
   * Menghapus kelas berdasarkan ID
   */
  async delete(id: number): Promise<ApiResponse<null>> {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM classes WHERE id = ?', [id]);

      return {
        status: 'success',
        message: 'Kelas berhasil dihapus.',
        data: null,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal menghapus kelas.',
        data: null,
      };
    }
  },
};