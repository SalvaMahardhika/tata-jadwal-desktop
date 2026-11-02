import { getDb } from './db';
import type { 
  ClassMatrixData, 
  TeacherMatrixData, 
  MasterMatrixData, 
  SubjectBalance,
  GenerateSchedulePayload,
  LockSlotPayload,
  ManualAssignPayload,
  ClearSlotPayload,
  ResetSchedulePayload,
  PublishSchedulePayload,
  UnpublishSchedulePayload,
  ScheduleItem,
  GenerateResult,
  TimeSlot
} from '../types/wizard';
import type { ApiResponse } from '../types/auth';

/**
 * Helper internal untuk menghitung sisa beban JP (Balance) mata pelajaran per kelas
 */
async function calculateClassBalance(classId: number, academicYearId?: number): Promise<SubjectBalance[]> {
  const db = await getDb();

  const csRows = await db.select<any[]>(`
    SELECT 
      cs.id as class_subject_id,
      cs.subject_id,
      cs.total_jp as target_jp,
      s.subject_name,
      s.subject_code,
      s.color_code
    FROM class_subjects cs
    JOIN subjects s ON cs.subject_id = s.id
    WHERE cs.class_id = ? AND cs.status = 'active'
  `, [classId]);

  const result: SubjectBalance[] = [];

  for (const cs of csRows) {
    // Hitung berapa JP yang sudah terisi di tabel schedules
    let countQuery = `
      SELECT COUNT(*) as count 
      FROM schedules sch
      JOIN class_subject_teachers cst ON sch.class_subject_teacher_id = cst.id
      WHERE sch.class_id = ? AND cst.class_subject_id = ?
    `;
    const countParams: any[] = [classId, cs.class_subject_id];

    if (academicYearId) {
      countQuery += ' AND sch.academic_year_id = ?';
      countParams.push(academicYearId);
    }

    const assignedRows = await db.select<{ count: number }[]>(countQuery, countParams);
    const assignedJp = Number(assignedRows[0]?.count || 0);
    const targetJp = Number(cs.target_jp || 0);

    result.push({
      class_subject_id: cs.class_subject_id,
      subject_id: cs.subject_id,
      subject_name: cs.subject_name,
      subject_code: cs.subject_code,
      color_code: cs.color_code,
      target_jp: targetJp,
      assigned_jp: assignedJp,
      remaining_jp: Math.max(0, targetJp - assignedJp),
    } as any);
  }

  return result;
}

export const WizardService = {
  /**
   * 1. Mengambil Matriks Jadwal per Kelas
   */
  async getClassMatrix(classId: number, academicYearId?: number): Promise<ApiResponse<ClassMatrixData>> {
    try {
      const db = await getDb();

      // Ambil detail kelas
      const classRows = await db.select<any[]>(`
        SELECT c.*, g.grade_name, m.major_name, ay.name as academic_year_name
        FROM classes c
        LEFT JOIN grades g ON c.grade_id = g.id
        LEFT JOIN majors m ON c.major_id = m.id
        LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
        WHERE c.id = ?
        LIMIT 1
      `, [classId]);

      if (classRows.length === 0) {
        return { status: 'error', message: 'Kelas tidak ditemukan.' };
      }

      const classData = classRows[0];
      const activeAyId = academicYearId || classData.academic_year_id;

      // Ambil slot waktu berdasarkan profil kelas
      const profileId = classData.time_slot_profile_id || 1;
      const timeSlots = await db.select<TimeSlot[]>(`
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
      `, [profileId]);

      // Ambil data jadwal kelas
      const scheduleRows = await db.select<any[]>(`
        SELECT 
          s.*,
          cst.teacher_id,
          t.name as teacher_name,
          cs.subject_id,
          sub.subject_name,
          sub.subject_code,
          sub.color_code
        FROM schedules s
        LEFT JOIN class_subject_teachers cst ON s.class_subject_teacher_id = cst.id
        LEFT JOIN teachers t ON cst.teacher_id = t.id
        LEFT JOIN class_subjects cs ON cst.class_subject_id = cs.id
        LEFT JOIN subjects sub ON cs.subject_id = sub.id
        WHERE s.class_id = ? AND s.academic_year_id = ?
      `, [classId, activeAyId]);

      const schedulesMap: Record<number, ScheduleItem> = {};
      scheduleRows.forEach((row) => {
        schedulesMap[row.time_slot_id] = {
          id: row.id,
          academic_year_id: row.academic_year_id,
          class_id: row.class_id,
          time_slot_id: row.time_slot_id,
          class_subject_teacher_id: row.class_subject_teacher_id,
          is_locked: Boolean(row.is_locked),
          custom_activity: row.custom_activity,
          status: row.status,
          created_by: row.created_by,
          class_subject_teacher: row.class_subject_teacher_id ? {
            id: row.class_subject_teacher_id,
            class_subject_id: row.subject_id,
            teacher_id: row.teacher_id,
            class_subject: {
              id: row.subject_id,
              class_id: row.class_id,
              subject_id: row.subject_id,
              total_jp: 0,
              max_jp_per_day: 2,
              subject: {
                id: row.subject_id,
                subject_code: row.subject_code || '',
                subject_name: row.subject_name || '',
                color_code: row.color_code || '#3b82f6',
                category: 'wajib',
                passing_grade: 75,
                status: 'active',
              },
            },
            teacher: {
              id: row.teacher_id,
              name: row.teacher_name || '',
              gender: 'L',
              status: 'active',
            },
          } : null,
        } as any;
      });

      const balance = await calculateClassBalance(classId, activeAyId);

      return {
        status: 'success',
        data: {
          class: classData,
          time_slots: timeSlots,
          schedules: schedulesMap,
          balance,
        },
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mengambil matriks jadwal kelas.',
      };
    }
  },

  /**
   * 2. Mengambil Matriks Jadwal per Guru
   */
  async getTeacherMatrix(teacherId: number, academicYearId: number): Promise<ApiResponse<TeacherMatrixData>> {
    try {
      const db = await getDb();

      const teacherRows = await db.select<any[]>('SELECT * FROM teachers WHERE id = ? LIMIT 1', [teacherId]);
      if (teacherRows.length === 0) {
        return { status: 'error', message: 'Guru tidak ditemukan.' };
      }

      const timeSlots = await db.select<TimeSlot[]>(`
        SELECT * FROM time_slots 
        ORDER BY 
          CASE day 
            WHEN 'senin' THEN 1 
            WHEN 'selasa' THEN 2 
            WHEN 'rabu' THEN 3 
            WHEN 'kamis' THEN 4 
            WHEN 'jumat' THEN 5 
            WHEN 'sabtu' THEN 6 
          END, period_number ASC
      `);

      const scheduleRows = await db.select<any[]>(`
        SELECT 
          s.*,
          c.class_name,
          ts.day,
          ts.period_number,
          ts.start_time,
          ts.end_time,
          ts.is_break,
          sub.subject_name,
          sub.color_code
        FROM schedules s
        JOIN class_subject_teachers cst ON s.class_subject_teacher_id = cst.id
        JOIN classes c ON s.class_id = c.id
        JOIN time_slots ts ON s.time_slot_id = ts.id
        LEFT JOIN class_subjects cs ON cst.class_subject_id = cs.id
        LEFT JOIN subjects sub ON cs.subject_id = sub.id
        WHERE cst.teacher_id = ? AND s.academic_year_id = ?
      `, [teacherId, academicYearId]);

      const schedulesMap: Record<number, ScheduleItem> = {};
      scheduleRows.forEach((row) => {
        schedulesMap[row.id] = {
          id: row.id,
          academic_year_id: row.academic_year_id,
          class_id: row.class_id,
          time_slot_id: row.time_slot_id,
          class_subject_teacher_id: row.class_subject_teacher_id,
          is_locked: Boolean(row.is_locked),
          custom_activity: row.custom_activity,
          status: row.status,
          created_by: row.created_by,
          class: {
            id: row.class_id,
            class_name: row.class_name,
            grade_id: 0,
            academic_year_id: row.academic_year_id,
            status: 'active',
          },
          time_slot: {
            id: row.time_slot_id,
            day: row.day,
            period_number: row.period_number,
            start_time: row.start_time,
            end_time: row.end_time,
            is_break: Boolean(row.is_break),
          },
          class_subject_teacher: {
            id: row.class_subject_teacher_id,
            class_subject_id: 0,
            teacher_id: teacherId,
            class_subject: {
              id: 0,
              class_id: row.class_id,
              subject_id: 0,
              total_jp: 0,
              max_jp_per_day: 2,
              subject: {
                id: 0,
                subject_code: '',
                subject_name: row.subject_name || '',
                color_code: row.color_code || '#3b82f6',
                category: 'wajib',
                passing_grade: 75,
                status: 'active',
              },
            },
          },
        } as any;
      });

      return {
        status: 'success',
        data: {
          teacher: teacherRows[0],
          time_slots: timeSlots,
          schedules: schedulesMap,
          total_assigned_jp: scheduleRows.length,
        },
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mengambil matriks jadwal guru.',
      };
    }
  },

  /**
   * 3. Mengambil Matriks Jadwal Master (Seluruh Kelas & Slot)
   */
  async getMasterMatrix(academicYearId: number): Promise<ApiResponse<MasterMatrixData>> {
    try {
      const db = await getDb();

      const classes = await db.select<any[]>(`
        SELECT c.*, g.grade_name, m.major_name 
        FROM classes c
        LEFT JOIN grades g ON c.grade_id = g.id
        LEFT JOIN majors m ON c.major_id = m.id
        WHERE c.academic_year_id = ? AND c.status = 'active'
        ORDER BY g.sequence ASC, c.class_name ASC
      `, [academicYearId]);

      const timeSlots = await db.select<TimeSlot[]>(`
        SELECT * FROM time_slots 
        ORDER BY 
          CASE day 
            WHEN 'senin' THEN 1 
            WHEN 'selasa' THEN 2 
            WHEN 'rabu' THEN 3 
            WHEN 'kamis' THEN 4 
            WHEN 'jumat' THEN 5 
            WHEN 'sabtu' THEN 6 
          END, period_number ASC
      `);

      const scheduleRows = await db.select<any[]>(`
        SELECT 
          s.*,
          cst.teacher_id,
          t.name as teacher_name,
          cs.subject_id,
          sub.subject_name,
          sub.color_code
        FROM schedules s
        LEFT JOIN class_subject_teachers cst ON s.class_subject_teacher_id = cst.id
        LEFT JOIN teachers t ON cst.teacher_id = t.id
        LEFT JOIN class_subjects cs ON cst.class_subject_id = cs.id
        LEFT JOIN subjects sub ON cs.subject_id = sub.id
        WHERE s.academic_year_id = ?
      `, [academicYearId]);

      // Pivot matrix structure: [class_id][time_slot_id]
      const matrix: Record<number, Record<number, ScheduleItem>> = {};

      scheduleRows.forEach((row) => {
        if (!matrix[row.class_id]) {
          matrix[row.class_id] = {};
        }
        matrix[row.class_id][row.time_slot_id] = {
          id: row.id,
          academic_year_id: row.academic_year_id,
          class_id: row.class_id,
          time_slot_id: row.time_slot_id,
          class_subject_teacher_id: row.class_subject_teacher_id,
          is_locked: Boolean(row.is_locked),
          custom_activity: row.custom_activity,
          status: row.status,
          created_by: row.created_by,
        } as any;
      });

      return {
        status: 'success',
        data: {
          classes,
          time_slots: timeSlots,
          matrix,
        } as any,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mengambil matriks master jadwal.',
      };
    }
  },

  /**
   * 4. Mengambil Data Sisa JP (Balance) Mata Pelajaran per Kelas
   */
  async getBalance(classId: number, academicYearId?: number): Promise<ApiResponse<SubjectBalance[]>> {
    try {
      const balance = await calculateClassBalance(classId, academicYearId);
      return {
        status: 'success',
        data: balance,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal menghitung balance JP mata pelajaran.',
      };
    }
  },

  /**
   * 5. Generate Otomatis Penyusunan Jadwal Pelajaran
   */
  async generate(payload: GenerateSchedulePayload): Promise<ApiResponse<GenerateResult>> {
    try {
      const db = await getDb();
      const academicYearId = payload.academic_year_id;
      const currentUserId = Number(localStorage.getItem('auth_user_id') || 1);

      // Ambil seluruh kelas aktif
      const activeClasses = await db.select<any[]>(
        "SELECT id, time_slot_profile_id FROM classes WHERE academic_year_id = ? AND status = 'active'",
        [academicYearId]
      );

      let totalGenerated = 0;
      let totalConflicts = 0;

      for (const cls of activeClasses) {
        // Ambil slot waktu non-istirahat
        const timeSlots = await db.select<any[]>(
          'SELECT id FROM time_slots WHERE time_slot_profile_id = ? AND is_break = 0 ORDER BY id ASC',
          [cls.time_slot_profile_id || 1]
        );

        // Ambil alokasi guru mata pelajaran untuk kelas ini
        const cstRows = await db.select<any[]>(`
          SELECT cst.id as cst_id, cst.teacher_id, cs.total_jp, s.is_joint_subject
          FROM class_subject_teachers cst
          JOIN class_subjects cs ON cst.class_subject_id = cs.id
          JOIN subjects s ON cs.subject_id = s.id
          WHERE cs.class_id = ? AND cs.status = 'active'
        `, [cls.id]);

        if (cstRows.length === 0 || timeSlots.length === 0) continue;

        // Susun daftar alokasi JP per cst_id
        const assignments: number[] = [];
        cstRows.forEach((item) => {
          const count = Math.max(1, item.jp || item.total_jp || 1);
          for (let i = 0; i < count; i++) {
            assignments.push(item.cst_id);
          }
        });

        let slotIndex = 0;
        for (const cstId of assignments) {
          if (slotIndex >= timeSlots.length) break;

          const slotId = timeSlots[slotIndex].id;

          // Cek apakah slot ini sudah terkunci (is_locked)
          const lockedCheck = await db.select<any[]>(
            'SELECT id FROM schedules WHERE class_id = ? AND time_slot_id = ? AND is_locked = 1 LIMIT 1',
            [cls.id, slotId]
          );

          if (lockedCheck.length > 0) {
            slotIndex++;
            continue;
          }

          // Cek bentrok guru pada jam yang sama di kelas lain
          const teacherRow = cstRows.find((c) => c.cst_id === cstId);
          if (teacherRow && !teacherRow.is_joint_subject) {
            const conflictCheck = await db.select<any[]>(`
              SELECT sch.id 
              FROM schedules sch
              JOIN class_subject_teachers cst ON sch.class_subject_teacher_id = cst.id
              WHERE sch.academic_year_id = ? 
                AND sch.time_slot_id = ? 
                AND sch.class_id != ? 
                AND cst.teacher_id = ?
              LIMIT 1
            `, [academicYearId, slotId, cls.id, teacherRow.teacher_id]);

            if (conflictCheck.length > 0) {
              totalConflicts++;
              slotIndex++;
              continue;
            }
          }

          // Simpan / Perbarui slot jadwal
          const existingSlot = await db.select<any[]>(
            'SELECT id FROM schedules WHERE class_id = ? AND time_slot_id = ? LIMIT 1',
            [cls.id, slotId]
          );

          if (existingSlot.length > 0) {
            await db.execute(
              `UPDATE schedules 
               SET class_subject_teacher_id = ?, status = 'draft', updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [cstId, existingSlot[0].id]
            );
          } else {
            await db.execute(
              `INSERT INTO schedules (
                academic_year_id, class_id, time_slot_id, class_subject_teacher_id, 
                is_locked, status, created_by
              ) VALUES (?, ?, ?, ?, 0, 'draft', ?)`,
              [academicYearId, cls.id, slotId, cstId, currentUserId]
            );
          }

          totalGenerated++;
          slotIndex++;
        }
      }

      return {
        status: 'success',
        data: {
          total_generated: totalGenerated,
          total_unassigned: 0,
          conflicts: totalConflicts,
        } as any,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal melakukan penyusunan jadwal otomatis.',
      };
    }
  },

  /**
   * 6. Mengunci Slot Jadwal
   */
  async lockSlot(payload: LockSlotPayload): Promise<ApiResponse<ScheduleItem>> {
    try {
      const db = await getDb();
      const isLocked = payload.is_locked ? 1 : 0;
      const currentUserId = Number(localStorage.getItem('auth_user_id') || 1);

      const existing = await db.select<any[]>(
        'SELECT id FROM schedules WHERE class_id = ? AND time_slot_id = ? LIMIT 1',
        [payload.class_id, payload.time_slot_id]
      );

      let scheduleId: number;

      if (existing.length > 0) {
        scheduleId = existing[0].id;
        await db.execute(
          'UPDATE schedules SET is_locked = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [isLocked, scheduleId]
        );
      } else {
        const result = await db.execute(
          `INSERT INTO schedules (
            academic_year_id, class_id, time_slot_id, is_locked, status, created_by
          ) VALUES (?, ?, ?, ?, 'draft', ?)`,
          [payload.academic_year_id, payload.class_id, payload.time_slot_id, isLocked, currentUserId]
        );
        scheduleId = result.lastInsertId;
      }

      const rows = await db.select<any[]>('SELECT * FROM schedules WHERE id = ? LIMIT 1', [scheduleId]);

      return {
        status: 'success',
        data: {
          ...rows[0],
          is_locked: Boolean(rows[0].is_locked),
        } as any,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mengubah status penguncian slot.',
      };
    }
  },

  /**
   * 7. Penugasan Manual Jadwal ke Slot Terentu
   */
  async manualAssign(payload: ManualAssignPayload): Promise<ApiResponse<ScheduleItem>> {
    try {
      const db = await getDb();
      const currentUserId = Number(localStorage.getItem('auth_user_id') || 1);

      const existing = await db.select<any[]>(
        'SELECT id FROM schedules WHERE class_id = ? AND time_slot_id = ? LIMIT 1',
        [payload.class_id, payload.time_slot_id]
      );

      let scheduleId: number;

      if (existing.length > 0) {
        scheduleId = existing[0].id;
        await db.execute(
          `UPDATE schedules 
           SET class_subject_teacher_id = ?, custom_activity = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [payload.class_subject_teacher_id ?? null, payload.custom_activity ?? null, scheduleId]
        );
      } else {
        const result = await db.execute(
          `INSERT INTO schedules (
            academic_year_id, class_id, time_slot_id, class_subject_teacher_id, 
            custom_activity, is_locked, status, created_by
          ) VALUES (?, ?, ?, ?, ?, 0, 'draft', ?)`,
          [
            payload.academic_year_id,
            payload.class_id,
            payload.time_slot_id,
            payload.class_subject_teacher_id ?? null,
            payload.custom_activity ?? null,
            currentUserId,
          ]
        );
        scheduleId = result.lastInsertId;
      }

      const rows = await db.select<any[]>('SELECT * FROM schedules WHERE id = ? LIMIT 1', [scheduleId]);

      return {
        status: 'success',
        data: {
          ...rows[0],
          is_locked: Boolean(rows[0].is_locked),
        } as any,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal menerapkan penugasan manual pada slot.',
      };
    }
  },

  /**
   * 8. Mengosongkan Slot Jadwal
   */
  async clearSlot(payload: ClearSlotPayload): Promise<ApiResponse<null>> {
    try {
      const db = await getDb();

      await db.execute(
        `UPDATE schedules 
         SET class_subject_teacher_id = NULL, custom_activity = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE class_id = ? AND time_slot_id = ? AND is_locked = 0`,
        [payload.class_id, payload.time_slot_id]
      );

      return {
        status: 'success',
        message: 'Slot jadwal berhasil dikosongkan.',
        data: null,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mengosongkan slot jadwal.',
        data: null,
      };
    }
  },

  /**
   * 9. Reset/Hapus Seluruh Penugasan Jadwal (Kecuali Slot Terkunci)
   */
  async reset(payload: ResetSchedulePayload): Promise<ApiResponse<null>> {
    try {
      const db = await getDb();
      let query = 'DELETE FROM schedules WHERE academic_year_id = ? AND is_locked = 0';
      const params: any[] = [payload.academic_year_id];

      if (payload.class_id) {
        query += ' AND class_id = ?';
        params.push(payload.class_id);
      }

      await db.execute(query, params);

      return {
        status: 'success',
        message: 'Jadwal berhasil di-reset.',
        data: null,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal melakukan reset jadwal.',
        data: null,
      };
    }
  },

  /**
   * 10. Publikasikan Jadwal Pelajaran
   */
  async publish(payload: PublishSchedulePayload): Promise<ApiResponse<null>> {
    try {
      const db = await getDb();
      let query = "UPDATE schedules SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE academic_year_id = ?";
      const params: any[] = [payload.academic_year_id];

      if (payload.class_id) {
        query += ' AND class_id = ?';
        params.push(payload.class_id);
      }

      await db.execute(query, params);

      return {
        status: 'success',
        message: 'Jadwal berhasil dipublikasikan.',
        data: null,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mempublikasikan jadwal.',
        data: null,
      };
    }
  },

  /**
   * 11. Batalkan Publikasi (Kembalikan ke Draft)
   */
  async unpublish(payload: UnpublishSchedulePayload): Promise<ApiResponse<null>> {
    try {
      const db = await getDb();
      let query = "UPDATE schedules SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE academic_year_id = ?";
      const params: any[] = [payload.academic_year_id];

      if (payload.class_id) {
        query += ' AND class_id = ?';
        params.push(payload.class_id);
      }

      await db.execute(query, params);

      return {
        status: 'success',
        message: 'Publikasi jadwal berhasil dibatalkan.',
        data: null,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal membatalkan publikasi jadwal.',
        data: null,
      };
    }
  },
};