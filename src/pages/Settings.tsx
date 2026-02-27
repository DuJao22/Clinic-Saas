import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Save, Clock, Check, Users, Plus, Trash2 } from 'lucide-react';

interface DaySchedule {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_open: boolean;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'doctor' | 'receptionist';
  specialty?: string;
}

const DAYS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'schedule' | 'users'>('schedule');
  
  // Schedule State
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  
  // Users State
  const [users, setUsers] = useState<User[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'doctor',
    specialty: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchSchedule();
    fetchUsers();
  }, []);

  const fetchSchedule = async () => {
    try {
      const res = await fetch('/api/settings/schedule');
      if (res.ok) {
        const data = await res.json();
        setSchedule(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSchedule = (index: number, field: keyof DaySchedule, value: any) => {
    const newSchedule = [...schedule];
    newSchedule[index] = { ...newSchedule[index], [field]: value };
    setSchedule(newSchedule);
  };

  const handleSaveSchedule = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule })
      });
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Horário de funcionamento atualizado com sucesso!' });
      } else {
        throw new Error('Falha ao salvar');
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao salvar as configurações.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      
      if (res.ok) {
        setShowUserModal(false);
        fetchUsers();
        setNewUser({ name: '', email: '', password: '', role: 'doctor', specialty: '' });
        setMessage({ type: 'success', text: 'Usuário adicionado com sucesso!' });
      } else {
        throw new Error('Falha ao adicionar usuário');
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao adicionar usuário.' });
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUsers();
        setMessage({ type: 'success', text: 'Usuário excluído com sucesso!' });
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao excluir usuário');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando configurações...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configurações da Clínica</h1>
          <p className="text-slate-500">Gerencie o horário de funcionamento e equipe.</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {message.type === 'success' && <Check className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'schedule' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Horários
          </div>
          {activeTab === 'schedule' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'users' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Equipe
          </div>
          {activeTab === 'users' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
        </button>
      </div>

      {activeTab === 'schedule' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Horário de Funcionamento
            </h2>
            <button 
              onClick={handleSaveSchedule}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm disabled:opacity-50 transition-all text-sm"
            >
              {saving ? 'Salvando...' : <><Save className="w-4 h-4" /> Salvar Alterações</>}
            </button>
          </div>
          
          <div className="divide-y divide-slate-100">
            {schedule.map((day, index) => (
              <div key={day.day_of_week} className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${!day.is_open ? 'opacity-60 bg-slate-50/50' : ''}`}>
                <div className="flex items-center gap-4 w-48">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={day.is_open}
                      onChange={(e) => handleUpdateSchedule(index, 'is_open', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <span className="font-medium text-slate-900">{DAYS[day.day_of_week]}</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Abre:</span>
                    <input 
                      type="time" 
                      disabled={!day.is_open}
                      value={day.open_time}
                      onChange={(e) => handleUpdateSchedule(index, 'open_time', e.target.value)}
                      className="p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                  <span className="text-slate-300">—</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Fecha:</span>
                    <input 
                      type="time" 
                      disabled={!day.is_open}
                      value={day.close_time}
                      onChange={(e) => handleUpdateSchedule(index, 'close_time', e.target.value)}
                      className="p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                </div>
                
                <div className="w-24 text-right text-sm font-medium text-slate-500">
                  {day.is_open ? 'Aberto' : 'Fechado'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button 
              onClick={() => setShowUserModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Adicionar Colaborador
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-slate-600">Nome</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-slate-600">Email</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-slate-600">Função</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-slate-600">Especialidade</th>
                  <th className="text-right py-3 px-6 text-sm font-semibold text-slate-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-6 font-medium text-slate-900">{u.name}</td>
                    <td className="py-3 px-6 text-slate-600">{u.email}</td>
                    <td className="py-3 px-6">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'doctor' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {u.role === 'admin' ? 'Administrador' : u.role === 'doctor' ? 'Médico' : 'Recepcionista'}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-slate-600">{u.specialty || '-'}</td>
                    <td className="py-3 px-6 text-right">
                      {u.id !== user?.id && (
                        <button 
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir usuário"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Novo Colaborador</h2>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                <input required type="text" className="w-full p-2 border rounded-lg" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input required type="email" className="w-full p-2 border rounded-lg" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                <input required type="password" className="w-full p-2 border rounded-lg" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Função</label>
                <select className="w-full p-2 border rounded-lg" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                  <option value="doctor">Médico</option>
                  <option value="receptionist">Recepcionista</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              {newUser.role === 'doctor' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Especialidade</label>
                  <input required type="text" className="w-full p-2 border rounded-lg" value={newUser.specialty} onChange={e => setNewUser({...newUser, specialty: e.target.value})} />
                </div>
              )}
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
