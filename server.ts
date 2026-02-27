import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import db, { initDb } from './src/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production';

app.use(express.json());
app.use(cookieParser());

// Initialize Database
initDb();

// Seed initial admin user if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE email = ?").get('admin@clinic.com');
if (!adminExists) {
  const clinicStmt = db.prepare("INSERT INTO clinics (name, address, phone) VALUES (?, ?, ?)");
  const clinicInfo = clinicStmt.run('Clínica Modelo', 'Rua das Flores, 123', '(11) 99999-9999');
  const clinicId = clinicInfo.lastInsertRowid;

  const hash = bcrypt.hashSync('admin123', 10);
  const userStmt = db.prepare("INSERT INTO users (clinic_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)");
  userStmt.run(clinicId, 'Administrador', 'admin@clinic.com', hash, 'admin');
  console.log('Admin user created: admin@clinic.com / admin123');
}

// Seed example doctors
const clinic = db.prepare("SELECT id FROM clinics LIMIT 1").get() as { id: number };
if (clinic) {
  const hash = bcrypt.hashSync('123456', 10);
  const insertDoctor = db.prepare("INSERT INTO users (clinic_id, name, email, password_hash, role, specialty) VALUES (?, ?, ?, ?, ?, ?)");
  const checkDoctor = db.prepare("SELECT id FROM users WHERE email = ?");
  
  const examples = [
    { name: 'Dr. Roberto Santos', email: 'roberto@clinic.com', specialty: 'Clínica Geral' },
    { name: 'Dra. Ana Oliveira', email: 'ana@clinic.com', specialty: 'Cardiologia' },
    { name: 'Dr. Carlos Ferreira', email: 'carlos@clinic.com', specialty: 'Dermatologia' },
    { name: 'Dra. Juliana Lima', email: 'juliana@clinic.com', specialty: 'Pediatria' },
    { name: 'Dr. Marcos Silva', email: 'marcos@clinic.com', specialty: 'Ortopedia' },
    { name: 'Dra. Fernanda Costa', email: 'fernanda@clinic.com', specialty: 'Ginecologia' },
    { name: 'Dr. Paulo Mendes', email: 'paulo@clinic.com', specialty: 'Oftalmologia' },
    { name: 'Dra. Camila Rocha', email: 'camila@clinic.com', specialty: 'Psiquiatria' },
    { name: 'Dr. Lucas Souza', email: 'lucas@clinic.com', specialty: 'Neurologia' }
  ];

  examples.forEach(doc => {
    const exists = checkDoctor.get(doc.email);
    if (!exists) {
      insertDoctor.run(clinic.id, doc.name, doc.email, hash, 'doctor', doc.specialty);
      console.log(`Seeded doctor: ${doc.name}`);
    }
  });
}

// Middleware to verify JWT
const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- Settings Routes ---
app.get('/api/settings/schedule', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Não autorizado' });
  
  const schedule = db.prepare("SELECT * FROM clinic_operating_hours WHERE clinic_id = ? ORDER BY day_of_week").all(req.user.clinic_id);
  res.json(schedule);
});

app.post('/api/settings/schedule', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Não autorizado' });
  
  const { schedule } = req.body; // Array of { day_of_week, open_time, close_time, is_open }
  
  try {
    const transaction = db.transaction(() => {
      const stmt = db.prepare(`
        UPDATE clinic_operating_hours 
        SET open_time = ?, close_time = ?, is_open = ? 
        WHERE clinic_id = ? AND day_of_week = ?
      `);
      
      for (const day of schedule) {
        stmt.run(day.open_time, day.close_time, day.is_open ? 1 : 0, req.user.clinic_id, day.day_of_week);
      }
    });
    
    transaction();
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- Public Routes (No Auth Required) ---

app.get('/api/public/specialties', (req, res) => {
  // Get distinct specialties from doctors
  const specialties = db.prepare("SELECT DISTINCT specialty FROM users WHERE role = 'doctor' AND specialty IS NOT NULL").all();
  res.json(specialties.map((s: any) => s.specialty));
});

app.get('/api/public/doctors', (req, res) => {
  const { specialty } = req.query;
  let query = "SELECT id, name, specialty, clinic_id FROM users WHERE role = 'doctor'";
  const params = [];
  
  if (specialty) {
    query += " AND specialty = ?";
    params.push(specialty);
  }
  
  const doctors = db.prepare(query).all(...params);
  res.json(doctors);
});

app.get('/api/public/slots', (req, res) => {
  const { doctor_id, date } = req.query;
  if (!doctor_id || !date) return res.status(400).json({ error: 'Faltando doctor_id ou data' });

  // Get doctor's clinic
  const doctor: any = db.prepare("SELECT clinic_id FROM users WHERE id = ?").get(doctor_id);
  if (!doctor) return res.status(404).json({ error: 'Médico não encontrado' });

  // Get day of week (0-6)
  const dayOfWeek = new Date(date as string).getDay(); // Note: This uses local time of server, ideally should handle timezone
  // Better approach: parse date string and get UTC day or specific timezone day. 
  // For simplicity assuming YYYY-MM-DD matches server local day logic or UTC.
  // Let's use a safer way to get day of week from the date string YYYY-MM-DD
  const [year, month, day] = (date as string).split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dow = dateObj.getDay();

  // Get operating hours for this day
  const schedule: any = db.prepare("SELECT * FROM clinic_operating_hours WHERE clinic_id = ? AND day_of_week = ?").get(doctor.clinic_id, dow);

  if (!schedule || !schedule.is_open) {
    return res.json([]); // Closed on this day
  }

  const startHour = parseInt(schedule.open_time.split(':')[0]);
  const startMin = parseInt(schedule.open_time.split(':')[1]);
  const endHour = parseInt(schedule.close_time.split(':')[0]);
  const endMin = parseInt(schedule.close_time.split(':')[1]);
  
  const interval = 30; // minutes
  
  const slots = [];
  let current = new Date(year, month - 1, day, startHour, startMin);
  const end = new Date(year, month - 1, day, endHour, endMin);

  while (current < end) {
    const time = current.toTimeString().slice(0, 5);
    slots.push(time);
    current.setMinutes(current.getMinutes() + interval);
  }

  // Filter out existing appointments
  const existing = db.prepare(`
    SELECT start_time FROM appointments 
    WHERE doctor_id = ? AND date(start_time) = ? AND status != 'cancelled'
  `).all(doctor_id, date);

  const bookedTimes = existing.map((a: any) => {
    return a.start_time.split('T')[1].substring(0, 5);
  });

  const availableSlots = slots.filter(time => !bookedTimes.includes(time));
  res.json(availableSlots);
});

app.get('/api/public/patient-check', (req, res) => {
  const { cpf } = req.query;
  if (!cpf) return res.status(400).json({ error: 'CPF required' });

  const patient: any = db.prepare("SELECT name, phone, email FROM patients WHERE cpf = ?").get(cpf);
  
  if (patient) {
    res.json({ found: true, name: patient.name, phone: patient.phone, email: patient.email });
  } else {
    res.json({ found: false });
  }
});

app.post('/api/public/appointments', (req, res) => {
  const { 
    doctor_id, 
    date, 
    time, 
    patient_name, 
    patient_cpf, 
    patient_phone, 
    patient_email, 
    appointment_type, 
    insurance_id,
    password 
  } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Senha é obrigatória' });
  }

  try {
    const transaction = db.transaction(() => {
      // 1. Find or Create Patient
      let patient: any = db.prepare("SELECT id, password_hash FROM patients WHERE cpf = ?").get(patient_cpf);
      
      if (patient) {
        // Verify password if patient exists
        if (patient.password_hash) {
          if (!bcrypt.compareSync(password, patient.password_hash)) {
            throw new Error('Senha incorreta');
          }
        } else {
          // If patient exists but has no password (legacy), update it
          const hash = bcrypt.hashSync(password, 10);
          db.prepare("UPDATE patients SET password_hash = ? WHERE id = ?").run(hash, patient.id);
        }
      } else {
        // Create new patient
        const doctor: any = db.prepare("SELECT clinic_id FROM users WHERE id = ?").get(doctor_id);
        if (!doctor) throw new Error('Médico não encontrado');

        const hash = bcrypt.hashSync(password, 10);
        const stmt = db.prepare(`
          INSERT INTO patients (clinic_id, name, cpf, phone, email, insurance_id, password_hash)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const info = stmt.run(doctor.clinic_id, patient_name, patient_cpf, patient_phone, patient_email, insurance_id || null, hash);
        patient = { id: info.lastInsertRowid };
      }

      // 2. Create Appointment
      const start_time = `${date}T${time}:00`;
      // Default 30 min duration
      const end_date = new Date(new Date(start_time).getTime() + 30 * 60000);
      const end_time = end_date.toISOString().slice(0, 19);

      // Get clinic_id again (redundant but safe)
      const doctor: any = db.prepare("SELECT clinic_id FROM users WHERE id = ?").get(doctor_id);

      const apptStmt = db.prepare(`
        INSERT INTO appointments (clinic_id, patient_id, doctor_id, start_time, end_time, status, appointment_type)
        VALUES (?, ?, ?, ?, ?, 'scheduled', ?)
      `);
      
      const info = apptStmt.run(doctor.clinic_id, patient.id, doctor_id, start_time, end_time, appointment_type);
      return info.lastInsertRowid;
    });

    const appointmentId = transaction();
    res.json({ success: true, appointmentId });

  } catch (err: any) {
    console.error('Appointment Error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// --- Auth Routes ---
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = jwt.sign({ id: user.id, role: user.role, clinic_id: user.clinic_id }, JWT_SECRET, { expiresIn: '8h' });
  res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
  res.json({ id: user.id, name: user.name, role: user.role, clinic_id: user.clinic_id });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Desconectado' });
});

app.get('/api/me', authenticateToken, (req: any, res) => {
  const user: any = db.prepare("SELECT id, name, email, role, clinic_id FROM users WHERE id = ?").get(req.user.id);
  res.json(user);
});

// --- Patients Routes ---
app.get('/api/patients', authenticateToken, (req: any, res) => {
  const patients = db.prepare("SELECT * FROM patients WHERE clinic_id = ? ORDER BY name").all(req.user.clinic_id);
  res.json(patients);
});

app.post('/api/patients', authenticateToken, (req: any, res) => {
  const { name, cpf, dob, phone, email, address, insurance_id, insurance_card_number, insurance_validity, notes } = req.body;
  try {
    const stmt = db.prepare(`
      INSERT INTO patients (clinic_id, name, cpf, dob, phone, email, address, insurance_id, insurance_card_number, insurance_validity, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(req.user.clinic_id, name, cpf, dob, phone, email, address, insurance_id, insurance_card_number, insurance_validity, notes);
    res.json({ id: info.lastInsertRowid });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/patients/:id', authenticateToken, (req: any, res) => {
  const { name, cpf, dob, phone, email, address, insurance_id, insurance_card_number, insurance_validity, notes } = req.body;
  const { id } = req.params;
  
  try {
    const stmt = db.prepare(`
      UPDATE patients 
      SET name = ?, cpf = ?, dob = ?, phone = ?, email = ?, address = ?, insurance_id = ?, insurance_card_number = ?, insurance_validity = ?, notes = ?
      WHERE id = ? AND clinic_id = ?
    `);
    const info = stmt.run(name, cpf, dob, phone, email, address, insurance_id, insurance_card_number, insurance_validity, notes, id, req.user.clinic_id);
    
    if (info.changes === 0) return res.status(404).json({ error: 'Paciente não encontrado' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- Appointments Routes ---
app.get('/api/appointments', authenticateToken, (req: any, res) => {
  const { start, end, doctor_id } = req.query;
  let query = "SELECT a.*, p.name as patient_name, u.name as doctor_name FROM appointments a JOIN patients p ON a.patient_id = p.id JOIN users u ON a.doctor_id = u.id WHERE a.clinic_id = ?";
  const params = [req.user.clinic_id];

  if (start && end) {
    query += " AND a.start_time BETWEEN ? AND ?";
    params.push(start, end);
  }
  if (doctor_id) {
    query += " AND a.doctor_id = ?";
    params.push(doctor_id);
  }

  const appointments = db.prepare(query).all(...params);
  res.json(appointments);
});

app.post('/api/appointments', authenticateToken, (req: any, res) => {
  const { patient_id, doctor_id, start_time, end_time, notes } = req.body;
  try {
    const stmt = db.prepare(`
      INSERT INTO appointments (clinic_id, patient_id, doctor_id, start_time, end_time, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(req.user.clinic_id, patient_id, doctor_id, start_time, end_time, notes);
    res.json({ id: info.lastInsertRowid });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/appointments/:id/status', authenticateToken, (req: any, res) => {
  const { status } = req.body;
  const { id } = req.params;
  
  try {
    const stmt = db.prepare("UPDATE appointments SET status = ? WHERE id = ? AND clinic_id = ?");
    const info = stmt.run(status, id, req.user.clinic_id);
    if (info.changes === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- Attendance (Check-in with Insurance Password) ---
app.post('/api/attendances', authenticateToken, (req: any, res) => {
  const { appointment_id, insurance_password, guide_number, reception_notes } = req.body;
  
  try {
    // Transaction to update appointment status and create attendance record
    const transaction = db.transaction(() => {
      db.prepare("INSERT INTO attendances (appointment_id, insurance_password, guide_number, reception_notes) VALUES (?, ?, ?, ?)").run(appointment_id, insurance_password, guide_number, reception_notes);
      db.prepare("UPDATE appointments SET status = 'present' WHERE id = ?").run(appointment_id);
    });
    transaction();
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- Medical Records ---
app.get('/api/medical-records/:patientId', authenticateToken, (req: any, res) => {
  const records = db.prepare(`
    SELECT mr.*, u.name as doctor_name, a.start_time as appointment_date 
    FROM medical_records mr 
    JOIN users u ON mr.doctor_id = u.id 
    JOIN appointments a ON mr.appointment_id = a.id
    WHERE mr.patient_id = ? 
    ORDER BY mr.created_at DESC
  `).all(req.params.patientId);
  res.json(records);
});

app.post('/api/medical-records', authenticateToken, (req: any, res) => {
  const { patient_id, appointment_id, chief_complaint, anamnesis, exams_requested, diagnosis, prescription, notes } = req.body;
  
  try {
    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO medical_records (patient_id, doctor_id, appointment_id, chief_complaint, anamnesis, exams_requested, diagnosis, prescription, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(patient_id, req.user.id, appointment_id, chief_complaint, anamnesis, exams_requested, diagnosis, prescription, notes);
      
      db.prepare("UPDATE appointments SET status = 'finished' WHERE id = ?").run(appointment_id);
    });
    transaction();
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- Users (Doctors/Reception) ---
app.get('/api/users', authenticateToken, (req: any, res) => {
  const users = db.prepare("SELECT id, name, email, role, specialty FROM users WHERE clinic_id = ?").all(req.user.clinic_id);
  res.json(users);
});

app.post('/api/users', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Não autorizado' });
  
  const { name, email, password, role, specialty } = req.body;
  const hash = bcrypt.hashSync(password, 10);
  
  try {
    const stmt = db.prepare("INSERT INTO users (clinic_id, name, email, password_hash, role, specialty) VALUES (?, ?, ?, ?, ?, ?)");
    const info = stmt.run(req.user.clinic_id, name, email, hash, role, specialty);
    res.json({ id: info.lastInsertRowid });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/users/:id', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Não autorizado' });
  const { id } = req.params;
  
  // Prevent deleting yourself
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Não é possível excluir o próprio usuário' });
  }

  try {
    const stmt = db.prepare("DELETE FROM users WHERE id = ? AND clinic_id = ?");
    const info = stmt.run(id, req.user.clinic_id);
    if (info.changes === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- Insurances ---
app.get('/api/insurances', authenticateToken, (req: any, res) => {
  const insurances = db.prepare("SELECT * FROM insurances WHERE clinic_id = ?").all(req.user.clinic_id);
  res.json(insurances);
});

app.post('/api/insurances', authenticateToken, (req: any, res) => {
  const { name, value_per_consultation } = req.body;
  try {
    const stmt = db.prepare("INSERT INTO insurances (clinic_id, name, value_per_consultation) VALUES (?, ?, ?)");
    const info = stmt.run(req.user.clinic_id, name, value_per_consultation);
    res.json({ id: info.lastInsertRowid });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- Financial ---
app.get('/api/financial', authenticateToken, (req: any, res) => {
  const transactions = db.prepare(`
    SELECT f.*, p.name as patient_name 
    FROM financial f 
    JOIN appointments a ON f.appointment_id = a.id 
    JOIN patients p ON a.patient_id = p.id 
    WHERE f.clinic_id = ? 
    ORDER BY f.created_at DESC
  `).all(req.user.clinic_id);
  res.json(transactions);
});

// --- Stats / Dashboard ---
app.get('/api/stats', authenticateToken, (req: any, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  const totalPatients = db.prepare("SELECT count(*) as count FROM patients WHERE clinic_id = ?").get(req.user.clinic_id) as any;
  const appointmentsToday = db.prepare("SELECT count(*) as count FROM appointments WHERE clinic_id = ? AND date(start_time) = ?").get(req.user.clinic_id, today) as any;
  const waiting = db.prepare("SELECT count(*) as count FROM appointments WHERE clinic_id = ? AND date(start_time) = ? AND status IN ('present', 'confirmed')").get(req.user.clinic_id, today) as any;
  const finished = db.prepare("SELECT count(*) as count FROM appointments WHERE clinic_id = ? AND date(start_time) = ? AND status = 'finished'").get(req.user.clinic_id, today) as any;

  res.json({
    totalPatients: totalPatients.count,
    appointmentsToday: appointmentsToday.count,
    waiting: waiting.count,
    finished: finished.count
  });
});

app.get('/api/dashboard/activity', authenticateToken, (req: any, res) => {
  const activity = db.prepare(`
    SELECT a.id, p.name as patient_name, a.status, a.start_time, a.updated_at
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.clinic_id = ?
    ORDER BY a.updated_at DESC
    LIMIT 5
  `).all(req.user.clinic_id);
  res.json(activity);
});

app.get('/api/dashboard/chart', authenticateToken, (req: any, res) => {
  // Get appointments count for last 6 months
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthStr = d.toISOString().slice(0, 7); // YYYY-MM
    months.push(monthStr);
  }

  const data = months.map(month => {
    const count = db.prepare(`
      SELECT count(*) as count 
      FROM appointments 
      WHERE clinic_id = ? AND strftime('%Y-%m', start_time) = ?
    `).get(req.user.clinic_id, month) as any;
    
    // Format month name (e.g., 'Jan')
    const [y, m] = month.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    const name = date.toLocaleString('pt-BR', { month: 'short' });
    
    return { name: name.charAt(0).toUpperCase() + name.slice(1), patients: count.count };
  });

  res.json(data);
});


// Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
