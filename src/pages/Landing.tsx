import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Stethoscope, Shield, Clock, CheckCircle } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">Clinic SaaS</span>
          </div>
          <div className="flex gap-4">
            <Link to="/login" className="px-4 py-2 text-slate-600 font-medium hover:text-blue-600 transition-colors">
              Área do Colaborador
            </Link>
            <Link to="/book" className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-shadow shadow-sm">
              Agendar Consulta
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-6 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <h1 className="text-5xl font-extrabold text-slate-900 leading-tight">
            Agendamento de Saúde Inteligente <br />
            <span className="text-blue-600">Simplificado.</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Agende suas consultas online 24/7. Escolha seu especialista, selecione um horário e receba confirmação instantânea via WhatsApp.
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/book" className="px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1">
              Agendar Agora
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Disponibilidade 24/7</h3>
            <p className="text-slate-500">
              Nosso sistema inteligente funciona o tempo todo para que você possa agendar consultas quando for melhor para você.
            </p>
          </div>
          <div className="p-8 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Aceitamos Convênios</h3>
            <p className="text-slate-500">
              Aceitamos os principais planos de saúde. Verifique facilmente sua cobertura durante o processo de agendamento.
            </p>
          </div>
          <div className="p-8 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Confirmação Instantânea</h3>
            <p className="text-slate-500">
              Receba confirmação imediata e lembretes automatizados para garantir que você nunca perca uma consulta.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-white">Clinic SaaS</span>
          </div>
          <div className="text-sm">
            &copy; {new Date().getFullYear()} Clinic SaaS. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
