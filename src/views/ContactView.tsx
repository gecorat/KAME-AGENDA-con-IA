import React, { useState, useEffect } from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  ArrowLeft,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Building2,
  HelpCircle,
  Copy,
  Check,
  RefreshCw,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LandingFooter } from '../components/landing/LandingFooter';
import { useAgendaStore } from '../lib/store';
import { saveContactMessageToFirestore } from '../lib/firestore-sync';

interface ContactViewProps {
  onBackToLanding: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  onOpenPortal?: () => void;
  onOpenLogin?: () => void;
}

export const ContactView: React.FC<ContactViewProps> = ({
  onBackToLanding,
  onOpenTerms,
  onOpenPrivacy,
  onOpenPortal,
  onOpenLogin
}) => {
  const { addContactMessage } = useAgendaStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('Dudas antes de contratar / Planes');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Anti-bot Human Verification state
  const [honeypot, setHoneypot] = useState('');
  const [numA, setNumA] = useState(3);
  const [numB, setNumB] = useState(5);
  const [userMathAnswer, setUserMathAnswer] = useState('');
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Generate random human challenge on mount
  const generateNewChallenge = () => {
    const a = Math.floor(Math.random() * 8) + 2;
    const b = Math.floor(Math.random() * 7) + 1;
    setNumA(a);
    setNumB(b);
    setUserMathAnswer('');
    setIsHumanVerified(false);
    setVerificationError(null);
  };

  useEffect(() => {
    generateNewChallenge();
  }, []);

  const handleMathCheck = (val: string) => {
    setUserMathAnswer(val);
    const expected = numA + numB;
    const numeric = parseInt(val.trim(), 10);
    if (!isNaN(numeric) && numeric === expected) {
      setIsHumanVerified(true);
      setVerificationError(null);
    } else {
      setIsHumanVerified(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot check: If bot filled this hidden field, quietly exit
    if (honeypot) {
      setIsSuccess(true);
      return;
    }

    if (!name.trim() || !email.trim() || !message.trim()) return;

    // Human verification check
    const expected = numA + numB;
    if (!isHumanVerified && parseInt(userMathAnswer.trim(), 10) !== expected) {
      setVerificationError('Por favor completa la verificación de seguridad para comprobar que eres una persona.');
      return;
    }

    setIsSubmitting(true);
    setVerificationError(null);

    try {
      if (addContactMessage) {
        await addContactMessage({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          subject,
          message: message.trim(),
          human_verified: true
        });
      } else {
        // Fallback directly to Firestore
        await saveContactMessageToFirestore({
          id: `msg-${Date.now()}`,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          subject,
          message: message.trim(),
          created_at: new Date().toISOString(),
          status: 'pending',
          human_verified: true,
          source: 'contact_page'
        });
      }
    } catch (err) {
      console.warn('Contact submission warning (saved locally if offline):', err);
    }

    setIsSubmitting(false);
    setIsSuccess(true);
    confetti({ particleCount: 65, spread: 70, origin: { y: 0.6 } });

    // Reset form fields
    setName('');
    setEmail('');
    setPhone('');
    setMessage('');
    generateNewChallenge();
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('contacto@agenfacil.com');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-neutral-900">
      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200 py-3.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
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
            {onOpenPortal && (
              <button
                type="button"
                onClick={onOpenPortal}
                className="hidden md:inline-flex px-3 py-1.5 text-neutral-600 hover:text-neutral-950 font-medium transition cursor-pointer"
              >
                Portal de Pacientes
              </button>
            )}
            {onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="px-3.5 py-1.5 bg-neutral-950 hover:bg-neutral-800 text-white font-bold rounded-xl shadow-2xs transition cursor-pointer"
              >
                Ingresar al Sistema
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* HEADER SECTION */}
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>Contacto y Atención</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight">
              ¿Dudas antes de empezar?
            </h1>
            <p className="text-neutral-600 text-sm sm:text-base leading-relaxed">
              Escribinos y te respondemos. Sin formularios eternos ni respuestas automáticas.
              Atención directa y personalizada para profesionales de la salud.
            </p>
          </div>

          {/* 2-COLUMN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* LEFT COLUMN: CONTACT DETAILS */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-neutral-50 rounded-3xl p-6 sm:p-7 border border-neutral-200 space-y-6">
                <h2 className="text-base font-bold text-neutral-950 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Canales de Comunicación</span>
                </h2>

                <div className="space-y-4">
                  {/* Email Card */}
                  <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-xs font-semibold text-neutral-500">
                        <Mail className="w-4 h-4 text-emerald-600" />
                        <span>Correo Electrónico Oficial</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyEmail}
                        className="text-[11px] text-neutral-500 hover:text-neutral-900 flex items-center gap-1 cursor-pointer transition"
                      >
                        {copiedEmail ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                    <a
                      href="mailto:contacto@agenfacil.com"
                      className="block text-sm font-bold text-neutral-950 hover:text-emerald-700 transition"
                    >
                      contacto@agenfacil.com
                    </a>
                    <p className="text-[11px] text-neutral-500">
                      Respondemos todas las consultas en menos de 24 horas hábiles.
                    </p>
                  </div>

                  {/* Location Card */}
                  <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-1.5">
                    <div className="flex items-center gap-2.5 text-xs font-semibold text-neutral-500">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <span>Ubicación y Base de Operaciones</span>
                    </div>
                    <div className="text-sm font-bold text-neutral-950">
                      Villa Carlos Paz, Córdoba, Argentina
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      Servicio en la nube con soporte integral para consultorios de todo el país y Latinoamérica.
                    </p>
                  </div>

                  {/* Hours Card */}
                  <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-1.5">
                    <div className="flex items-center gap-2.5 text-xs font-semibold text-neutral-500">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <span>Horario de Atención</span>
                    </div>
                    <div className="text-sm font-bold text-neutral-950">
                      Lunes a Viernes: 09:00 a 18:00 hs (ART)
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      Atención técnica y comercial continuada.
                    </p>
                  </div>
                </div>

                {/* Trust badge */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3 text-emerald-950 text-xs leading-relaxed">
                  <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold text-emerald-900">Seguridad y Confidencialidad</strong>
                    Tus datos y consultas son tratados bajo estrictas normas de protección de datos personales. Nunca compartimos tu información.
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: CONTACT FORM */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-neutral-950 tracking-tight">
                    Envíanos tu consulta
                  </h2>
                  <p className="text-xs text-neutral-500 mt-1">
                    Completa los campos y te escribiremos directamente a tu correo.
                  </p>
                </div>

                {isSuccess && (
                  <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2 text-center animate-fade-in">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <div className="font-bold text-sm">¡Mensaje enviado con éxito!</div>
                    <p className="text-xs text-emerald-800">
                      Gracias por escribirnos. Nuestro equipo se pondrá en contacto a la brevedad.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsSuccess(false)}
                      className="mt-2 text-xs font-bold text-emerald-900 underline cursor-pointer"
                    >
                      Enviar otra consulta
                    </button>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-800 block">
                        Nombre y Apellido <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Ej. Dr. Lucas Romero"
                        className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-neutral-950 focus:outline-hidden transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-800 block">
                        Correo Electrónico <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="doctor@consultorio.com"
                        className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-neutral-950 focus:outline-hidden transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-800 block">
                        Teléfono / WhatsApp (Opcional)
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+54 9 11 1234-5678"
                        className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-neutral-950 focus:outline-hidden transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-800 block">
                        Motivo de la consulta
                      </label>
                      <select
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-neutral-950 focus:outline-hidden transition cursor-pointer"
                      >
                        <option value="Dudas antes de contratar / Planes">Dudas antes de contratar / Planes</option>
                        <option value="Soporte sobre Pasarelas de Pago (DLocal Go / MP)">Soporte sobre Pasarelas de Pago (DLocal Go / MP)</option>
                        <option value="Asistencia técnica y configuración inicial">Asistencia técnica y configuración inicial</option>
                        <option value="Integración con WhatsApp y Bot IA">Integración con WhatsApp y Bot IA</option>
                        <option value="Facturación y suscripción">Facturación y suscripción</option>
                        <option value="Otro motivo">Otro motivo</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-800 block">
                      Mensaje <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Cuéntanos cómo podemos ayudarte o qué duda tienes sobre AgenFacil..."
                      className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-neutral-950 focus:outline-hidden transition resize-none"
                    />
                  </div>

                  {/* Hidden Honeypot for bot traps */}
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="website_url_check">No completar este campo</label>
                    <input
                      id="website_url_check"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={e => setHoneypot(e.target.value)}
                    />
                  </div>

                  {/* Anti-Bot Human Verification Challenge */}
                  <div className={`p-4 rounded-2xl border transition-all ${
                    isHumanVerified
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : verificationError
                      ? 'bg-red-50 border-red-300'
                      : 'bg-neutral-50 border-neutral-200'
                  }`}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                          isHumanVerified
                            ? 'bg-emerald-600 text-white'
                            : 'bg-neutral-900 text-white'
                        }`}>
                          {isHumanVerified ? <Check className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        </div>
                        <span className="text-xs font-bold text-neutral-900">
                          Verificación Humana (Anti-Robot)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={generateNewChallenge}
                        className="text-[11px] text-neutral-500 hover:text-neutral-900 flex items-center gap-1 cursor-pointer transition"
                        title="Generar otro cálculo"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span className="hidden sm:inline">Cambiar</span>
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="text-xs text-neutral-700">
                        ¿Cuánto es <span className="inline-block px-2 py-0.5 bg-white font-mono font-bold text-neutral-900 rounded-md border border-neutral-200 shadow-2xs mx-1">{numA} + {numB}</span>?
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={userMathAnswer}
                          onChange={e => handleMathCheck(e.target.value)}
                          placeholder="Tu respuesta..."
                          className={`w-28 px-3 py-1.5 text-xs rounded-xl font-bold transition focus:outline-hidden ${
                            isHumanVerified
                              ? 'bg-white border-2 border-emerald-500 text-emerald-900 focus:ring-emerald-500'
                              : 'bg-white border border-neutral-300 focus:ring-2 focus:ring-neutral-900'
                          }`}
                        />
                        {isHumanVerified && (
                          <div className="flex items-center gap-1 text-emerald-700 text-xs font-bold animate-fade-in">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>¡Verificado!</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {verificationError && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-red-700">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{verificationError}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-neutral-500 leading-relaxed">
                    Al enviar este formulario aceptas nuestra{' '}
                    <button
                      type="button"
                      onClick={onOpenPrivacy}
                      className="underline font-medium text-neutral-800 hover:text-neutral-950"
                    >
                      Política de Privacidad
                    </button>{' '}
                    y{' '}
                    <button
                      type="button"
                      onClick={onOpenTerms}
                      className="underline font-medium text-neutral-800 hover:text-neutral-950"
                    >
                      Términos y Condiciones
                    </button>.
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Enviando mensaje...</span>
                      </>
                    ) : (
                      <>
                        <span>Enviar Consulta</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <LandingFooter
        onOpenContact={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onOpenTerms={onOpenTerms}
        onOpenPrivacy={onOpenPrivacy}
        onOpenPortal={onOpenPortal}
        onOpenLogin={onOpenLogin}
      />
    </div>
  );
};
