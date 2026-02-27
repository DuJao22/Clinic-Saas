import React, { useState, useEffect } from 'react';
import { Plus, Search, User, Phone, Mail, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Patient {
  id: number;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  insurance_card_number: string;
}

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newPatient, setNewPatient] = useState({
    name: '',
    cpf: '',
    dob: '',
    phone: '',
    email: '',
    address: '',
    insurance_id: '',
    insurance_card_number: '',
    insurance_validity: '',
    notes: ''
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    const res = await fetch('/api/patients');
    const data = await res.json();
    setPatients(data);
  };

  const handleEdit = (patient: any) => {
    setNewPatient({
      name: patient.name,
      cpf: patient.cpf,
      dob: patient.dob || '',
      phone: patient.phone || '',
      email: patient.email || '',
      address: patient.address || '',
      insurance_id: patient.insurance_id || '',
      insurance_card_number: patient.insurance_card_number || '',
      insurance_validity: patient.insurance_validity || '',
      notes: patient.notes || ''
    });
    setEditingId(patient.id);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/patients/${editingId}` : '/api/patients';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatient)
      });
      
      if (res.ok) {
        setShowModal(false);
        fetchPatients();
        setNewPatient({
          name: '', cpf: '', dob: '', phone: '', email: '', address: '',
          insurance_id: '', insurance_card_number: '', insurance_validity: '', notes: ''
        });
        setEditingId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.cpf.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Pacientes</h1>
        <button 
          onClick={() => {
            setNewPatient({
              name: '', cpf: '', dob: '', phone: '', email: '', address: '',
              insurance_id: '', insurance_card_number: '', insurance_validity: '', notes: ''
            });
            setEditingId(null);
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Paciente
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Nome</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">CPF</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Contato</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Convênio</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPatients.map((patient) => (
              <tr key={patient.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                      {patient.name.charAt(0)}
                    </div>
                    <span className="font-medium text-slate-900">{patient.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-600 font-mono text-sm">{patient.cpf}</td>
                <td className="py-3 px-4">
                  <div className="flex flex-col text-sm text-slate-500">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {patient.phone}</span>
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {patient.email}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">{patient.insurance_card_number || '-'}</td>
                <td className="py-3 px-4 text-right">
                  <button 
                    onClick={() => handleEdit(patient)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredPatients.length === 0 && (
          <div className="p-8 text-center text-slate-500">Nenhum paciente encontrado.</div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">{editingId ? 'Editar Paciente' : 'Novo Paciente'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo *</label>
                  <input required type="text" className="w-full p-2 border rounded-lg" value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CPF *</label>
                  <input required type="text" className="w-full p-2 border rounded-lg" value={newPatient.cpf} onChange={e => setNewPatient({...newPatient, cpf: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data de Nascimento</label>
                  <input type="date" className="w-full p-2 border rounded-lg" value={newPatient.dob} onChange={e => setNewPatient({...newPatient, dob: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                  <input type="text" className="w-full p-2 border rounded-lg" value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                  <input type="email" className="w-full p-2 border rounded-lg" value={newPatient.email} onChange={e => setNewPatient({...newPatient, email: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
                  <input type="text" className="w-full p-2 border rounded-lg" value={newPatient.address} onChange={e => setNewPatient({...newPatient, address: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Carteirinha #</label>
                  <input type="text" className="w-full p-2 border rounded-lg" value={newPatient.insurance_card_number} onChange={e => setNewPatient({...newPatient, insurance_card_number: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Validade</label>
                  <input type="date" className="w-full p-2 border rounded-lg" value={newPatient.insurance_validity} onChange={e => setNewPatient({...newPatient, insurance_validity: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                  <textarea className="w-full p-2 border rounded-lg" rows={3} value={newPatient.notes} onChange={e => setNewPatient({...newPatient, notes: e.target.value})}></textarea>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar Paciente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
