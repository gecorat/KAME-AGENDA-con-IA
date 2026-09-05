import React, { useState } from 'react';
import { X, Mail, Lock, User, AlertCircle, Sparkles, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAgendaStore } from '../lib/store';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess
}) => {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, loginAsDemo, isAuthLoading } = useAgendaStore();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('Medicina General / Consultorio');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('La ventana de inicio con Google se cerró antes de completar.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Tu navegador bloqueó la ventana emergente de Google. Habilítala para continuar.');
      } else {
        setError(err.message || 'No se pudo iniciar sesión con Google. Puedes probar el acceso con email o demo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        if (!email || !password) {
          throw new Error('Por favor completa tu correo y contraseña.');
        }
        await loginWithEmail(email, password);
      } else {
        if (!fullName || !email || !password) {
          throw new Error('Por favor completa todos los campos requeridos.');
        }
        if (password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres.');
        }
        await registerWithEmail(fullName, email, password, specialty);
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Credenciales inválidas. Verifica tu correo y contraseña.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este correo ya se encuentra registrado. Por favor inicia sesión.');
        setMode('login');
      } else {
        setError(err.message || 'Ocurrió un error al procesar tu solicitud.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (type: 'superadmin' | 'pro' | 'basic') => {
    loginAsDemo(type);
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-950 text-white flex items-center justify-center font-bold text-xs">
              K
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 font-display">
                {mode === 'login' ? 'Iniciar Sesión en AgendaPro' : 'Crear Cuenta Profesional'}
              </h3>
              <p className="text-xs text-neutral-500">
                {mode === 'login' ? 'Accede a tu panel médico y agenda' : 'Comienza tu prueba gratis de 14 días'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 p-1 bg-neutral-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className={`py-2 rounded-lg transition-all ${
                mode === 'login' 
                  ? 'bg-white text-neutral-900 shadow-2xs' 
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); }}
              className={`py-2 rounded-lg transition-all ${
                mode === 'register' 
                  ? 'bg-white text-neutral-900 shadow-2xs' 
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Crear Cuenta Gratis
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Action: Google Auth */}
          <div>
            <button
              type="button"
              id="btn-google-auth"
              onClick={handleGoogleSignIn}
              disabled={loading || isAuthLoading}
              className="w-full h-11 px-4 bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-800 font-semibold text-sm rounded-xl transition-all shadow-2xs flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{mode === 'login' ? 'Continuar con Google' : 'Crear cuenta con Google'}</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-neutral-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-medium text-neutral-400 uppercase tracking-wider shrink-0">
              o con correo
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Nombre Completo / Título Profesional
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Ej. Dr. Martín González"
                    className="w-full h-10 pl-9 pr-3 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full h-10 pl-9 pr-3 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-neutral-700">
                  Contraseña
                </label>
                {mode === 'login' && (
                  <span className="text-[11px] text-neutral-500 hover:text-neutral-900 cursor-pointer">
                    ¿Olvidaste tu clave?
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 pl-9 pr-3 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Especialidad Principal
                </label>
                <input
                  type="text"
                  value={specialty}
                  onChange={e => setSpecialty(e.target.value)}
                  placeholder="Ej. Odontología, Psicología, Cardiología"
                  className="w-full h-10 px-3 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <span>Procesando...</span>
              ) : mode === 'login' ? (
                <>
                  <span>Ingresar al Panel</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Crear Cuenta y Comenzar</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Direct Demo / Fast Access Selector */}
          <div className="pt-2 border-t border-neutral-100">
            <div className="text-[11px] font-semibold text-neutral-500 mb-2 flex items-center justify-between">
              <span>Accesos rápidos de prueba (1 clic):</span>
              <span className="text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-600">Sin registro previo</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('superadmin')}
                className="p-2 text-left bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 rounded-xl transition-colors group"
              >
                <span className="block text-[11px] font-bold text-neutral-900 leading-tight group-hover:text-amber-600">
                  Super Admin
                </span>
                <span className="block text-[10px] text-neutral-500 truncate">
                  Gonzalo Corat
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('pro')}
                className="p-2 text-left bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 rounded-xl transition-colors group"
              >
                <span className="block text-[11px] font-bold text-neutral-900 leading-tight group-hover:text-sky-600">
                  Plan Pro AI
                </span>
                <span className="block text-[10px] text-neutral-500 truncate">
                  Dra. Valenzuela
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('basic')}
                className="p-2 text-left bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 rounded-xl transition-colors group"
              >
                <span className="block text-[11px] font-bold text-neutral-900 leading-tight group-hover:text-neutral-700">
                  Plan Básico
                </span>
                <span className="block text-[10px] text-neutral-500 truncate">
                  Dr. Romero
                </span>
              </button>
            </div>
          </div>

          <div className="text-center">
            <p className="text-[11px] text-neutral-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tus datos y los de tus pacientes están 100% protegidos</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
