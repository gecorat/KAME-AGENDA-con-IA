import React, { useState, useEffect } from 'react';
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
  User,
  Key,
  Scale,
  Brain,
  Zap,
  Apple,
  BookOpen,
  Heart,
  Smile,
  Briefcase,
  Lightbulb,
  Mail,
  ArrowRight,
  Sun,
  Moon
} from 'lucide-react';
import { useAgendaStore } from '../lib/store';
import { NotificationCenter } from './NotificationCenter';
import { getClientTerm, getProfessionInfo } from '../lib/terminology';

interface AppLayoutProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenNewAppointment: () => void;
  onOpenAppointment?: (appointmentId: string) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeTab,
  onSelectTab,
  onOpenNewAppointment,
  onOpenAppointment,
  children
}) => {
  const { practiceSettings, waitlist, appointments, services, availability, currentUser, logout, unreadContactMessagesCount } = useAgendaStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dark mode state with persistence in localStorage and documentElement class sync
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('agenfacil_theme');
      if (saved) return saved === 'dark';
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('agenfacil_theme');
      if (saved === 'dark') {
        document.documentElement.classList.add('dark');
        setIsDarkMode(true);
      } else if (saved === 'light') {
        document.documentElement.classList.remove('dark');
        setIsDarkMode(false);
      }
    }
  }, []);

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    if (typeof window !== 'undefined') {
      if (nextMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('agenfacil_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('agenfacil_theme', 'light');
      }
    }
  };

  const waitingCount = waitlist.filter(w => w.status === 'waiting').length;
  const pendingPaymentsCount = appointments.filter(a => a.payment_status === 'pending' && a.status !== 'cancelled').length;
  const isGonzalo = !currentUser || currentUser?.email?.toLowerCase() === 'gonzalocorat@gmail.com';
  const isSuperAdmin = isGonzalo || currentUser?.role === 'superadmin' || Boolean(currentUser?.isSuperAdmin);
  const isTrial = !isSuperAdmin && (practiceSettings.subscription_plan === 'trial' || Boolean(practiceSettings.trial_active));
  const isPro = isSuperAdmin || practiceSettings.subscription_plan === 'pro';
  const trialDaysLeft = practiceSettings.trial_days_left ?? 14;

  // Calculate guide progress
  const isProfileComplete = Boolean(practiceSettings.practice_name?.trim() && practiceSettings.professional_name?.trim() && practiceSettings.phone?.trim());
  const isServicesComplete = services.some(s => s.active);
  const isHoursComplete = availability.some(d => d.enabled);
  const completedStepsList = practiceSettings.onboarding_completed_steps || [];
  const isBotTested = completedStepsList.includes('whatsapp') || appointments.some(a => a.origin === 'bot_whatsapp');
  const isPortalTested = completedStepsList.includes('share') || appointments.some(a => (a.origin as string) === 'patient_portal' || a.origin === 'public_booking');

  let completedStepsCount = 0;
  if (isProfileComplete) completedStepsCount++;
  if (isServicesComplete) completedStepsCount++;
  if (isHoursComplete) completedStepsCount++;
  if (isBotTested) completedStepsCount++;
  if (isPortalTested) completedStepsCount++;

  const professionInfo = getProfessionInfo(practiceSettings);
  const clientTermPlural = getClientTerm(practiceSettings, { plural: true, capitalize: true });

  const getHistoryIcon = () => {
    switch (professionInfo.id) {
      case 'legal_contable': return Scale;
      case 'psicologia': return Brain;
      case 'kinesiologia': return Zap;
      case 'nutricion': return Apple;
      case 'educacion_clases': return BookOpen;
      case 'estetica_belleza': return Sparkles;
      case 'veterinaria': return Heart;
      case 'odontologia': return Smile;
      default: return Stethoscope;
    }
  };

  const NAV_SECTIONS = [
    {
      title: 'Principal',
      items: [
        { id: 'dashboard', label: 'Panel General', icon: LayoutDashboard },
        { id: 'agenda', label: 'Agenda de Turnos', icon: Calendar },
        { id: 'pacientes', label: clientTermPlural, icon: professionInfo.id === 'legal_contable' ? Scale : Users },
        {
          id: 'cobros',
          label: professionInfo.id === 'legal_contable' ? 'Honorarios & Caja' : 'Cobros & Caja',
          icon: Receipt,
          badge: pendingPaymentsCount > 0 ? `${pendingPaymentsCount}` : undefined,
          badgeColor: 'bg-amber-100 text-amber-800'
        },
        {
          id: 'consultas',
          label: professionInfo.historyTabTitle,
          icon: getHistoryIcon(),
          badge: professionInfo.badgeWorkflow,
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
      title: 'WhatsApp & Bot',
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
        }
      ]
    },
    {
      title: 'Informes & Guía',
      items: [
        { id: 'metricas', label: 'Métricas & Estadísticas', icon: TrendingUp },
        {
          id: 'guia',
          label: 'Guía de Inicio',
          icon: Compass,
          badge: `${completedStepsCount}/5`,
          badgeColor: completedStepsCount === 5 ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-900 text-white'
        },
        {
          id: 'sugerencias',
          label: 'Buzón de Sugerencias',
          icon: Lightbulb,
          badge: 'Feedback',
          badgeColor: 'bg-amber-100 text-amber-800'
        }
      ]
    },
    {
      title: 'Configuración & Portal',
      items: [
        { id: 'editor-pagina', label: 'Página Web & Portal', icon: Palette, badge: 'Público', badgeColor: 'bg-emerald-100 text-emerald-800' },
        { id: 'servicios', label: 'Servicios & Aranceles', icon: DollarSign },
        { id: 'horarios', label: 'Horarios de Atención', icon: Clock },
        {
          id: 'google-sync',
          label: 'Google Workspace',
          icon: Cloud
        },
        { id: 'configuracion', label: 'Ajustes Generales', icon: Settings },
        {
          id: 'suscripcion',
          label: 'Planes & Precios',
          icon: CreditCard,
          badge: isTrial ? `${trialDaysLeft} DÍAS` : (practiceSettings.subscription_plan === 'pro' ? 'PRO AI' : 'BÁSICO'),
          badgeColor: isTrial ? 'bg-neutral-900 text-white' : (practiceSettings.subscription_plan === 'pro' ? 'bg-sky-100 text-sky-800' : 'bg-neutral-200 text-neutral-800')
        }
      ]
    },
    ...(isSuperAdmin ? [
      {
        title: 'Super Admin (Gonzalo)',
        items: [
          {
            id: 'superadmin-apis',
            label: 'APIs & Pasarelas (DLocal / MP)',
            icon: Key,
            badge: 'Admin',
            badgeColor: 'bg-amber-400 text-neutral-950 font-bold'
          },
          {
            id: 'superadmin-analytics',
            label: 'Estadísticas SaaS & Cobros',
            icon: TrendingUp,
            badge: 'Admin',
            badgeColor: 'bg-amber-400 text-neutral-950 font-bold'
          },
          {
            id: 'superadmin-mensajes',
            label: 'Mensajes Web (Contacto)',
            icon: Mail,
            badge: unreadContactMessagesCount > 0 ? `${unreadContactMessagesCount} NUEVO${unreadContactMessagesCount > 1 ? 'S' : ''}` : undefined,
            badgeColor: 'bg-rose-500 text-white font-bold animate-pulse'
          }
        ]
      }
    ] : [])
  ];

  const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap(s => s.items);
  const activeItem = ALL_NAV_ITEMS.find(item =>
    item.id === activeTab ||
    (activeTab === 'asistente' && item.id === 'chats') ||
    (activeTab === 'apis' && item.id === 'superadmin-apis') ||
    (activeTab === 'mensajes' && item.id === 'superadmin-mensajes')
  );

  return (
    <div className="min-h-screen bg-[#fafafa] text-neutral-900 flex flex-col font-sans max-w-full overflow-x-hidden">
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-200/80 md:hidden w-full max-w-full">
        <div className="px-3 sm:px-4 h-14 flex items-center justify-between gap-2 max-w-full">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-lg text-neutral-600 hover:bg-neutral-100 shrink-0"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div
              onClick={() => onSelectTab('dashboard')}
              className="flex items-center gap-1.5 cursor-pointer min-w-0"
            >
              <div className="w-7 h-7 rounded-md bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                A
              </div>
              <span className="font-bold text-sm tracking-tight text-neutral-900 font-display truncate">
                Agenfacil
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Theme Toggle (Mobile) */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className="p-1.5 text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
              title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              aria-label="Alternar modo claro y oscuro"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-neutral-600" />
              )}
            </button>

            <NotificationCenter onSelectTab={onSelectTab} onOpenAppointment={onOpenAppointment} />

            <button
              onClick={onOpenNewAppointment}
              className="px-2.5 sm:px-3 py-1 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-2xs flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Turno</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Panel - Fixed on Desktop (Left), Drawer on Mobile */}
      <aside
        id="main-sidebar-panel"
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-neutral-200/80 flex flex-col transform transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
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
              A
            </div>
            <div className="overflow-hidden">
              <span className="font-bold text-sm tracking-tight text-neutral-900 block leading-tight font-display">
                Agenfacil
              </span>
              <span className="text-[11px] text-neutral-500 font-medium truncate block leading-tight">
                {practiceSettings.practice_name}
              </span>
            </div>
          </div>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 md:hidden"
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
          {/* Landing Page Button (For all users & testing) */}
          <button
            type="button"
            id="sidebar-btn-landing"
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
              <Rocket className="w-3.5 h-3.5 text-emerald-600" />
              <span>Landing Page Web</span>
            </div>
            <ExternalLink className="w-3 h-3 text-neutral-400" />
          </button>

          {/* Public Patient Booking Page Button -> Tu Página */}
          <button
            type="button"
            id="sidebar-btn-portal"
            onClick={() => {
              onSelectTab('portal');
              setMobileMenuOpen(false);
            }}
            className={`w-full px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center justify-between ${
              activeTab === 'portal'
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white hover:bg-neutral-100 text-neutral-800 border-neutral-200'
            }`}
            title="Ver tu página pública de reservas de turnos"
          >
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-sky-600" />
              <span>Tu Página</span>
            </div>
            <ExternalLink className="w-3 h-3 text-neutral-400" />
          </button>

          {/* Trial Promotion Card for Free Trial Users */}
          {isTrial && (
            <div className="p-3 rounded-xl bg-gradient-to-br from-neutral-950 to-neutral-900 text-white border border-neutral-800 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Prueba Pro ({trialDaysLeft}d restantes)
                </span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-tight">
                Simulador IA activo. Al finalizar tu prueba, continúa con el <strong>Plan Pro AI</strong> para conectar tu WhatsApp real.
              </p>
              <button
                type="button"
                onClick={() => {
                  onSelectTab('suscripcion');
                  setMobileMenuOpen(false);
                }}
                className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-[11px] font-extrabold transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Activar Plan Pro AI</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

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
                  onSelectTab(isSuperAdmin ? 'landing' : 'portal');
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
                {isSuperAdmin
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
      <div className="md:pl-64 flex flex-col flex-1 min-w-0">
        {/* Desktop Top Header Bar with Context & Quick Info */}
        <header className="hidden md:flex sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-neutral-200/80 px-6 h-14 items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 font-medium">Panel</span>
            <span className="text-xs text-neutral-300">/</span>
            <h2 className="text-xs font-semibold text-neutral-800 font-display">
              {activeItem?.label || 'Agenfacil'}
            </h2>
            {activeItem?.badge && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200/60">
                {activeItem.badge}
              </span>
            )}
            {isTrial && (
              <button
                type="button"
                onClick={() => onSelectTab('suscripcion')}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition cursor-pointer"
                title="Ver planes para continuar con Plan Pro AI al finalizar el trial"
              >
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>Prueba Pro ({trialDaysLeft}d restantes)</span>
                <span className="text-amber-700 underline font-normal ml-0.5">Elegir Plan</span>
              </button>
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

            {/* Quick Landing Web View Button */}
            <button
              type="button"
              id="topbar-btn-landing"
              onClick={() => onSelectTab('landing')}
              className="px-2.5 py-1 text-xs font-medium text-neutral-700 hover:text-neutral-950 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Ver la Landing Page pública de Agenfacil"
            >
              <Globe className="w-3.5 h-3.5 text-neutral-500" />
              <span className="hidden lg:inline">Landing Web</span>
            </button>

            {/* Light / Dark Mode Toggle Button */}
            <button
              type="button"
              id="topbar-btn-theme"
              onClick={toggleDarkMode}
              className="p-1.5 text-neutral-600 hover:text-neutral-950 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg shadow-2xs transition-all flex items-center justify-center cursor-pointer"
              title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro (ideal para consultorios con poca luz)'}
              aria-label="Alternar modo claro y oscuro"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-neutral-600" />
              )}
            </button>

            {/* Notification Center */}
            <NotificationCenter onSelectTab={onSelectTab} onOpenAppointment={onOpenAppointment} />

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
                onSelectTab(isSuperAdmin ? 'landing' : 'portal');
              }}
              className="p-1.5 text-neutral-500 hover:text-rose-600 hover:bg-neutral-100 rounded-lg transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Application Container */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-6 min-w-0 overflow-x-hidden">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-neutral-200/60 bg-transparent py-4 px-6 text-center text-xs text-neutral-400">
          Agenfacil • Gestión clínica integral, turnos automatizados y atención médica inteligente
        </footer>
      </div>
    </div>
  );
};
