import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, CheckCircle, ArrowRight, ArrowLeft, Stethoscope, Shield, DollarSign, UserPlus } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { ptBR } from 'date-fns/locale';

export default function PublicBooking() {
  const [step, setStep] = useState(1);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  
  const [booking, setBooking] = useState({
    specialty: '',
    doctor_id: '',
    doctor_name: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '',
    appointment_type: 'private', // private or insurance
    insurance_id: '',
    patient_name: '',
    patient_cpf: '',
    patient_phone: '',
    patient_email: '',
    password: ''
  });

  const [loadingSpecialties, setLoadingSpecialties] = useState(true);
  const [specialtiesError, setSpecialtiesError] = useState('');

  useEffect(() => {
    setLoadingSpecialties(true);
    fetch('/api/public/specialties')
      .then(res => {
        if (!res.ok) throw new Error('Falha ao carregar especialidades');
        return res.json();
      })
      .then(data => {
        setSpecialties(data);
        setLoadingSpecialties(false);
      })
      .catch(err => {
        console.error(err);
        setSpecialtiesError('Erro ao carregar especialidades.');
        setLoadingSpecialties(false);
      });
  }, []);

  useEffect(() => {
    if (booking.specialty) {
      fetch(`/api/public/doctors?specialty=${booking.specialty}`)
        .then(res => res.json())
        .then(setDoctors);
    }
  }, [booking.specialty]);

  useEffect(() => {
    if (booking.doctor_id && booking.date) {
      fetch(`/api/public/slots?doctor_id=${booking.doctor_id}&date=${booking.date}`)
        .then(res => res.json())
        .then(setSlots);
    }
  }, [booking.doctor_id, booking.date]);

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!booking.password) {
      alert('Por favor, informe uma senha.');
      return;
    }

    try {
      const res = await fetch('/api/public/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setStep(6); // Success step
      } else {
        alert(data.error || 'Erro ao agendar consulta');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao agendar consulta');
    }
  };

  // ... existing components ...

          {step === 5.2 && (
            <div className="space-y-6 max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-slate-900 text-center">Seus Dados</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                  <input required type="text" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={booking.patient_name} onChange={e => setBooking({...booking, patient_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
                  <input required type="text" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={booking.patient_cpf} onChange={e => setBooking({...booking, patient_cpf: e.target.value})} placeholder="000.000.000-00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefone (WhatsApp)</label>
                  <input required type="tel" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={booking.patient_phone} onChange={e => setBooking({...booking, patient_phone: e.target.value})} placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                  <input type="email" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={booking.patient_email} onChange={e => setBooking({...booking, patient_email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Crie uma Senha</label>
                  <input required type="password" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={booking.password} onChange={e => setBooking({...booking, password: e.target.value})} placeholder="Para acessar seus agendamentos" />
                </div>
                
                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg mt-4">
                  Confirmar Agendamento
                </button>
              </form>
            </div>
          )}

          {step === 5.3 && (
            <div className="space-y-6 max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-slate-900 text-center">Confirme seus Dados</h2>
              <div className="bg-slate-50 p-6 rounded-xl space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Nome</label>
                  <p className="font-medium text-slate-900">{booking.patient_name}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">CPF</label>
                  <p className="font-medium text-slate-900">{booking.patient_cpf}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Telefone</label>
                  <p className="font-medium text-slate-900">{booking.patient_phone}</p>
                </div>
                {booking.patient_email && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase">E-mail</label>
                    <p className="font-medium text-slate-900">{booking.patient_email}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sua Senha</label>
                <input required type="password" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={booking.password} onChange={e => setBooking({...booking, password: e.target.value})} placeholder="Digite sua senha para confirmar" />
              </div>
              
              <button onClick={handleSubmit} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg">
                Confirmar Agendamento
              </button>
              
              <button onClick={() => setStep(5.2)} className="w-full text-slate-500 font-medium py-2 hover:text-slate-800">
                Editar Dados
              </button>
            </div>
          )}

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl text-slate-800">Clínica SaaS</span>
        </div>
        {step < 6 && (
          <div className="text-sm font-medium text-slate-500">
            Passo {step} de 5
          </div>
        )}
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto p-6">
        {step > 1 && step < 6 && (
          <button onClick={handleBack} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-8 min-h-[400px]">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 text-center">Selecione uma Especialidade</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {loadingSpecialties ? (
                  <div className="col-span-full text-center py-12 text-slate-500">
                    Carregando especialidades...
                  </div>
                ) : specialtiesError ? (
                  <div className="col-span-full text-center py-12 text-red-500">
                    {specialtiesError}
                  </div>
                ) : specialties.length > 0 ? (
                  specialties.map(s => (
                    <button
                      key={s}
                      onClick={() => { setBooking({ ...booking, specialty: s }); handleNext(); }}
                      className="p-6 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all text-left flex items-center gap-4 group"
                    >
                      <div className="p-3 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                        <Stethoscope className="w-6 h-6 text-blue-600" />
                      </div>
                      <span className="font-semibold text-slate-800 text-lg">{s}</span>
                    </button>
                  ))
                ) : (
                  <div className="col-span-2 text-center text-slate-500 py-8">Nenhuma especialidade disponível.</div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 text-center">Selecione um Médico</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {doctors.map(d => (
                  <button
                    key={d.id}
                    onClick={() => { setBooking({ ...booking, doctor_id: d.id, doctor_name: d.name }); handleNext(); }}
                    className="p-6 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all text-left flex items-center gap-4 group"
                  >
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold text-lg group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                      {d.name.charAt(0)}
                    </div>
                    <div>
                      <span className="block font-semibold text-slate-800 text-lg">{d.name}</span>
                      <span className="text-sm text-slate-500">{d.specialty}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 text-center">Tipo de Consulta</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => { setBooking({ ...booking, appointment_type: 'private' }); handleNext(); }}
                  className="p-6 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all text-left flex items-center gap-4"
                >
                  <div className="p-3 bg-green-50 rounded-full">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <span className="block font-semibold text-slate-800 text-lg">Particular</span>
                    <span className="text-sm text-slate-500">Pagamento na clínica</span>
                  </div>
                </button>
                <button
                  onClick={() => { setBooking({ ...booking, appointment_type: 'insurance' }); handleNext(); }}
                  className="p-6 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all text-left flex items-center gap-4"
                >
                  <div className="p-3 bg-purple-50 rounded-full">
                    <Shield className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <span className="block font-semibold text-slate-800 text-lg">Convênio</span>
                    <span className="text-sm text-slate-500">Use seu plano de saúde</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 text-center">Selecione Data e Hora</h2>
              
              <div className="flex justify-center gap-2 mb-6 overflow-x-auto pb-2">
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = addDays(new Date(), i);
                  const dateStr = format(d, 'yyyy-MM-dd');
                  const isSelected = booking.date === dateStr;
                  return (
                    <button
                      key={i}
                      onClick={() => setBooking({ ...booking, date: dateStr, time: '' })}
                      className={clsx(
                        "flex flex-col items-center justify-center w-16 h-20 rounded-xl border transition-all flex-shrink-0",
                        isSelected ? "bg-blue-600 border-blue-600 text-white shadow-md" : "bg-white border-slate-200 text-slate-600 hover:border-blue-300"
                      )}
                    >
                      <span className="text-xs font-medium uppercase">{format(d, 'EEE', { locale: ptBR })}</span>
                      <span className="text-xl font-bold">{format(d, 'd')}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {slots.length > 0 ? slots.map(time => (
                  <button
                    key={time}
                    onClick={() => { setBooking({ ...booking, time }); handleNext(); }}
                    className={clsx(
                      "py-2 px-4 rounded-lg text-sm font-medium border transition-all",
                      booking.time === time 
                        ? "bg-blue-600 text-white border-blue-600" 
                        : "bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:text-blue-600"
                    )}
                  >
                    {time}
                  </button>
                )) : (
                  <div className="col-span-full text-center text-slate-500 py-8 bg-slate-50 rounded-xl">
                    Nenhum horário disponível para esta data.
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6 max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-slate-900 text-center">Você já possui cadastro?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setStep(5.1)}
                  className="p-6 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all text-center flex flex-col items-center gap-4"
                >
                  <div className="p-3 bg-blue-50 rounded-full">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="font-semibold text-slate-800 text-lg">Sim, já sou paciente</span>
                </button>
                <button
                  onClick={() => setStep(5.2)}
                  className="p-6 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all text-center flex flex-col items-center gap-4"
                >
                  <div className="p-3 bg-green-50 rounded-full">
                    <UserPlus className="w-6 h-6 text-green-600" />
                  </div>
                  <span className="font-semibold text-slate-800 text-lg">Não, é minha primeira vez</span>
                </button>
              </div>
            </div>
          )}

          {step === 5.1 && (
            <div className="space-y-6 max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-slate-900 text-center">Identificação</h2>
              <p className="text-center text-slate-500">Informe seu CPF para localizarmos seu cadastro.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
                  <input 
                    type="text" 
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={booking.patient_cpf} 
                    onChange={e => setBooking({...booking, patient_cpf: e.target.value})} 
                    placeholder="000.000.000-00" 
                  />
                </div>
                <button 
                  onClick={async () => {
                    if (!booking.patient_cpf) return alert('Por favor, informe o CPF');
                    try {
                      const res = await fetch(`/api/public/patient-check?cpf=${booking.patient_cpf}`);
                      const data = await res.json();
                      if (data.found) {
                        setBooking({
                          ...booking,
                          patient_name: data.name,
                          patient_phone: data.phone || '',
                          patient_email: data.email || ''
                        });
                        setStep(5.3); // Confirm details
                      } else {
                        alert('Cadastro não encontrado. Por favor, preencha seus dados.');
                        setStep(5.2); // Go to full form
                      }
                    } catch (err) {
                      alert('Erro ao verificar cadastro');
                    }
                  }}
                  className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg"
                >
                  Buscar Cadastro
                </button>
              </div>
            </div>
          )}

          {step === 5.2 && (
            <div className="space-y-6 max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-slate-900 text-center">Seus Dados</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                  <input required type="text" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={booking.patient_name} onChange={e => setBooking({...booking, patient_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
                  <input required type="text" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={booking.patient_cpf} onChange={e => setBooking({...booking, patient_cpf: e.target.value})} placeholder="000.000.000-00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefone (WhatsApp)</label>
                  <input required type="tel" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={booking.patient_phone} onChange={e => setBooking({...booking, patient_phone: e.target.value})} placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                  <input type="email" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={booking.patient_email} onChange={e => setBooking({...booking, patient_email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Crie uma Senha</label>
                  <input required type="password" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={booking.password} onChange={e => setBooking({...booking, password: e.target.value})} placeholder="Para acessar seus agendamentos" />
                </div>
                
                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg mt-4">
                  Confirmar Agendamento
                </button>
              </form>
            </div>
          )}

          {step === 5.3 && (
            <div className="space-y-6 max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-slate-900 text-center">Confirme seus Dados</h2>
              <div className="bg-slate-50 p-6 rounded-xl space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Nome</label>
                  <p className="font-medium text-slate-900">{booking.patient_name}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">CPF</label>
                  <p className="font-medium text-slate-900">{booking.patient_cpf}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Telefone</label>
                  <p className="font-medium text-slate-900">{booking.patient_phone}</p>
                </div>
                {booking.patient_email && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase">E-mail</label>
                    <p className="font-medium text-slate-900">{booking.patient_email}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sua Senha</label>
                <input required type="password" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={booking.password} onChange={e => setBooking({...booking, password: e.target.value})} placeholder="Digite sua senha para confirmar" />
              </div>
              
              <button onClick={handleSubmit} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg">
                Confirmar Agendamento
              </button>
              
              <button onClick={() => setStep(5.2)} className="w-full text-slate-500 font-medium py-2 hover:text-slate-800">
                Editar Dados
              </button>
            </div>
          )}

          {step === 6 && (
            <div className="text-center space-y-6 py-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Agendamento Confirmado!</h2>
                <p className="text-slate-500 max-w-md mx-auto">
                  Sua consulta com <strong>{booking.doctor_name}</strong> em <strong>{format(parseISO(booking.date), 'dd/MM/yyyy')}</strong> às <strong>{booking.time}</strong> foi agendada.
                </p>
              </div>
              <div className="bg-blue-50 p-6 rounded-xl max-w-md mx-auto text-left space-y-3">
                <p className="text-sm text-blue-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Uma confirmação foi enviada para seu WhatsApp.
                </p>
                <p className="text-sm text-blue-800 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Por favor, chegue 15 minutos antes.
                </p>
              </div>
              <div className="pt-8">
                <Link to="/login" className="text-blue-600 font-medium hover:underline">
                  Área do Colaborador
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
