import { SubscriptionPlanDef } from '../types';

export const SUBSCRIPTION_PLANS: SubscriptionPlanDef[] = [
  {
    id: 'basic',
    name: 'Plan Esencial',
    badge: 'Consultorio Inicial',
    tagline: 'Ideal para profesionales independientes que buscan ordenar su agenda y terminar con el caos de turnos.',
    priceMonthARS: 29000,
    priceAnnualARS: 299000,
    priceMonthUSD: 29,
    priceAnnualUSD: 299,
    popular: false,
    features: [
      { text: '1 Profesional de la salud independiente', included: true },
      { text: 'Turnos y Pacientes ilimitados sin comisiones', included: true },
      { text: 'Agenda interactiva (Día, Semana, Mes)', included: true },
      { text: 'Portal web público de turnos online 24/7', included: true },
      { text: 'Recordatorios por WhatsApp con 1 clic (manual rápido)', included: true },
      { text: 'Caja diaria, aranceles y control de cobros', included: true },
      { text: 'Ficha médica básica con antecedentes del paciente', included: true },
      { text: 'Lista de espera manual', included: true },
      { text: 'Bot de WhatsApp Inteligente 24/7 autónomo', included: false },
      { text: 'Historias Clínicas con Dictado por Voz e IA (SOAP)', included: false },
      { text: 'Cobro de Seña Automática con Mercado Pago', included: false },
      { text: 'Smart Waitlist con reasignación autónoma', included: false },
      { text: 'Sincronización en vivo con Google Calendar', included: false },
      { text: 'Respaldos automáticos en Google Sheets / Drive', included: false }
    ]
  },
  {
    id: 'pro',
    name: 'Plan Pro AI',
    badge: 'MÁS ELEGIDO',
    tagline: 'Automatización total con Inteligencia Artificial. Ahorra más de 10 horas semanales y elimina ausentismos.',
    priceMonthARS: 49000,
    priceAnnualARS: 499000,
    priceMonthUSD: 49,
    priceAnnualUSD: 499,
    popular: true,
    features: [
      { text: '1 Profesional + soporte multiespacio', included: true },
      { text: 'Todo lo incluido en el Plan Esencial', included: true, highlight: true },
      { text: 'Bot Autónomo de WhatsApp 24/7 con IA (agenda y responde solo)', included: true, highlight: true },
      { text: 'Historias Clínicas con Dictado por Voz & IA (formato SOAP médico)', included: true, highlight: true },
      { text: 'Cobro de Señas y Pagos Online con Mercado Pago en portal', included: true, highlight: true },
      { text: 'Smart Waitlist: reasigna turnos cancelados en automático por WhatsApp', included: true, highlight: true },
      { text: 'Sincronización bidireccional con Google Calendar', included: true },
      { text: 'Exportación y copias de seguridad automáticas en Google Sheets', included: true },
      { text: 'Recetas oficiales y certificados médicos con membrete y QR', included: true },
      { text: 'Soporte prioritario por WhatsApp directo', included: true }
    ]
  }
];

export interface PlanComparisonRow {
  category: string;
  feature: string;
  basic: string | boolean;
  pro: string | boolean;
  highlight?: boolean;
}

export const PLAN_COMPARISON_MATRIX: PlanComparisonRow[] = [
  {
    category: 'Agenda & Pacientes',
    feature: 'Límite de turnos y pacientes',
    basic: 'Ilimitados',
    pro: 'Ilimitados'
  },
  {
    category: 'Agenda & Pacientes',
    feature: 'Portal web público de turnos 24/7',
    basic: true,
    pro: true
  },
  {
    category: 'Agenda & Pacientes',
    feature: 'Sincronización con Google Calendar',
    basic: false,
    pro: 'Bidireccional en vivo',
    highlight: true
  },
  {
    category: 'WhatsApp & Automatización',
    feature: 'Recordatorios por WhatsApp',
    basic: 'Manual con 1 clic',
    pro: 'Automáticos programados (24h y 2h)',
    highlight: true
  },
  {
    category: 'WhatsApp & Automatización',
    feature: 'Bot de WhatsApp con IA para agendar y atender',
    basic: false,
    pro: 'Bot 24/7 autónomo',
    highlight: true
  },
  {
    category: 'WhatsApp & Automatización',
    feature: 'Smart Waitlist (Lista de espera inteligente)',
    basic: 'Manual estática',
    pro: 'Aviso y reasignación automática con IA',
    highlight: true
  },
  {
    category: 'Historias Clínicas & Consultas',
    feature: 'Ficha médica del paciente',
    basic: 'Estándar',
    pro: 'Completa con antecedentes y tags'
  },
  {
    category: 'Historias Clínicas & Consultas',
    feature: 'Dictado de notas por Voz & Redacción SOAP con IA',
    basic: false,
    pro: 'Ilimitado con transcripción médica',
    highlight: true
  },
  {
    category: 'Historias Clínicas & Consultas',
    feature: 'Recetario oficial en PDF con Código QR',
    basic: 'Plantilla básica',
    pro: 'Membretado con QR y firma digital'
  },
  {
    category: 'Cobros & Finanzas',
    feature: 'Control de caja chica y aranceles',
    basic: true,
    pro: true
  },
  {
    category: 'Cobros & Finanzas',
    feature: 'Cobro de señas con Mercado Pago en portal de turnos',
    basic: false,
    pro: 'Integrado (Checkout Pro / Link)',
    highlight: true
  },
  {
    category: 'Cobros & Finanzas',
    feature: 'Exportación a Google Sheets / Drive',
    basic: false,
    pro: 'En 1 clic / Sincronizado'
  },
  {
    category: 'Soporte',
    feature: 'Canal de soporte y onboarding',
    basic: 'Email estándar',
    pro: 'WhatsApp directo prioritario'
  }
];
