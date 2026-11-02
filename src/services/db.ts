import Database from '@tauri-apps/plugin-sql';

let dbInstance: Database | null = null;

/**
 * Mendapatkan atau menginisialisasi koneksi Database SQLite tunggal (Singleton).
 */
export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load('sqlite:tata_jadwal.db');
    
    // Aktifkan dukungan Foreign Keys di SQLite
    await dbInstance.execute('PRAGMA foreign_keys = ON;');
    
    await initTables(dbInstance);
  }
  return dbInstance;
}

/**
 * Membuat seluruh tabel database sesuai dengan skema migration Laravel.
 */
async function initTables(db: Database): Promise<void> {
  // 1. Tabel Users
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      email_verified_at DATETIME,
      password TEXT NOT NULL,
      phone TEXT,
      avatar TEXT,
      status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
      remember_token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Tabel Academic Years
  await db.execute(`
    CREATE TABLE IF NOT EXISTS academic_years (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      semester TEXT CHECK(semester IN ('odd', 'even')) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Tabel Grades
  await db.execute(`
    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grade_name TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Tabel Majors
  await db.execute(`
    CREATE TABLE IF NOT EXISTS majors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      major_name TEXT NOT NULL,
      status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. Tabel Teachers
  await db.execute(`
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nip TEXT UNIQUE,
      name TEXT NOT NULL,
      gender TEXT CHECK(gender IN ('L', 'P')) NOT NULL,
      max_jp_per_week INTEGER DEFAULT 24,
      status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 6. Tabel Subjects (termasuk is_joint_subject)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_code TEXT UNIQUE NOT NULL,
      subject_name TEXT NOT NULL,
      color_code TEXT DEFAULT '#3B82F6',
      category TEXT CHECK(category IN ('wajib', 'peminatan', 'mulok', 'kejuruan', 'kokurikuler')) DEFAULT 'wajib',
      passing_grade INTEGER DEFAULT 75,
      status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
      is_joint_subject BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 7. Tabel Time Slot Profiles
  await db.execute(`
    CREATE TABLE IF NOT EXISTS time_slot_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      academic_year_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_default BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
    );
  `);

  // 8. Tabel Classes
  await db.execute(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_name TEXT NOT NULL,
      grade_id INTEGER NOT NULL,
      major_id INTEGER,
      academic_year_id INTEGER NOT NULL,
      time_slot_profile_id INTEGER,
      homeroom_teacher_id INTEGER,
      status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE CASCADE,
      FOREIGN KEY (major_id) REFERENCES majors(id) ON DELETE SET NULL,
      FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
      FOREIGN KEY (time_slot_profile_id) REFERENCES time_slot_profiles(id) ON DELETE SET NULL,
      FOREIGN KEY (homeroom_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
    );
  `);

  // 9. Tabel Class Subjects
  await db.execute(`
    CREATE TABLE IF NOT EXISTS class_subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      total_jp INTEGER NOT NULL,
      max_jp_per_day INTEGER DEFAULT 2,
      status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );
  `);

  // 10. Tabel Class Subject Teachers (termasuk kolom jp)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS class_subject_teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_subject_id INTEGER NOT NULL,
      teacher_id INTEGER NOT NULL,
      jp INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (class_subject_id) REFERENCES class_subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
    );
  `);

  // 11. Tabel Time Slots (termasuk time_slot_profile_id)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS time_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      time_slot_profile_id INTEGER NOT NULL,
      day TEXT CHECK(day IN ('senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu')) NOT NULL,
      period_number INTEGER NOT NULL,
      label TEXT,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      is_break BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (time_slot_profile_id) REFERENCES time_slot_profiles(id) ON DELETE CASCADE
    );
  `);

  // 12. Tabel Schedules
  await db.execute(`
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      academic_year_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      time_slot_id INTEGER NOT NULL,
      class_subject_teacher_id INTEGER,
      is_locked BOOLEAN DEFAULT 0,
      custom_activity TEXT,
      status TEXT CHECK(status IN ('draft', 'published')) DEFAULT 'draft',
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (time_slot_id) REFERENCES time_slots(id) ON DELETE CASCADE,
      FOREIGN KEY (class_subject_teacher_id) REFERENCES class_subject_teachers(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 13. Tabel Cache & Cache Locks (Laravel Cache System)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      expiration INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS cache_locks (
      key TEXT PRIMARY KEY,
      owner TEXT NOT NULL,
      expiration INTEGER NOT NULL
    );
  `);

  // 14. Tabel Jobs, Job Batches, & Failed Jobs (Laravel Queue System)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      queue TEXT NOT NULL,
      payload TEXT NOT NULL,
      attempts INTEGER NOT NULL,
      reserved_at INTEGER,
      available_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS job_batches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      total_jobs INTEGER NOT NULL,
      pending_jobs INTEGER NOT NULL,
      failed_jobs INTEGER NOT NULL,
      failed_job_ids TEXT NOT NULL,
      options TEXT,
      cancelled_at INTEGER,
      created_at INTEGER NOT NULL,
      finished_at INTEGER
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS failed_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      connection TEXT NOT NULL,
      queue TEXT NOT NULL,
      payload TEXT NOT NULL,
      exception TEXT NOT NULL,
      failed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 15. Tabel Personal Access Tokens (Sanctum)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS personal_access_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tokenable_type TEXT NOT NULL,
      tokenable_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      abilities TEXT,
      last_used_at DATETIME,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}