import React, { useState } from 'react';
import {
  Check,
  Star,
  ArrowRight,
  ShieldCheck,
  Zap,
  MessageSquare,
  Calendar,
  CreditCard,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Users,
  CheckCircle2,
  Lock,
  FileText,
  DollarSign,
  TrendingUp,
  Bot,
  Shield,
  HelpCircle,
  PhoneCall,
  Send,
  X,
  Mic,
  Globe,
  Award,
  Layers,
  CheckCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { LandingFooter } from '../components/landing/LandingFooter';
import { useAgendaStore } from '../lib/store';

interface LandingPageViewProps {
  onEnterApp: () => void;
  onOpenPortal: () => void;
  onOpenAuth?: (mode: 'login' | 'register') => void;
  onOpenContact?: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
}

interface ChatScenario {
  id: string;
  title: string;
  badge: string;
  description: string;
  patientName: string;
  messages: Array<{
    sender: 'patient' | 'bot' | 'system';
    text: string;
    time: string;
    actionBadge?: string;
  }>;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onEnterApp,
  onOpenPortal,
  onOpenAuth,
  onOpenContact,
  onOpenTerms,
  onOpenPrivacy
}) => {
  const { currentUser, logout } = useAgendaStore();
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<'basic' | 'pro'>('pro');
  const [trialEmail, setTrialEmail] = useState('');
  const [trialName, setTrialName] = useState('');
  const [trialSpecialty, setTrialSpecialty] = useState('Medicina General');
  const [trialSuccess, setTrialSuccess] = useState(false);

  // Pricing interactive controls
  const [pricingCurrency, setPricingCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // Handle initial #planes hash if present, then clean URL hash
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#planes') {
      setTimeout(() => {
        document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' });
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 100);
    }
  }, []);

  const handleOpenLogin = () => {
    if (onOpenAuth) {
      onOpenAuth('login');
    } else {
      onEnterApp();
    }
  };

  const handleOpenRegister = (plan: 'basic' | 'pro' = 'pro') => {
    setSelectedPlanForModal(plan);
    if (onOpenAuth) {
      onOpenAuth('register');
    } else {
      setShowTrialModal(true);
    }
  };

  // Interactive WhatsApp mobile preview scenarios
  const [activeScenarioId, setActiveScenarioId] = useState<string>('reserva');

  const SCENARIOS: ChatScenario[] = [
    {
      id: 'reserva',
      title: 'Reserva 24/7 de noche',
      badge: 'Domingo 23:15 hs',
      description: 'La IA agenda al paciente mientras duermes, sin intervención humana.',
      patientName: 'Mariana Gómez',
      messages: [
        {
          sender: 'patient',
          text: 'Hola Dra.! Buenas noches, quería saber si tiene turnos disponibles para esta semana por favor.',
          time: '23:14'
        },
        {
          sender: 'bot',
          text: '¡Hola Mariana! 👋 Con gusto te ayudo a coordinar. Para esta semana tengo disponibilidad el *Jueves a las 11:00 hs* o el *Viernes a las 16:30 hs*. ¿Cuál te queda más cómodo?',
          time: '23:15'
        },
        {
          sender: 'patient',
          text: 'El jueves a las 11:00 me viene perfecto.',
          time: '23:15'
        },
        {
          sender: 'bot',
          text: '¡Excelente! Para confirmar la reserva solicitamos una seña de *$5.000* (se descuenta del total). Podés transferir al Alias: *consultorio.dra.gomez* o pagar con Mercado Pago: agenfacil.com/pay/m-gomez',
          time: '23:16',
          actionBadge: 'Link de pago generado'
        },
        {
          sender: 'system',
          text: '💳 Seña de $5.000 acreditada con éxito vía Mercado Pago. Turno registrado en Google Calendar.',
          time: '23:18'
        },
        {
          sender: 'bot',
          text: '¡Seña recibida con éxito! 🎉 Tu turno del *Jueves a las 11:00 hs* está 100% confirmado. Te esperamos en Av. Santa Fe 2450, Piso 4.',
          time: '23:18'
        }
      ]
    },
    {
      id: 'sena',
      title: 'Cobro de Seña con Alias',
      badge: 'Cero Ausentismo',
      description: 'Elimina las inasistencias exigiendo anticipo bancario directo a tu cuenta.',
      patientName: 'Esteban Martínez',
      messages: [
        {
          sender: 'patient',
          text: 'Buenas tardes, quiero sacar turno para primera consulta.',
          time: '14:20'
        },
        {
          sender: 'bot',
          text: '¡Hola Esteban! Para primera consulta tenemos turno el *Miércoles a las 15:00 hs*. El valor es de $25.000 y se confirma abonando una seña de *$7.000* a nuestro Alias bancario.',
          time: '14:20'
        },
        {
          sender: 'patient',
          text: 'Genial, ¿cuál es el Alias bancario?',
          time: '14:21'
        },
        {
          sender: 'bot',
          text: 'El Alias es: *dr.benitez.traumato* (Banco Galicia). El dinero entra directamente a nuestra cuenta. Cuando transfieras, avísame por acá.',
          time: '14:21'
        },
        {
          sender: 'patient',
          text: 'Ya te transferí los $7.000!',
          time: '14:23'
        },
        {
          sender: 'system',
          text: '✅ Transferencia bancaria validada. Turno asegurado sin riesgo de hueco.',
          time: '14:24'
        }
      ]
    },
    {
      id: 'cancelacion',
      title: 'Liberación de Hueco',
      badge: 'Lista de Espera',
      description: 'Si un paciente cancela, la IA ofrece el lugar al siguiente en espera.',
      patientName: 'Carlos Rossi',
      messages: [
        {
          sender: 'patient',
          text: 'Doctor, disculpe, se me complicó con el trabajo y mañana no voy a poder ir a las 10:00.',
          time: '09:05'
        },
        {
          sender: 'bot',
          text: 'Comprendo Carlos, gracias por avisar con anticipación. Ya cancelé tu turno de mañana y te reprogramamos para el próximo martes.',
          time: '09:05'
        },
        {
          sender: 'system',
          text: '⚡ Turno de 10:00 hs liberado. Ofreciendo automáticamente a 3 pacientes en Lista de Espera...',
          time: '09:06'
        },
        {
          sender: 'bot',
          text: '¡El turno libre ya fue ocupado por Lucía Álvarez de la lista de espera! Tu agenda sigue 100% llena.',
          time: '09:08'
        }
      ]
    }
  ];

  const activeScenario = SCENARIOS.find(s => s.id === activeScenarioId) || SCENARIOS[0];

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const handleStartTrial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trialEmail) return;
    setTrialSuccess(true);
    confetti({ particleCount: 80, spread: 70 });
    setTimeout(() => {
      setShowTrialModal(false);
      setTrialSuccess(false);
      onEnterApp();
    }, 1400);
  };

  // Pricing matrix data
  const pricingData = {
    basic: {
      id: 'basic',
      name: 'Plan Esencial',
      badge: 'Consultorio Básico',
      tagline: 'Ideal para profesionales independientes que buscan ordenar su agenda y terminar con el desorden de turnos.',
      priceMonthlyARS: 29000,
      priceAnnualARS: 299000, // ~15% off
      priceMonthlyUSD: 29,
      priceAnnualUSD: 299,
      featuresIncluded: [
        '1 Profesional de la salud independiente',
        'Turnos y Pacientes ilimitados sin comisiones',
        'Portal web público de turnos online 24/7 personalizable',
        'Agenda interactiva visual (Vistas Día, Semana, Mes)',
        'Recordatorios por WhatsApp con 1 clic (manual rápido)',
        'Control de caja diaria, aranceles y cobros',
        'Ficha médica digital con antecedentes y datos de contacto',
        'Lista de espera manual para pacientes interesados',
        'Soporte estándar por correo electrónico'
      ],
      featuresExcluded: [
        'Bot de WhatsApp Autónomo 24/7 con Inteligencia Artificial',
        'Cobro de Señas automático con CBU/CVU o Mercado Pago',
        'Historias Clínicas Inteligentes con Dictado por Voz y SOAP IA',
        'Smart Waitlist con reasignación autónoma de cancelaciones',
        'Sincronización en vivo con Google Calendar'
      ]
    },
    pro: {
      id: 'pro',
      name: 'Plan Pro AI',
      badge: 'MÁS ELEGIDO • RECOMENDADO',
      tagline: 'Automatización integral con Inteligencia Artificial. Ahorra +10 horas semanales y elimina inasistencias.',
      priceMonthlyARS: 49000,
      priceAnnualARS: 499000, // ~15% off
      priceMonthlyUSD: 49,
      priceAnnualUSD: 499,
      featuresIncluded: [
        'Todo lo incluido en el Plan Esencial',
        'Bot Autónomo de WhatsApp 24/7 con IA (atiende y agenda solo)',
        'Cobro de Señas con Alias bancario y Mercado Pago (Cero Ausentismo)',
        'Historias Clínicas con Dictado por Voz y Redacción SOAP médica con IA',
        'Smart Waitlist: Reasignación automática de cancelaciones por WhatsApp',
        'Sincronización bidireccional en tiempo real con Google Calendar',
        'Recetas oficiales y certificados médicos en PDF con Código QR',
        'Copias de seguridad y exportación automática a Google Sheets / Drive',
        'Soporte prioritario por WhatsApp directo y onboarding guiado'
      ]
    }
  };

  const getPriceDisplay = (plan: 'basic' | 'pro') => {
    const data = pricingData[plan];
    if (pricingCurrency === 'ARS') {
      if (billingCycle === 'monthly') {
        return {
          amount: '$29.000',
          amountPro: '$49.000',
          current: plan === 'basic' ? '$29.000' : '$49.000',
          period: '/ mes',
          subtext: 'Facturado mensualmente en pesos argentinos'
        };
      } else {
        return {
          amount: '$299.000',
          amountPro: '$499.000',
          current: plan === 'basic' ? '$299.000' : '$499.000',
          period: '/ año',
          subtext: 'Facturado anualmente (equivale a ~' + (plan === 'basic' ? '$24.916' : '$41.583') + ' / mes)'
        };
      }
    } else {
      if (billingCycle === 'monthly') {
        return {
          amount: '$29',
          amountPro: '$49',
          current: plan === 'basic' ? '$29' : '$49',
          period: 'USD / mes',
          subtext: 'Cobro internacional mensual en dólares'
        };
      } else {
        return {
          amount: '$299',
          amountPro: '$499',
          current: plan === 'basic' ? '$299' : '$499',
          period: 'USD / año',
          subtext: 'Cobro internacional anual (equivale a ~' + (plan === 'basic' ? '$24.90' : '$41.50') + ' USD/mes)'
        };
      }
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white overflow-x-hidden">
      {/* 
        GUARANTEE TOP ANNOUNCEMENT BAR (Zero-Risk Transparency)
      */}
      <div className="bg-neutral-950 text-white text-[11px] sm:text-xs py-2 px-4 text-center border-b border-neutral-800">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Garantía de Prueba:</span>
          </span>
          <span className="text-neutral-200">
            Prueba 14 días gratis sin compromiso.
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 font-extrabold text-[10px] tracking-wide uppercase">
            <Lock className="w-2.5 h-2.5" />
            No requiere tarjeta de crédito
          </span>
        </div>
      </div>

      {/* 
        PREMIUM HEADER (Ultra-Clean & Persuasive)
      */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="sticky top-0 bg-white/95 backdrop-blur-md z-40 border-b border-neutral-100 transition-all"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          {/* Brand Identity */}
          <div
            onClick={onEnterApp}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-neutral-950 text-white flex items-center justify-center font-extrabold text-sm shadow-xs group-hover:scale-105 transition-transform">
              AF
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-neutral-950">
                  Agenfacil
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  Consultorios & Salud
                </span>
              </div>
              <span className="text-[11px] text-neutral-500 font-medium">
                Asistente Médico IA en WhatsApp
              </span>
            </div>
          </div>

          {/* Persuasive Call To Action Group */}
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="#planes"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-xs font-semibold text-neutral-600 hover:text-neutral-950 px-2.5 sm:px-3 py-2 rounded-xl hover:bg-neutral-50 transition cursor-pointer"
            >
              Ver Planes y Beneficios
            </a>

            {currentUser ? (
              <>
                <button
                  type="button"
                  onClick={onEnterApp}
                  className="relative inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold shadow-xs transition-all hover:shadow-md cursor-pointer active:scale-98"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ir a mi Panel de Control</span>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-300" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleOpenLogin}
                  className="hidden sm:inline-block text-xs font-semibold text-neutral-700 hover:text-neutral-950 px-3 py-2 rounded-xl hover:bg-neutral-50 transition cursor-pointer"
                >
                  Ingresar
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenRegister('pro')}
                  className="relative inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold shadow-xs transition-all hover:shadow-md cursor-pointer active:scale-98"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Probar 14 Días Gratis</span>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-300" />
                </button>
              </>
            )}
          </div>
        </div>
      </motion.header>

      {/* HERO SECTION */}
      <section className="relative pt-12 sm:pt-16 pb-20 px-4 sm:px-6 overflow-hidden bg-gradient-to-b from-neutral-50/70 via-white to-white border-b border-neutral-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: High-Impact Persuasion Copy (7 cols) */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="lg:col-span-7 space-y-6 text-center lg:text-left"
            >
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-xs font-semibold text-emerald-900 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold">Asistente IA para WhatsApp en Argentina</span>
                <span className="text-emerald-700 hidden sm:inline">• Cero ausentismo</span>
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-5xl font-black text-neutral-950 tracking-tight leading-[1.15]">
                El asistente de WhatsApp que <span className="underline decoration-emerald-400 decoration-4 underline-offset-4">agenda pacientes</span> y <span className="underline decoration-neutral-300 decoration-4 underline-offset-4">cobra señas</span> mientras tú atiendes.
              </h1>

              {/* Subheadline */}
              <p className="text-base sm:text-lg text-neutral-600 font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Olvídate de contestar mensajes a deshoras y de perder ingresos por turnos vacíos. Conecta tu propio número de WhatsApp en 60 segundos: la inteligencia artificial atiende 24/7, responde con calidez médica, confirma turnos y cobra señas por Alias o Mercado Pago directo a tu cuenta.
              </p>

              {/* Primary Persuasive CTA Area */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
                <button
                  type="button"
                  onClick={() => handleOpenRegister('pro')}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Probar 14 Días Gratis</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Reassurance & Guarantee Micro-Copy */}
              <div className="pt-2 p-3 sm:p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-950">
                <div className="flex items-center gap-2 font-bold">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Garantía de Prueba: 100% Sin Tarjeta de Crédito</span>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-emerald-800 font-medium">
                  <span className="flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> 14 días acceso Pro
                  </span>
                  <span className="flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> Sin cobros sorpresa
                  </span>
                </div>
              </div>

              {/* Doctor Social Proof Badges */}
              <div className="pt-4 border-t border-neutral-200/60 flex items-center justify-center lg:justify-start gap-4">
                <div className="flex -space-x-2">
                  <img
                    className="w-8 h-8 rounded-full border-2 border-white object-cover"
                    src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=80&auto=format&fit=crop&q=80"
                    alt="Médico"
                  />
                  <img
                    className="w-8 h-8 rounded-full border-2 border-white object-cover"
                    src="https://images.unsplash.com/photo-1594824813689-5632d4b8e21a?w=80&auto=format&fit=crop&q=80"
                    alt="Dra"
                  />
                  <img
                    className="w-8 h-8 rounded-full border-2 border-white object-cover"
                    src="https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=80&auto=format&fit=crop&q=80"
                    alt="Doctor"
                  />
                </div>
                <div className="text-left text-xs">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                    <span className="font-bold text-neutral-900 ml-1">4.9/5</span>
                  </div>
                  <span className="text-neutral-500 text-[11px]">Elegido por más de 120 médicos y consultorios</span>
                </div>
              </div>
            </motion.div>

            {/* Right Column: AUTHENTIC COMPACT MOBILE MOCKUP */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
              className="lg:col-span-5 flex flex-col items-center justify-center"
            >
              {/* Interactive Scenario Buttons */}
              <div className="w-full max-w-sm mb-3 flex items-center justify-center gap-1.5 p-1 bg-neutral-100 rounded-xl border border-neutral-200">
                {SCENARIOS.map(sc => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setActiveScenarioId(sc.id)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      activeScenarioId === sc.id
                        ? 'bg-white text-neutral-900 shadow-2xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {sc.badge}
                  </button>
                ))}
              </div>

              {/* REALISTIC MOBILE SMARTPHONE FRAME */}
              <div className="relative w-[310px] sm:w-[330px] rounded-[42px] p-3 bg-neutral-950 shadow-2xl border-[4px] border-neutral-800 ring-1 ring-white/20">
                {/* Dynamic Island / Notch */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-neutral-950 rounded-full z-30 flex items-center justify-end px-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-800" />
                </div>

                {/* Smartphone Screen Canvas */}
                <div className="bg-[#0b141a] rounded-[32px] overflow-hidden text-white flex flex-col h-[520px] shadow-inner relative font-sans">
                  
                  {/* WhatsApp Native Top App Bar */}
                  <div className="bg-[#1f2c34] px-3 pt-6 pb-2.5 flex items-center justify-between border-b border-[#2a3942] z-20">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs text-white">
                          <Bot className="w-4 h-4" />
                        </div>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#1f2c34]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-neutral-100">Dra. Valenzuela</span>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 fill-emerald-400/20" />
                        </div>
                        <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                          <span>Asistente IA • En línea</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-neutral-300">
                      <PhoneCall className="w-3.5 h-3.5 opacity-80" />
                      <span className="text-[9px] bg-emerald-950 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-800/80">
                        24/7
                      </span>
                    </div>
                  </div>

                  {/* WhatsApp Wallpaper & Chat Bubbles Container */}
                  <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs bg-[#0b141a] bg-opacity-95">
                    
                    {/* Timestamp Pill */}
                    <div className="text-center my-1">
                      <span className="text-[9px] bg-[#182229] text-neutral-400 px-2.5 py-0.5 rounded-md shadow-2xs font-medium">
                        {activeScenario.badge}
                      </span>
                    </div>

                    {/* Chat Bubble Sequence */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeScenario.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-2.5"
                      >
                        {activeScenario.messages.map((msg, idx) => {
                          if (msg.sender === 'system') {
                            return (
                              <div
                                key={idx}
                                className="bg-emerald-950/80 text-emerald-200 border border-emerald-800/60 p-2.5 rounded-xl text-[11px] leading-snug flex items-center gap-2 shadow-xs"
                              >
                                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>{msg.text}</span>
                              </div>
                            );
                          }

                          const isPatient = msg.sender === 'patient';
                          return (
                            <div
                              key={idx}
                              className={`flex flex-col ${isPatient ? 'items-start' : 'items-end'}`}
                            >
                              <div
                                className={`p-2.5 rounded-2xl max-w-[88%] text-[11px] leading-relaxed shadow-xs ${
                                  isPatient
                                    ? 'bg-[#202c33] text-neutral-100 rounded-tl-xs'
                                    : 'bg-[#005c4b] text-white rounded-tr-xs'
                                }`}
                              >
                                <div>{msg.text}</div>
                                {msg.actionBadge && (
                                  <div className="mt-1.5 inline-block text-[9px] font-bold bg-emerald-900/90 text-emerald-200 px-2 py-0.5 rounded border border-emerald-600/50">
                                    {msg.actionBadge}
                                  </div>
                                )}
                                <div className="text-[9px] text-right mt-1 opacity-70 flex items-center justify-end gap-1">
                                  <span>{msg.time}</span>
                                  {!isPatient && <span className="text-sky-300">✓✓</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Mock WhatsApp Bottom Bar */}
                  <div className="bg-[#1f2c34] p-2 flex items-center gap-2 border-t border-[#2a3942]">
                    <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5 text-[11px] text-neutral-400 flex items-center justify-between">
                      <span>Escribe un mensaje...</span>
                      <Send className="w-3.5 h-3.5 text-neutral-400" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs">
                      <Bot className="w-4 h-4" />
                    </div>
                  </div>

                </div>
              </div>

              {/* Scenario Explanation Card below Phone */}
              <div className="mt-3 text-center max-w-xs">
                <p className="text-[11px] text-neutral-500 font-medium">
                  {activeScenario.description}
                </p>
              </div>

            </motion.div>

          </div>
        </div>
      </section>

      {/* THREE SIMPLIFIED STEPS TO ONBOARD */}
      <motion.section
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="py-20 px-4 sm:px-6 max-w-7xl mx-auto"
      >
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-extrabold tracking-widest text-emerald-700 uppercase bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Activación Instantánea
          </span>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-neutral-950">
            Comienza a operar en 3 sencillos pasos
          </h2>
          <p className="text-sm text-neutral-600">
            Sin instalaciones complejas, sin cambiar de chip y sin necesidad de conocimientos técnicos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Step 1 */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="p-7 rounded-3xl border border-neutral-200 bg-white shadow-2xs hover:shadow-md transition-all space-y-4 relative"
          >
            <div className="w-12 h-12 rounded-2xl bg-neutral-950 text-white font-black text-base flex items-center justify-center shadow-xs">
              01
            </div>
            <h3 className="text-base font-bold text-neutral-950">
              Crea tu cuenta en 30 segundos
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Solo ingresas tu nombre y especialidad. Sin configuraciones complejas para comenzar a atender con IA.
            </p>
            <div className="pt-2 text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Acceso inmediato al sistema
            </div>
          </motion.div>

          {/* Step 2 */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="p-7 rounded-3xl border border-neutral-200 bg-white shadow-2xs hover:shadow-md transition-all space-y-4 relative"
          >
            <div className="w-12 h-12 rounded-2xl bg-neutral-950 text-white font-black text-base flex items-center justify-center shadow-xs">
              02
            </div>
            <h3 className="text-base font-bold text-neutral-950">
              Conecta tu WhatsApp con un código QR
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Escaneas el código en pantalla desde tu WhatsApp en 5 segundos, exactamente igual a abrir WhatsApp Web. Usas tu número de siempre.
            </p>
            <div className="pt-2 text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Sin pagarle a Meta ni trámites
            </div>
          </motion.div>

          {/* Step 3 */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="p-7 rounded-3xl border border-neutral-200 bg-white shadow-2xs hover:shadow-md transition-all space-y-4 relative"
          >
            <div className="w-12 h-12 rounded-2xl bg-neutral-950 text-white font-black text-base flex items-center justify-center shadow-xs">
              03
            </div>
            <h3 className="text-base font-bold text-neutral-950">
              Define tus horarios y tu Alias de cobro
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Elige el monto de seña que deseas exigir ($3.000, $5.000 o más). La IA atiende a tus pacientes, agenda citas y valida transferencias.
            </p>
            <div className="pt-2 text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Dinero directo a tu cuenta bancaria
            </div>
          </motion.div>
        </div>

        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={() => handleOpenRegister('pro')}
            className="px-6 py-3.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs shadow-xs transition inline-flex items-center gap-2 cursor-pointer active:scale-98"
          >
            <span>Crear mi consultorio ahora</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.section>

      {/* COMPARISON TABLE: BEFORE VS WITH AGENFACIL */}
      <motion.section
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="py-20 px-4 sm:px-6 bg-neutral-50 border-t border-b border-neutral-200/70"
      >
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              Impacto Real en tu Consultorio
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-neutral-950">
              La diferencia entre perder tiempo y operar en piloto automático
            </h2>
            <p className="text-sm text-neutral-600">
              Descubre por qué los consultorios tradicionales pierden miles de pesos por semana.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Without AgendaPro */}
            <motion.div
              whileHover={{ y: -3 }}
              className="p-7 rounded-3xl bg-white border border-rose-200/80 shadow-xs space-y-4"
            >
              <div className="inline-flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wider bg-rose-50 px-3 py-1 rounded-full">
                <span>✕ Consultorio Tradicional</span>
              </div>
              <ul className="space-y-3 text-xs text-neutral-700">
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold text-sm">✕</span>
                  <span><strong>30% de inasistencias:</strong> Pacientes que no asisten y te dejan un hueco de 40 minutos en el consultorio.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold text-sm">✕</span>
                  <span><strong>Interrupciones constantes:</strong> Responder audios y mensajes mientras atiendes o en tus fines de semana.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold text-sm">✕</span>
                  <span><strong>Cobro manual incómodo:</strong> Pedir comprobantes por chat, verificar el homebanking y registrarlo en Excel.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold text-sm">✕</span>
                  <span><strong>Secretarias saturadas:</strong> Doble asignación de turnos y errores humanos en la libreta.</span>
                </li>
              </ul>
            </motion.div>

            {/* With Agenfacil */}
            <motion.div
              whileHover={{ y: -3 }}
              className="p-7 rounded-3xl bg-neutral-950 text-white shadow-xl space-y-4 border border-neutral-800 relative overflow-hidden"
            >
              <div className="inline-flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800">
                <span>✓ Con Agenfacil</span>
              </div>
              <ul className="space-y-3 text-xs text-neutral-200">
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 font-bold text-sm">✓</span>
                  <span><strong>Menos del 2% de ausentismo:</strong> El cobro de seña garantiza el compromiso del paciente desde el primer minuto.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 font-bold text-sm">✓</span>
                  <span><strong>Atención automática 24/7:</strong> La IA contesta amablemente a cualquier hora y agenda el turno en tu Google Calendar.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 font-bold text-sm">✓</span>
                  <span><strong>Seña directa a tu banco:</strong> Los pacientes pagan a tu propio CBU o Mercado Pago sin comisiones intermedias.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 font-bold text-sm">✓</span>
                  <span><strong>Recordatorios preventivos:</strong> Avisos por WhatsApp 24 horas y 2 horas antes con confirmación en un clic.</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* CORE CAPABILITIES (Comprehensive Grid & Fundamental Benefits) */}
      <motion.section
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="py-24 px-4 sm:px-6 max-w-7xl mx-auto"
      >
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold tracking-widest text-emerald-800 uppercase bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Ecosistema Clínico & Automatización Integral
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-neutral-950">
            Todo lo que tu práctica necesita en un solo lugar
          </h2>
          <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
            Diseñado específicamente para médicos, odontólogos, psicólogos y profesionales de la salud que buscan simplificar su día a día, eliminar ausencias y automatizar su atención 24/7 sin complejidades.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1. Bot WhatsApp IA */}
          <motion.div whileHover={{ y: -4 }} className="p-6 rounded-3xl border border-neutral-200/90 bg-white hover:border-emerald-500/40 hover:shadow-lg transition-all flex flex-col justify-between shadow-2xs group">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-neutral-950 text-white flex items-center justify-center group-hover:bg-emerald-600 transition-colors shadow-xs">
                <Bot className="w-5 h-5 text-emerald-400 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-base font-bold text-neutral-950">Bot de WhatsApp IA 24/7</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Mantiene conversaciones naturales y fluidas por WhatsApp. Responde preguntas sobre tratamientos, horarios libres y atiende de noche sin que toques tu celular.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Entiende audios de voz y texto</span>
            </div>
          </motion.div>

          {/* 2. Cobro de Señas & Validacion */}
          <motion.div whileHover={{ y: -4 }} className="p-6 rounded-3xl border border-neutral-200/90 bg-white hover:border-emerald-500/40 hover:shadow-lg transition-all flex flex-col justify-between shadow-2xs group">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-neutral-950 text-white flex items-center justify-center group-hover:bg-emerald-600 transition-colors shadow-xs">
                <CreditCard className="w-5 h-5 text-emerald-400 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-base font-bold text-neutral-950">Cobro de Señas & Alias Directo</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Pide un anticipo obligatorio para reservar. El paciente transfiere directo a tu CBU, CVU o Mercado Pago sin intermediarios ni retenciones sorpresa.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Reduce ausentismo a &lt; 2%</span>
            </div>
          </motion.div>

          {/* 3. Historias Clínicas & Dictado */}
          <motion.div whileHover={{ y: -4 }} className="p-6 rounded-3xl border border-neutral-200/90 bg-white hover:border-emerald-500/40 hover:shadow-lg transition-all flex flex-col justify-between shadow-2xs group">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-neutral-950 text-white flex items-center justify-center group-hover:bg-emerald-600 transition-colors shadow-xs">
                <FileText className="w-5 h-5 text-emerald-400 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-base font-bold text-neutral-950">Historias Clínicas SOAP</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Ficha digital médica con antecedentes, notas de evolución y diagnósticos CIE-10. Soporta dictado por voz y generación automática de resúmenes clínicos con IA.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Dictado por voz y copilot médico</span>
            </div>
          </motion.div>

          {/* 4. Sincronización Google Calendar */}
          <motion.div whileHover={{ y: -4 }} className="p-6 rounded-3xl border border-neutral-200/90 bg-white hover:border-emerald-500/40 hover:shadow-lg transition-all flex flex-col justify-between shadow-2xs group">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-neutral-950 text-white flex items-center justify-center group-hover:bg-emerald-600 transition-colors shadow-xs">
                <Calendar className="w-5 h-5 text-emerald-400 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-base font-bold text-neutral-950">Sincronización Google Calendar</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Cada turno reservado se refleja en tu calendario personal. Si bloqueas un horario por congresos o vacaciones, la IA no ofrecerá ese horario.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sincronización bidireccional</span>
            </div>
          </motion.div>

          {/* 5. Lista de Espera Inteligente */}
          <motion.div whileHover={{ y: -4 }} className="p-6 rounded-3xl border border-neutral-200/90 bg-white hover:border-emerald-500/40 hover:shadow-lg transition-all flex flex-col justify-between shadow-2xs group">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-neutral-950 text-white flex items-center justify-center group-hover:bg-emerald-600 transition-colors shadow-xs">
                <Users className="w-5 h-5 text-emerald-400 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-base font-bold text-neutral-950">Smart Waitlist Automatizada</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Si un paciente cancela o reprograma con anticipación, el sistema avisa automáticamente a los pacientes en espera para reocupar el turno en minutos.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cero huecos vacíos en tu día</span>
            </div>
          </motion.div>

          {/* 6. Recordatorios Multicanal */}
          <motion.div whileHover={{ y: -4 }} className="p-6 rounded-3xl border border-neutral-200/90 bg-white hover:border-emerald-500/40 hover:shadow-lg transition-all flex flex-col justify-between shadow-2xs group">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-neutral-950 text-white flex items-center justify-center group-hover:bg-emerald-600 transition-colors shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-base font-bold text-neutral-950">Recordatorios Preventivos</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Envía avisos automáticos por WhatsApp 24 horas y 2 horas antes de la cita con confirmación en 1 toque. El paciente confirma o avisa si no puede asistir.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Avisos por WhatsApp & Email</span>
            </div>
          </motion.div>

          {/* 7. Portal Web & Perfil Profesional */}
          <motion.div whileHover={{ y: -4 }} className="p-6 rounded-3xl border border-neutral-200/90 bg-white hover:border-emerald-500/40 hover:shadow-lg transition-all flex flex-col justify-between shadow-2xs group">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-neutral-950 text-white flex items-center justify-center group-hover:bg-emerald-600 transition-colors shadow-xs">
                <Globe className="w-5 h-5 text-emerald-400 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-base font-bold text-neutral-950">Portal Web & Link en Bio</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Obtén tu página web profesional (<code>agenfacil.com/u/tu-nombre</code>) para incluir en tu Instagram, Google Maps, tarjetas y WhatsApp Business.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Reservas 24/7 sin fricción</span>
            </div>
          </motion.div>

          {/* 8. Caja, Recibos & Métricas */}
          <motion.div whileHover={{ y: -4 }} className="p-6 rounded-3xl border border-neutral-200/90 bg-white hover:border-emerald-500/40 hover:shadow-lg transition-all flex flex-col justify-between shadow-2xs group">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-neutral-950 text-white flex items-center justify-center group-hover:bg-emerald-600 transition-colors shadow-xs">
                <TrendingUp className="w-5 h-5 text-emerald-400 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-base font-bold text-neutral-950">Finanzas, Recibos & Métricas</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Visualiza tu recaudación mensual, pacientes recurrentes y servicios más rentables. Emite recibos prolijos en PDF y exporta reportes para tu contador.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Reportes de facturación claros</span>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* 
        ========================================================================
        DEDICATED PRICING & BENEFITS SECTION (User Request Focus)
        ========================================================================
      */}
      <section id="planes" className="py-24 px-4 sm:px-6 bg-gradient-to-b from-neutral-50 via-white to-neutral-50 border-t border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-center max-w-3xl mx-auto space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-neutral-900 text-white text-xs font-bold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Planes & Precios Transparentes</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-neutral-950">
              Inversión clara y predecible para tu consultorio
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
              Comienza hoy con <strong>14 días de prueba gratis</strong> con todas las funciones Pro y el Simulador de WhatsApp IA desbloqueado. Al finalizar, continúa con el plan que mejor se adapte a tu práctica médica.
            </p>

            {/* Trial & Guarantee Banner Callout */}
            <div className="p-5 sm:p-6 rounded-3xl bg-emerald-50/80 border-2 border-emerald-300 text-left max-w-3xl mx-auto shadow-sm space-y-3">
              <div className="flex items-center gap-2.5 font-black text-sm text-emerald-950">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-neutral-950">Garantía de Prueba 100% Sin Tarjeta</div>
                  <div className="text-[11px] text-emerald-800 font-medium">14 días de acceso completo a todas las funciones sin ingresar datos de pago</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-emerald-200/70 text-xs text-neutral-800">
                <div className="flex items-start gap-2 bg-white/70 p-2.5 rounded-xl border border-emerald-100">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3] mt-0.5" />
                  <div>
                    <strong className="block text-neutral-950 text-[11px]">Sin Tarjeta ni CVC</strong>
                    <span className="text-[10px] text-neutral-600">No solicitamos ningún dato de tarjeta para comenzar.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-white/70 p-2.5 rounded-xl border border-emerald-100">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3] mt-0.5" />
                  <div>
                    <strong className="block text-neutral-950 text-[11px]">Cero Cobros Sorpresa</strong>
                    <span className="text-[10px] text-neutral-600">Al terminar los 14 días no se cobra nada automáticamente.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-white/70 p-2.5 rounded-xl border border-emerald-100">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3] mt-0.5" />
                  <div>
                    <strong className="block text-neutral-950 text-[11px]">Tú Tienes el Control</strong>
                    <span className="text-[10px] text-neutral-600">Eliges tú mismo si deseas contratar o no al finalizar.</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Interactive Currency & Billing Cycle Switchers */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
          >
            {/* Currency Selector (ARS / USD Suggestions) */}
            <div className="inline-flex p-1 bg-neutral-200/80 rounded-2xl border border-neutral-300/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setPricingCurrency('ARS')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  pricingCurrency === 'ARS'
                    ? 'bg-white text-neutral-950 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <span>🇦🇷 Pesos ($ ARS)</span>
              </button>
              <button
                type="button"
                onClick={() => setPricingCurrency('USD')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  pricingCurrency === 'USD'
                    ? 'bg-white text-neutral-950 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <span>🌎 Dólares (USD $)</span>
              </button>
            </div>

            {/* Billing Cycle Toggle (Monthly / Annual) */}
            <div className="inline-flex p-1 bg-neutral-200/80 rounded-2xl border border-neutral-300/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-neutral-950 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Mensual
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  billingCycle === 'annual'
                    ? 'bg-white text-neutral-950 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <span>Anual</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300/60">
                  ~15% OFF
                </span>
              </button>
            </div>
          </motion.div>

          {/* Pricing Cards Grid (The 2 Plans with Full Benefits) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch pt-4">
            
            {/* PLAN 1: PLAN ESENCIAL ($29.000 ARS / $29 USD) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ y: -4 }}
              className="rounded-3xl p-8 bg-white border border-neutral-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden"
            >
              <div className="space-y-6">
                {/* Plan Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                      {pricingData.basic.badge}
                    </span>
                    <h3 className="text-2xl font-black text-neutral-950 mt-0.5">
                      {pricingData.basic.name}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-neutral-100 text-neutral-800 flex items-center justify-center font-bold">
                    <Calendar className="w-5 h-5" />
                  </div>
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed min-h-[36px]">
                  {pricingData.basic.tagline}
                </p>

                {/* Price Display */}
                <div className="pt-2 pb-4 border-b border-neutral-100">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl sm:text-5xl font-black tracking-tight text-neutral-950">
                      {getPriceDisplay('basic').current}
                    </span>
                    <span className="text-sm font-bold text-neutral-500">
                      {getPriceDisplay('basic').period}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 font-medium mt-1">
                    {getPriceDisplay('basic').subtext}
                  </p>
                </div>

                {/* Benefits & Included Features */}
                <div className="space-y-3">
                  <div className="text-xs font-extrabold text-neutral-950 uppercase tracking-wider">
                    Lo que incluye el Plan Esencial:
                  </div>
                  <ul className="space-y-2.5 text-xs text-neutral-700">
                    {pricingData.basic.featuresIncluded.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3] mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Excluded comparison items (soft grayed out) */}
                  <div className="pt-2 border-t border-neutral-100 space-y-2 text-xs text-neutral-400">
                    {pricingData.basic.featuresExcluded.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 list-none line-through decoration-neutral-300 opacity-60">
                        <X className="w-4 h-4 text-neutral-400 shrink-0 stroke-[2] mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-8 mt-6 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => handleOpenRegister('basic')}
                  className="w-full py-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Prueba ahora 14 Días GRATIS</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div className="flex items-center justify-center gap-1.5 mt-2.5 text-[11px] text-emerald-800 font-semibold bg-emerald-50/80 py-1 px-2 rounded-lg border border-emerald-200/60">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Garantía: 100% Sin Tarjeta de Crédito</span>
                </div>
              </div>
            </motion.div>

            {/* PLAN 2: PLAN PRO AI ($49.000 ARS / $49 USD) - HIGHLIGHTED */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ y: -4 }}
              className="rounded-3xl p-8 bg-neutral-950 text-white border-2 border-emerald-500 shadow-xl hover:shadow-2xl transition-all flex flex-col justify-between relative overflow-hidden ring-4 ring-emerald-500/10"
            >
              {/* Top Accent Ribbon */}
              <div className="absolute top-0 right-0 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-extrabold text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl shadow-sm flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-white" />
                <span>MÁS ELEGIDO</span>
              </div>

              <div className="space-y-6">
                {/* Plan Header */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Inteligencia Artificial Médica
                    </span>
                    <h3 className="text-2xl font-black text-white mt-0.5">
                      {pricingData.pro.name}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center font-bold">
                    <Bot className="w-5 h-5" />
                  </div>
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed min-h-[36px]">
                  {pricingData.pro.tagline}
                </p>

                {/* Price Display */}
                <div className="pt-2 pb-4 border-b border-neutral-800">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                      {getPriceDisplay('pro').current}
                    </span>
                    <span className="text-sm font-bold text-neutral-400">
                      {getPriceDisplay('pro').period}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    <span>{getPriceDisplay('pro').subtext}</span>
                  </p>
                </div>

                {/* Benefits & Included Features */}
                <div className="space-y-3">
                  <div className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCheck className="w-4 h-4" />
                    <span>Beneficios exclusivos del Plan Pro AI:</span>
                  </div>
                  <ul className="space-y-2.5 text-xs text-neutral-200">
                    {pricingData.pro.featuresIncluded.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[3] mt-0.5" />
                        <span className={idx < 5 ? 'font-semibold text-white' : ''}>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-8 mt-6 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => handleOpenRegister('pro')}
                  className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs sm:text-sm transition-all shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Sparkles className="w-4 h-4 text-neutral-950" />
                  <span>Prueba ahora 14 Días GRATIS</span>
                  <ArrowRight className="w-4 h-4 text-neutral-950" />
                </button>
                <div className="flex items-center justify-center gap-1.5 mt-2.5 text-[11px] text-emerald-300 font-semibold bg-emerald-950/60 py-1 px-2 rounded-lg border border-emerald-800/80">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Garantía: Sin Tarjeta • Sin Contratos</span>
                </div>
              </div>
            </motion.div>

          </div>

          {/* Guarantee and Transparent Payment Footnote */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="p-6 rounded-2xl bg-white border border-neutral-200/80 max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left text-xs text-neutral-600 shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-neutral-900">Garantía 100% Sin Tarjeta</div>
                <div className="text-[11px] text-neutral-500">Prueba 14 días sin ingresar ninguna tarjeta ni método de pago.</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-neutral-900">Múltiples Medios de Pago</div>
                <div className="text-[11px] text-neutral-500">Alias CBU/CVU, Mercado Pago y Tarjetas.</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-neutral-900">0% Comisiones Médicas</div>
                <div className="text-[11px] text-neutral-500">El 100% del valor de tus turnos es tuyo.</div>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* REAL MEDICAL REVIEWS */}
      <motion.section
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="py-20 px-4 sm:px-6 bg-neutral-50 border-t border-neutral-200/60"
      >
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-neutral-950">
              Testimonios de profesionales que recuperaron su tiempo
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              Médicos, odontólogos y psicólogos en todo el país que ya no sufren cancelaciones de último momento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div whileHover={{ y: -3 }} className="p-6 rounded-3xl border border-neutral-200 bg-white shadow-xs space-y-4">
              <div className="flex items-center gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-xs text-neutral-700 italic leading-relaxed">
                "Antes perdía hasta 3 turnos por semana de pacientes que simplemente no venían. Con las señas por Alias en Agenfacil, las inasistencias cayeron a cero."
              </p>
              <div className="pt-2 border-t border-neutral-100 flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80"
                  alt="Dr. Martín Benítez"
                  className="w-10 h-10 rounded-full object-cover border border-neutral-200"
                />
                <div>
                  <div className="text-xs font-bold text-neutral-900">Dr. Martín Benítez</div>
                  <div className="text-[10px] text-neutral-500">Traumatólogo • Consultorios Belgrano</div>
                </div>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -3 }} className="p-6 rounded-3xl border border-neutral-200 bg-white shadow-xs space-y-4">
              <div className="flex items-center gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-xs text-neutral-700 italic leading-relaxed">
                "El bot contesta los fines de semana y por las noches. Los pacientes se sienten atendidos de inmediato y el lunes encuentro toda la agenda llena y con señas pagas."
              </p>
              <div className="pt-2 border-t border-neutral-100 flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1594824813689-5632d4b8e21a?w=100&auto=format&fit=crop&q=80"
                  alt="Dra. Valentina Paz"
                  className="w-10 h-10 rounded-full object-cover border border-neutral-200"
                />
                <div>
                  <div className="text-xs font-bold text-neutral-900">Dra. Valentina Paz</div>
                  <div className="text-[10px] text-neutral-500">Dermatóloga • San Isidro</div>
                </div>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -3 }} className="p-6 rounded-3xl border border-neutral-200 bg-white shadow-xs space-y-4">
              <div className="flex items-center gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-xs text-neutral-700 italic leading-relaxed">
                "Personalicé mi portal de reservas con mi foto y colores en 2 minutos. Mis pacientes me dicen que parece de una clínica internacional de primer nivel."
              </p>
              <div className="pt-2 border-t border-neutral-100 flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=100&auto=format&fit=crop&q=80"
                  alt="Lic. Lucas Romero"
                  className="w-10 h-10 rounded-full object-cover border border-neutral-200"
                />
                <div>
                  <div className="text-xs font-bold text-neutral-900">Lic. Lucas Romero</div>
                  <div className="text-[10px] text-neutral-500">Psicólogo Clínico • Recoleta</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <motion.section
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="py-20 px-4 sm:px-6 max-w-4xl mx-auto border-t border-neutral-200/60"
      >
        <div className="text-center space-y-3 mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
            Transparencia Total
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
            Preguntas Frecuentes
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500">
            Todo lo que necesitas saber sobre el servicio y los planes de suscripción.
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              q: '¿Se necesita tarjeta de crédito o cuenta bancaria para probar los 14 días?',
              a: 'No, en lo absoluto. Nuestra garantía de prueba es 100% libre de riesgo: puedes crear tu cuenta y comenzar a utilizar el sistema completo sin ingresar ninguna tarjeta de crédito ni método de pago. Al finalizar tus 14 días, tú decides activamente si deseas contratar un plan abonando por transferencia, Mercado Pago o tarjeta. No hay cobros automáticos sorpresa ni renovaciones forzadas.'
            },
            {
              q: '¿Tengo que cambiar mi número de WhatsApp o comprar otro chip?',
              a: 'No. Utilizas tu propio número personal o de consultorio. Se vincula escaneando un código QR exactamente como WhatsApp Web en menos de 10 segundos.'
            },
            {
              q: '¿Cómo recibo el dinero de las señas?',
              a: 'Directamente en tu cuenta bancaria o billetera virtual. Configuras tu propio Alias (CBU/CVU) o tu cuenta de Mercado Pago. Agenfacil no retiene tu dinero ni cobra comisiones por transacción.'
            },
            {
              q: '¿Cuál es la diferencia entre el Plan Esencial y el Plan Pro AI?',
              a: 'El Plan Esencial ($29.000 ARS / $29 USD) incluye la agenda interactiva, turnos ilimitados, portal público y recordatorios por WhatsApp en 1 clic. El Plan Pro AI ($49.000 ARS / $49 USD) suma el Bot autónomo 24/7 con IA, cobro de señas por Alias/Mercado Pago, historias clínicas con dictado por voz y SOAP, Smart Waitlist y sincronización con Google Calendar.'
            },
            {
              q: '¿Puedo pagar por transferencia bancaria o en pesos?',
              a: 'Sí. Aceptamos transferencias bancarias directas mediante CBU/CVU (Alias), Mercado Pago, tarjeta de débito/crédito, y también pasarelas internacionales (Lemon Squeezy o DLocal Go) si estás en el exterior.'
            },
            {
              q: '¿Se sincroniza con mi Google Calendar?',
              a: 'Sí. En el Plan Pro AI, todos los turnos confirmados se sincronizan automáticamente con tu Google Calendar para que los veas en tu teléfono, computadora y smartwatch.'
            }
          ].map((item, idx) => (
            <div
              key={idx}
              className="border border-neutral-200 rounded-2xl overflow-hidden transition bg-white"
            >
              <button
                type="button"
                onClick={() => toggleFaq(idx)}
                className="w-full p-4 sm:p-5 text-left font-bold text-xs sm:text-sm text-neutral-900 flex items-center justify-between gap-4 hover:bg-neutral-50 transition cursor-pointer"
              >
                <span>{item.q}</span>
                {activeFaq === idx ? (
                  <ChevronUp className="w-4 h-4 text-neutral-500 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-neutral-500 shrink-0" />
                )}
              </button>
              {activeFaq === idx && (
                <div className="px-4 sm:px-5 pb-5 text-xs text-neutral-600 leading-relaxed border-t border-neutral-100 pt-3">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.section>

      {/* FINAL CALL TO ACTION */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="py-20 px-4 sm:px-6 bg-neutral-950 text-white text-center relative overflow-hidden"
      >
        <div className="max-w-3xl mx-auto space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-emerald-400 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Empieza hoy en 2 minutos</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
            Recupera tu tranquilidad profesional y dile adiós a los turnos vacíos.
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto leading-relaxed">
            Súmate a los más de 120 consultorios que ya operan con IA en Argentina y la región. Sin contratos, sin tarjetas obligatorias y con soporte personalizado.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => handleOpenRegister('pro')}
              className="w-full sm:w-auto px-8 py-4 bg-white text-neutral-950 font-bold text-xs sm:text-sm rounded-xl hover:bg-neutral-100 transition shadow-lg cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Prueba ahora 14 Días GRATIS</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleOpenLogin}
              className="w-full sm:w-auto px-6 py-4 bg-neutral-900 text-neutral-200 font-semibold text-xs sm:text-sm rounded-xl hover:bg-neutral-800 border border-neutral-800 transition cursor-pointer"
            >
              Ingresar al Sistema
            </button>
          </div>

          {/* Guarantee Micro-Copy */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-neutral-400 font-medium">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400 stroke-[2.5]" /> Garantía 100% Sin Tarjeta de Crédito
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-500 stroke-[3]" /> 14 días acceso completo
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-500 stroke-[3]" /> Sin renovaciones forzadas
            </span>
          </div>
        </div>
      </motion.section>

      {/* PRE-FOOTER AND DARK FOOTER */}
      <LandingFooter
        onOpenContact={onOpenContact}
        onOpenTerms={onOpenTerms}
        onOpenPrivacy={onOpenPrivacy}
        onOpenPortal={onOpenPortal}
        onOpenLogin={handleOpenLogin}
      />

      {/* PERSUASIVE TRIAL SIGNUP / ONBOARDING MODAL */}
      {showTrialModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-neutral-200 space-y-5 animate-scale-in relative">
            <button
              type="button"
              onClick={() => setShowTrialModal(false)}
              className="absolute top-5 right-5 text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-11 h-11 rounded-2xl bg-neutral-950 text-white flex items-center justify-center mx-auto mb-1 shadow-xs">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-[10px] font-extrabold uppercase tracking-wide mx-auto">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Garantía: Sin tarjeta de crédito</span>
              </div>
              <h3 className="text-xl font-bold text-neutral-950">
                {selectedPlanForModal === 'pro' ? 'Comenzar con Plan Pro AI' : 'Comenzar con Plan Esencial'}
              </h3>
              <p className="text-xs text-neutral-500">
                Acceso completo e instantáneo durante 14 días sin costo ni compromiso.
              </p>
            </div>

            {trialSuccess ? (
              <div className="p-5 rounded-2xl bg-emerald-50 text-emerald-900 text-center space-y-2 border border-emerald-200">
                <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto" />
                <div className="font-bold text-sm">¡Consultorio activado con éxito!</div>
                <div className="text-xs text-emerald-700">Abriendo tu panel de control...</div>
              </div>
            ) : (
              <div className="space-y-4">
                {onOpenAuth && (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTrialModal(false);
                        onOpenAuth('register');
                      }}
                      className="w-full h-11 px-4 bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-800 font-semibold text-xs rounded-xl transition shadow-2xs flex items-center justify-center gap-2.5"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      <span>Crear cuenta rápida con Google</span>
                    </button>
                    <div className="relative flex items-center justify-center my-3">
                      <div className="border-t border-neutral-200 w-full" />
                      <span className="bg-white px-2 text-[10px] text-neutral-400 uppercase tracking-wider shrink-0">o con formulario</span>
                    </div>
                  </div>
                )}

                <form onSubmit={handleStartTrial} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">Nombre del Profesional o Clínica</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Dr. Lucas Romero"
                      value={trialName}
                      onChange={(e) => setTrialName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-950 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">Especialidad</label>
                    <select
                      value={trialSpecialty}
                      onChange={(e) => setTrialSpecialty(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-950 focus:outline-hidden bg-white"
                    >
                      <option value="Medicina General">Medicina General</option>
                      <option value="Dermatología">Dermatología</option>
                      <option value="Odontología">Odontología</option>
                      <option value="Psicología">Psicología</option>
                      <option value="Traumatología">Traumatología</option>
                      <option value="Pediatría">Pediatría</option>
                      <option value="Nutrición">Nutrición</option>
                      <option value="Kinesiología">Kinesiología</option>
                      <option value="Otro">Otro consultorio</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      placeholder="doctor@consultorio.com"
                      value={trialEmail}
                      onChange={(e) => setTrialEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-950 focus:outline-hidden"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3.5 bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Activar Mi Consultorio</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-800 font-semibold bg-emerald-50 py-1.5 px-3 rounded-xl border border-emerald-200/80">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>No te pediremos tarjeta de crédito para la prueba</span>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
