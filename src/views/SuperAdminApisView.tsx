import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  Phone,
  CreditCard,
  Mail,
  Copy,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Crown,
  Lock,
  Webhook,
  Save,
  Check,
  Server,
  Sparkles,
  Zap,
  Globe,
  Sliders,
  Building2,
  Layers,
  FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAgendaStore } from '../lib/store';
import { PracticeSettings } from '../types';
import { SaasPaymentOrchestrator } from '../components/superadmin/SaasPaymentOrchestrator';
import { SaasTransferSubmissionsManager } from '../components/superadmin/SaasTransferSubmissionsManager';

export const SuperAdminApisView: React.FC = () => {
  const { practiceSettings, updatePracticeSettings, currentUser, saasTransfers } = useAgendaStore();

  const [activeTab, setActiveTab] = useState<'pasarelas' | 'orquestador' | 'transferencias'>('pasarelas');
  const [formData, setFormData] = useState<PracticeSettings>(practiceSettings);
  const [testingEvolution, setTestingEvolution] = useState(false);

  // Keep formData synchronized whenever practiceSettings loads or updates from Firestore
  useEffect(() => {
    if (practiceSettings) {
      setFormData(prev => ({ ...practiceSettings, ...prev, ...practiceSettings }));
    }
  }, [practiceSettings]);
  const [evolutionResult, setEvolutionResult] = useState<{ success: boolean; message: string; state?: string } | null>(null);

  const [testingDlocal, setTestingDlocal] = useState(false);
  const [dlocalResult, setDlocalResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testingLemonSqueezy, setTestingLemonSqueezy] = useState(false);
  const [lemonSqueezyResult, setLemonSqueezyResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testingEmail, setTestingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testEmailTo, setTestEmailTo] = useState('gonzalocorat@gmail.com');
  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isSuperAdmin = !currentUser || currentUser?.email?.toLowerCase() === 'gonzalocorat@gmail.com' || currentUser?.role === 'superadmin' || Boolean(currentUser?.isSuperAdmin);

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tu-dominio.com';
  const evolutionWebhookUrl = `${originUrl}/api/evolution/webhook`;
  const mercadoPagoWebhookUrl = `${originUrl}/api/mercadopago/webhook`;
  const dlocalWebhookUrl = `${originUrl}/api/dlocalgo/webhook`;
  const lemonSqueezyWebhookUrl = `${originUrl}/api/lemonsqueezy/webhook`;

  const pendingTransfersCount = saasTransfers?.filter(t => t.status === 'pending').length || 0;

  const handleChange = (field: keyof PracticeSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updatePracticeSettings(formData);
    setSaveSuccess(true);
    confetti({ particleCount: 50, spread: 60 });
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWebhook(id);
    setTimeout(() => setCopiedWebhook(null), 2000);
  };

  const handleTestLemonSqueezy = async () => {
    setTestingLemonSqueezy(true);
    setLemonSqueezyResult(null);
    try {
      const res = await fetch('/api/lemonsqueezy/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: formData.lemonsqueezy_api_key
        })
      });
      const data = await res.json();
      setLemonSqueezyResult({
        success: data.success,
        message: data.message || (data.success ? 'Conexión exitosa con Lemon Squeezy' : 'Error en la conexión')
      });
    } catch (err: any) {
      setLemonSqueezyResult({
        success: false,
        message: err.message || 'Error de red al conectar con Lemon Squeezy.'
      });
    } finally {
      setTestingLemonSqueezy(false);
    }
  };

  const handleTestEvolution = async () => {
    setTestingEvolution(true);
    setEvolutionResult(null);
    try {
      const res = await fetch('/api/evolution/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiUrl: formData.evolution_api_url,
          apiKey: formData.evolution_api_key,
          instanceName: formData.evolution_instance_name
        })
      });
      const data = await res.json();
      if (data.success) {
        setEvolutionResult({
          success: true,
          message: `¡Conexión exitosa con Evolution API! Estado de instancia: ${data.status || 'operativa'}`,
          state: data.status
        });
      } else {
        setEvolutionResult({
          success: false,
          message: data.message || data.error || 'No se pudo contactar al microservicio Evolution API.'
        });
      }
    } catch (e: any) {
      setEvolutionResult({
        success: false,
        message: e.message || 'Error de red al conectar con Evolution API.'
      });
    } finally {
      setTestingEvolution(false);
    }
  };

  const handleTestDlocal = async () => {
    setTestingDlocal(true);
    setDlocalResult(null);
    try {
      const res = await fetch('/api/dlocalgo/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: formData.dlocal_go_api_key,
          secretKey: formData.dlocal_go_secret_key
        })
      });
      const data = await res.json();
      if (data.success) {
        setDlocalResult({
          success: true,
          message: data.message || '¡Conexión exitosa con DLocal Go! API Key válida.'
        });
      } else {
        setDlocalResult({
          success: false,
          message: data.message || data.error || 'Error al conectar con DLocal Go.'
        });
      }
    } catch (e: any) {
      setDlocalResult({
        success: false,
        message: e.message || 'Error de red al conectar con DLocal Go.'
      });
    } finally {
      setTestingDlocal(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setEmailResult(null);
    try {
      const res = await fetch('/api/reminders/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmailTo,
          patientName: 'Gonzalo Corat (Admin Test)',
          practiceName: 'Agenfacil Platform',
          date: 'Mañana',
          time: '10:00',
          serviceName: 'Prueba de Sistema',
          modality: 'presencial',
          address: 'Servidor Central',
          resendApiKey: formData.email_resend_api_key,
          senderEmail: formData.email_sender_address
        })
      });
      const data = await res.json();
      if (data.success) {
        setEmailResult({
          success: true,
          message: `¡Correo de prueba despachado con éxito a ${testEmailTo}!`
        });
      } else {
        setEmailResult({
          success: false,
          message: data.message || data.error || 'Error al enviar correo mediante Resend API.'
        });
      }
    } catch (e: any) {
      setEmailResult({
        success: false,
        message: e.message || 'Error de conexión al enviar email.'
      });
    } finally {
      setTestingEmail(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <Lock className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-neutral-900 mb-2">
          Acceso Restringido a Super Administrador
        </h3>
        <p className="text-xs sm:text-sm text-neutral-600 mb-6 leading-relaxed">
          Esta sección de credenciales maestras y webhooks está reservada para el administrador de la plataforma.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Banner & Header */}
      <div className="bg-neutral-900 text-white rounded-3xl p-6 sm:p-8 border border-neutral-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-neutral-950 font-bold text-[11px] tracking-wide uppercase flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" />
                Super Admin
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                {currentUser?.email || 'gonzalocorat@gmail.com'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/80 text-[10px] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Credenciales Maestras SaaS
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              APIs, Webhooks & Pasarelas Centrales
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl leading-relaxed">
              Configura las llaves de acceso globales que dan vida a toda la plataforma: el microservicio Evolution API (WhatsApp), la pasarela Mercado Pago y el servicio transaccional de Email Resend.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleSaveAll()}
            className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs cursor-pointer self-start md:self-auto shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>{saveSuccess ? '¡Guardado en Firestore!' : 'Guardar Credenciales'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between text-emerald-900 text-xs font-bold animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>¡Todas las credenciales y webhooks se han actualizado correctamente en Firestore!</span>
          </div>
          <button onClick={() => setSaveSuccess(false)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <Check className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Status Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">WhatsApp Evolution API</span>
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Phone className="w-4 h-4" />
            </span>
          </div>
          <div className="text-base font-bold text-neutral-900 flex items-center gap-1.5">
            {formData.evolution_api_url ? (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Configurado
              </span>
            ) : (
              <span className="text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Pendiente URL
              </span>
            )}
          </div>
          <p className="text-[11px] text-neutral-400">
            {formData.evolution_instance_name || 'master-agenfacil'} (Instancia Maestra)
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">Mercado Pago Gateway</span>
            <span className="p-2 bg-sky-50 text-sky-700 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <div className="text-base font-bold text-neutral-900 flex items-center gap-1.5">
            {formData.mercadopago_access_token ? (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Token Activo
              </span>
            ) : (
              <span className="text-neutral-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Sin Token
              </span>
            )}
          </div>
          <p className="text-[11px] text-neutral-400">
            Cobro suscripciones ($49k / $29k)
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">DLocal Go (Checkout Pro)</span>
            <span className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <Globe className="w-4 h-4" />
            </span>
          </div>
          <div className="text-base font-bold text-neutral-900 flex items-center gap-1.5">
            {formData.dlocal_go_api_key ? (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Conectado
              </span>
            ) : (
              <span className="text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Sin API Key
              </span>
            )}
          </div>
          <p className="text-[11px] text-neutral-400">
            Tarjetas, transferencias y pagos locales
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">Email Transaccional (Resend)</span>
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Mail className="w-4 h-4" />
            </span>
          </div>
          <div className="text-base font-bold text-neutral-900 flex items-center gap-1.5">
            {formData.email_resend_api_key ? (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> API Key Lista
              </span>
            ) : (
              <span className="text-neutral-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Sin API Key
              </span>
            )}
          </div>
          <p className="text-[11px] text-neutral-400">
            {formData.email_sender_address || 'notificaciones@agenfacil.com'}
          </p>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('pasarelas')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'pasarelas'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Pasarelas & Credenciales APIs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orquestador')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'orquestador'
              ? 'bg-amber-500 text-neutral-950 shadow-xs'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Orquestador & Prioridad SaaS</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('transferencias')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer relative ${
            activeTab === 'transferencias'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Transferencias & Confirmaciones</span>
          {pendingTransfersCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-neutral-950 animate-pulse">
              {pendingTransfersCount} pend.
            </span>
          )}
        </button>
      </div>

      {/* TAB CONTENT 1: ORQUESTADOR DE MÉTODOS Y PRIORIDAD */}
      {activeTab === 'orquestador' && (
        <div className="space-y-6 animate-fade-in">
          <SaasPaymentOrchestrator formData={formData} handleChange={handleChange} />
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => handleSaveAll()}
              className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-2xl text-xs transition flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>Guardar Configuración de Prioridad</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: BANDEJA DE TRANSFERENCIAS Y DATOS BANCARIOS */}
      {activeTab === 'transferencias' && (
        <div className="space-y-6 animate-fade-in">
          <SaasTransferSubmissionsManager formData={formData} handleChange={handleChange} />
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => handleSaveAll()}
              className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-2xl text-xs transition flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>Guardar Datos Bancarios</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: PASARELAS Y CREDENCIALES APIS */}
      {activeTab === 'pasarelas' && (
      <form onSubmit={handleSaveAll} className="space-y-6 animate-fade-in">
        {/* SECTION 1: EVOLUTION API (WHATSAPP SAAS GATEWAY) */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  1. Microservicio Evolution API (WhatsApp Gateway)
                </h3>
                <p className="text-xs text-neutral-500">
                  Conexión con el servidor Docker / VPS que gestiona las sesiones de WhatsApp y el bot con IA.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              Multi-tenant
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-neutral-700 block mb-1">
                URL del Servidor Evolution API:
              </label>
              <input
                type="url"
                value={formData.evolution_api_url || ''}
                onChange={e => handleChange('evolution_api_url', e.target.value)}
                placeholder="https://evolution.tu-dominio.com"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 font-mono text-xs"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                Dirección HTTPS del endpoint donde corre Evolution API (sin barra final).
              </p>
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">
                Global API Key (Evolution Server):
              </label>
              <input
                type="password"
                value={formData.evolution_api_key || ''}
                onChange={e => handleChange('evolution_api_key', e.target.value)}
                placeholder="4296444B631A411F49DD67A9"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 font-mono text-xs"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                AUTHENTICATION_API_KEY configurada en tu archivo .env del servidor Evolution.
              </p>
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">
                Nombre de Instancia Maestra (Default):
              </label>
              <input
                type="text"
                value={formData.evolution_instance_name || ''}
                onChange={e => handleChange('evolution_instance_name', e.target.value)}
                placeholder="master-agenfacil"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 font-mono text-xs"
              />
            </div>

            {/* Test Connection Button & Result */}
            <div className="flex flex-col justify-end">
              <button
                type="button"
                disabled={testingEvolution || !formData.evolution_api_url}
                onClick={handleTestEvolution}
                className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2 shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {testingEvolution ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                <span>Probar Conexión con Evolution API</span>
              </button>
            </div>
          </div>

          {evolutionResult && (
            <div className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
              evolutionResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              {evolutionResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="font-bold">{evolutionResult.success ? 'Conexión Exitosa' : 'Fallo de Conexión'}</span>
                <p className="text-[11px] leading-relaxed">{evolutionResult.message}</p>
              </div>
            </div>
          )}

          {/* Evolution Webhook URL Box */}
          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-neutral-800">
                <Webhook className="w-4 h-4 text-emerald-700" />
                <span>URL de Webhook para Evolution API (Eventos de Entrada):</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(evolutionWebhookUrl, 'evolution')}
                className="text-neutral-700 hover:text-neutral-900 font-semibold inline-flex items-center gap-1 text-[11px] bg-white px-2.5 py-1 rounded-lg border border-neutral-200 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedWebhook === 'evolution' ? '¡Copiado!' : 'Copiar URL'}</span>
              </button>
            </div>
            <code className="block p-2.5 bg-white border border-neutral-200 rounded-xl font-mono text-[11px] text-neutral-700 select-all overflow-x-auto">
              {evolutionWebhookUrl}
            </code>
            <p className="text-[10px] text-neutral-500">
              Configura este webhook en tu Evolution API para recibir los mensajes entrantes de los pacientes en tiempo real y disparar la IA Gemini.
            </p>
          </div>
        </div>

        {/* SECTION 2: MERCADO PAGO GATEWAY & SUSCRIPCIONES */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  2. Mercado Pago Suscripciones SaaS & Pagos Centrales
                </h3>
                <p className="text-xs text-neutral-500">
                  Recibe las suscripciones recurrentes de los médicos (Plan Pro $49.000 / Plan Básico $29.000).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="toggle-mercadopago-checkbox"
                  checked={formData.saas_method_mercadopago_enabled !== false}
                  onChange={e => {
                    const checked = e.target.checked;
                    handleChange('saas_method_mercadopago_enabled', checked);
                    updatePracticeSettings({
                      saas_method_mercadopago_enabled: checked
                    });
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
              </label>
              <span className={`text-xs font-bold ${
                formData.saas_method_mercadopago_enabled !== false
                  ? 'text-sky-700'
                  : 'text-neutral-400'
              }`}>
                {formData.saas_method_mercadopago_enabled !== false ? 'Habilitado' : 'Deshabilitado'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-neutral-700 block mb-1">
                Access Token (Producción):
              </label>
              <input
                type="password"
                value={formData.mercadopago_access_token || ''}
                onChange={e => handleChange('mercadopago_access_token', e.target.value)}
                placeholder="APP_USR-xxxxxx-xxxxxx..."
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 font-mono text-xs"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                Tu Access Token de Mercado Pago Developers para emitir cobros y suscripciones.
              </p>
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">
                Public Key:
              </label>
              <input
                type="text"
                value={formData.mercadopago_public_key || ''}
                onChange={e => handleChange('mercadopago_public_key', e.target.value)}
                placeholder="APP_USR-xxxxxx-..."
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 font-mono text-xs"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-semibold text-neutral-700 block mb-1">
                Webhook Secret (Firma de Seguridad):
              </label>
              <input
                type="password"
                value={formData.mercadopago_webhook_secret || ''}
                onChange={e => handleChange('mercadopago_webhook_secret', e.target.value)}
                placeholder="whsec_xxxxxxxxx..."
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 font-mono text-xs"
              />
            </div>
          </div>

          {/* Mercado Pago Webhook URL Box */}
          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-neutral-800">
                <Webhook className="w-4 h-4 text-sky-700" />
                <span>URL de Notificaciones Webhook (Mercado Pago IPN):</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(mercadoPagoWebhookUrl, 'mp')}
                className="text-neutral-700 hover:text-neutral-900 font-semibold inline-flex items-center gap-1 text-[11px] bg-white px-2.5 py-1 rounded-lg border border-neutral-200 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedWebhook === 'mp' ? '¡Copiado!' : 'Copiar URL'}</span>
              </button>
            </div>
            <code className="block p-2.5 bg-white border border-neutral-200 rounded-xl font-mono text-[11px] text-neutral-700 select-all overflow-x-auto">
              {mercadoPagoWebhookUrl}
            </code>
            <p className="text-[10px] text-neutral-500">
              Registra esta URL en tu Dashboard de Desarrolladores de Mercado Pago para procesar altas y renovaciones automáticas de suscripciones.
            </p>
          </div>
        </div>

        {/* SECTION 3: LEMON SQUEEZY (MERCHANT OF RECORD GLOBAL & SAAS) */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-900 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-neutral-900">
                    3. Lemon Squeezy (Merchant of Record Global)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    SaaS Global & Recurrente
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  Cobros recurrentes con tarjetas internacionales y locales, gestión fiscal automatizada y facturación sin requerir aprobación de pasarela previa.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="toggle-lemonsqueezy-checkbox"
                  checked={formData.saas_method_lemonsqueezy_enabled !== false && formData.lemonsqueezy_enabled !== false}
                  onChange={e => {
                    const checked = e.target.checked;
                    handleChange('saas_method_lemonsqueezy_enabled', checked);
                    handleChange('lemonsqueezy_enabled', checked);
                    updatePracticeSettings({
                      saas_method_lemonsqueezy_enabled: checked,
                      lemonsqueezy_enabled: checked
                    });
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
              <span className={`text-xs font-bold ${
                formData.saas_method_lemonsqueezy_enabled !== false && formData.lemonsqueezy_enabled !== false
                  ? 'text-amber-700'
                  : 'text-neutral-400'
              }`}>
                {formData.saas_method_lemonsqueezy_enabled !== false && formData.lemonsqueezy_enabled !== false ? 'Habilitado' : 'Deshabilitado'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="font-semibold text-neutral-700 block mb-1">
                Lemon Squeezy API Key (Bearer Token):
              </label>
              <input
                type="password"
                value={formData.lemonsqueezy_api_key || ''}
                onChange={e => handleChange('lemonsqueezy_api_key', e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 font-mono text-xs"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                Generada en tu cuenta de Lemon Squeezy &gt; Settings &gt; API Keys.
              </p>
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">
                Store ID:
              </label>
              <input
                type="text"
                value={formData.lemonsqueezy_store_id || ''}
                onChange={e => handleChange('lemonsqueezy_store_id', e.target.value)}
                placeholder="12345"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 font-mono text-xs"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                ID de tu tienda en Lemon Squeezy (número visible en la URL de tu Store).
              </p>
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">
                Webhook Secret (Firma de Validación):
              </label>
              <input
                type="password"
                value={formData.lemonsqueezy_webhook_secret || ''}
                onChange={e => handleChange('lemonsqueezy_webhook_secret', e.target.value)}
                placeholder="whsec_lemonsqueezy_secret..."
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 font-mono text-xs"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                Secreto firmado para verificar autenticidad en notificaciones de cobro.
              </p>
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">
                Variant ID - Plan Básico:
              </label>
              <input
                type="text"
                value={formData.lemonsqueezy_variant_id_basic || ''}
                onChange={e => handleChange('lemonsqueezy_variant_id_basic', e.target.value)}
                placeholder="Ej: 567891"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 font-mono text-xs"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                Variant ID del producto Plan Básico creado en Lemon Squeezy.
              </p>
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">
                Variant ID - Plan Pro AI:
              </label>
              <input
                type="text"
                value={formData.lemonsqueezy_variant_id_pro || ''}
                onChange={e => handleChange('lemonsqueezy_variant_id_pro', e.target.value)}
                placeholder="Ej: 567892"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 font-mono text-xs"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                Variant ID del producto Plan Pro AI creado en Lemon Squeezy.
              </p>
            </div>

            {/* Test Lemon Squeezy Connection Button */}
            <div className="md:col-span-2 pt-2 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[11px] text-neutral-500">
                Verifica la autenticación directa con la API oficial de Lemon Squeezy.
              </p>
              <button
                type="button"
                disabled={testingLemonSqueezy || !formData.lemonsqueezy_api_key}
                onClick={handleTestLemonSqueezy}
                className="w-full sm:w-auto py-2 px-4 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-2xs disabled:opacity-50 cursor-pointer shrink-0"
              >
                {testingLemonSqueezy ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Probar Conexión con Lemon Squeezy</span>
              </button>
            </div>
          </div>

          {lemonSqueezyResult && (
            <div className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
              lemonSqueezyResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              {lemonSqueezyResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="font-bold">{lemonSqueezyResult.success ? 'Conexión Exitosa' : 'Error en Validación'}</span>
                <p className="text-[11px] leading-relaxed">{lemonSqueezyResult.message}</p>
              </div>
            </div>
          )}

          {/* Lemon Squeezy Webhook URL Box */}
          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-neutral-800">
                <Webhook className="w-4 h-4 text-amber-700" />
                <span>URL de Webhook (Lemon Squeezy):</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(lemonSqueezyWebhookUrl, 'ls')}
                className="text-neutral-700 hover:text-neutral-900 font-semibold inline-flex items-center gap-1 text-[11px] bg-white px-2.5 py-1 rounded-lg border border-neutral-200 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedWebhook === 'ls' ? '¡Copiado!' : 'Copiar URL'}</span>
              </button>
            </div>
            <code className="block p-2.5 bg-white border border-neutral-200 rounded-xl font-mono text-[11px] text-neutral-700 select-all overflow-x-auto">
              {lemonSqueezyWebhookUrl}
            </code>
            <p className="text-[10px] text-neutral-500">
              Pega esta URL en tu Dashboard de Lemon Squeezy &gt; Settings &gt; Webhooks para capturar eventos de suscripción creada, renovada o cancelada.
            </p>
          </div>
        </div>

        {/* SECTION 4: DLOCAL GO (CHECKOUT PRO GLOBAL & LATAM) */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-neutral-900">
                    4. DLocal Go (Checkout Pro Latam & Global)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    Pasarela Recomendada
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  Cobro de suscripciones de planes en moneda local (ARS, USD, BRL, etc.) mediante tarjetas de crédito, débito y transferencias directas con retorno automático.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="toggle-dlocal-checkbox"
                  checked={formData.saas_method_dlocal_enabled !== false && formData.dlocal_go_enabled !== false && Boolean(formData.saas_method_dlocal_enabled || formData.dlocal_go_enabled)}
                  onChange={e => {
                    const checked = e.target.checked;
                    handleChange('saas_method_dlocal_enabled', checked);
                    handleChange('dlocal_go_enabled', checked);
                    updatePracticeSettings({
                      saas_method_dlocal_enabled: checked,
                      dlocal_go_enabled: checked
                    });
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
              <span className={`text-xs font-bold ${
                formData.saas_method_dlocal_enabled !== false && formData.dlocal_go_enabled !== false && Boolean(formData.saas_method_dlocal_enabled || formData.dlocal_go_enabled)
                  ? 'text-purple-700'
                  : 'text-neutral-400'
              }`}>
                {formData.saas_method_dlocal_enabled !== false && formData.dlocal_go_enabled !== false && Boolean(formData.saas_method_dlocal_enabled || formData.dlocal_go_enabled) ? 'Habilitado' : 'Deshabilitado'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-neutral-700 block mb-1">
                DLocal Go API Key (Bearer Token):
              </label>
              <input
                type="password"
                value={formData.dlocal_go_api_key || ''}
                onChange={e => handleChange('dlocal_go_api_key', e.target.value)}
                placeholder="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI..."
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 font-mono text-xs"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                Tu clave pública/Bearer generada en la consola de integración de DLocal Go.
              </p>
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">
                DLocal Go Secret Key:
              </label>
              <input
                type="password"
                value={formData.dlocal_go_secret_key || ''}
                onChange={e => handleChange('dlocal_go_secret_key', e.target.value)}
                placeholder="sec_live_xxxxxxxx..."
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 font-mono text-xs"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                Clave secreta para validación de callbacks y seguridad de transacciones.
              </p>
            </div>

            {/* Test Connection Button */}
            <div className="md:col-span-2 pt-2 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[11px] text-neutral-500">
                Prueba la comunicación directa con el endpoint oficial de DLocal Go antes de guardar.
              </p>
              <button
                type="button"
                disabled={testingDlocal || !formData.dlocal_go_api_key}
                onClick={handleTestDlocal}
                className="w-full sm:w-auto py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2 shadow-2xs disabled:opacity-50 cursor-pointer shrink-0"
              >
                {testingDlocal ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
                <span>Probar Conexión con DLocal Go</span>
              </button>
            </div>
          </div>

          {dlocalResult && (
            <div className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
              dlocalResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              {dlocalResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="font-bold">{dlocalResult.success ? 'Conexión Exitosa' : 'Error en Validación'}</span>
                <p className="text-[11px] leading-relaxed">{dlocalResult.message}</p>
              </div>
            </div>
          )}

          {/* DLocal Webhook URL Box */}
          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-neutral-800">
                <Webhook className="w-4 h-4 text-amber-700" />
                <span>URL de Retorno / Webhook IPN (DLocal Go):</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(dlocalWebhookUrl, 'dlocal')}
                className="text-neutral-700 hover:text-neutral-900 font-semibold inline-flex items-center gap-1 text-[11px] bg-white px-2.5 py-1 rounded-lg border border-neutral-200 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedWebhook === 'dlocal' ? '¡Copiado!' : 'Copiar URL'}</span>
              </button>
            </div>
            <code className="block p-2.5 bg-white border border-neutral-200 rounded-xl font-mono text-[11px] text-neutral-700 select-all overflow-x-auto">
              {dlocalWebhookUrl}
            </code>
            <p className="text-[10px] text-neutral-500">
              Configura esta URL en el apartado de Webhooks de tu panel DLocal Go para recibir notificaciones automáticas de aprobación en tiempo real.
            </p>
          </div>
        </div>

        {/* SECTION 5: EMAIL TRANSACCIONAL (RESEND / SMTP) */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  5. Servicio de Email Transaccional (Resend API)
                </h3>
                <p className="text-xs text-neutral-500">
                  Envío automático de confirmaciones de reserva, cancelaciones y recordatorios por correo a pacientes.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
              Alta Entregabilidad
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-neutral-700 block mb-1">
                Resend API Key:
              </label>
              <input
                type="password"
                value={formData.email_resend_api_key || ''}
                onChange={e => handleChange('email_resend_api_key', e.target.value)}
                placeholder="re_123456789_abcdefg..."
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 font-mono text-xs"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                Obtén tu API key en <a href="https://resend.com" target="_blank" rel="noreferrer" className="text-sky-600 underline">resend.com</a>.
              </p>
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">
                Remitente Oficial (Sender Address):
              </label>
              <input
                type="email"
                value={formData.email_sender_address || ''}
                onChange={e => handleChange('email_sender_address', e.target.value)}
                placeholder="turnos@agenfacil.com o tu-nombre@tudominio.com"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 font-mono text-xs"
              />
            </div>

            {/* Test Email Section */}
            <div className="md:col-span-2 pt-2 border-t border-neutral-100 flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full">
                <input
                  type="email"
                  value={testEmailTo}
                  onChange={e => setTestEmailTo(e.target.value)}
                  placeholder="email-de-prueba@gmail.com"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 text-xs"
                />
              </div>
              <button
                type="button"
                disabled={testingEmail || !formData.email_resend_api_key}
                onClick={handleTestEmail}
                className="w-full sm:w-auto py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2 shadow-2xs disabled:opacity-50 cursor-pointer shrink-0"
              >
                {testingEmail ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                <span>Enviar Email de Prueba</span>
              </button>
            </div>
          </div>

          {emailResult && (
            <div className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
              emailResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              {emailResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="font-bold">{emailResult.success ? 'Envío Exitoso' : 'Error en Envío'}</span>
                <p className="text-[11px] leading-relaxed">{emailResult.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-2xl text-xs transition flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>{saveSuccess ? '¡Guardado con Éxito!' : 'Guardar Todos los Cambios'}</span>
          </button>
        </div>
      </form>
      )}
    </div>
  );
};
