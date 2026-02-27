import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, Calendar, Clock, CheckCircle } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalPatients: 0,
    appointmentsToday: 0,
    waiting: 0,
    finished: 0
  });

  const [activity, setActivity] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data));

    fetch('/api/dashboard/activity')
      .then(res => res.json())
      .then(data => setActivity(data));

    fetch('/api/dashboard/chart')
      .then(res => res.json())
      .then(data => setChartData(data));
  }, []);

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Painel de Controle</h1>
        <div className="text-sm text-slate-500">
          Bem-vindo de volta, <span className="font-medium text-slate-900">{user?.name}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total de Pacientes" value={stats.totalPatients} icon={Users} color="bg-blue-500" />
        <StatCard title="Consultas Hoje" value={stats.appointmentsToday} icon={Calendar} color="bg-indigo-500" />
        <StatCard title="Sala de Espera" value={stats.waiting} icon={Clock} color="bg-amber-500" />
        <StatCard title="Finalizados" value={stats.finished} icon={CheckCircle} color="bg-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Consultas por Mês</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#F1F5F9' }}
                />
                <Bar dataKey="patients" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Atividade Recente</h3>
          <div className="space-y-4">
            {activity.length > 0 ? activity.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                  {item.patient_name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{item.patient_name}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(item.updated_at || item.start_time).toLocaleString('pt-BR')}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  item.status === 'finished' ? 'bg-green-100 text-green-700' :
                  item.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                  item.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {item.status === 'finished' ? 'Finalizado' :
                   item.status === 'scheduled' ? 'Agendado' :
                   item.status === 'cancelled' ? 'Cancelado' : item.status}
                </span>
              </div>
            )) : (
              <p className="text-slate-500 text-center py-4">Nenhuma atividade recente.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
