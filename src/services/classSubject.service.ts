import { getDb } from './db';
import type { 
  ClassSubject, 
  ClassSubjectGroupData, 
  AssignClassSubjectPayload, 
  UpdateClassSubjectPayload 
} from '../types/classSubject';
import type { ApiResponse } from '../types/auth';

/**
 * Helper internal untuk mengambil data detail ClassSubject beserta relasi Subject & Teachers
 */
async function getClassSubjectById(id: number): Promise<ClassSubject | null> {
  const db = await getDb();

  const rows = await db.select<any[]>(`
    SELECT 
      cs.*,
      s.subject_code,
      s.subject_name,
      s.color_code,
      s.category,
      s.passing_grade,
      s.status as subject_status,
      s.is_joint_subject
    FROM class_subjects cs
    JOIN subjects s ON cs.subject_id = s.id
    WHERE cs.id = ?
    LIMIT 1
  `, [id]);

  if (rows.length === 0) return null;

  const row = rows[0];

  // Ambil daftar guru pengampu untuk mata pelajaran kelas ini
  const teacherRows = await db.select<any[]>(`
    SELECT 
      cst.id as cst_id,
      cst.class_subject_id,
      cst.teacher_id,
      cst.jp,
      t.nip,
      t.name,
      t.gender,
      t.max_jp_per_week,
      t.status as teacher_status
    FROM class_subject_teachers cst
    JOIN teachers t ON cst.teacher_id = t.id
    WHERE cst.class_subject_id = ?
  `, [id]);

  const teachers = teacherRows.map((tRow) => ({
    id: tRow.cst_id,
    class_subject_id: tRow.class_subject_id,
    teacher_id: tRow.teacher_id,
    jp: tRow.jp,
    teacher: {
      id: tRow.teacher_id,
      nip: tRow.nip,
      name: tRow.name,
      gender: tRow.gender,
      max_jp_per_week: tRow.max_jp_per_week,
      status: tRow.teacher_status,
    },
  }));

  return {
    id: row.id,
    class_id: row.class_id,
    subject_id: row.subject_id,
    total_jp: row.total_jp,
    max_jp_per_day: row.max_jp_per_day,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    subject: {
      id: row.subject_id,
      subject_code: row.subject_code,
      subject_name: row.subject_name,
      color_code: row.color_code,
      category: row.category,
      passing_grade: row.passing_grade,
      status: row.subject_status,
      is_joint_subject: Boolean(row.is_joint_subject),
    },
    teachers,
  };
}

export const ClassSubjectService = {
  /**
   * Mengambil semua alokasi mata pelajaran untuk satu kelas tertentu
   */
  async getByClass(classId: number): Promise<ApiResponse<ClassSubjectGroupData>> {
    try {
      const db = await getDb();

      // 1. Ambil info detail kelas
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
        return {
          status: 'error',
          message: 'Kelas tidak ditemukan.',
        };
      }

      // 2. Ambil semua ID class_subject milik kelas ini
      const csRows = await db.select<any[]>(
        'SELECT id FROM class_subjects WHERE class_id = ? ORDER BY id ASC',
        [classId]
      );

      // 3. Populate detail tiap class_subject
      const subjects: ClassSubject[] = [];
      for (const csRow of csRows) {
        const item = await getClassSubjectById(csRow.id);
        if (item) subjects.push(item);
      }

      const totalTargetJp = subjects.reduce((sum, item) => sum + item.total_jp, 0);

      const classData = {
        ...classRows[0],
        grade: classRows[0].grade_name ? { id: classRows[0].grade_id, grade_name: classRows[0].grade_name } : undefined,
        major: classRows[0].major_name ? { id: classRows[0].major_id, major_name: classRows[0].major_name } : undefined,
        academic_year: classRows[0].academic_year_name ? { id: classRows[0].academic_year_id, name: classRows[0].academic_year_name } : undefined,
      };

      return {
        status: 'success',
        data: {
          class: classData,
          subjects,
          total_target_jp: totalTargetJp,
        },
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mengambil mata pelajaran kelas.',
      };
    }
  },

  /**
   * Menambahkan/menghubungkan mata pelajaran ke suatu kelas
   */
  async assignSubject(classId: number, payload: AssignClassSubjectPayload): Promise<ApiResponse<ClassSubject>> {
    try {
      const db = await getDb();

      // Cek apakah mata pelajaran sudah dialokasikan di kelas ini sebelumnya
      const existing = await db.select<any[]>(
        'SELECT id FROM class_subjects WHERE class_id = ? AND subject_id = ? LIMIT 1',
        [classId, payload.subject_id]
      );

      if (existing.length > 0) {
        return {
          status: 'error',
          message: 'Mata pelajaran ini sudah ditambahkan ke kelas tersebut.',
        };
      }

      // Insert ke class_subjects
      const result = await db.execute(
        `INSERT INTO class_subjects (class_id, subject_id, total_jp, max_jp_per_day, status)
         VALUES (?, ?, ?, ?, ?)`,
        [
          classId,
          payload.subject_id,
          payload.total_jp,
          payload.max_jp_per_day ?? 2,
          payload.status ?? 'active',
        ]
      );

      const classSubjectId = result.lastInsertId;

      // Insert guru pengampu (jika ada dalam payload)
      if (payload.teachers && payload.teachers.length > 0) {
        for (const t of payload.teachers) {
          await db.execute(
            `INSERT INTO class_subject_teachers (class_subject_id, teacher_id, jp)
             VALUES (?, ?, ?)`,
            [classSubjectId, t.teacher_id, t.jp ?? 0]
          );
        }
      } else if ((payload as any).teacher_id) {
        // Fallback untuk single teacher_id
        await db.execute(
          `INSERT INTO class_subject_teachers (class_subject_id, teacher_id, jp)
           VALUES (?, ?, ?)`,
          [classSubjectId, (payload as any).teacher_id, payload.total_jp]
        );
      }

      const data = await getClassSubjectById(classSubjectId);
      if (!data) {
        return { status: 'error', message: 'Gagal mengambil data alokasi mata pelajaran.' };
      }

      return {
        status: 'success',
        data,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal menambahkan mata pelajaran ke kelas.',
      };
    }
  },

  /**
   * Memperbarui pengaturan alokasi JP & guru pengampu mata pelajaran kelas
   */
  async updateAssignment(id: number, payload: UpdateClassSubjectPayload): Promise<ApiResponse<ClassSubject>> {
    try {
      const db = await getDb();

      await db.execute(
        `UPDATE class_subjects 
         SET total_jp = ?, max_jp_per_day = ?, status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [payload.total_jp, payload.max_jp_per_day ?? 2, payload.status ?? 'active', id]
      );

      // Jika ada pembaruan daftar guru pengampu
      if (payload.teachers) {
        // Hapus pemetaan guru lama
        await db.execute('DELETE FROM class_subject_teachers WHERE class_subject_id = ?', [id]);

        // Re-insert pemetaan guru baru
        for (const t of payload.teachers) {
          await db.execute(
            `INSERT INTO class_subject_teachers (class_subject_id, teacher_id, jp)
             VALUES (?, ?, ?)`,
            [id, t.teacher_id, t.jp ?? 0]
          );
        }
      }

      const data = await getClassSubjectById(id);
      if (!data) {
        return { status: 'error', message: 'Gagal memperbarui data alokasi mata pelajaran.' };
      }

      return {
        status: 'success',
        data,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal memperbarui alokasi mata pelajaran.',
      };
    }
  },

  /**
   * Menghapus alokasi mata pelajaran dari kelas
   */
  async deleteAssignment(id: number): Promise<ApiResponse<null>> {
    try {
      const db = await getDb();
      
      // Hapus relasi guru pengampu & alokasi mapel kelas
      await db.execute('DELETE FROM class_subject_teachers WHERE class_subject_id = ?', [id]);
      await db.execute('DELETE FROM class_subjects WHERE id = ?', [id]);

      return {
        status: 'success',
        message: 'Alokasi mata pelajaran berhasil dihapus.',
        data: null,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal menghapus alokasi mata pelajaran.',
        data: null,
      };
    }
  },
};