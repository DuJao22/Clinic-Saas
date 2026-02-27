import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, addMinutes, isSameDay, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, User, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';
import { ptBR } from 'date-fns/locale';

interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'confirmed' | 'present' | 'in_progress' | 'finished' | 'cancelled' | 'missed';
  patient_name: string;
  doctor_name: string;
}

interface Doctor {
  id: number;
  name: string;
}

export default function Schedule() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<number | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  // New Appointment State
  const [newAppt, setNewAppt] = useState({
    patient_id: '',
    doctor_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
    duration: 30,
    notes: ''
  });

  // Check-in State
  const [checkIn, setCheckIn] = useState({
    insurance_password: '',
    guide_number: '',
    reception_notes: ''
  });

  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    fetchDoctors();
    fetchPatients();
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [currentDate, selectedDoctor]);

  const DOCTOR_COLORS = [
    'bg-red-100 text-red-700 border-red-200',
    'bg-orange-100 text-orange-700 border-orange-200',
    'bg-amber-100 text-amber-700 border-amber-200',
    'bg-green-100 text-green-700 border-green-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-teal-100 text-teal-700 border-teal-200',
    'bg-cyan-100 text-cyan-700 border-cyan-200',
    'bg-sky-100 text-sky-700 border-sky-200',
    'bg-blue-100 text-blue-700 border-blue-200',
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-violet-100 text-violet-700 border-violet-200',
    'bg-purple-100 text-purple-700 border-purple-200',
    'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    'bg-pink-100 text-pink-700 border-pink-200',
    'bg-rose-100 text-rose-700 border-rose-200',
  ];

  const getDoctorColor = (doctorId: number) => {
    const index = doctors.findIndex(d => d.id === doctorId);
    if (index === -1) return 'bg-slate-100 text-slate-700 border-slate-200';
    return DOCTOR_COLORS[index % DOCTOR_COLORS.length];
  };

  const fetchDoctors = async () => {
    const res = await fetch('/api/users');
    const data = await res.json();
    const docs = data.filter((u: any) => u.role === 'doctor');
    setDoctors(docs);
    // Removed auto-selection to default to "All"
  };

  const fetchPatients = async () => {
    const res = await fetch('/api/patients');
    const data = await res.json();
    setPatients(data);
  };

  const fetchAppointments = async () => {
    const start = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const end = format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), 'yyyy-MM-dd');
    let url = `/api/appointments?start=${start}&end=${end}`;
    if (selectedDoctor) url += `&doctor_id=${selectedDoctor}`;
    
    const res = await fetch(url);
    const data = await res.json();
    setAppointments(data);
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    const start_time = `${newAppt.date}T${newAppt.time}:00`;
    const end_date = addMinutes(parseISO(start_time), newAppt.duration);
    const end_time = format(end_date, "yyyy-MM-dd'T'HH:mm:ss");

    await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: newAppt.patient_id,
        doctor_id: newAppt.doctor_id || selectedDoctor,
        start_time,
        end_time,
        notes: newAppt.notes
      })
    });
    setShowModal(false);
    fetchAppointments();
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    await fetch('/api/attendances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointment_id: selectedAppointment.id,
        ...checkIn
      })
    });
    setShowCheckInModal(false);
    fetchAppointments();
  };

  const weekDays = Array.from({ length: 5 }).map((_, i) => addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), i));
  const timeSlots = Array.from({ length: 20 }).map((_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const min = (i % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'confirmed': return 'bg-green-100 text-green-700 border-green-200';
      case 'present': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'finished': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-900">Agenda</h1>
          <div className="flex items-center bg-white rounded-lg border border-slate-200 p-1">
            <button onClick={() => setCurrentDate(addDays(currentDate, -7))} className="p-1 hover:bg-slate-50 rounded"><ChevronLeft className="w-5 h-5 text-slate-500" /></button>
            <span className="px-3 font-medium text-slate-700 capitalize">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</span>
            <button onClick={() => setCurrentDate(addDays(currentDate, 7))} className="p-1 hover:bg-slate-50 rounded"><ChevronRight className="w-5 h-5 text-slate-500" /></button>
          </div>
          <select 
            className="border border-slate-200 rounded-lg px-3 py-2 bg-white text-sm"
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Todos os Médicos</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </button>
      </div>

      {!selectedDoctor && (
        <div className="flex flex-wrap gap-3 mb-4 px-1">
          {doctors.map((d, i) => (
            <div key={d.id} className="flex items-center gap-2 text-xs font-medium bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
              <div className={`w-3 h-3 rounded-full ${DOCTOR_COLORS[i % DOCTOR_COLORS.length].split(' ')[0]}`}></div>
              <span className="text-slate-700">{d.name}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="grid grid-cols-6 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
          <div className="p-3 text-center text-xs font-semibold text-slate-500 border-r border-slate-200">Hora</div>
          {weekDays.map(day => (
            <div key={day.toString()} className="p-3 text-center border-r border-slate-200 last:border-r-0">
              <div className="text-xs font-semibold text-slate-500 uppercase">{format(day, 'EEE', { locale: ptBR })}</div>
              <div className={clsx("text-sm font-bold mt-1 w-8 h-8 rounded-full flex items-center justify-center mx-auto", isSameDay(day, new Date()) ? "bg-blue-600 text-white" : "text-slate-900")}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto">
          {timeSlots.map(time => (
            <div key={time} className="grid grid-cols-6 border-b border-slate-100 min-h-[60px]">
              <div className="p-2 text-xs text-slate-400 text-center border-r border-slate-100 sticky left-0 bg-white">{time}</div>
              {weekDays.map(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const slotAppts = appointments.filter(a => a.start_time.startsWith(`${dayStr}T${time}`));
                
                return (
                  <div key={dayStr} className="border-r border-slate-100 p-1 relative group hover:bg-slate-50 transition-colors">
                    {slotAppts.map(appt => (
                      <div 
                        key={appt.id}
                        onClick={() => { setSelectedAppointment(appt); setShowCheckInModal(true); }}
                        className={clsx(
                          "p-2 rounded-lg text-xs mb-1 cursor-pointer border shadow-sm transition-all hover:shadow-md",
                          getDoctorColor(appt.doctor_id)
                        )}
                      >
                        <div className="font-bold truncate">{appt.patient_name}</div>
                        {!selectedDoctor && (
                          <div className="text-[10px] opacity-90 truncate font-medium mb-0.5">{appt.doctor_name}</div>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-1 opacity-75">
                            <Clock className="w-3 h-3" />
                            {format(parseISO(appt.start_time), 'HH:mm')}
                          </div>
                          <div className={clsx(
                            "w-2 h-2 rounded-full",
                            appt.status === 'confirmed' ? "bg-green-500" :
                            appt.status === 'present' ? "bg-purple-500" :
                            appt.status === 'finished' ? "bg-slate-500" :
                            "bg-blue-500"
                          )} title={appt.status}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* New Appointment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Novo Agendamento</h2>
            <form onSubmit={handleCreateAppointment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Paciente</label>
                <select required className="w-full p-2 border rounded-lg" value={newAppt.patient_id} onChange={e => setNewAppt({...newAppt, patient_id: e.target.value})}>
                  <option value="">Selecione o Paciente</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                  <input required type="date" className="w-full p-2 border rounded-lg" value={newAppt.date} onChange={e => setNewAppt({...newAppt, date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hora</label>
                  <input required type="time" className="w-full p-2 border rounded-lg" value={newAppt.time} onChange={e => setNewAppt({...newAppt, time: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                <textarea className="w-full p-2 border rounded-lg" rows={3} value={newAppt.notes} onChange={e => setNewAppt({...newAppt, notes: e.target.value})}></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Agendar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Check-in Modal */}
      {showCheckInModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Check-in do Paciente</h2>
                <p className="text-sm text-slate-500 mt-1">{selectedAppointment.patient_name}</p>
              </div>
              <div className={clsx("px-2 py-1 rounded text-xs font-bold uppercase", getStatusColor(selectedAppointment.status))}>
                {selectedAppointment.status}
              </div>
            </div>

            {selectedAppointment.status === 'scheduled' || selectedAppointment.status === 'confirmed' ? (
              <form onSubmit={handleCheckIn} className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <label className="block text-sm font-bold text-blue-900 mb-1">Senha do Convênio *</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full p-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="Digite o código de autorização"
                    value={checkIn.insurance_password}
                    onChange={e => setCheckIn({...checkIn, insurance_password: e.target.value})}
                  />
                  <p className="text-xs text-blue-600 mt-1">Obrigatório para faturamento de convênio</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Número da Guia</label>
                  <input type="text" className="w-full p-2 border rounded-lg" value={checkIn.guide_number} onChange={e => setCheckIn({...checkIn, guide_number: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Observações da Recepção</label>
                  <textarea className="w-full p-2 border rounded-lg" rows={3} value={checkIn.reception_notes} onChange={e => setCheckIn({...checkIn, reception_notes: e.target.value})}></textarea>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowCheckInModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Fechar</button>
                  <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Confirmar Presença
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-slate-600">Este agendamento já está marcado como {selectedAppointment.status}.</p>
                <div className="flex justify-end">
                  <button onClick={() => setShowCheckInModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Fechar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
