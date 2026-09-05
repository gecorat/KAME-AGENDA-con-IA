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
  Stethoscope,
  CreditCard,
  Cloud,
  MessageSquare,
  Compass,
  Palette,
  Rocket,
  LogOut,
  User
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
  const { practiceSettings, waitlist, appointments, services, availability, currentUser, logout } = useAgendaStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const waitingCount = waitlist.filter(w => w.status === 'waiting').length;
  const pendingPaymentsCount = appointments.filter(a => a.payment_status === 'pending' && a.status !== 'cancelled').length;
  const isTrial = practiceSettings.subscription_plan === 'trial' || Boolean(practiceSettings.trial_active);
  const isPro = practiceSettings.subscription_plan === 'pro';
  const trialDaysLeft = practiceSettings.trial_days_left ?? 7;

  // Calculate guide progress
  const isProfileComplete = Boolean(practiceSettings.practice_name?.trim() && practiceSettings.professional_name?.trim() && practiceSettings.phone?.trim());
  const isServicesComplete = services.some(s => s.active);
  const isHoursComplete = availability.some(d => d.enabled);
  const completedStepsList = practiceSettings.onboarding_completed_steps || [];
  const isBotTested = completedStepsList.includes('whatsapp') || appointments.some(a => a.origin === 'bot_whatsapp');
  const isPortalTested = completedStepsList.includes('share') || appointments.some(a => a.origin === 'patient_portal');

  let completedStepsCount = 0;
  if (isProfileComplete) completedStepsCount++;
  if (isServicesComplete) completedStepsCount++;
  if (isHoursComplete) completedStepsCount++;
  if (isBotTested) completedStepsCount++;
  if (isPortalTested) completedStepsCount++;

  const NAV_SECTIONS = [
    {
      title: 'Principal',
      items: [
        {
          id: 'guia',
          label: 'Guía de Inicio',
          icon: Compass,
          badge: `${completedStepsCount}/5`,
          badgeColor: completedStepsCount === 5 ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-900 text-white'
        },
        { id: 'dashboard', label: 'Panel', icon: LayoutDashboard },
        { id: 'agenda', label: 'Agenda', icon: Calendar },
        { id: 'pacientes', label: 'Pacientes', icon: Users }
      ]
    },
    {
      title: 'Comunicación',
      items: [
        {
          id: 'chats',
          label: isPro ? 'WhatsApp & Chats' : 'Bot IA (Simulador)',
          icon: MessageSquare,
          badge: isPro ? (practiceSettings.whatsapp_connected ? 'En línea' : 'Configurar') : 'Trial',
          badgeColor: isPro ? (practiceSettings.whatsapp_connected ? 'bg-neutral-100 text-neutral-800' : 'bg-amber-100 text-amber-800') : 'bg-neutral-100 text-neutral-800'
        },
        {
          id: 'recordatorios',
          label: 'Recordatorios',
          icon: Bell,
          badge: 'Auto',
          badgeColor: 'bg-neutral-100 text-neutral-700'
        },
        {
          id: 'espera',
          label: 'Lista de Espera',
          icon: ListOrdered,
          badge: waitingCount > 0 ? `${waitingCount}` : undefined,
          badgeColor: 'bg-neutral-200 text-neutral-800'
        }
      ]
    },
    {
      title: 'Gestión & Caja',
      items: [
        {
          id: 'cobros',
          label: 'Cobros & Caja',
          icon: Receipt,
          badge: pendingPaymentsCount > 0 ? `${pendingPaymentsCount}` : undefined,
          badgeColor: 'bg-amber-100 text-amber-800'
        },
        {
          id: 'consultas',
          label: 'Historias Clínicas',
          icon: Stethoscope,
          badge: 'SOAP',
          badgeColor: 'bg-neutral-100 text-neutral-700'
        },
        { id: 'metricas', label: 'Métricas', icon: TrendingUp }
      ]
    },
    {
      title: 'Configuración',
      items: [
        { id: 'editor-pagina', label: 'Editor Página Pública', icon: Palette, badge: 'Diseño', badgeColor: 'bg-emerald-100 text-emerald-800' },
        { id: 'servicios', label: 'Aranceles', icon: DollarSign },
        { id: 'horarios', label: 'Horarios', icon: Clock },
        {
          id: 'google-sync',
          label: 'Google Workspace',
          icon: Cloud
        },
        { id: 'configuracion', label: 'Ajustes', icon: Settings },
        {
          id: 'suscripcion',
          label: 'Planes & Precios',
          icon: CreditCard,
          badge: isTrial ? `${trialDaysLeft} DÍAS` : (practiceSettings.subscription_plan === 'pro' ? 'PRO AI' : 'BÁSICO'),
          badgeColor: isTrial ? 'bg-neutral-900 text-white' : (practiceSettings.subscription_plan === 'pro' ? 'bg-sky-100 text-sky-800' : 'bg-neutral-200 text-neutral-800')
        }
      ]
    },
    ...(currentUser?.isSuperAdmin || currentUser?.email === 'gonzalocorat@gmail.com' ? [
      {
        title: 'Super Admin (Gonzalo)',
        items: [
          {
            id: 'superadmin-analytics',
            label: 'Estadísticas SaaS & Cobros',
            icon: TrendingUp,
            badge: 'Admin',
            badgeColor: 'bg-amber-400 text-neutral-950 font-bold'
          }
        ]
      }
    ] : [])
  ];

  const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap(s => s.items);
  const activeItem = ALL_NAV_ITEMS.find(item => item.id === activeTab || (activeTab === 'asistente' && item.id === 'chats'));

  return (
    <div className="min-h-screen bg-[#fafafa] text-neutral-900 flex flex-col font-sans">
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-200/80 lg:hidden">
        <div className="px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-lg text-neutral-600 hover:bg-neutral-100"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div
              onClick={() => onSelectTab('dashboard')}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-md bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
                K
              </div>
              <span className="font-bold text-sm tracking-tight text-neutral-900 font-display">
                AgendaPro <span className="text-neutral-500 font-normal">AI</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectTab('portal')}
              className="px-2.5 py-1 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-700 bg-white hover:bg-neutral-50 flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5 text-neutral-500" />
              <span className="hidden sm:inline">Portal</span>
            </button>

            <button
              onClick={onOpenNewAppointment}
              className="px-3 py-1 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-2xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Turno</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Panel - Fixed on Desktop (Left), Drawer on Mobile */}
      <aside
        id="main-sidebar-panel"
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-neutral-200/80 flex flex-col transform transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header at top of sidebar */}
        <div className="p-4 border-b border-neutral-200/80 flex items-center justify-between">
          <div
            onClick={() => {
              onSelectTab('dashboard');
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              K
            </div>
            <div className="overflow-hidden">
              <span className="font-bold text-sm tracking-tight text-neutral-900 block leading-tight font-display">
                AgendaPro <span className="text-neutral-500 font-normal">AI</span>
              </span>
              <span className="text-[11px] text-neutral-500 font-medium truncate block leading-tight">
                {practiceSettings.practice_name}
              </span>
            </div>
          </div>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Action Button: Nuevo Turno */}
        <div className="p-3 border-b border-neutral-100">
          <button
            type="button"
            id="sidebar-btn-new-appointment"
            onClick={() => {
              onOpenNewAppointment();
              setMobileMenuOpen(false);
            }}
            className="w-full px-3 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 active:scale-[0.99] rounded-lg shadow-2xs transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Turno</span>
          </button>
        </div>

        {/* Navigation Items (Grouped Sections) */}
        <nav className="flex-1 overflow-y-auto p-2.5 space-y-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-2 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id || (item.id === 'chats' && activeTab === 'asistente');

                  return (
                    <button
                      key={item.id}
                      type="button"
                      id={`sidebar-nav-${item.id}`}
                      onClick={() => {
                        onSelectTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                        isActive
                          ? 'bg-neutral-900 text-white font-semibold shadow-2xs'
                          : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100/70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 flex-shrink-0 ${
                            isActive ? 'text-white' : 'text-neutral-400'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-semibold flex-shrink-0 ${
                            isActive
                              ? 'bg-neutral-800 text-neutral-200'
                              : (item.badgeColor || 'bg-neutral-100 text-neutral-700')
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-neutral-200/80 space-y-2 bg-neutral-50/50">
          {/* Landing Page Button */}
          <button
            type="button"
            onClick={() => {
              onSelectTab('landing');
              setMobileMenuOpen(false);
            }}
            className={`w-full px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center justify-between ${
              activeTab === 'landing'
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white hover:bg-neutral-100 text-neutral-800 border-neutral-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Rocket className="w-3.5 h-3.5 text-amber-500" />
              <span>Landing Page Web</span>
            </div>
            <ExternalLink className="w-3 h-3 text-neutral-400" />
          </button>

          {/* Public Patient Portal Button */}
          <button
            type="button"
            id="sidebar-btn-portal"
            onClick={() => {
              onSelectTab('portal');
              setMobileMenuOpen(false);
            }}
            className={`w-full px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center justify-between ${
              activeTab === 'portal'
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-neutral-500" />
              <span>Portal Pacientes</span>
            </div>
            <ExternalLink className="w-3 h-3 text-neutral-400" />
          </button>

          {/* User Account & Logout Card */}
          <div className="p-2.5 rounded-xl bg-neutral-100 border border-neutral-200/70 text-xs">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-full object-cover shrink-0 border border-neutral-300"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-neutral-900 block truncate text-xs">
                    {currentUser?.name || 'Usuario'}
                  </span>
                  <span className="text-[10px] text-neutral-500 block truncate">
                    {currentUser?.email || 'Sesión iniciada'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                id="btn-logout-sidebar"
                onClick={async () => {
                  await logout();
                  onSelectTab('landing');
                  setMobileMenuOpen(false);
                }}
                className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-neutral-200 rounded-lg transition-colors shrink-0"
                title="Cerrar sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between pt-1.5 border-t border-neutral-200/80 text-[10px]">
              <span className="text-neutral-500">Plan actual:</span>
              <button
                type="button"
                onClick={() => {
                  onSelectTab('suscripcion');
                  setMobileMenuOpen(false);
                }}
                className="font-bold text-neutral-900 hover:underline uppercase tracking-wider"
              >
                {currentUser?.isSuperAdmin || currentUser?.email === 'gonzalocorat@gmail.com'
                  ? 'Super Admin'
                  : isTrial
                  ? `Trial (${trialDaysLeft}d)`
                  : practiceSettings.subscription_plan === 'pro'
                  ? 'Plan Pro AI'
                  : 'Plan Básico'}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area (offset by sidebar width on desktop) */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        {/* 7-Day Trial Notification Bar */}
        {isTrial && (
          <div className="bg-neutral-900 text-white px-4 sm:px-6 py-2 border-b border-neutral-800 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="font-semibold text-neutral-200 truncate">
                Prueba gratuita de 7 días activa
              </span>
              <span className="text-neutral-400 hidden md:inline">
                — Tienes acceso total a las funciones del Plan Básico para agendar y atender pacientes
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                {trialDaysLeft} días restantes
              </span>
              <button
                type="button"
                onClick={() => onSelectTab('suscripcion')}
                className="px-2.5 py-1 rounded bg-white hover:bg-neutral-100 text-neutral-900 text-[11px] font-semibold transition-colors shadow-2xs"
              >
                Elegir Plan
              </button>
            </div>
          </div>
        )}

        {/* Desktop Top Header Bar with Context & Quick Info */}
        <header className="hidden lg:flex sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-neutral-200/80 px-6 h-14 items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 font-medium">Panel</span>
            <span className="text-xs text-neutral-300">/</span>
            <h2 className="text-xs font-semibold text-neutral-800 font-display">
              {activeItem?.label || 'AgendaPro'}
            </h2>
            {activeItem?.badge && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200/60">
                {activeItem.badge}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-semibold text-neutral-800 block leading-tight">
                {practiceSettings.practice_name}
              </span>
              <span className="text-[10px] text-neutral-400 block leading-tight capitalize">
                {new Date().toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </div>

            <button
              onClick={() => onSelectTab('landing')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
                activeTab === 'landing'
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200'
              }`}
              title="Ver Landing Page ultra profesional"
            >
              <Rocket className="w-3.5 h-3.5 text-amber-500" />
              <span>Landing Page</span>
            </button>

            <button
              onClick={() => onSelectTab('portal')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                activeTab === 'portal'
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-200'
              }`}
              title="Probar portal de turnos para pacientes"
            >
              <Globe className="w-3.5 h-3.5 text-neutral-500" />
              <span>Portal Online</span>
            </button>

            <button
              onClick={onOpenNewAppointment}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 active:scale-[0.99] rounded-lg shadow-2xs transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Turno</span>
            </button>

            {/* Top Bar Quick Logout */}
            <button
              type="button"
              id="btn-logout-header"
              onClick={async () => {
                await logout();
                onSelectTab('landing');
              }}
              className="p-1.5 text-neutral-500 hover:text-rose-600 hover:bg-neutral-100 rounded-lg transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Application Container */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-neutral-200/60 bg-transparent py-4 px-6 text-center text-xs text-neutral-400">
          AgendaPro AI • Gestión clínica integral, turnos automatizados y atención médica con Inteligencia Artificial
        </footer>
      </div>
    </div>
  );
};
