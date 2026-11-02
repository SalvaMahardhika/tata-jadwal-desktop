import { getDb } from './db';
import type { ApiResponse } from '../types/auth';

export interface DashboardStats {
  teachers: number;
  classes: number;
  subjects: number;
  active_academic_year: string;
}

export const DashboardService = {
  /**
   * Mengambil statistik ringkasan untuk dashboard dari database SQLite
   */
  async getStats(): Promise<ApiResponse<DashboardStats>> {
    try {
      const db = await getDb();

      // 1. Hitung jumlah guru aktif
      const teacherCount = await db.select<{ count: number }[]>(
        "SELECT COUNT(*) as count FROM teachers WHERE status = 'active'"
      );

      // 2. Hitung jumlah kelas aktif
      const classCount = await db.select<{ count: number }[]>(
        "SELECT COUNT(*) as count FROM classes WHERE status = 'active'"
      );

      // 3. Hitung jumlah mata pelajaran aktif
      const subjectCount = await db.select<{ count: number }[]>(
        "SELECT COUNT(*) as count FROM subjects WHERE status = 'active'"
      );

      // 4. Ambil tahun ajaran aktif
      const activeAyRows = await db.select<{ name: string; semester: string }[]>(
        'SELECT name, semester FROM academic_years WHERE is_active = 1 LIMIT 1'
      );

      let activeAyName = 'Belum Diatur';
      if (activeAyRows.length > 0) {
        const semesterText = activeAyRows[0].semester === 'odd' ? 'Ganjil' : 'Genap';
        activeAyName = `${activeAyRows[0].name} (${semesterText})`;
      }

      return {
        status: 'success',
        data: {
          teachers: teacherCount[0]?.count || 0,
          classes: classCount[0]?.count || 0,
          subjects: subjectCount[0]?.count || 0,
          active_academic_year: activeAyName,
        },
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Gagal mengambil data statistik dashboard.',
      };
    }
  },
};