import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Bot,
  User,
  Send,
  Sparkles,
  Phone,
  Check,
  CheckCheck,
  Calendar,
  RefreshCw,
  Plus,
  ShieldCheck,
  ExternalLink,
  QrCode,
  Wifi,
  WifiOff,
  Link,
  Search,
  Clock,
  DollarSign,
  AlertCircle,
  Copy,
  ChevronRight,
  Filter,
  ArrowLeft,
  ArrowRight,
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAgendaStore } from '../lib/store';
import { Conversation, ChatMessage } from '../types';

interface WhatsAppChatsViewProps {
  onOpenNewAppointmentWithPatient?: (patientName: string, patientPhone: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const WhatsAppChatsView: React.FC<WhatsAppChatsViewProps> = ({
  onOpenNewAppointmentWithPatient,
  onNavigateToTab
}) => {
  const {
    conversations,
    practiceSettings,
    services,
    availability,
    appointments,
    addChatMessage,
    createConversation,
    toggleAiHandled,
    addAppointment,
    updatePracticeSettings
  } = useAgendaStore();

  const isPro = practiceSettings.subscription_plan === 'pro';
  const isTrial = practiceSettings.subscription_plan === 'trial' || Boolean(practiceSettings.trial_active);

  const [activeConvId, setActiveConvId] = useState<string>(conversations[0]?.id || '');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'ai' | 'manual'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // WhatsApp QR & Pro Upgrade Modals
  const [showQrModal, setShowQrModal] = useState(false);
  const [showProUpgradeModal, setShowProUpgradeModal] = useState(false);
  const [qrScanning, setQrScanning] = useState(false);
  const [qrFetchLoading, setQrFetchLoading] = useState(false);
  const [evolutionQrCode, setEvolutionQrCode] = useState<string | null>(null);
  const [customPhoneInput, setCustomPhoneInput] = useState(practiceSettings.whatsapp_number || '+54 9 11 5000-0000');

  // Simulation modal
  const [showNewSimModal, setShowNewSimModal] = useState(false);
  const [newSimPatientName, setNewSimPatientName] = useState('');
  const [newSimPatientPhone, setNewSimPatientPhone] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find(c => c.id === activeConvId) || conversations[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConv?.messages, loading]);

  // Filtered conversations
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch =
      conv.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.patient_phone.includes(searchQuery);

    if (!matchesSearch) return false;

    if (filterType === 'unread') return conv.unread_count > 0;
    if (filterType === 'ai') return conv.ai_handled;
    if (filterType === 'manual') return !conv.ai_handled;
    return true;
  });

  const handleSendMessage = async (customMessage?: string) => {
    const textToSend = (customMessage || inputText).trim();
    if (!textToSend || !activeConv) return;

    if (!customMessage) {
      setInputText('');
    }

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Add message
    addChatMessage(activeConv.id, {
      role: 'user',
      content: textToSend,
      timestamp: nowTime,
      status: 'read'
    });

    // 2. If AI handled is enabled, call backend Gemini endpoint
    if (activeConv.ai_handled) {
      setLoading(true);
      try {
        const payload = {
          message: textToSend,
          history: activeConv.messages.slice(-8),
          practiceSettings,
          services: services.filter(s => s.active),
          availability,
          existingAppointments: appointments.slice(0, 10).map(a => ({
            start_datetime: a.start_datetime,
            service_name: a.service_name
          }))
        };

        const res = await fetch('/api/assistant/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (data.reply) {
          let actionTaken: ChatMessage['actionTaken'] = undefined;

          if (data.action && data.action.action === 'book_appointment') {
            try {
              confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 }
              });

              const matchedService = services.find(s =>
                s.name.toLowerCase().includes((data.action.service_name || '').toLowerCase())
              ) || services[0];

              const aptDate = data.action.datetime ? new Date(data.action.datetime) : new Date();
              const endDate = new Date(aptDate.getTime() + (matchedService?.duration_minutes || 30) * 60000);

              const created = addAppointment({
                patient_id: 'pat-bot',
                patient_name: data.action.patient_name || activeConv.patient_name,
                patient_phone: data.action.patient_phone || activeConv.patient_phone,
                service_id: matchedService.id,
                service_name: matchedService.name,
                service_price: matchedService.price,
                start_datetime: aptDate.toISOString(),
                end_datetime: endDate.toISOString(),
                status: 'confirmed',
                payment_status: 'pending',
                notes: `Agendado automáticamente por ${practiceSettings.bot_assistant_name}. ${data.action.notes || ''}`,
                origin: 'bot_whatsapp'
              });

              actionTaken = {
                type: 'appointment_created',
                appointmentId: created.id,
                details: `${matchedService.name} el ${aptDate.toLocaleDateString()} a las ${aptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs`
              };
            } catch (err) {
              console.error('Error adding automatic appointment:', err);
            }
          }

          addChatMessage(activeConv.id, {
            role: 'assistant',
            content: data.reply,
            timestamp: replyTime,
            status: 'read',
            actionTaken
          });
        }
      } catch (error) {
        console.error('Chat error:', error);
        addChatMessage(activeConv.id, {
          role: 'assistant',
          content: 'Disculpa, ocurrió una intermitencia en el servicio. ¿Podrías repetir tu consulta?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSendQuickAction = (type: 'portal' | 'cbu' | 'reminder') => {
    if (!activeConv) return;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let text = '';

    if (type === 'portal') {
      text = `Hola ${activeConv.patient_name}, puedes ver todos nuestros tratamientos y agendar tu turno online en cualquier momento ingresando aquí: ${window.location.origin}/#portal`;
    } else if (type === 'cbu') {
      text = `Datos bancarios para señas o transferencias:\n• CBU/CVU: 0000003100098765432100\n• Alias: ${practiceSettings.handle}.MEDICA\n• Titular: ${practiceSettings.professional_name}\nPor favor envía el comprobante por este medio.`;
    } else if (type === 'reminder') {
      text = `Hola ${activeConv.patient_name}, te recordamos tu turno en ${practiceSettings.practice_name} con ${practiceSettings.professional_name}. Por favor responde 'CONFIRMO' para asegurar tu espacio o avísanos si necesitas reprogramar.`;
    }

    addChatMessage(activeConv.id, {
      role: 'assistant',
      content: text,
      timestamp: nowTime,
      status: 'sent'
    });
  };

  const handleCreateSimulation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSimPatientName.trim()) return;

    const newConv = createConversation(
      newSimPatientName.trim(),
      newSimPatientPhone.trim() || '+54 9 11 8899-0011',
      'Hola, quería saber si tienen turnos disponibles para esta semana.'
    );

    setActiveConvId(newConv.id);
    setShowNewSimModal(false);
    setNewSimPatientName('');
    setNewSimPatientPhone('');

    setTimeout(() => {
      handleSendMessage('Hola, quería saber si tienen turnos disponibles para esta semana.');
    }, 400);
  };

  const handleOpenQrModal = async () => {
    setShowQrModal(true);
    setQrFetchLoading(true);
    try {
      const targetInstance = practiceSettings.practice_name
        ? practiceSettings.practice_name.toLowerCase().replace(/[^a-z0-9]/g, '')
        : 'consultorio';
      const res = await fetch('/api/evolution/instance-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: targetInstance })
      });
      const data = await res.json();
      if (data.qrcode) {
        setEvolutionQrCode(data.qrcode);
      }
    } catch (err) {
      console.warn('Error fetching Evolution QR code:', err);
    } finally {
      setQrFetchLoading(false);
    }
  };

  const handleSimulateQrScan = () => {
    setQrScanning(true);
    setTimeout(() => {
      setQrScanning(false);
      updatePracticeSettings({
        whatsapp_connected: true,
        whatsapp_session_phone: customPhoneInput,
        whatsapp_number: customPhoneInput
      });
      setShowQrModal(false);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 } });
    }, 1200);
  };

  const handleDisconnectWhatsApp = async () => {
    if (window.confirm('¿Deseas desvincular la sesión actual de WhatsApp?')) {
      try {
        const targetInstance = practiceSettings.practice_name
          ? practiceSettings.practice_name.toLowerCase().replace(/[^a-z0-9]/g, '')
          : 'consultorio';
        await fetch('/api/evolution/disconnect-instance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instanceName: targetInstance })
        });
      } catch (err) {
        console.warn('Error disconnecting instance:', err);
      }
      updatePracticeSettings({
        whatsapp_connected: false,
        whatsapp_session_phone: undefined
      });
      setEvolutionQrCode(null);
    }
  };

  // Find appointments for active patient
  const activePatientAppointments = appointments.filter(
    a => a.patient_phone.replace(/\D/g, '') === activeConv?.patient_phone.replace(/\D/g, '')
  );

  return (
    <div className="space-y-4">
      {/* Top Header Bar: WhatsApp Status & Actions */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-neutral-200/75 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
            {isPro ? <MessageSquare className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-semibold text-neutral-900 font-display">
                {isPro ? 'WhatsApp & Mensajería' : 'Simulador Bot IA (Datos Reales)'}
              </h2>

              {isPro ? (
                practiceSettings.whatsapp_connected ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    WhatsApp En Línea • {practiceSettings.whatsapp_session_phone || practiceSettings.whatsapp_number}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    <WifiOff className="w-3 h-3 text-amber-600" />
                    Línea Desconectada
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200 font-mono">
                  <Sparkles className="w-3 h-3 text-neutral-600" />
                  Trial Activo (Plan Básico)
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5 max-w-2xl">
              {isPro
                ? 'Bandeja en vivo conectada con tu línea de WhatsApp Business y bot de agendamiento 24/7.'
                : 'Simulador inteligente con acceso a tu agenda, servicios y turnos reales. Conecta tu línea real con el Plan Pro.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (isPro) {
                handleOpenQrModal();
              } else {
                setShowProUpgradeModal(true);
              }
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 ${
              isPro
                ? 'text-neutral-800 bg-white hover:bg-neutral-50 border border-neutral-200'
                : 'text-neutral-900 bg-white hover:bg-neutral-50 border border-neutral-300'
            }`}
          >
            {isPro ? (
              <>
                <QrCode className="w-3.5 h-3.5 text-neutral-500" />
                <span>{practiceSettings.whatsapp_connected ? 'Gestionar Conexión' : 'Vincular WhatsApp'}</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-neutral-500" />
                <span>Conectar WhatsApp Real</span>
              </>
            )}
          </button>

          <a
            href="https://web.whatsapp.com"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
            title="Abrir WhatsApp Web en pestaña nueva"
          >
            <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
            <span className="hidden sm:inline">WhatsApp Web</span>
          </a>

          <button
            type="button"
            onClick={() => setShowNewSimModal(true)}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Chat</span>
          </button>
        </div>
      </div>

      {/* Main Two/Three Columns Layout - Fully Responsive for Mobile, Tablet & Desktop */}
      <div className="bg-white rounded-xl border border-neutral-200/75 shadow-2xs overflow-hidden grid lg:grid-cols-12 min-h-[580px]">
        {/* Column 1: Conversations List */}
        <div className={`${mobileView === 'chat' ? 'hidden lg:flex' : 'flex'} lg:col-span-4 border-r border-neutral-200/80 flex-col bg-neutral-50/40 w-full`}>
          {/* Search and Filters */}
          <div className="p-3 border-b border-neutral-200/70 space-y-2 bg-white">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar por paciente o teléfono..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-400"
              />
            </div>

            <div className="flex items-center gap-1 text-[11px] overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2 py-0.5 rounded font-medium whitespace-nowrap ${filterType === 'all' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
              >
                Todos ({conversations.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('unread')}
                className={`px-2 py-0.5 rounded font-medium whitespace-nowrap ${filterType === 'unread' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
              >
                No leídos
              </button>
              <button
                type="button"
                onClick={() => setFilterType('ai')}
                className={`px-2 py-0.5 rounded font-medium whitespace-nowrap ${filterType === 'ai' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
              >
                Bot IA
              </button>
              <button
                type="button"
                onClick={() => setFilterType('manual')}
                className={`px-2 py-0.5 rounded font-medium whitespace-nowrap ${filterType === 'manual' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
              >
                Manual
              </button>
            </div>
          </div>

          {/* List items */}
          <div className="divide-y divide-neutral-100 overflow-y-auto flex-1 max-h-[500px] lg:max-h-none">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-400">
                No se encontraron conversaciones con este filtro.
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isSelected = conv.id === activeConv?.id;
                const initials = conv.patient_name.slice(0, 2).toUpperCase();

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveConvId(conv.id);
                      setMobileView('chat');
                    }}
                    className={`p-3 cursor-pointer transition-colors flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-neutral-100/70 border-l-2 border-l-neutral-900'
                        : 'hover:bg-neutral-100/50'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-neutral-900 text-white font-semibold text-xs flex items-center justify-center shrink-0">
                      {initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-semibold text-neutral-900 truncate">
                          {conv.patient_name}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {conv.last_message_time}
                        </span>
                      </div>

                      <p className="text-[11px] text-neutral-500 truncate">
                        {conv.last_message}
                      </p>

                      <div className="flex items-center justify-between gap-1.5 mt-1">
                        <div className="flex items-center gap-1">
                          {conv.ai_handled ? (
                            <span className="text-[9px] bg-neutral-200 text-neutral-800 font-medium px-1.5 py-0.2 rounded flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5 text-neutral-600" /> IA Activa
                            </span>
                          ) : (
                            <span className="text-[9px] bg-neutral-100 text-neutral-600 font-medium px-1.5 py-0.2 rounded">
                              Manual
                            </span>
                          )}
                        </div>

                        {conv.unread_count > 0 && (
                          <span className="w-4 h-4 rounded-full bg-neutral-900 text-white text-[9px] font-bold flex items-center justify-center">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: Active Chat Timeline */}
        <div className={`${mobileView === 'list' ? 'hidden lg:flex' : 'flex'} lg:col-span-8 flex-col bg-[#fafafa] relative w-full`}>
          {activeConv ? (
            <>
              {/* Chat Header with Mobile Back Button */}
              <div className="px-3.5 sm:px-4 py-2.5 bg-white border-b border-neutral-200/80 flex items-center justify-between shadow-2xs z-10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobileView('list')}
                    className="p-1.5 -ml-1 text-neutral-600 hover:bg-neutral-100 rounded-lg lg:hidden shrink-0"
                    title="Volver a la lista de chats"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white font-semibold text-xs flex items-center justify-center shrink-0">
                    {activeConv.patient_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-neutral-900 truncate">
                      {activeConv.patient_name}
                    </h3>
                    <p className="text-[11px] text-neutral-500 flex items-center gap-1.5 truncate">
                      <span className="font-mono">{activeConv.patient_phone}</span>
                      <span>•</span>
                      <a
                        href={`https://wa.me/${activeConv.patient_phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-neutral-700 hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>WhatsApp</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleAiHandled(activeConv.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors flex items-center gap-1.5 ${
                      activeConv.ai_handled
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                    }`}
                    title="Alternar entre atención con IA automática o respuesta manual del profesional"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>{activeConv.ai_handled ? 'Bot IA Piloto' : 'Manual'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="px-4 py-2 bg-neutral-100/60 border-b border-neutral-200/60 flex items-center gap-2 overflow-x-auto text-[11px]">
                <span className="text-neutral-400 font-medium whitespace-nowrap">Respuestas rápidas:</span>
                <button
                  type="button"
                  onClick={() => handleSendQuickAction('portal')}
                  className="px-2.5 py-1 bg-white hover:bg-neutral-50 border border-neutral-200/80 rounded text-neutral-700 font-medium whitespace-nowrap flex items-center gap-1 transition-colors"
                >
                  <Link className="w-3 h-3 text-neutral-500" />
                  <span>Link de Turnos</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendQuickAction('reminder')}
                  className="px-2.5 py-1 bg-white hover:bg-neutral-50 border border-neutral-200/80 rounded text-neutral-700 font-medium whitespace-nowrap flex items-center gap-1 transition-colors"
                >
                  <Clock className="w-3 h-3 text-neutral-500" />
                  <span>Recordatorio</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendQuickAction('cbu')}
                  className="px-2.5 py-1 bg-white hover:bg-neutral-50 border border-neutral-200/80 rounded text-neutral-700 font-medium whitespace-nowrap flex items-center gap-1 transition-colors"
                >
                  <DollarSign className="w-3 h-3 text-neutral-500" />
                  <span>Datos CBU / Seña</span>
                </button>

                {onOpenNewAppointmentWithPatient && (
                  <button
                    type="button"
                    onClick={() => onOpenNewAppointmentWithPatient(activeConv.patient_name, activeConv.patient_phone)}
                    className="ml-auto px-2.5 py-1 bg-neutral-900 text-white rounded font-medium whitespace-nowrap flex items-center gap-1 transition-colors"
                  >
                    <Calendar className="w-3 h-3" />
                    <span>Agendar Turno</span>
                  </button>
                )}
              </div>

              {/* Message Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                <div className="text-center my-1">
                  <span className="text-[10px] bg-white border border-neutral-200 text-neutral-500 px-2.5 py-0.5 rounded font-mono">
                    Sesión de WhatsApp activa • Encriptación de extremo a extremo
                  </span>
                </div>

                {activeConv.messages.map(msg => {
                  const isAssistant = msg.role === 'assistant';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-lg p-3 text-xs leading-relaxed ${
                          isAssistant
                            ? 'bg-white text-neutral-800 border border-neutral-200/80 shadow-2xs'
                            : 'bg-neutral-900 text-white shadow-2xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>

                        {/* If an action was taken (e.g. appointment created) */}
                        {msg.actionTaken && (
                          <div className="mt-2.5 p-2 bg-neutral-50 rounded border border-neutral-200/80 text-[11px] text-neutral-800 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-neutral-700" />
                              <span className="font-semibold">{msg.actionTaken.details}</span>
                            </div>
                            <span className="px-1.5 py-0.2 rounded bg-neutral-200 text-[10px] font-mono">
                              Turno Creado
                            </span>
                          </div>
                        )}

                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                            isAssistant ? 'text-neutral-400' : 'text-neutral-400'
                          }`}
                        >
                          <span>{msg.timestamp}</span>
                          {!isAssistant && <CheckCheck className="w-3 h-3 text-neutral-300" />}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {loading && (
                  <div className="flex items-center gap-2 text-xs text-neutral-500 p-2 bg-white border border-neutral-200 rounded-lg w-fit shadow-2xs">
                    <RefreshCw className="w-3 h-3 animate-spin text-neutral-600" />
                    <span>{practiceSettings.bot_assistant_name} está escribiendo...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-3 bg-white border-t border-neutral-200/80">
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder={
                      activeConv.ai_handled
                        ? "Escribe un mensaje o prueba una pregunta como paciente..."
                        : "Escribe una respuesta como profesional..."
                    }
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || loading}
                    className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-400 text-xs">
              <MessageSquare className="w-8 h-8 text-neutral-300 mb-2" />
              <p>Selecciona una conversación de la izquierda para ver el historial y responder.</p>
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp QR Connection Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-md w-full p-5 space-y-4 shadow-xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-neutral-900" />
                <h3 className="text-sm font-bold text-neutral-900 font-display">
                  Conexión con WhatsApp Business
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-600">
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-800">Estado actual:</span>
                  {practiceSettings.whatsapp_connected ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      Vinculado ({practiceSettings.whatsapp_session_phone || practiceSettings.whatsapp_number})
                    </span>
                  ) : (
                    <span className="text-amber-700 font-medium">Pendiente de vinculación</span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-500">
                  La conexión permite que el sistema envíe recordatorios automáticos y que el Bot responda turnos las 24 horas.
                </p>
              </div>

              {/* QR Code graphic container */}
              <div className="p-4 bg-white border border-neutral-200 rounded-lg flex flex-col items-center justify-center space-y-2 text-center">
                <div className="w-48 h-48 border-2 border-neutral-900 rounded-lg p-2 bg-neutral-900 flex items-center justify-center relative overflow-hidden">
                  {qrFetchLoading ? (
                    <div className="text-white flex flex-col items-center justify-center gap-2 text-xs">
                      <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                      <span>Conectando con Evolution API...</span>
                    </div>
                  ) : evolutionQrCode ? (
                    <img
                      src={evolutionQrCode.startsWith('data:') ? evolutionQrCode : `data:image/png;base64,${evolutionQrCode}`}
                      alt="WhatsApp Evolution QR Code"
                      className="w-full h-full object-contain bg-white rounded"
                    />
                  ) : (
                    /* High-fidelity SVG QR representation */
                    <div className="w-full h-full bg-white p-2 flex flex-col justify-between rounded">
                      <div className="flex justify-between">
                        <div className="w-8 h-8 border-4 border-neutral-900 p-0.5"><div className="w-full h-full bg-neutral-900" /></div>
                        <div className="w-8 h-8 border-4 border-neutral-900 p-0.5"><div className="w-full h-full bg-neutral-900" /></div>
                      </div>
                      <div className="grid grid-cols-5 gap-1 my-1">
                        <div className="h-2 bg-neutral-900" /><div className="h-2 bg-neutral-300" /><div className="h-2 bg-neutral-900" /><div className="h-2 bg-neutral-900" /><div className="h-2 bg-neutral-300" />
                        <div className="h-2 bg-neutral-900" /><div className="h-2 bg-neutral-900" /><div className="h-2 bg-neutral-300" /><div className="h-2 bg-neutral-900" /><div className="h-2 bg-neutral-900" />
                      </div>
                      <div className="flex justify-between">
                        <div className="w-8 h-8 border-4 border-neutral-900 p-0.5"><div className="w-full h-full bg-neutral-900" /></div>
                        <div className="w-4 h-4 bg-neutral-900 self-end" />
                      </div>
                    </div>
                  )}

                  {qrScanning && (
                    <div className="absolute inset-0 bg-neutral-900/95 text-white rounded-lg flex flex-col items-center justify-center text-xs gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                      <span className="font-semibold">Emparejando sesión con WhatsApp...</span>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-neutral-500 max-w-xs">
                  {evolutionQrCode ? 'Código QR generado por Evolution API. Escanéalo desde WhatsApp.' : 'Abre WhatsApp en tu teléfono > Ajustes > Dispositivos vinculados > Vincular dispositivo.'}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Número de WhatsApp del Consultorio:
                </label>
                <input
                  type="text"
                  value={customPhoneInput}
                  onChange={e => setCustomPhoneInput(e.target.value)}
                  placeholder="+54 9 11 5555-1234"
                  className="w-full px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-400 font-mono"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
              {practiceSettings.whatsapp_connected ? (
                <button
                  type="button"
                  onClick={handleDisconnectWhatsApp}
                  className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-md font-medium transition-colors"
                >
                  Desvincular
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-md font-medium transition-colors"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleSimulateQrScan}
                  disabled={qrScanning}
                  className="px-3.5 py-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 text-white rounded-md font-semibold transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  {qrScanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{practiceSettings.whatsapp_connected ? 'Reconectar Sesión' : 'Simular Escaneo QR'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Simulation Chat Modal */}
      {showNewSimModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-sm w-full p-5 space-y-4 shadow-xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-sm font-bold text-neutral-900 font-display">
                Nuevo Chat de Paciente
              </h3>
              <button
                type="button"
                onClick={() => setShowNewSimModal(false)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSimulation} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">
                  Nombre del Paciente:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Lucía Martínez"
                  value={newSimPatientName}
                  onChange={e => setNewSimPatientName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">
                  Teléfono / WhatsApp:
                </label>
                <input
                  type="tel"
                  placeholder="+54 9 11 7766-5544"
                  value={newSimPatientPhone}
                  onChange={e => setNewSimPatientPhone(e.target.value)}
                  className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-400 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewSimModal(false)}
                  className="px-3 py-1.5 text-neutral-600 hover:bg-neutral-100 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md font-semibold"
                >
                  Iniciar Conversación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plan Pro Required for Live WhatsApp Modal */}
      {showProUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-md w-full p-5 sm:p-6 space-y-4 shadow-xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900 font-display">
                  Conexión WhatsApp Business (Plan Pro)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowProUpgradeModal(false)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-700 text-base leading-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-600 leading-relaxed">
              <p>
                La vinculación directa con tu número real de <strong>WhatsApp Business</strong> para atención y confirmación de turnos 24/7 en la nube es una función exclusiva del <strong>Plan Pro AI</strong>.
              </p>

              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-neutral-900">
                  <Bot className="w-4 h-4 text-neutral-700" />
                  <span>Tu Trial de 7 días incluye:</span>
                </div>
                <p className="text-[11px] text-neutral-600">
                  Acceso irrestricto a este <strong>Simulador del Bot IA</strong>, que opera con la agenda en vivo, tus aranceles, servicios y horarios reales, simulando con exactitud cómo responderá la IA a tus pacientes.
                </p>
              </div>

              <div className="p-3 bg-neutral-900 text-white rounded-lg space-y-1">
                <span className="font-bold text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Beneficios del Plan Pro AI:
                </span>
                <ul className="text-[11px] text-neutral-300 space-y-1 list-disc pl-4 pt-1">
                  <li>Atención en vivo en tu línea real de WhatsApp las 24 hs.</li>
                  <li>Agendamiento y cancelación directa sin intervención manual.</li>
                  <li>Historias clínicas con dictado de voz y transcripción médica (Gemini).</li>
                  <li>Sincronización con Google Calendar y Google Sheets.</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowProUpgradeModal(false);
                  setShowQrModal(true);
                }}
                className="w-full sm:w-auto px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors text-center"
              >
                Probar Escaneo QR en Sandbox
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowProUpgradeModal(false);
                  if (onNavigateToTab) {
                    onNavigateToTab('suscripcion');
                  } else {
                    updatePracticeSettings({ subscription_plan: 'pro' });
                  }
                }}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Actualizar a Plan Pro</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
