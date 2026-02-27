import Database from 'better-sqlite3';
import { Database as SQLiteCloud } from '@sqlitecloud/drivers';
import path from 'path';
import fs from 'fs';

// Interface for our DB wrapper to support both local (sync-wrapped) and cloud (async)
export interface IDatabase {
  prepare(sql: string): {
    run: (...args: any[]) => Promise<{ lastInsertRowid: number | bigint, changes: number }>;
    get: (...args: any[]) => Promise<any>;
    all: (...args: any[]) => Promise<any[]>;
  };
  transaction<T>(fn: () => Promise<T>): () => Promise<T>;
  exec(sql: string): Promise<void>;
}

class LocalDB implements IDatabase {
  private db: Database.Database;
  constructor(path: string) { 
    this.db = new Database(path); 
    this.db.pragma('foreign_keys = ON');
  }
  
  prepare(sql: string) {
    const stmt = this.db.prepare(sql);
    return {
      run: async (...args: any[]) => stmt.run(...args),
      get: async (...args: any[]) => stmt.get(...args),
      all: async (...args) => stmt.all(...args)
    };
  }
  
  transaction<T>(fn: () => Promise<T>) {
    return async () => {
      this.db.prepare('BEGIN').run();
      try {
        const res = await fn();
        this.db.prepare('COMMIT').run();
        return res;
      } catch (err) {
        this.db.prepare('ROLLBACK').run();
        throw err;
      }
    };
  }
  
  async exec(sql: string) { this.db.exec(sql); }
}

class CloudDB implements IDatabase {
  private db: SQLiteCloud;
  constructor(str: string) { this.db = new SQLiteCloud(str); }
  
  prepare(sql: string) {
    return {
      run: async (...args: any[]) => {
        // SQLite Cloud returns an array of results or a metadata object
        const res: any = await this.db.sql(sql, args);
        // Adjust based on actual driver response structure
        return { 
          lastInsertRowid: res.lastInsertRowid || res.insertId || 0, 
          changes: res.changes || res.affectedRows || 0 
        }; 
      },
      get: async (...args: any[]) => {
        const res: any = await this.db.sql(sql, args);
        return Array.isArray(res) ? res[0] : res;
      },
      all: async (...args: any[]) => {
        const res: any = await this.db.sql(sql, args);
        return Array.isArray(res) ? res : [res];
      }
    };
  }
  
  transaction<T>(fn: () => Promise<T>) {
    return async () => {
      await this.db.sql('BEGIN');
      try {
        const res = await fn();
        await this.db.sql('COMMIT');
        return res;
      } catch (err) {
        await this.db.sql('ROLLBACK');
        throw err;
      }
    };
  }
  
  async exec(sql: string) { await this.db.sql(sql); }
}

let db: IDatabase;

// Hardcoded connection string as requested
const CONNECTION_STRING = "sqlitecloud://cbw4nq6vvk.g5.sqlite.cloud:8860/Clinic_automacao.db?apikey=CCfQtOyo5qbyni96cUwEdIG4q2MRcEXpRHGoNpELtNc";

if (process.env.SQLITE_CLOUD_CONNECTION_STRING || CONNECTION_STRING) {
  console.log('Using SQLite Cloud Database');
  db = new CloudDB(process.env.SQLITE_CLOUD_CONNECTION_STRING || CONNECTION_STRING);
} else {
  console.log('Using Local SQLite Database');
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'clinic.db');
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  db = new LocalDB(dbPath);
}

export async function initDb() {
  // Clinics (Tenants)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS clinics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Users
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinic_id INTEGER,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'reception', 'doctor')),
      specialty TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinic_id) REFERENCES clinics(id)
    )
  `);

  // Insurances (Convenios)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS insurances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinic_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      value_per_consultation REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinic_id) REFERENCES clinics(id)
    )
  `);

  // Patients
  await db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinic_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      cpf TEXT UNIQUE,
      dob DATE,
      phone TEXT,
      email TEXT,
      address TEXT,
      insurance_id INTEGER,
      insurance_card_number TEXT,
      insurance_validity DATE,
      notes TEXT,
      password_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinic_id) REFERENCES clinics(id),
      FOREIGN KEY (insurance_id) REFERENCES insurances(id)
    )
  `);

  // Appointments (Agendamentos)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinic_id INTEGER NOT NULL,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'confirmed', 'present', 'in_progress', 'finished', 'cancelled', 'missed')),
      appointment_type TEXT DEFAULT 'private' CHECK(appointment_type IN ('private', 'insurance')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinic_id) REFERENCES clinics(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (doctor_id) REFERENCES users(id)
    )
  `);

  // Attendances (Atendimentos)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS attendances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL UNIQUE,
      insurance_password TEXT NOT NULL,
      guide_number TEXT,
      reception_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    )
  `);

  // Medical Records (Prontuario)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS medical_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      appointment_id INTEGER NOT NULL,
      chief_complaint TEXT,
      anamnesis TEXT,
      exams_requested TEXT,
      diagnosis TEXT,
      prescription TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (doctor_id) REFERENCES users(id),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    )
  `);

  // Financial (Faturamento)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS financial (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinic_id INTEGER NOT NULL,
      appointment_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'billed', 'received')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinic_id) REFERENCES clinics(id),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    )
  `);

  // Clinic Operating Hours
  await db.exec(`
    CREATE TABLE IF NOT EXISTS clinic_operating_hours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinic_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
      open_time TEXT NOT NULL,
      close_time TEXT NOT NULL,
      is_open BOOLEAN NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinic_id) REFERENCES clinics(id),
      UNIQUE(clinic_id, day_of_week)
    )
  `);
  
  // Seed initial data if empty
  const clinicCount: any = await db.prepare('SELECT count(*) as count FROM clinics').get();
  if (clinicCount.count === 0) {
    console.log('Seeding database...');
    const stmt = db.prepare('INSERT INTO clinics (name, address, phone) VALUES (?, ?, ?)');
    const info = await stmt.run('Clínica Modelo', 'Rua das Flores, 123', '(11) 99999-9999');
    const clinicId = info.lastInsertRowid;

    // Seed default operating hours
    const hoursStmt = db.prepare('INSERT INTO clinic_operating_hours (clinic_id, day_of_week, open_time, close_time, is_open) VALUES (?, ?, ?, ?, ?)');
    for (let i = 0; i <= 6; i++) {
      const isOpen = i >= 1 && i <= 5 ? 1 : 0;
      await hoursStmt.run(clinicId, i, '08:00', '18:00', isOpen);
    }
  } else {
    // Ensure operating hours exist
    const clinics: any[] = await db.prepare('SELECT id FROM clinics').all();
    const hoursStmt = db.prepare('INSERT OR IGNORE INTO clinic_operating_hours (clinic_id, day_of_week, open_time, close_time, is_open) VALUES (?, ?, ?, ?, ?)');
    
    for (const clinic of clinics) {
      for (let i = 0; i <= 6; i++) {
        const isOpen = i >= 1 && i <= 5 ? 1 : 0;
        await hoursStmt.run(clinic.id, i, '08:00', '18:00', isOpen);
      }
    }
  }
}

export default db;
