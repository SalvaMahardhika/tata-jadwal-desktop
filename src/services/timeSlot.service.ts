import { getDb } from './db';
import type { TimeSlot, TimeSlotPayload, TimeSlotFilter, GenerateTimeSlotPayload } from '../types/timeSlot';
import type { ApiResponse } from '../types/auth';

/**
 * Helper internal untuk menambah menit ke string jam HH:mm
 */
function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  date.setMinutes(date.getMinutes() + minutesToAdd);

  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export const TimeSlotService = {
  /**
   * Mengambil semua data slot waktu dengan filter (profil, hari, status istirahat)
   */
  async getAll(params?: TimeSlotFilter): Promise<ApiResponse<TimeSlot[]>> {
    try {
      const db = await getDb();
      let query = 'SELECT * FROM time_slots WHERE 1=1';
      const queryParams: any[] = [];

      if (params?.time_slot_profile_id) {
        query += ' AND time_slot_profile_id = ?';
        queryParams.push(params.time_slot_profile_id);
      }

      if (params?.day) {
        query += ' AND day = ?';
        queryParams.push(params.day);
      }

      if (params?.is_break !== undefined && params?.is_break !== null && params?.is_break !== (' ' as any)) {
        query += ' AND is_break = ?';
        queryParams.push(params.is_break ? 1 : 0);
      }

      query += ` ORDER BY 
        CASE day 
          WHEN 'senin' THEN 1 
          WHEN 'selasa' THEN 2 
          WHEN 'rabu' THEN 3 
          WHEN 'kamis' THEN 4 
          WHEN 'jumat' THEN 5 
          WHEN 'sabtu' THEN 6 
        END, period_number ASC`;

      const rows = await db.select<any[]>(query, queryParams);

      const data: TimeSlot[] = rows.map((row) => ({
        ...row,
        is_break: Boolean(row.is_break),
      }));

      return {
        status: 'success',
        data,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mengambil data slot waktu.',
      };
    }
  },

  /**
   * Mengambil detail slot waktu berdasarkan ID
   */
  async getById(id: number): Promise<ApiResponse<TimeSlot>> {
    try {
      const db = await getDb();
      const rows = await db.select<any[]>('SELECT * FROM time_slots WHERE id = ? LIMIT 1', [id]);

      if (rows.length === 0) {
        return {
          status: 'error',
          message: 'Slot waktu tidak ditemukan.',
        };
      }

      const data: TimeSlot = {
        ...rows[0],
        is_break: Boolean(rows[0].is_break),
      };

      return {
        status: 'success',
        data,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mengambil detail slot waktu.',
      };
    }
  },

  /**
   * Menambahkan slot waktu baru
   */
  async create(payload: TimeSlotPayload): Promise<ApiResponse<TimeSlot>> {
    try {
      const db = await getDb();
      const isBreak = payload.is_break ? 1 : 0;

      const result = await db.execute(
        `INSERT INTO time_slots (
          time_slot_profile_id, day, period_number, label, start_time, end_time, is_break
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.time_slot_profile_id,
          payload.day,
          payload.period_number,
          payload.label ?? null,
          payload.start_time,
          payload.end_time,
          isBreak,
        ]
      );

      return await this.getById(result.lastInsertId);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal menambahkan slot waktu.',
      };
    }
  },

  /**
   * Memperbarui data slot waktu
   */
  async update(id: number, payload: TimeSlotPayload): Promise<ApiResponse<TimeSlot>> {
    try {
      const db = await getDb();
      const isBreak = payload.is_break ? 1 : 0;

      await db.execute(
        `UPDATE time_slots 
         SET time_slot_profile_id = ?, day = ?, period_number = ?, label = ?, 
             start_time = ?, end_time = ?, is_break = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [
          payload.time_slot_profile_id,
          payload.day,
          payload.period_number,
          payload.label ?? null,
          payload.start_time,
          payload.end_time,
          isBreak,
          id,
        ]
      );

      return await this.getById(id);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal memperbarui slot waktu.',
      };
    }
  },

  /**
   * Menghapus slot waktu berdasarkan ID
   */
  async delete(id: number): Promise<ApiResponse<null>> {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM time_slots WHERE id = ?', [id]);

      return {
        status: 'success',
        message: 'Slot waktu berhasil dihapus.',
        data: null,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal menghapus slot waktu.',
        data: null,
      };
    }
  },

  /**
   * Menghapus seluruh slot waktu pada hari tertentu untuk profil tertentu
   */
  async deleteByDay(day: string, profileId?: number | null): Promise<ApiResponse<null>> {
    try {
      const db = await getDb();
      let query = 'DELETE FROM time_slots WHERE day = ?';
      const params: any[] = [day];

      if (profileId) {
        query += ' AND time_slot_profile_id = ?';
        params.push(profileId);
      }

      await db.execute(query, params);

      return {
        status: 'success',
        message: `Seluruh slot waktu untuk hari ${day} berhasil dihapus.`,
        data: null,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal menghapus slot waktu berdasarkan hari.',
        data: null,
      };
    }
  },

  /**
   * Auto-generate susunan slot waktu berdasarkan skema konfigurasi secara lokal
   */
  async generate(payload: GenerateTimeSlotPayload): Promise<ApiResponse<TimeSlot[]>> {
    try {
      const db = await getDb();
      const profileId = (payload as any).time_slot_profile_id;
      const days: string[] = (payload as any).days || ['senin', 'selasa', 'rabu', 'kamis', 'jumat'];
      const startTime = (payload as any).start_time || '07:00';
      const durationPerPeriod = (payload as any).duration_per_period || 45;
      const totalPeriods = (payload as any).total_periods || 8;
      const breaks: Array<{ period_after: number; duration: number; label?: string }> = (payload as any).breaks || [];

      // Jika diberikan array daftar slot buatan siap pakai (manual array)
      const customSlots: TimeSlotPayload[] = (payload as any).slots || [];

      if (!profileId) {
        return {
          status: 'error',
          message: 'Profil slot waktu (time_slot_profile_id) wajib ditentukan.',
        };
      }

      // 1. Bersihkan slot waktu lama pada hari-hari yang dispesifikasikan
      for (const day of days) {
        await db.execute('DELETE FROM time_slots WHERE time_slot_profile_id = ? AND day = ?', [profileId, day]);
      }

      // 2. Generate slot baru
      if (customSlots.length > 0) {
        for (const slot of customSlots) {
          await db.execute(
            `INSERT INTO time_slots (
              time_slot_profile_id, day, period_number, label, start_time, end_time, is_break
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              profileId,
              slot.day,
              slot.period_number,
              slot.label ?? null,
              slot.start_time,
              slot.end_time,
              slot.is_break ? 1 : 0,
            ]
          );
        }
      } else {
        // Kalkulasi otomatis berdasarkan rentang jam dan durasi
        for (const day of days) {
          let currentStart = startTime;
          let currentPeriod = 1;

          for (let i = 1; i <= totalPeriods; i++) {
            const currentEnd = addMinutesToTime(currentStart, durationPerPeriod);
            const label = `Jam ke-${currentPeriod} (${currentStart} - ${currentEnd})`;

            await db.execute(
              `INSERT INTO time_slots (
                time_slot_profile_id, day, period_number, label, start_time, end_time, is_break
              ) VALUES (?, ?, ?, ?, ?, ?, 0)`,
              [profileId, day, currentPeriod, label, currentStart, currentEnd]
            );

            currentStart = currentEnd;
            currentPeriod++;

            // Cek apakah jam ke-i diikuti istirahat
            const breakConfig = breaks.find((b) => b.period_after === i);
            if (breakConfig) {
              const breakEnd = addMinutesToTime(currentStart, breakConfig.duration);
              const breakLabel = breakConfig.label || `Istirahat (${currentStart} - ${breakEnd})`;

              await db.execute(
                `INSERT INTO time_slots (
                  time_slot_profile_id, day, period_number, label, start_time, end_time, is_break
                ) VALUES (?, ?, ?, ?, ?, ?, 1)`,
                [profileId, day, currentPeriod, breakLabel, currentStart, breakEnd]
              );

              currentStart = breakEnd;
              currentPeriod++;
            }
          }
        }
      }

      return await this.getAll({ time_slot_profile_id: profileId });
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal melakukan auto-generate slot waktu.',
      };
    }
  },
};