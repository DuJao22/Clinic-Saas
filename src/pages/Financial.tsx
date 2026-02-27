import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function Financial() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    received: 0
  });

  useEffect(() => {
    fetchFinancials();
  }, []);

  const fetchFinancials = async () => {
    try {
      const res = await fetch('/api/financial');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
        
        const total = data.reduce((acc: number, curr: any) => acc + curr.amount, 0);
        const pending = data.filter((t: any) => t.status === 'pending').reduce((acc: number, curr: any) => acc + curr.amount, 0);
        const received = data.filter((t: any) => t.status === 'received').reduce((acc: number, curr: any) => acc + curr.amount, 0);
        
        setStats({ total, pending, received });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Relatórios Financeiros</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">Receita Total</h3>
            <div className="p-2 bg-blue-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">R$ {stats.total.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">Pendente</h3>
            <div className="p-2 bg-orange-50 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">R$ {stats.pending.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">Recebido</h3>
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">R$ {stats.received.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-800">Transações Recentes</h2>
        </div>
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Data</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Paciente</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Descrição</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Status</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.length > 0 ? transactions.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 text-sm text-slate-600">
                  {format(parseISO(t.created_at), 'dd/MM/yyyy')}
                </td>
                <td className="py-3 px-4 text-sm font-medium text-slate-900">{t.patient_name}</td>
                <td className="py-3 px-4 text-sm text-slate-600">Consulta</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    t.status === 'received' ? 'bg-green-100 text-green-700' :
                    t.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {t.status === 'received' ? 'Recebido' : t.status === 'pending' ? 'Pendente' : t.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-sm font-bold text-slate-900">
                  R$ {t.amount.toFixed(2)}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">Nenhuma transação encontrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Clock({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
