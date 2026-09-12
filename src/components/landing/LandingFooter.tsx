import React from 'react';
import { Mail, MapPin, ShieldCheck, ArrowRight, Phone, MessageSquare } from 'lucide-react';

interface LandingFooterProps {
  onOpenContact?: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
  onOpenPortal?: () => void;
  onOpenLogin?: () => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({
  onOpenContact,
  onOpenTerms,
  onOpenPrivacy,
  onOpenPortal,
  onOpenLogin
}) => {
  return (
    <footer className="w-full">
      {/* PRE-FOOTER BANNER (Exact style from Kame Agenda) */}
      <section className="bg-neutral-100/90 py-16 px-4 sm:px-6 text-center border-t border-neutral-200">
        <div className="max-w-3xl mx-auto space-y-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-950 tracking-tight">
            ¿Dudas antes de empezar?
          </h2>
          <p className="text-neutral-600 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Escribinos y te respondemos. Sin formularios eternos ni respuestas automáticas.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenContact?.();
              }}
              className="bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Contactanos</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="mailto:contacto@agenfacil.com"
              className="text-neutral-800 hover:text-neutral-950 font-semibold text-xs sm:text-sm underline underline-offset-4 decoration-neutral-300 hover:decoration-neutral-950 transition cursor-pointer"
            >
              contacto@agenfacil.com
            </a>
          </div>
        </div>
      </section>

      {/* MAIN DARK FOOTER (Exact structure & deep navy tone from Kame Agenda) */}
      <div className="bg-[#0b1329] text-slate-300 pt-14 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Top 3-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 sm:gap-12 pb-12">
            {/* Column 1: Brand Info */}
            <div className="space-y-3">
              <h3 className="text-white font-bold text-base tracking-tight flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500 text-neutral-950 flex items-center justify-center font-extrabold text-xs">
                  AF
                </div>
                <span>AgenFacil</span>
              </h3>
              <p className="text-slate-400 text-xs sm:text-[13px] leading-relaxed max-w-sm">
                Agenda online, recordatorios automáticos y asistente de WhatsApp para profesionales que atienden con turno.
              </p>
            </div>

            {/* Column 2: Contact */}
            <div className="space-y-3">
              <h4 className="text-white font-bold text-sm tracking-tight">
                Contacto
              </h4>
              <ul className="space-y-2.5 text-xs sm:text-[13px]">
                <li>
                  <a
                    href="mailto:contacto@agenfacil.com"
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition group"
                  >
                    <Mail className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition" />
                    <span>contacto@agenfacil.com</span>
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenContact?.();
                    }}
                    className="text-slate-400 hover:text-white underline underline-offset-4 decoration-slate-600 hover:decoration-white transition cursor-pointer text-left"
                  >
                    Formulario de contacto
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Legal */}
            <div className="space-y-3">
              <h4 className="text-white font-bold text-sm tracking-tight">
                Legales
              </h4>
              <ul className="space-y-2.5 text-xs sm:text-[13px]">
                <li>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenTerms?.();
                    }}
                    className="text-slate-400 hover:text-white transition cursor-pointer text-left"
                  >
                    Términos y Condiciones
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenPrivacy?.();
                    }}
                    className="text-slate-400 hover:text-white transition cursor-pointer text-left"
                  >
                    Política de Privacidad
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-800/80 pt-8 mt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-400">
              <div className="space-y-1.5">
                <div className="font-semibold text-slate-300">
                  AgenFacil — Sistema de Gestión Médica y Turnos Online
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Villa Carlos Paz, Córdoba, Argentina</span>
                </div>
                <div className="text-slate-500 text-[11px] pt-0.5">
                  © {new Date().getFullYear()} AgenFacil. Todos los derechos reservados.
                </div>
              </div>

              {/* Quick links to portal & login */}
              <div className="flex items-center gap-4 text-xs text-slate-400">
                {onOpenPortal && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenPortal();
                    }}
                    className="hover:text-white transition cursor-pointer"
                  >
                    Portal de Pacientes
                  </button>
                )}
                {onOpenLogin && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenLogin();
                    }}
                    className="hover:text-white transition cursor-pointer"
                  >
                    Ingresar al Panel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
