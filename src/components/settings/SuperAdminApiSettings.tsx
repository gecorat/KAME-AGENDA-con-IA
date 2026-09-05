import React, { useState } from 'react';
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
  Webhook
} from 'lucide-react';
import { PracticeSettings } from '../../types';

interface SuperAdminApiSettingsProps {
  formData: PracticeSettings;
  onChange: (field: keyof PracticeSettings, value: any) => void;
}

export const SuperAdminApiSettings: React.FC<SuperAdminApiSettingsProps> = ({
  formData,
  onChange
}) => {
  const [testingEvolution, setTestingEvolution] = useState(false);
  const [evolutionResult, setEvolutionResult] = useState<{ success: boolean; message: string; state?: string } | null>(null);

  const [testingEmail, setTestingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testEmailTo, setTestEmailTo] = useState('gonzalocorat@gmail.com');
  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWebhook(id);
    setTimeout(() => setCopiedWebhook(null), 2000);
  };

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tu-dominio.com';
  const evolutionWebhookUrl = `${originUrl}/api/evolution/webhook`;
  const mercadoPagoWebhookUrl = `${originUrl}/api/mercadopago/webhook`;

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
          practiceName: 'AgendaPro AI Platform',
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
          message: data.simulated
            ? `Prueba simulada exitosa para ${testEmailTo}. Configura RESEND_API_KEY para envíos reales.`
            : `¡Correo de prueba enviado con éxito a ${testEmailTo}!`
        });
      } else {
        setEmailResult({
          success: false,
          message: data.error || 'No se pudo enviar el correo de prueba.'
        });
      }
    } catch (e: any) {
      setEmailResult({
        success: false,
        message: e.message || 'Error al conectar con la API de correos.'
      });
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Super Admin Notice Banner */}
      <div className="p-4 bg-neutral-900 text-white rounded-2xl shadow-sm space-y-2 border border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-400 text-neutral-900 flex items-center justify-center font-bold">
              <Crown className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider font-display text-amber-300">
              Panel Exclusivo de Super Administrador
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-800 text-neutral-300 border border-neutral-700 flex items-center gap-1">
            <Lock className="w-3 h-3 text-amber-400" />
            gonzalocorat@gmail.com
          </span>
        </div>
        <p className="text-xs text-neutral-300 leading-relaxed">
          Solo tú tienes visibilidad de estas credenciales y endpoints maestros. Los médicos y profesionales que usen el sistema <strong>nunca verán claves de API ni URLs</strong>: ellos únicamente verán el botón de <strong>Escanear QR de WhatsApp</strong> y las suscripciones a pagar mediante Mercado Pago.
        </p>
      </div>

      {/* 1. Evolution API (Global WhatsApp Microservice) */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-display">
                Evolution API (Servidor Maestro de WhatsApp)
              </h3>
              <p className="text-xs text-neutral-500">
                El microservicio backend Baileys que genera los códigos QR para que los consultorios sincronicen sus teléfonos.
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-900 text-white font-mono">
            SAAS CORE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-neutral-700 block mb-1">
              Evolution API Server URL:
            </label>
            <input
              type="url"
              placeholder="https://evolution.tudominio.com"
              value={formData.evolution_api_url || ''}
              onChange={e => onChange('evolution_api_url', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
            <p className="text-[10px] text-neutral-400 mt-1">
              URL del contenedor Docker o VPS donde está desplegado tu Evolution API.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">
              Prefijo / Nombre de Instancia:
            </label>
            <input
              type="text"
              placeholder="consultorio"
              value={formData.evolution_instance_name || ''}
              onChange={e => onChange('evolution_instance_name', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-neutral-400 font-semibold"
            />
            <p className="text-[10px] text-neutral-400 mt-1">
              Identificador de la sesión en el servidor.
            </p>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-700 block mb-1">
            Evolution Global API Key (Apikey de autenticación):
          </label>
          <input
            type="password"
            placeholder="4296001409E42C3A9B2491647..."
            value={formData.evolution_api_key || ''}
            onChange={e => onChange('evolution_api_key', e.target.value)}
            className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-neutral-400"
          />
        </div>

        {/* Evolution Webhook */}
        <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/90 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
              <Webhook className="w-3.5 h-3.5 text-neutral-600" />
              Webhook Global para Recepción de Mensajes (Evolution API)
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(evolutionWebhookUrl, 'evolution')}
              className="text-[11px] font-semibold text-neutral-700 hover:text-neutral-900 flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedWebhook === 'evolution' ? '¡Copiado!' : 'Copiar Webhook'}</span>
            </button>
          </div>
          <div className="p-2 bg-white rounded-lg border border-neutral-200 text-xs font-mono text-neutral-700 select-all break-all">
            {evolutionWebhookUrl}
          </div>
          <p className="text-[10px] text-neutral-500">
            Eventos a suscribir en Evolution API: <code>MESSAGES_UPSERT</code> y <code>CONNECTION_UPDATE</code>.
          </p>
        </div>

        {/* Test Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
          <button
            type="button"
            disabled={testingEvolution}
            onClick={handleTestEvolution}
            className="px-3.5 py-2 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingEvolution ? 'animate-spin' : ''}`} />
            <span>{testingEvolution ? 'Verificando Servidor...' : 'Probar Conexión con Evolution API'}</span>
          </button>

          {evolutionResult && (
            <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
              evolutionResult.success
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {evolutionResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span>{evolutionResult.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Mercado Pago (SaaS Platform Subscriptions) */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-display">
                Mercado Pago (Suscripciones de la Plataforma SaaS)
              </h3>
              <p className="text-xs text-neutral-500">
                Aquí van <strong>tus credenciales de Mercado Pago</strong> para cobrar los planes Básico y Pro a los médicos y consultorios.
              </p>
            </div>
          </div>
          <a
            href="https://www.mercadopago.com.ar/developers/panel/app"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1"
          >
            <span>Panel Developers MP</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="p-3 bg-sky-50/70 border border-sky-200/80 rounded-xl text-xs text-sky-950 leading-relaxed">
          <strong>Aclaración de Cobros:</strong> Los pagos por suscripción SaaS van a tu cuenta de Mercado Pago personal/empresa. Las señas de los pacientes se cobran en la cuenta bancaria o MP de cada consultorio configurado en la pestaña "Señas de Pacientes".
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">
              Tu Public Key de Mercado Pago:
            </label>
            <input
              type="text"
              placeholder="APP_USR-672589...-042812-..."
              value={formData.mercadopago_public_key || ''}
              onChange={e => onChange('mercadopago_public_key', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">
              Tu Access Token de Mercado Pago:
            </label>
            <input
              type="password"
              placeholder="APP_USR-7819203847-..."
              value={formData.mercadopago_access_token || ''}
              onChange={e => onChange('mercadopago_access_token', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
          </div>
        </div>

        {/* MP Webhook */}
        <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/90 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
              <Webhook className="w-3.5 h-3.5 text-neutral-600" />
              Webhook de Pagos de Suscripciones
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(mercadoPagoWebhookUrl, 'mp')}
              className="text-[11px] font-semibold text-neutral-700 hover:text-neutral-900 flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedWebhook === 'mp' ? '¡Copiado!' : 'Copiar Webhook'}</span>
            </button>
          </div>
          <div className="p-2 bg-white rounded-lg border border-neutral-200 text-xs font-mono text-neutral-700 select-all break-all">
            {mercadoPagoWebhookUrl}
          </div>
        </div>
      </div>

      {/* 3. Transactional Emails (Resend / SMTP) */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-700 border border-violet-200 flex items-center justify-center font-bold">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-display">
                Servidor de Correo Transaccional (Resend / SMTP)
              </h3>
              <p className="text-xs text-neutral-500">
                Envío de confirmaciones y recordatorios por email para todos los pacientes del sistema.
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-700">
            Email Engine
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">
              Resend API Key:
            </label>
            <input
              type="password"
              placeholder="re_123456789_abcdef..."
              value={formData.email_resend_api_key || ''}
              onChange={e => onChange('email_resend_api_key', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">
              Dirección de Remitente (Sender Email):
            </label>
            <input
              type="email"
              placeholder="turnos@agendapro.com"
              value={formData.email_sender_address || ''}
              onChange={e => onChange('email_sender_address', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
          </div>
        </div>

        {/* Test Email */}
        <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1 w-full">
            <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
              Enviar correo de prueba a:
            </label>
            <input
              type="email"
              value={testEmailTo}
              onChange={e => setTestEmailTo(e.target.value)}
              placeholder="gonzalocorat@gmail.com"
              className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
          </div>
          <button
            type="button"
            disabled={testingEmail}
            onClick={handleTestEmail}
            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition shrink-0 self-end"
          >
            {testingEmail ? 'Enviando...' : 'Enviar Prueba'}
          </button>
        </div>

        {emailResult && (
          <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
            emailResult.success
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {emailResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{emailResult.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};
