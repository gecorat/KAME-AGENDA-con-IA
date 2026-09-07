import { PracticeSettings, ProfessionCategory, ClientTerminology } from '../types';

export interface ProfessionOption {
  id: ProfessionCategory;
  name: string;
  defaultTitle: string;
  defaultSpecialty: string;
  defaultClientTerm: ClientTerminology;
  consultationTitle: string;
  consultationSubtitle: string;
  badgeLabel: string;
  icon: string;
  description: string;
  // Dynamic UI terminology
  clientLabelSingular: string;
  clientLabelPlural: string;
  consultationLabelSingular: string;
  consultationLabelPlural: string;
  directoryTitle: string;
  directorySubtitle: string;
  historyTabTitle: string;
  historyTabIcon: string;
  detailsTabTitle: string;
  fieldsCategory: 'medical' | 'legal' | 'nutrition' | 'kinesiology' | 'education' | 'aesthetic' | 'veterinary' | 'general';
  billingTerm: string;
  badgeWorkflow: string;
  customFields?: {
    primaryLabel: string;
    primaryPlaceholder: string;
    secondaryLabel: string;
    secondaryPlaceholder: string;
  };
}

export const PROFESSION_OPTIONS: ProfessionOption[] = [
  {
    id: 'odontologia',
    name: 'Odontología & Salud Bucal',
    defaultTitle: 'Odontólogo / Especialista Dental',
    defaultSpecialty: 'Odontología Integral, Implantes y Estética Dental',
    defaultClientTerm: 'pacientes',
    consultationTitle: 'Ficha Odontológica & Odontograma',
    consultationSubtitle: 'Registro de piezas dentales, caras, tratamientos y evolución clínica',
    badgeLabel: 'Odontología',
    icon: 'Stethoscope',
    description: 'Odontogramas anatómicos interactivos (FDI), piezas dentales, caras y planes de tratamiento.',
    clientLabelSingular: 'Paciente',
    clientLabelPlural: 'Pacientes',
    consultationLabelSingular: 'Consulta',
    consultationLabelPlural: 'Consultas Odontológicas',
    directoryTitle: 'Directorio de Pacientes',
    directorySubtitle: 'Fichas clínicas con odontograma FDI, recetas, certificados y turnos.',
    historyTabTitle: 'Historial Odontológico & Odontograma',
    historyTabIcon: 'Smile',
    detailsTabTitle: 'Ficha Clínica & Antecedentes',
    fieldsCategory: 'medical',
    billingTerm: 'Facturado',
    badgeWorkflow: 'FDI'
  },
  {
    id: 'medicina_general',
    name: 'Medicina General & Especialidades',
    defaultTitle: 'Médico / Especialista',
    defaultSpecialty: 'Medicina Clínica, Pediatría, Dermatología, Cardiología, etc.',
    defaultClientTerm: 'pacientes',
    consultationTitle: 'Historia Clínica & Evolución (SOAP)',
    consultationSubtitle: 'Subjetivo, examen físico objetivo, diagnóstico CIE-10 y plan terapéutico',
    badgeLabel: 'Medicina',
    icon: 'Activity',
    description: 'Evolución médica SOAP completa, signos vitales, recetas médicas y certificados.',
    clientLabelSingular: 'Paciente',
    clientLabelPlural: 'Pacientes',
    consultationLabelSingular: 'Consulta',
    consultationLabelPlural: 'Consultas Médicas',
    directoryTitle: 'Directorio de Pacientes',
    directorySubtitle: 'Historias clínicas completas SOAP, recetas digitales y turnos.',
    historyTabTitle: 'Historial Clínico (SOAP)',
    historyTabIcon: 'Activity',
    detailsTabTitle: 'Ficha & Antecedentes Médicos',
    fieldsCategory: 'medical',
    billingTerm: 'Facturado',
    badgeWorkflow: 'SOAP'
  },
  {
    id: 'psicologia',
    name: 'Psicología & Salud Mental',
    defaultTitle: 'Lic. en Psicología / Terapeuta',
    defaultSpecialty: 'Psicología Clínica, Terapia Cognitivo Conductual, Psicoanálisis',
    defaultClientTerm: 'consultantes',
    consultationTitle: 'Registro de Sesión & Proceso Terapéutico',
    consultationSubtitle: 'Motivo de consulta, encuadre terapéutico, observaciones y acuerdos',
    badgeLabel: 'Psicología',
    icon: 'Brain',
    description: 'Notas de sesión confidenciales, objetivos trabajados y tareas intersesión.',
    clientLabelSingular: 'Consultante',
    clientLabelPlural: 'Consultantes',
    consultationLabelSingular: 'Sesión',
    consultationLabelPlural: 'Sesiones Terapéuticas',
    directoryTitle: 'Directorio de Consultantes',
    directorySubtitle: 'Encuadre terapéutico, registro confidencial de sesiones y notas de evolución.',
    historyTabTitle: 'Historial de Sesiones & Encuadre',
    historyTabIcon: 'Brain',
    detailsTabTitle: 'Ficha & Antecedentes Personales',
    fieldsCategory: 'general',
    billingTerm: 'Facturado',
    badgeWorkflow: 'Encuadre'
  },
  {
    id: 'kinesiologia',
    name: 'Kinesiología & Fisioterapia',
    defaultTitle: 'Lic. en Kinesiología / Fisioterapeuta',
    defaultSpecialty: 'Rehabilitación Traumatológica, Deportiva y Postural',
    defaultClientTerm: 'pacientes',
    consultationTitle: 'Ficha Kinésica & Rehabilitación',
    consultationSubtitle: 'Evaluación funcional, rango de movilidad (ROM), escala EVA de dolor y plan',
    badgeLabel: 'Kinesiología',
    icon: 'Zap',
    description: 'Evaluación postural, seguimiento de dolor (EVA 1-10) y ejercicios asignados.',
    clientLabelSingular: 'Paciente',
    clientLabelPlural: 'Pacientes',
    consultationLabelSingular: 'Sesión Kinésica',
    consultationLabelPlural: 'Sesiones Kinésicas',
    directoryTitle: 'Directorio de Pacientes',
    directorySubtitle: 'Seguimiento de lesiones, escala EVA de dolor, ejercicios y evolución.',
    historyTabTitle: 'Historial Kinésico & Tratamientos',
    historyTabIcon: 'Zap',
    detailsTabTitle: 'Evaluación & Antecedentes Traumatológicos',
    fieldsCategory: 'kinesiology',
    billingTerm: 'Facturado',
    badgeWorkflow: 'EVA'
  },
  {
    id: 'nutricion',
    name: 'Nutrición & Dietética',
    defaultTitle: 'Lic. en Nutrición / Nutricionista',
    defaultSpecialty: 'Nutrición Clínica, Deportiva y Planes Alimentarios',
    defaultClientTerm: 'pacientes',
    consultationTitle: 'Ficha Nutricional & Antropometría',
    consultationSubtitle: 'Composición corporal, peso, pliegues, objetivos nutricionales y pautas',
    badgeLabel: 'Nutrición',
    icon: 'Apple',
    description: 'Parámetros antropométricos, hábitos alimenticios y evolución de metas.',
    clientLabelSingular: 'Paciente',
    clientLabelPlural: 'Pacientes',
    consultationLabelSingular: 'Consulta',
    consultationLabelPlural: 'Consultas Nutricionales',
    directoryTitle: 'Directorio de Pacientes',
    directorySubtitle: 'Evolución antropométrica, cálculo de IMC, metas y planes de alimentación.',
    historyTabTitle: 'Evolución Nutricional & Mediciones',
    historyTabIcon: 'Apple',
    detailsTabTitle: 'Ficha Antropométrica & Hábitos',
    fieldsCategory: 'nutrition',
    billingTerm: 'Facturado',
    badgeWorkflow: 'IMC'
  },
  {
    id: 'estetica_belleza',
    name: 'Estética, Cosmetología & Belleza',
    defaultTitle: 'Especialista en Estética & Cosmiatría',
    defaultSpecialty: 'Tratamientos Faciales, Corporales, Manicuría, Barbería & Spa',
    defaultClientTerm: 'clientes',
    consultationTitle: 'Ficha de Tratamiento & Sesión Estética',
    consultationSubtitle: 'Protocolo aplicado, tipo de piel/zona, productos utilizados y recomendaciones',
    badgeLabel: 'Estética',
    icon: 'Sparkles',
    description: 'Registro de protocolos, zonas tratadas, aparatología y consentimiento de sesión.',
    clientLabelSingular: 'Cliente',
    clientLabelPlural: 'Clientes',
    consultationLabelSingular: 'Tratamiento',
    consultationLabelPlural: 'Sesiones de Tratamiento',
    directoryTitle: 'Directorio de Clientes',
    directorySubtitle: 'Fichas técnicas de tratamientos, zonas, biotipo cutáneo y sesiones.',
    historyTabTitle: 'Historial de Tratamientos & Sesiones',
    historyTabIcon: 'Sparkles',
    detailsTabTitle: 'Ficha Técnica & Biotipo',
    fieldsCategory: 'aesthetic',
    billingTerm: 'Facturado',
    badgeWorkflow: 'Sesiones'
  },
  {
    id: 'veterinaria',
    name: 'Veterinaria & Salud Animal',
    defaultTitle: 'Médico Veterinario',
    defaultSpecialty: 'Clínica Veterinaria Pequeños y Grandes Animales',
    defaultClientTerm: 'pacientes',
    consultationTitle: 'Historia Clínica Veterinaria',
    consultationSubtitle: 'Especie, raza, peso, anamnesis del tutor, vacunas y tratamiento',
    badgeLabel: 'Veterinaria',
    icon: 'Heart',
    description: 'Registro con datos de la mascota (nombre, peso, raza) y datos del tutor responsable.',
    clientLabelSingular: 'Paciente (Mascota)',
    clientLabelPlural: 'Pacientes & Tutores',
    consultationLabelSingular: 'Consulta Veterinaria',
    consultationLabelPlural: 'Consultas Veterinarias',
    directoryTitle: 'Directorio de Pacientes & Tutores',
    directorySubtitle: 'Historias veterinarias, control de peso, vacunas y datos del tutor.',
    historyTabTitle: 'Historia Clínica Veterinaria',
    historyTabIcon: 'Heart',
    detailsTabTitle: 'Ficha de la Mascota & Tutor',
    fieldsCategory: 'veterinary',
    billingTerm: 'Facturado',
    badgeWorkflow: 'Mascotas'
  },
  {
    id: 'coaching_consultoria',
    name: 'Coaching, Consultoría & Asesoría',
    defaultTitle: 'Consultor / Coach Ejecutivo',
    defaultSpecialty: 'Coaching Ontológico, Asesoría de Negocios, Mentoría',
    defaultClientTerm: 'clientes',
    consultationTitle: 'Minuta de Sesión & Plan de Acción',
    consultationSubtitle: 'Temas abordados, acuerdos de la sesión, metas fijadas y tareas',
    badgeLabel: 'Consultoría',
    icon: 'Target',
    description: 'Seguimiento de metas estratégicas, compromisos y bitácora de reuniones.',
    clientLabelSingular: 'Cliente',
    clientLabelPlural: 'Clientes',
    consultationLabelSingular: 'Sesión',
    consultationLabelPlural: 'Sesiones de Consultoría',
    directoryTitle: 'Directorio de Clientes',
    directorySubtitle: 'Minutas de reuniones, seguimiento de objetivos, acuerdos y honorarios.',
    historyTabTitle: 'Minutas de Sesiones & Acuerdos',
    historyTabIcon: 'Target',
    detailsTabTitle: 'Ficha del Cliente & Empresa',
    fieldsCategory: 'general',
    billingTerm: 'Honorarios',
    badgeWorkflow: 'Metas'
  },
  {
    id: 'educacion_clases',
    name: 'Clases Particulares, Idiomas & Música',
    defaultTitle: 'Profesor / Docente / Instructor',
    defaultSpecialty: 'Clases Particulares, Idiomas, Música, Apoyo Escolar',
    defaultClientTerm: 'alumnos',
    consultationTitle: 'Ficha de Clase & Progreso Pedagógico',
    consultationSubtitle: 'Contenido dictado, tareas asignadas, nivel alcanzado y próximas actividades',
    badgeLabel: 'Educación',
    icon: 'BookOpen',
    description: 'Planificación de clases, registro de ejercitación y control de avances pedagógicos.',
    clientLabelSingular: 'Alumno',
    clientLabelPlural: 'Alumnos',
    consultationLabelSingular: 'Clase',
    consultationLabelPlural: 'Clases Dictadas',
    directoryTitle: 'Directorio de Alumnos',
    directorySubtitle: 'Control pedagógico de contenidos, tareas asignadas, nivel y cuotas.',
    historyTabTitle: 'Progreso & Clases Dictadas',
    historyTabIcon: 'BookOpen',
    detailsTabTitle: 'Ficha del Alumno & Nivel',
    fieldsCategory: 'education',
    billingTerm: 'Cobrado',
    badgeWorkflow: 'Progreso'
  },
  {
    id: 'legal_contable',
    name: 'Estudio Jurídico & Contable',
    defaultTitle: 'Abogado / Contador Público',
    defaultSpecialty: 'Asesoramiento Legal, Trámites Impositivos y Sociedades',
    defaultClientTerm: 'clientes',
    consultationTitle: 'Ficha de Expediente & Gestiones Realizadas',
    consultationSubtitle: 'Carátula, número de trámite, estado procesal y próximos pasos',
    badgeLabel: 'Legal / Contable',
    icon: 'Scale',
    description: 'Bitácora de actuaciones, vencimientos de plazos y documentación solicitada.',
    clientLabelSingular: 'Cliente',
    clientLabelPlural: 'Clientes',
    consultationLabelSingular: 'Actuación',
    consultationLabelPlural: 'Expedientes & Actuaciones',
    directoryTitle: 'Directorio de Clientes & Causas',
    directorySubtitle: 'Seguimiento de expedientes, actuaciones judiciales, plazos y honorarios.',
    historyTabTitle: 'Expedientes & Actuaciones Registradas',
    historyTabIcon: 'Scale',
    detailsTabTitle: 'Ficha del Cliente & Causa',
    fieldsCategory: 'legal',
    billingTerm: 'Honorarios',
    badgeWorkflow: 'Causas'
  },
  {
    id: 'otro_personalizado',
    name: 'Otro Profesional o Negocio de Servicios',
    defaultTitle: 'Profesional de Servicios',
    defaultSpecialty: 'Atención personalizada y servicios a medida',
    defaultClientTerm: 'clientes',
    consultationTitle: 'Ficha de Servicio & Seguimiento',
    consultationSubtitle: 'Detalle de trabajos realizados, notas y requerimientos del cliente',
    badgeLabel: 'Servicios',
    icon: 'Briefcase',
    description: 'Campos 100% personalizables adaptados a cualquier rubro o negocio.',
    clientLabelSingular: 'Cliente',
    clientLabelPlural: 'Clientes',
    consultationLabelSingular: 'Servicio',
    consultationLabelPlural: 'Servicios Realizados',
    directoryTitle: 'Directorio de Clientes',
    directorySubtitle: 'Registro de trabajos, bitácora de servicios, notas y cobros.',
    historyTabTitle: 'Historial de Trabajos & Servicios',
    historyTabIcon: 'Briefcase',
    detailsTabTitle: 'Ficha del Cliente & Preferencias',
    fieldsCategory: 'general',
    billingTerm: 'Facturado',
    badgeWorkflow: 'Servicios'
  }
];

export function getProfessionInfo(settings?: PracticeSettings | null): ProfessionOption {
  const category = settings?.profession_category || 'odontologia';
  const match = PROFESSION_OPTIONS.find(p => p.id === category);
  if (match) return match;
  return PROFESSION_OPTIONS[0];
}

export function getClientTerm(
  settings?: PracticeSettings | null,
  options?: {
    plural?: boolean;
    capitalize?: boolean;
    article?: 'el' | 'al' | 'del' | 'un';
  }
): string {
  const termKey: ClientTerminology = settings?.client_term || getProfessionInfo(settings).defaultClientTerm || 'pacientes';
  const plural = options?.plural ?? false;
  const capitalize = options?.capitalize ?? false;
  const article = options?.article;

  let baseSingular = 'paciente';
  let basePlural = 'pacientes';
  let gender: 'm' | 'f' = 'm';

  switch (termKey) {
    case 'clientes':
      baseSingular = 'cliente';
      basePlural = 'clientes';
      gender = 'm';
      break;
    case 'consultantes':
      baseSingular = 'consultante';
      basePlural = 'consultantes';
      gender = 'm';
      break;
    case 'alumnos':
      baseSingular = 'alumno';
      basePlural = 'alumnos';
      gender = 'm';
      break;
    case 'pacientes':
    default:
      baseSingular = 'paciente';
      basePlural = 'pacientes';
      gender = 'm';
      break;
  }

  let text = plural ? basePlural : baseSingular;

  if (article) {
    if (article === 'el') {
      text = plural ? `los ${text}` : `el ${text}`;
    } else if (article === 'al') {
      text = plural ? `a los ${text}` : `al ${text}`;
    } else if (article === 'del') {
      text = plural ? `de los ${text}` : `del ${text}`;
    } else if (article === 'un') {
      text = plural ? `unos ${text}` : `un ${text}`;
    }
  }

  if (capitalize) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  return text;
}

export function getConsultationTerm(
  settings?: PracticeSettings | null,
  options?: { plural?: boolean; capitalize?: boolean }
): string {
  const info = getProfessionInfo(settings);
  const baseSingular = info.consultationLabelSingular;
  const basePlural = info.consultationLabelPlural;
  
  let text = options?.plural ? basePlural : baseSingular;
  if (options?.capitalize) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  } else {
    text = text.toLowerCase();
  }
  return text;
}
