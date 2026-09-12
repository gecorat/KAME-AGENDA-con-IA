import React from 'react';
import {
  FileText,
  ShieldCheck,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Mail,
  Building2,
  Scale,
  CreditCard,
  Lock,
  Printer
} from 'lucide-react';
import { LandingFooter } from '../components/landing/LandingFooter';

interface TermsViewProps {
  onBackToLanding: () => void;
  onOpenContact: () => void;
  onOpenPrivacy: () => void;
  onOpenPortal?: () => void;
  onOpenLogin?: () => void;
}

export const TermsView: React.FC<TermsViewProps> = ({
  onBackToLanding,
  onOpenContact,
  onOpenPrivacy,
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
            <Scale className="w-3.5 h-3.5 text-emerald-600" />
            <span>Marco Legal del Servicio</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight">
            Términos y Condiciones de Uso
          </h1>
          <p className="text-neutral-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Reglas, derechos y responsabilidades que rigen el uso del software de gestión médica y agendamiento inteligente AgenFacil.
          </p>
          <div className="text-xs text-neutral-400 pt-1">
            Última actualización: Enero de 2026 • Versión vigente 2.4
          </div>
        </div>
      </section>

      {/* CONTENT BODY */}
      <main className="flex-1 py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto prose prose-neutral prose-sm sm:prose-base space-y-10">
          {/* Quick Summary Box */}
          <div className="not-prose bg-emerald-50/70 border border-emerald-200 rounded-3xl p-6 sm:p-7 space-y-3">
            <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              <span>Resumen Clave de Términos para el Profesional</span>
            </div>
            <ul className="text-xs sm:text-sm text-emerald-900 space-y-2 list-disc list-inside">
              <li><strong>Servicio SaaS:</strong> AgenFacil es un software en la nube para automatizar turnos, agendas y recordatorios de WhatsApp.</li>
              <li><strong>Sin permanencia forzada:</strong> Puedes cancelar tu suscripción en cualquier momento sin penalizaciones ni costos ocultos.</li>
              <li><strong>Tus datos son tuyos:</strong> La información de tus pacientes y consultas te pertenece y está bajo estricta confidencialidad.</li>
              <li><strong>Pagos seguros:</strong> Todos los cobros se gestionan a través de pasarelas autorizadas (DLocal Go, Mercado Pago, Lemon Squeezy o transferencia bancaria). AgenFacil nunca almacena los datos de tu tarjeta de crédito.</li>
            </ul>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-950 border-b border-neutral-100 pb-2">
              1. Identificación del Servicio y Aceptación
            </h2>
            <p className="text-neutral-700 text-sm leading-relaxed">
              El presente documento establece los Términos y Condiciones de Uso (en adelante, los <strong>"Términos"</strong>) que regulan el acceso y utilización de la plataforma web y servicios de software provistos bajo la marca <strong>AgenFacil</strong> (en adelante, <strong>"AgenFacil"</strong> o la <strong>"Plataforma"</strong>), con domicilio y base de operaciones en Villa Carlos Paz, Provincia de Córdoba, República Argentina, con canal oficial de contacto:{' '}
              <a href="mailto:contacto@agenfacil.com" className="text-emerald-700 underline font-semibold">
                contacto@agenfacil.com
              </a>.
            </p>
            <p className="text-neutral-700 text-sm leading-relaxed">
              Al registrarse, acceder o utilizar la Plataforma, el profesional, consultorio o institución médica (en adelante, el <strong>"Usuario"</strong> o <strong>"Profesional"</strong>) declara haber leído, comprendido y aceptado en su totalidad estos Términos, así como nuestra{' '}
              <button onClick={onOpenPrivacy} className="text-emerald-700 underline font-semibold cursor-pointer">
                Política de Privacidad
              </button>.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-950 border-b border-neutral-100 pb-2">
              2. Descripción del Servicio (SaaS)
            </h2>
            <p className="text-neutral-700 text-sm leading-relaxed">
              AgenFacil proporciona una solución tecnológica de <em>Software as a Service (SaaS)</em> orientada a la gestión operativa, agendamiento de citas, portal público para reserva de turnos por parte de pacientes, módulo de recordatorios automatizados vía WhatsApp, registro de consultas e historial de turnos para profesionales de la salud.
            </p>
            <p className="text-neutral-700 text-sm leading-relaxed">
              AgenFacil no presta servicios médicos, odontológicos, psicológicos o de salud de ninguna naturaleza. La Plataforma constituye únicamente una herramienta tecnológica de soporte y administración para los profesionales matriculados habilitados.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-950 border-b border-neutral-100 pb-2">
              3. Registro de Cuenta y Seguridad
            </h2>
            <p className="text-neutral-700 text-sm leading-relaxed">
              Para acceder a los módulos de gestión, el Usuario debe registrar una cuenta con datos fidedignos, actualizados y comprobables. El Usuario es el único responsable de mantener la confidencialidad de sus credenciales de acceso y de todas las actividades realizadas bajo su cuenta.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-950 border-b border-neutral-100 pb-2">
              4. Período de Prueba Gratuito (Trial)
            </h2>
            <p className="text-neutral-700 text-sm leading-relaxed">
              AgenFacil puede ofrecer períodos de prueba gratuitos sin compromiso. Durante el período de prueba, el Profesional tiene acceso a las funciones principales sin necesidad de ingresar datos de tarjeta de crédito. Al finalizar dicho período, el Usuario podrá optar libremente por suscribirse a uno de los planes de pago disponibles.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-950 border-b border-neutral-100 pb-2">
              5. Planes de Suscripción, Pagos y Facturación
            </h2>
            <p className="text-neutral-700 text-sm leading-relaxed">
              El uso continuado de AgenFacil requiere una suscripción activa (Plan Esencial o Plan Pro AI), facturada de forma mensual o anual conforme a las tarifas públicas vigentes al momento de la contratación:
            </p>
            <ul className="text-neutral-700 text-sm space-y-1.5 list-disc list-inside">
              <li><strong>Pasarelas de Pago Autorizadas:</strong> Los pagos son procesados de forma segura e independiente mediante proveedores certificados que cumplen con estándares PCI-DSS internacionales, tales como <strong>DLocal Go</strong>, <strong>Mercado Pago</strong>, <strong>Lemon Squeezy</strong> o transferencia bancaria directa a cuentas verificadas de AgenFacil.</li>
              <li><strong>Seguridad de Datos Financieros:</strong> AgenFacil <em>nunca almacena ni tiene acceso directo</em> a los números completos de tarjeta de crédito, débito ni códigos de seguridad (CVC/CVV) de los Usuarios. Toda la información bancaria es procesada cifrada por las pasarelas de pago habilitadas.</li>
              <li><strong>Moneda y Precios:</strong> Los precios se exhiben claramente antes de la confirmación en Pesos Argentinos (ARS) o Dólares Estadounidenses (USD) según corresponda.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-950 border-b border-neutral-100 pb-2">
              6. Cancelación y Política de Reembolsos
            </h2>
            <p className="text-neutral-700 text-sm leading-relaxed">
              <strong>Cancelación en cualquier momento:</strong> El Usuario puede cancelar su suscripción en cualquier momento desde la sección de Planes o solicitándolo a <a href="mailto:contacto@agenfacil.com" className="text-emerald-700 underline">contacto@agenfacil.com</a>. Al cancelar, el servicio permanecerá activo hasta la finalización del período prepagado y no se generarán cobros posteriores.
            </p>
            <p className="text-neutral-700 text-sm leading-relaxed">
              <strong>Reembolsos:</strong> En caso de que se haya producido un cobro erróneo o duplicado derivado de un problema técnico en las pasarelas, AgenFacil procederá a gestionar el reintegro total correspondiente en un plazo no mayor a 5 días hábiles tras la verificación del comprobante.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-950 border-b border-neutral-100 pb-2">
              7. Confidencialidad y Datos de Pacientes
            </h2>
            <p className="text-neutral-700 text-sm leading-relaxed">
              AgenFacil reconoce el carácter sensible de la información de los pacientes y respeta el secreto profesional médico. Los datos almacenados no son comercializados, cedidos ni explotados comercialmente con terceros. Todo el almacenamiento se rige por la Ley N° 25.326 de Protección de los Datos Personales de la República Argentina.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-950 border-b border-neutral-100 pb-2">
              8. Disponibilidad del Servicio (SLA) y Soporte
            </h2>
            <p className="text-neutral-700 text-sm leading-relaxed">
              AgenFacil procura mantener una disponibilidad continua del 99.5% anual en sus servidores en la nube. Eventuales mantenimientos programados serán notificados previamente. El soporte técnico se brinda a través de <a href="mailto:contacto@agenfacil.com" className="text-emerald-700 underline">contacto@agenfacil.com</a> y los canales oficiales de asistencia.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-950 border-b border-neutral-100 pb-2">
              9. Propiedad Intelectual
            </h2>
            <p className="text-neutral-700 text-sm leading-relaxed">
              Todo el código, diseño, marcas, logotipos, interfaces y algoritmos de AgenFacil son propiedad exclusiva de AgenFacil. Se concede al Usuario una licencia de uso personal, no exclusiva, revocable e intransferible mientras mantenga su cuenta o suscripción activa.
            </p>
          </section>

          {/* Section 10 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-950 border-b border-neutral-100 pb-2">
              10. Legislación Aplicable y Jurisdicción
            </h2>
            <p className="text-neutral-700 text-sm leading-relaxed">
              Los presentes Términos se rigen e interpretan por las leyes de la República Argentina. Ante cualquier controversia derivada del uso de la Plataforma, las partes acuerdan someterse a la jurisdicción de los Tribunales Ordinarios de la Provincia de Córdoba, renunciando a cualquier otro fuero o jurisdicción que pudiera corresponder.
            </p>
          </section>

          {/* Section 11: Contact */}
          <section className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200 not-prose space-y-3">
            <div className="font-bold text-sm text-neutral-950 flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-600" />
              <span>Canal de Dudas y Notificaciones Legales</span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Para cualquier consulta sobre estos Términos, solicitudes de facturación o dudas sobre pasarelas de pago, puedes escribirnos en cualquier momento a:{' '}
              <a href="mailto:contacto@agenfacil.com" className="font-bold text-neutral-900 underline">
                contacto@agenfacil.com
              </a>{' '}
              o a través de nuestro{' '}
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
        onOpenTerms={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onOpenPrivacy={onOpenPrivacy}
        onOpenPortal={onOpenPortal}
        onOpenLogin={onOpenLogin}
      />
    </div>
  );
};
