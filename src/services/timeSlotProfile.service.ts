import { getDb } from './db';
import type {
  TimeSlotProfilePayload,
  AssignProfileToClassesPayload,
  DuplicateProfilePayload,
} from '../types/timeSlot';
import type { ApiResponse } from '../types/auth';

export const timeSlotProfileService = {
  /**
   * Mengambil semua profil slot waktu (bisa difilter berdasarkan tahun ajaran)
   */
  async getAll(academicYearId?: number): Promise<ApiResponse<any[]>> {
    try {
      const db = await getDb();
      let query = `
        SELECT 
          tsp.*,
          ay.name as academic_year_name,
          (SELECT COUNT(*) FROM time_slots WHERE time_slot_profile_id = tsp.id) as time_slots_count,
          (SELECT COUNT(*) FROM classes WHERE time_slot_profile_id = tsp.id) as classes_count
        FROM time_slot_profiles tsp
        LEFT JOIN academic_years ay ON tsp.academic_year_id = ay.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (academicYearId) {
        query += ' AND tsp.academic_year_id = ?';
        params.push(academicYearId);
      }

      query += ' ORDER BY tsp.is_default DESC, tsp.name ASC';

      const rows = await db.select<any[]>(query, params);

      const data = rows.map((row) => ({
        ...row,
        is_default: Boolean(row.is_default),
        time_slots_count: Number(row.time_slots_count || 0),
        classes_count: Number(row.classes_count || 0),
      }));

      return {
        status: 'success',
        data,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mengambil data profil slot waktu.',
      };
    }
  },

  /**
   * Mengambil detail profil slot waktu beserta slot dan kelas yang terhubung
   */
  async getById(id: number): Promise<ApiResponse<any>> {
    try {
      const db = await getDb();

      const profileRows = await db.select<any[]>(`
        SELECT 
          tsp.*,
          ay.name as academic_year_name
        FROM time_slot_profiles tsp
        LEFT JOIN academic_years ay ON tsp.academic_year_id = ay.id
        WHERE tsp.id = ?
        LIMIT 1
      `, [id]);

      if (profileRows.length === 0) {
        return {
          status: 'error',
          message: 'Profil slot waktu tidak ditemukan.',
        };
      }

      const profile = {
        ...profileRows[0],
        is_default: Boolean(profileRows[0].is_default),
      };

      // Ambil slot waktu milik profil ini
      const timeSlots = await db.select<any[]>(`
        SELECT * FROM time_slots 
        WHERE time_slot_profile_id = ?
        ORDER BY 
          CASE day 
            WHEN 'senin' THEN 1 
            WHEN 'selasa' THEN 2 
            WHEN 'rabu' THEN 3 
            WHEN 'kamis' THEN 4 
            WHEN 'jumat' THEN 5 
            WHEN 'sabtu' THEN 6 
          END, period_number ASC
      `, [id]);

      // Ambil daftar kelas yang menggunakan profil ini
      const assignedClasses = await db.select<any[]>(`
        SELECT id, class_name, grade_id, major_id, status 
        FROM classes 
        WHERE time_slot_profile_id = ?
        ORDER BY class_name ASC
      `, [id]);

      return {
        status: 'success',
        data: {
          ...profile,
          time_slots: timeSlots.map((ts) => ({ ...ts, is_break: Boolean(ts.is_break) })),
          classes: assignedClasses,
        },
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mengambil detail profil slot waktu.',
      };
    }
  },

  /**
   * Menambahkan profil slot waktu baru
   */
  async create(payload: TimeSlotProfilePayload): Promise<ApiResponse<any>> {
    try {
      const db = await getDb();
      const isDefault = payload.is_default ? 1 : 0;

      // Jika diset sebagai default, reset status default profil lain pada tahun ajaran yang sama
      if (isDefault === 1) {
        await db.execute(
          'UPDATE time_slot_profiles SET is_default = 0 WHERE academic_year_id = ?',
          [payload.academic_year_id]
        );
      }

      const result = await db.execute(
        `INSERT INTO time_slot_profiles (academic_year_id, name, description, is_default)
         VALUES (?, ?, ?, ?)`,
        [payload.academic_year_id, payload.name, payload.description ?? null, isDefault]
      );

      return await this.getById(result.lastInsertId);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal membuat profil slot waktu.',
      };
    }
  },

  /**
   * Memperbarui profil slot waktu
   */
  async update(id: number, payload: TimeSlotProfilePayload): Promise<ApiResponse<any>> {
    try {
      const db = await getDb();
      const isDefault = payload.is_default ? 1 : 0;

      if (isDefault === 1) {
        await db.execute(
          'UPDATE time_slot_profiles SET is_default = 0 WHERE academic_year_id = ? AND id != ?',
          [payload.academic_year_id, id]
        );
      }

      await db.execute(
        `UPDATE time_slot_profiles 
         SET academic_year_id = ?, name = ?, description = ?, is_default = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [payload.academic_year_id, payload.name, payload.description ?? null, isDefault, id]
      );

      return await this.getById(id);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal memperbarui profil slot waktu.',
      };
    }
  },

  /**
   * Menghapus profil slot waktu
   */
  async delete(id: number): Promise<ApiResponse<null>> {
    try {
      const db = await getDb();

      // Lepaskan referensi profil dari tabel classes
      await db.execute('UPDATE classes SET time_slot_profile_id = NULL WHERE time_slot_profile_id = ?', [id]);

      // Hapus slot waktu dan profil
      await db.execute('DELETE FROM time_slots WHERE time_slot_profile_id = ?', [id]);
      await db.execute('DELETE FROM time_slot_profiles WHERE id = ?', [id]);

      return {
        status: 'success',
        message: 'Profil slot waktu berhasil dihapus.',
        data: null,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal menghapus profil slot waktu.',
        data: null,
      };
    }
  },

  /**
   * Menghubungkan profil slot waktu ke beberapa kelas
   */
  async assignToClasses(profileId: number, payload: AssignProfileToClassesPayload): Promise<ApiResponse<any>> {
    try {
      const db = await getDb();
      const classIds = payload.class_ids || (payload as any).classes || [];

      // Lepas penugasan lama untuk kelas yang sebelumnya terhubung jika perlu
      if ((payload as any).replace_all) {
        await db.execute('UPDATE classes SET time_slot_profile_id = NULL WHERE time_slot_profile_id = ?', [profileId]);
      }

      // Tetapkan profil ke kelas terpilih
      if (classIds.length > 0) {
        const placeholders = classIds.map(() => '?').join(',');
        await db.execute(
          `UPDATE classes SET time_slot_profile_id = ? WHERE id IN (${placeholders})`,
          [profileId, ...classIds]
        );
      }

      return await this.getById(profileId);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal menerapkan profil slot waktu ke kelas.',
      };
    }
  },

  /**
   * Menggandakan (duplicate) profil slot waktu beserta seluruh struktur slot waktunya
   */
  async duplicate(profileId: number, payload: DuplicateProfilePayload): Promise<ApiResponse<any>> {
    try {
      const db = await getDb();

      // 1. Ambil profil sumber
      const sourceProfile = await db.select<any[]>(
        'SELECT * FROM time_slot_profiles WHERE id = ? LIMIT 1',
        [profileId]
      );

      if (sourceProfile.length === 0) {
        return {
          status: 'error',
          message: 'Profil sumber tidak ditemukan.',
        };
      }

      const src = sourceProfile[0];
      const newName = payload.name || `${src.name} (Salinan)`;
      const targetAyId = payload.academic_year_id || src.academic_year_id;

      // 2. Buat profil baru
      const insertResult = await db.execute(
        `INSERT INTO time_slot_profiles (academic_year_id, name, description, is_default)
         VALUES (?, ?, ?, 0)`,
        [targetAyId, newName, src.description ? `${src.description} (Salinan)` : null]
      );

      const newProfileId = insertResult.lastInsertId;

      // 3. Salin seluruh slot waktu dari profil sumber
      const sourceSlots = await db.select<any[]>(
        'SELECT * FROM time_slots WHERE time_slot_profile_id = ?',
        [profileId]
      );

      for (const slot of sourceSlots) {
        await db.execute(
          `INSERT INTO time_slots (
            time_slot_profile_id, day, period_number, label, start_time, end_time, is_break
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            newProfileId,
            slot.day,
            slot.period_number,
            slot.label,
            slot.start_time,
            slot.end_time,
            slot.is_break,
          ]
        );
      }

      return await this.getById(newProfileId);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal menggandakan profil slot waktu.',
      };
    }
  },
};