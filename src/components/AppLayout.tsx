import React, { useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Bot,
  DollarSign,
  Clock,
  TrendingUp,
  Settings,
  Globe,
  Plus,
  Sparkles,
  Phone,
  ExternalLink,
  Menu,
  X,
  ListOrdered,
  Bell,
  Receipt,
  Stethoscope
} from 'lucide-react';
import { useAgendaStore } from '../lib/store';

interface AppLayoutProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenNewAppointment: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeTab,
  onSelectTab,
  onOpenNewAppointment,
  children
}) => {
  const { practiceSettings, waitlist, appointments } = useAgendaStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const waitingCount = waitlist.filter(w => w.status === 'waiting').length;
  const pendingPaymentsCount = appointments.filter(a => a.payment_status === 'pending' && a.status !== 'cancelled').length;

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Panel', icon: LayoutDashboard },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    {
      id: 'cobros',
      label: 'Cobros & Caja',
      icon: Receipt,
      badge: pendingPaymentsCount > 0 ? `${pendingPaymentsCount}` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    {
      id: 'espera',
      label: 'Lista de Espera',
      icon: ListOrdered,
      badge: waitingCount > 0 ? `${waitingCount}` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    {
      id: 'recordatorios',
      label: 'Recordatorios',
      icon: Bell,
      badge: 'Auto',
      badgeColor: 'bg-emerald-100 text-emerald-800'
    },
    { id: 'pacientes', label: 'Pacientes', icon: Users },
    {
      id: 'consultas',
      label: 'Historias Clínicas',
      icon: Stethoscope,
      badge: 'Voz & IA',
      badgeColor: 'bg-rose-100 text-rose-800'
    },
    { id: 'asistente', label: 'Bot IA WhatsApp', icon: Bot, badge: 'IA' },
    { id: 'servicios', label: 'Aranceles', icon: DollarSign },
    { id: 'horarios', label: 'Horarios', icon: Clock },
    { id: 'metricas', label: 'Métricas', icon: TrendingUp },
    { id: 'configuracion', label: 'Configuración', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-neutral-100/60 text-neutral-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg lg:hidden text-neutral-600 hover:bg-neutral-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div
              onClick={() => onSelectTab('dashboard')}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                K
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-tight text-neutral-900 block leading-tight">
                  Kame Agenda <span className="text-sky-600">AI</span>
                </span>
                <span className="text-[10px] text-neutral-500 font-medium block leading-tight">
                  {practiceSettings.practice_name}
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${isActive ? 'bg-sky-50 text-sky-700 shadow-2xs font-bold' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'}`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-600' : 'text-neutral-400'}`} />
                  {item.label}
                  {item.badge && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${item.badgeColor || 'bg-emerald-100 text-emerald-800'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2">
            {/* Direct preview public portal button */}
            <button
              onClick={() => onSelectTab('portal')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 ${activeTab === 'portal' ? 'bg-sky-600 text-white border-sky-600' : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'}`}
              title="Probar portal de turnos para pacientes"
            >
              <Globe className="w-3.5 h-3.5 text-sky-600" />
              <span className="hidden sm:inline">Portal Paciente</span>
            </button>

            {/* New appointment CTA */}
            <button
              onClick={onOpenNewAppointment}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo Turno</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-neutral-200 bg-white p-3 space-y-1 shadow-lg animate-in slide-in-from-top-2 duration-150">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${isActive ? 'bg-sky-50 text-sky-700 font-bold' : 'text-neutral-700 hover:bg-neutral-50'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-neutral-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${item.badgeColor || 'bg-emerald-100 text-emerald-800'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white/70 py-4 px-6 text-center text-xs text-neutral-400">
        Kame Agenda AI • Gestión médica, turnos online y atención automatizada con IA para Argentina & LATAM
      </footer>
    </div>
  );
};
