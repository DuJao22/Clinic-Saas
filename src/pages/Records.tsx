import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Clock, FileText, CheckCircle, User, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function Records() {
  const { user } = useAuth();
  const [waitingList, setWaitingList] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientHistory, setPatientHistory] = useState<any[]>([]);
  const [activeAppointment, setActiveAppointment] = useState<any>(null);
  
  // Consultation Form
  const [consultation, setConsultation] = useState({
    chief_complaint: '',
    anamnesis: '',
    exams_requested: '',
    diagnosis: '',
    prescription: '',
    notes: ''
  });

  useEffect(() => {
    fetchWaitingList();
  }, []);

  const fetchWaitingList = async () => {
    // In a real app, we'd have a specific endpoint for this
    const today = format(new Date(), 'yyyy-MM-dd');
    const res = await fetch(`/api/appointments?start=${today}&end=${today}&doctor_id=${user?.id}`);
    const data = await res.json();
    setWaitingList(data.filter((a: any) => a.status === 'present' || a.status === 'in_progress'));
  };

  const startConsultation = async (appointment: any) => {
    setActiveAppointment(appointment);
    // Fetch patient details and history
    const res = await fetch(`/api/medical-records/${appointment.patient_id}`);
    const history = await res.json();
    setPatientHistory(history);
    
    // Update status to in_progress
    await fetch(`/api/appointments/${appointment.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' })
    });
  };

  const finishConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAppointment) return;

    await fetch('/api/medical-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: activeAppointment.patient_id,
        appointment_id: activeAppointment.id,
        ...consultation
      })
    });
    
    setActiveAppointment(null);
    setConsultation({
      chief_complaint: '', anamnesis: '', exams_requested: '', diagnosis: '', prescription: '', notes: ''
    });
    fetchWaitingList();
  };

  if (activeAppointment) {
    return (
      <div className="grid grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
        {/* Left: Patient History */}
        <div className="col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <User className="w-4 h-4" />
              {activeAppointment.patient_name}
            </h2>
            <p className="text-xs text-slate-500 mt-1">Histórico</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {patientHistory.map((record) => (
              <div key={record.id} className="border border-slate-100 rounded-lg p-3 text-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-700">{format(parseISO(record.created_at), 'dd/MM/yyyy')}</span>
                  <span className="text-xs text-slate-400">{record.doctor_name}</span>
                </div>
                <p className="text-slate-600 mb-1"><span className="font-medium">Diagnóstico:</span> {record.diagnosis}</p>
                <p className="text-slate-600"><span className="font-medium">Prescrição:</span> {record.prescription}</p>
              </div>
            ))}
            {patientHistory.length === 0 && <p className="text-center text-slate-400 text-sm">Nenhum registro anterior.</p>}
          </div>
        </div>

        {/* Right: Consultation Form */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-blue-50 flex justify-between items-center">
            <h2 className="font-bold text-blue-900 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Consulta Atual
            </h2>
            <div className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-1 rounded">
              {format(new Date(), 'HH:mm')}
            </div>
          </div>
          
          <form onSubmit={finishConsultation} className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Queixa Principal</label>
              <textarea required className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows={2} value={consultation.chief_complaint} onChange={e => setConsultation({...consultation, chief_complaint: e.target.value})}></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Anamnese</label>
                <textarea className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows={4} value={consultation.anamnesis} onChange={e => setConsultation({...consultation, anamnesis: e.target.value})}></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Exames Solicitados</label>
                <textarea className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows={4} value={consultation.exams_requested} onChange={e => setConsultation({...consultation, exams_requested: e.target.value})}></textarea>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Diagnóstico</label>
              <input type="text" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={consultation.diagnosis} onChange={e => setConsultation({...consultation, diagnosis: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prescrição</label>
              <textarea className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows={4} value={consultation.prescription} onChange={e => setConsultation({...consultation, prescription: e.target.value})}></textarea>
            </div>
            
            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setActiveAppointment(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium shadow-sm">
                <CheckCircle className="w-4 h-4" />
                Finalizar Consulta
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Prontuário Eletrônico</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" />
            Sala de Espera
          </h2>
        </div>
        
        {waitingList.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {waitingList.map((appt) => (
              <div key={appt.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    {appt.patient_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{appt.patient_name}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(parseISO(appt.start_time), 'HH:mm')}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => startConsultation(appt)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm"
                >
                  Iniciar Consulta
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500">
            Nenhum paciente aguardando.
          </div>
        )}
      </div>
    </div>
  );
}
