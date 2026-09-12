import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Bot,
  User,
  Send,
  Sparkles,
  Phone,
  MoreVertical,
  Check,
  CheckCheck,
  Calendar,
  AlertCircle,
  RefreshCw,
  Plus,
  ShieldCheck,
  Clock,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAgendaStore } from '../lib/store';
import { Conversation, ChatMessage } from '../types';

export const AssistantBotView: React.FC = () => {
  const {
    conversations,
    practiceSettings,
    services,
    availability,
    appointments,
    addChatMessage,
    createConversation,
    toggleAiHandled,
    addAppointment
  } = useAgendaStore();

  const [activeConvId, setActiveConvId] = useState<string>(conversations[0]?.id || '');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [newSimPatientName, setNewSimPatientName] = useState('');
  const [newSimPatientPhone, setNewSimPatientPhone] = useState('');
  const [showNewSimModal, setShowNewSimModal] = useState(false);
  const [lastBookedAction, setLastBookedAction] = useState<any>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find(c => c.id === activeConvId) || conversations[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConv?.messages, loading]);

  const handleSendMessage = async (customMessage?: string) => {
    const textToSend = (customMessage || inputText).trim();
    if (!textToSend || !activeConv) return;

    if (!customMessage) {
      setInputText('');
    }

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Add user message to conversation
    addChatMessage(activeConv.id, {
      role: 'user',
      content: textToSend,
      timestamp: nowTime,
      status: 'read'
    });

    // If AI handled is enabled, call backend Gemini endpoint
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
          // If the AI decided to book an appointment
          let actionTaken: ChatMessage['actionTaken'] = undefined;

          if (data.action && data.action.action === 'book_appointment') {
            try {
              // Trigger confetti celebration
              confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 }
              });

              // Match service
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

              setLastBookedAction(actionTaken);
            } catch (err) {
              console.error('Error adding automatic appointment from AI action:', err);
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
          content: 'Disculpa, tuve un inconveniente técnico momentáneo. ¿Podrías reiterar tu consulta?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCreateSimulation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSimPatientName.trim()) return;

    const newConv = createConversation(
      newSimPatientName.trim(),
      newSimPatientPhone.trim() || '+54 9 11 8899-0011',
      '¡Hola! Quería consultar disponibilidad para hacerme una limpieza dental.'
    );

    setActiveConvId(newConv.id);
    setShowNewSimModal(false);
    setNewSimPatientName('');
    setNewSimPatientPhone('');

    // Trigger initial bot reply
    setTimeout(() => {
      handleSendMessage('¡Hola! Quería consultar disponibilidad para hacerme una limpieza dental.');
    }, 400);
  };

  const quickPrompts = [
    '¿Cuánto cuesta la consulta inicial?',
    '¿Qué días y horarios atienden?',
    'Quiero reservar para mañana a las 11:30 hs',
    '¿Tienen turno de videoconsulta online?'
  ];

  return (
    <div className="space-y-4">
      {/* Top Explanation Banner */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-900">
                Simulador de WhatsApp & Asistente IA
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Prueba cómo interactúa el bot con tus pacientes, consulta tus servicios y coordina turnos automáticamente.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowNewSimModal(true)}
            className="px-3.5 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Simular Nuevo Paciente
          </button>
        </div>
      </div>

      {/* Main WhatsApp Window */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col lg:grid lg:grid-cols-12 min-h-[620px] w-full min-w-0">
        {/* Left Col: Conversations Sidebar (4 cols) */}
        <div className={`${mobileView === 'chat' ? 'hidden lg:flex' : 'flex'} lg:col-span-4 border-r border-neutral-200 flex-col bg-neutral-50/50 w-full min-w-0`}>
          <div className="p-3.5 border-b border-neutral-200 bg-neutral-100/60 flex items-center justify-between w-full min-w-0">
            <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider truncate">
              Chats Recientes ({conversations.length})
            </span>
            <button
              onClick={() => setShowNewSimModal(true)}
              className="p-1 rounded-lg hover:bg-white text-neutral-600 transition-colors shrink-0"
              title="Nuevo chat de prueba"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y divide-neutral-100 overflow-y-auto flex-1 max-h-[500px] lg:max-h-none w-full min-w-0">
            {conversations.map(conv => {
              const isSelected = conv.id === activeConv?.id;
              const initials = conv.patient_name.slice(0, 2).toUpperCase();

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    setActiveConvId(conv.id);
                    setMobileView('chat');
                  }}
                  className={`p-3.5 cursor-pointer transition-colors flex items-center gap-3 w-full min-w-0 ${isSelected ? 'bg-white border-l-4 border-l-emerald-600 shadow-2xs' : 'hover:bg-neutral-100/60'}`}
                >
                  <div className="w-11 h-11 rounded-full bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-neutral-900 truncate">
                        {conv.patient_name}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono shrink-0 ml-1">
                        {conv.last_message_time}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 truncate">
                      {conv.last_message}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {conv.ai_handled ? (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-medium px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> IA Activa
                        </span>
                      ) : (
                        <span className="text-[9px] bg-neutral-200 text-neutral-700 font-medium px-1.5 py-0.2 rounded-full">
                          Manual
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Active Chat Area (8 cols) */}
        <div className={`${mobileView === 'list' ? 'hidden lg:flex' : 'flex'} lg:col-span-8 flex-col bg-[#efeae2]/30 relative w-full min-w-0 max-w-full overflow-hidden`}>
          {activeConv ? (
            <>
              {/* WhatsApp Chat Header */}
              <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-b border-neutral-200 flex items-center justify-between gap-2 shadow-2xs z-10 w-full min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setMobileView('list')}
                    className="p-1.5 -ml-1 text-neutral-600 hover:bg-neutral-100 rounded-lg lg:hidden shrink-0"
                    title="Volver a lista de chats"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center shrink-0">
                    {activeConv.patient_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-bold text-neutral-900 truncate">
                      {activeConv.patient_name}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-neutral-500 flex items-center gap-1 truncate">
                      <span className="font-mono truncate">{activeConv.patient_phone}</span>
                      <span>•</span>
                      {activeConv.ai_handled ? (
                        <span className="text-emerald-600 font-medium flex items-center gap-1 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          <span className="truncate">Atendido por {practiceSettings.bot_assistant_name}</span>
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium truncate">Manual</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleAiHandled(activeConv.id)}
                    className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-xl border transition-colors flex items-center gap-1.5 ${activeConv.ai_handled ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-neutral-100 border-neutral-300 text-neutral-700'}`}
                  >
                    <Bot className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">{activeConv.ai_handled ? 'Modo: IA Piloto' : 'Modo: Manual'}</span>
                    <span className="sm:hidden">{activeConv.ai_handled ? 'IA Activa' : 'Manual'}</span>
                  </button>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div
                className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 w-full min-w-0"
                style={{
                  backgroundImage: `radial-gradient(#d1d5db 0.75px, transparent 0.75px)`,
                  backgroundSize: '16px 16px'
                }}
              >
                <div className="text-center my-1 sm:my-2 w-full overflow-hidden">
                  <span className="text-[10px] bg-white/90 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-300 px-3 py-1 rounded-full shadow-2xs font-medium inline-block max-w-full truncate border border-neutral-200/50 dark:border-neutral-700/50">
                    Hoy • Procesado en tiempo real con Gemini
                  </span>
                </div>

                {activeConv.messages.map(msg => {
                  const isAssistant = msg.role === 'assistant';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col w-full min-w-0 ${isAssistant ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] p-2.5 sm:p-3 rounded-2xl shadow-2xs text-xs whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere] ${isAssistant ? 'bg-white dark:bg-[#1f232d] text-neutral-900 dark:text-neutral-100 rounded-tl-xs border border-neutral-150 dark:border-neutral-700' : 'bg-[#d9fdd3] dark:bg-[#064e3b] text-neutral-900 dark:text-emerald-50 rounded-tr-xs'}`}
                      >
                        <p className="break-words [overflow-wrap:anywhere]">{msg.content}</p>

                        {/* If appointment created card */}
                        {msg.actionTaken && (
                          <div className="mt-2.5 p-2.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-950 dark:text-emerald-100">
                            <div className="font-bold flex items-center gap-1 text-emerald-800 dark:text-emerald-300 mb-0.5">
                              <Calendar className="w-3.5 h-3.5 shrink-0" /> Turno agendado en sistema:
                            </div>
                            <p className="break-words">{msg.actionTaken.details}</p>
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1 block font-medium">
                              ✓ Impactado en la agenda y turnero
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-neutral-400 dark:text-neutral-400 font-mono">
                          <span>{msg.timestamp}</span>
                          {!isAssistant && <CheckCheck className="w-3 h-3 text-sky-500" />}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {loading && (
                  <div className="flex items-center gap-2 p-2.5 bg-white dark:bg-neutral-800 rounded-2xl text-xs text-neutral-500 dark:text-neutral-300 border border-neutral-100 dark:border-neutral-700 shadow-2xs self-start w-fit max-w-full">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-spin shrink-0" />
                    <span className="truncate">{practiceSettings.bot_assistant_name} está respondiendo...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick suggestion chips */}
              <div className="px-3 sm:px-4 py-2 bg-white/90 dark:bg-[#14161c] border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-1.5 overflow-x-auto text-[11px] w-full min-w-0 no-scrollbar">
                <span className="text-neutral-400 dark:text-neutral-400 shrink-0 font-medium text-[10px] sm:text-[11px]">Probar:</span>
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(qp)}
                    className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-800 dark:hover:text-emerald-300 text-neutral-700 dark:text-neutral-200 rounded-full shrink-0 border border-neutral-200 dark:border-neutral-700 transition-colors whitespace-nowrap text-[11px] cursor-pointer"
                  >
                    {qp}
                  </button>
                ))}
              </div>

              {/* Input Box */}
              <div className="p-2.5 sm:p-3 bg-white border-t border-neutral-200 flex items-center gap-2 w-full min-w-0">
                <input
                  type="text"
                  placeholder={
                    activeConv.ai_handled
                      ? "Escribe como paciente..."
                      : "Escribe tu respuesta..."
                  }
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 min-w-0 px-3.5 py-2 sm:py-2.5 text-xs bg-neutral-100 border border-neutral-200 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />

                <button
                  onClick={() => handleSendMessage()}
                  disabled={loading || !inputText.trim()}
                  className="p-2 sm:p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl sm:rounded-2xl shadow-xs transition-colors shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-neutral-400">
              No hay conversaciones seleccionadas.
            </div>
          )}
        </div>
      </div>

      {/* New Simulation Modal */}
      {showNewSimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 border border-neutral-200">
            <h3 className="text-sm font-bold text-neutral-900 mb-2">Simular Nuevo Paciente</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Crea un nuevo hilo de chat para probar la interacción desde cero.
            </p>
            <form onSubmit={handleCreateSimulation} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">Nombre del paciente</label>
                <input
                  type="text"
                  value={newSimPatientName}
                  onChange={e => setNewSimPatientName(e.target.value)}
                  placeholder="Ej. Lucas Ferrari"
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">WhatsApp / Teléfono</label>
                <input
                  type="tel"
                  value={newSimPatientPhone}
                  onChange={e => setNewSimPatientPhone(e.target.value)}
                  placeholder="+54 9 11 9988-1122"
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewSimModal(false)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                >
                  Iniciar Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
