import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'clinic.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

export function initDb() {
  // Clinics (Tenants)
  db.exec(`
    CREATE TABLE IF NOT EXISTS clinics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Users
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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

  // Migration: Add password_hash to patients if it doesn't exist
  try {
    const tableInfo = db.prepare("PRAGMA table_info(patients)").all() as any[];
    const hasPassword = tableInfo.some(col => col.name === 'password_hash');
    if (!hasPassword) {
      console.log('Migrating: Adding password_hash to patients table');
      db.exec("ALTER TABLE patients ADD COLUMN password_hash TEXT");
    }
  } catch (err) {
    console.error('Migration failed:', err);
  }

  // Appointments (Agendamentos)
  db.exec(`
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

  // Attendances (Atendimentos - linked to appointment, stores insurance password)
  db.exec(`
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

  // Medical Records (Prontuario / Evolucoes)
  db.exec(`
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
  db.exec(`
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

  // Clinic Operating Hours (Horario de Funcionamento)
  db.exec(`
    CREATE TABLE IF NOT EXISTS clinic_operating_hours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinic_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6), -- 0 = Sunday, 6 = Saturday
      open_time TEXT NOT NULL, -- HH:MM
      close_time TEXT NOT NULL, -- HH:MM
      is_open BOOLEAN NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinic_id) REFERENCES clinics(id),
      UNIQUE(clinic_id, day_of_week)
    )
  `);
  
  // Seed initial data if empty
  const clinicCount = db.prepare('SELECT count(*) as count FROM clinics').get() as { count: number };
  if (clinicCount.count === 0) {
    console.log('Seeding database...');
    const stmt = db.prepare('INSERT INTO clinics (name, address, phone) VALUES (?, ?, ?)');
    const info = stmt.run('Clínica Modelo', 'Rua das Flores, 123', '(11) 99999-9999');
    const clinicId = info.lastInsertRowid;

    // Seed default operating hours (Mon-Fri 08:00-18:00)
    const hoursStmt = db.prepare('INSERT INTO clinic_operating_hours (clinic_id, day_of_week, open_time, close_time, is_open) VALUES (?, ?, ?, ?, ?)');
    for (let i = 0; i <= 6; i++) {
      const isOpen = i >= 1 && i <= 5 ? 1 : 0; // Mon-Fri open
      hoursStmt.run(clinicId, i, '08:00', '18:00', isOpen);
    }

    // Create default admin user (password: admin123)
    // Hash generated with bcryptjs.hashSync('admin123', 10)
    const adminPass = '$2a$10$X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7'; // Placeholder hash, will generate real one in code
    
    // We'll insert users in the server startup or a separate seed script to use bcrypt properly
  } else {
    // Ensure operating hours exist for existing clinics (migration support)
    const clinics = db.prepare('SELECT id FROM clinics').all() as { id: number }[];
    const hoursStmt = db.prepare('INSERT OR IGNORE INTO clinic_operating_hours (clinic_id, day_of_week, open_time, close_time, is_open) VALUES (?, ?, ?, ?, ?)');
    
    clinics.forEach(clinic => {
      for (let i = 0; i <= 6; i++) {
        const isOpen = i >= 1 && i <= 5 ? 1 : 0;
        hoursStmt.run(clinic.id, i, '08:00', '18:00', isOpen);
      }
    });
  }
}

export default db;
