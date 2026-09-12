import React from 'react';
import {
  ShieldCheck,
  ArrowLeft,
  Lock,
  FileCheck,
  Mail,
  Building2,
  Database,
  UserCheck,
  EyeOff,
  Printer
} from 'lucide-react';
import { LandingFooter } from '../components/landing/LandingFooter';

interface PrivacyViewProps {
  onBackToLanding: () => void;
  onOpenContact: () => void;
  onOpenTerms: () => void;
  onOpenPortal?: () => void;
  onOpenLogin?: () => void;
}

export const PrivacyView: React.FC<PrivacyViewProps> = ({
  onBackToLanding,
  onOpenContact,
  onOpenTerms,
  onOpenPortal,
  onOpenLogin
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-neutral-900">
      {/* TOP NAVIGATION */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200 py-3.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToLanding}
              className="p-2 -ml-2 rounded-xl text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Volver</span>
            </button>
            <div className="h-4 w-px bg-neutral-200 hidden sm:block" />
            <button
              type="button"
              onClick={onBackToLanding}
              className="flex items-center gap-2 cursor-pointer text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-neutral-950 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                AF
              </div>
              <span className="font-extrabold text-sm sm:text-base text-neutral-950 tracking-tight">
                AgenFacil
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={handlePrint}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 rounded-xl transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
            {onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="px-3.5 py-1.5 bg-neutral-950 hover:bg-neutral-800 text-white font-bold rounded-xl shadow-2xs transition cursor-pointer"
              >
                Ingresar al Panel
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="bg-neutral-50 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-b border-neutral-200">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white text-neutral-800 border border-neutral-200 shadow-2xs">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Protección de Datos y Privacidad</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight">
            Política de Privacidad
          </h1>
          <p className="text-neutral-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Tu privacidad y la seguridad de los datos médicos de tus pacientes son nuestra máxima prioridad.
            Cumplimiento pleno con la Ley N° 25.326 de Protección de los Datos Personales.
          </p>
          <div className="text-xs text-neutral-400 pt-1">
            Última actualización: Enero de 2026 • AgenFacil
          </div>
        </div>
      </section>

      {/* CONTENT BODY */}
      <main className="flex-1 py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto prose prose-neutral prose-sm sm:prose-base space-y-10">
          {/* Key commitments highlight */}
          <div className="not-prose grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200 space-y-2">
              <EyeOff className="w-5 h-5 text-emerald-600" />
              <div className="font-bold text-xs text-neutral-900">Sin Venta de Datos</div>
              <div className="text-[11px] text-neutral-500 leading-relaxed">
                Nunca vendemos, alquilamos ni comercializamos bases de datos ni historiales médicos a terceros.
              </div>
            </div>

            <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200 space-y-2">
              <Lock className="w-5 h-5 text-emerald-600" />
              <div className="font-bold text-xs text-neutral-900">Cifrado de Extremo a Extremo</div>
              <div className="text-[11px] text-neutral-500 leading-relaxed">
                Comunicaciones seguras mediante TLS 1.3 / HTTPS y bases de datos con aislamiento multi-tenant.
              </div>
            </div>

            <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200 space-y-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <div className="font-bold text-xs text-neutral-900">Pasarelas PCI-DSS</div>
              <div className="text-[11px] text-neutral-500 leading-relaxed">
                Los pagos se procesan en pasarelas seguras (DLocal Go, MP, Lemon Squeezy) sin almacenar tarjetas.
              </div>
            </div>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-950 border-b border-neutral-100 pb-2">
              1. Responsable del Tratamiento
            </h2>
            <p className="text-neutral-700 text-sm leading-relaxed">
              El responsable del tratamiento de los datos personales recopilados a través del sitio web y plataforma de software es <strong>AgenFacil</strong>, con base de operaciones en Villa Carlos Paz, Provincia de Córdoba, República Argentina, y correo electrónico de contacto para asuntos de privacidad:{' '}
              <a href="mailto:contacto@agenfacil.com" className="text-emerald-700 underline font-semibold">
                contacto@agenfacil.com
              </a>.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-950 border-b border-neutral-100 pb-2">
              2. Datos que Recopilamos
            </h2>
            <p className="text-neutral-700 text-sm leading-relaxed">
              Recopilamos y tratamos únicamente la información necesaria para el funcionamiento de la agenda y la gestión médica:
            </p>
            <ul className="text-neutral-700 text-sm space-y-1.5 list-disc list-inside">
              <li><strong>Datos del Profesional:</strong> Nombre completo, correo electrónico, especialidad médica o profesional, número de matrícula o acreditación (si corresponde), teléfono de atención y configuraciones de horarios de consultorio.</li>
              <li><strong>Datos de Pacientes y Citas:</strong> Nombre, número de teléfono (para recordatorios WhatsApp), motivo de consulta o notas de evolución cargadas por el profesional o ingresadas voluntariamente por el paciente al reservar un turno online.</li>
              <li><strong>Datos de Facturación y Suscripción:</strong> Historial de transacciones, fecha de pago y estado de suscripción. <em>No almacenamos números de tarjetas de crédito o códigos CVC.</em></li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-950 border-b border-neutral-100 pb-2">
              3. Finalidad del Tratamiento de los Datos
            </h2>
            <p className="text-neutral-700 text-sm leading-relaxed">
              Los datos personales son utilizados exclusivamente para:
            </p>
            <ul className="text-neutral-700 text-sm space-y-1.5 list-disc list-inside">
              <li>Permitir el agendamiento y reserva de turnos en tiempo real.</li>
              <li>El envío de notificaciones automáticas y recordatorios de citas a los pacientes a través de WhatsApp.</li>
              <li>La administración de cobros de suscripción a través de las pasarelas habilitadas.</li>
              <li>Brindar soporte técnico y responder consultas enviadas por el formulario de contacto.</li>
              <li>Garantizar la seguridad y prevenir fraudes o accesos indebidos a las cuentas.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-950 border-b border-neutral-100 pb-2">
              4. Pasarelas de Pago y Seguridad Financiera
            </h2>
            <p className="text-neutral-700 text-sm leading-relaxed">
              Para el cobro de planes de suscripción, AgenFacil utiliza pasarelas de pago seguras y certificadas internacionalmente, tales como <strong>DLocal Go</strong>, <strong>Mercado Pago</strong> y <strong>Lemon Squeezy</strong>, así como transferencias bancarias directas:
            </p>
            <p className="text-neutral-700 text-sm leading-relaxed">
              Toda transacción con tarjeta de crédito o débito se ejecuta en los entornos seguros y encriptados de dichas pasarelas, las cuales cumplen con los más rigurosos estándares de seguridad <strong>PCI-DSS (Payment Card Industry Data Security Standard)</strong>. AgenFacil nunca almacena, visualiza ni procesa en sus servidores datos sensibles de instrumentos de pago.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-950 border-b border-neutral-100 pb-2">
              5. Secreto Profesional y Confidencialidad Médica
            </h2>
            <p className="text-neutral-700 text-sm leading-relaxed">
              AgenFacil adopta una política de <strong>cero acceso a los historiales clínicos privados</strong>. Los registros médicos y las consultas agendadas pertenecen exclusivamente al profesional y a su paciente. Nuestro personal técnico no accede a dichos contenidos salvo solicitud explícita de soporte técnico autorizada por el titular.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-950 border-b border-neutral-100 pb-2">
              6. Derechos del Titular (Derechos ARCO)
            </h2>
            <p className="text-neutral-700 text-sm leading-relaxed">
              De acuerdo con la Ley N° 25.326 de Protección de los Datos Personales de la República Argentina, el titular de los datos personales tiene la facultad de ejercer el derecho de <strong>Acceso, Rectificación, Actualización y Supresión</strong> de sus datos de forma gratuita.
            </p>
            <p className="text-neutral-700 text-sm leading-relaxed">
              Para ejercer cualquiera de estos derechos, el titular puede enviar una solicitud por escrito a{' '}
              <a href="mailto:contacto@agenfacil.com" className="text-emerald-700 underline font-semibold">
                contacto@agenfacil.com
              </a>, acreditando su identidad. Las solicitudes son atendidas en un plazo máximo de diez (10) días hábiles.
            </p>
            <div className="text-xs text-neutral-500 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
              <em>La DIRECCIÓN NACIONAL DE PROTECCIÓN DE DATOS PERSONALES, Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que se interpongan con relación al incumplimiento de las normas sobre protección de datos personales.</em>
            </div>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-950 border-b border-neutral-100 pb-2">
              7. Conservación y Resguardo de los Datos
            </h2>
            <p className="text-neutral-700 text-sm leading-relaxed">
              Los datos se conservan mientras la cuenta del Usuario permanezca activa o según resulte necesario para el cumplimiento de obligaciones legales y fiscales. Si el Usuario solicita el cierre definitivo de su cuenta, sus datos serán eliminados o anonimizados de forma segura de nuestras bases de datos en un plazo de 30 días.
            </p>
          </section>

          {/* Section 8: Contact */}
          <section className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200 not-prose space-y-3">
            <div className="font-bold text-sm text-neutral-950 flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-600" />
              <span>Consultas sobre Privacidad y Datos Personales</span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Si tienes preguntas sobre esta política o deseas solicitar la actualización o baja de tus datos, contáctanos a:{' '}
              <a href="mailto:contacto@agenfacil.com" className="font-bold text-neutral-900 underline">
                contacto@agenfacil.com
              </a>{' '}
              o mediante nuestro{' '}
              <button onClick={onOpenContact} className="text-emerald-700 underline font-bold cursor-pointer">
                Formulario de Contacto
              </button>.
            </p>
          </section>
        </div>
      </main>

      {/* FOOTER */}
      <LandingFooter
        onOpenContact={onOpenContact}
        onOpenTerms={onOpenTerms}
        onOpenPrivacy={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onOpenPortal={onOpenPortal}
        onOpenLogin={onOpenLogin}
      />
    </div>
  );
};
