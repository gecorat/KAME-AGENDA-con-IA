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
  AlertTriangle,
  Copy,
  ChevronRight,
  Filter,
  ArrowLeft,
  ArrowRight,
  Lock,
  Sliders,
  CheckSquare,
  Globe,
  Crown,
  Power,
  PauseCircle,
  PlayCircle,
  ShieldAlert,
  Smartphone,
  ArrowDown,
  Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAgendaStore } from '../lib/store';
import { Conversation, ChatMessage } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';
import { BotPersonalitySettings } from '../components/settings/BotPersonalitySettings';
import { RequiredFieldsSettings } from '../components/settings/RequiredFieldsSettings';

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
    updatePracticeSettings,
    clearAllConversations,
    currentUser
  } = useAgendaStore();

  const isGonzalo = currentUser?.email?.toLowerCase() === 'gonzalocorat@gmail.com';
  const isSuperAdmin = isGonzalo && Boolean(currentUser?.isSuperAdmin);
  const isPro = practiceSettings.subscription_plan === 'pro';
  const isTrial = practiceSettings.subscription_plan === 'trial' || Boolean(practiceSettings.trial_active);

  const [subTab, setSubTab] = useState<'chats' | 'personality' | 'fields' | 'connection'>('chats');
  const [realConversations, setRealConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>(conversations[0]?.id || '');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'ai' | 'manual'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [isClearingChats, setIsClearingChats] = useState(false);
  
  // WhatsApp QR & Pro Upgrade Modals
  const [showQrModal, setShowQrModal] = useState(false);
  const [showProUpgradeModal, setShowProUpgradeModal] = useState(false);
  const [qrScanning, setQrScanning] = useState(false);
  const [qrFetchLoading, setQrFetchLoading] = useState(false);
  const [qrConnectedSuccess, setQrConnectedSuccess] = useState(false);
  const [evolutionQrCode, setEvolutionQrCode] = useState<string | null>(null);
  const [customPhoneInput, setCustomPhoneInput] = useState(practiceSettings.whatsapp_number || '+54 9 11 5000-0000');

  // Simulation modal
  const [showNewSimModal, setShowNewSimModal] = useState(false);
  const [newSimPatientName, setNewSimPatientName] = useState('');
  const [newSimPatientPhone, setNewSimPatientPhone] = useState('');
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isUserNearBottomRef = useRef(true);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const prevMessagesCountRef = useRef(0);

  // Helper to compare conversations array to prevent unnecessary re-renders
  const areConversationsEqual = (a: Conversation[], b: Conversation[]): boolean => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const ca = a[i];
      const cb = b[i];
      if (
        ca.id !== cb.id ||
        ca.unread_count !== cb.unread_count ||
        ca.ai_handled !== cb.ai_handled ||
        ca.last_message !== cb.last_message ||
        ca.last_message_time !== cb.last_message_time
      ) {
        return false;
      }
      if (ca.messages.length !== cb.messages.length) return false;
      if (ca.messages.length > 0 && cb.messages.length > 0) {
        const lastMa = ca.messages[ca.messages.length - 1];
        const lastMb = cb.messages[cb.messages.length - 1];
        if (lastMa.id !== lastMb.id || lastMa.content !== lastMb.content || lastMa.status !== lastMb.status) {
          return false;
        }
      }
    }
    return true;
  };

  // Safe state updater that preserves object references if identical
  const updateConversationsIfChanged = (newConversations: Conversation[]) => {
    setRealConversations(prev => {
      if (areConversationsEqual(prev, newConversations)) {
        return prev;
      }
      return newConversations;
    });
  };

  // Sync backend config on practiceSettings change
  useEffect(() => {
    fetch('/api/evolution/sync-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiUrl: practiceSettings.evolution_api_url,
        apiKey: practiceSettings.evolution_api_key,
        instanceName: practiceSettings.evolution_instance_name,
        practiceSettings,
        appUrl: typeof window !== 'undefined' ? window.location.origin : undefined
      })
    }).catch(err => console.warn('Config sync error:', err));
  }, [practiceSettings]);

  const [isSyncingChats, setIsSyncingChats] = useState(false);

  const fetchAndSyncRealChats = async (isManual = false) => {
    try {
      if (isManual) setIsSyncingChats(true);
      const res = await fetch('/api/evolution/sync-chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiUrl: practiceSettings.evolution_api_url,
          apiKey: practiceSettings.evolution_api_key,
          instanceName: practiceSettings.evolution_instance_name,
          practiceSettings,
          services: services.filter(s => s.active),
          availability,
          existingAppointments: appointments.slice(0, 10).map(a => ({
            start_datetime: a.start_datetime,
            service_name: a.service_name
          })),
          appUrl: typeof window !== 'undefined' ? window.location.origin : undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.conversations)) {
          const mapped: Conversation[] = data.conversations.map((rc: any) => ({
            id: rc.id,
            patient_name: rc.patient_name || rc.patient_first_name || 'Paciente WhatsApp',
            patient_phone: rc.patient_phone || '',
            patient_avatar: rc.patient_avatar || undefined,
            unread_count: rc.unread_count || 0,
            ai_handled: rc.ai_handled !== false,
            last_message: rc.last_message || '',
            last_message_time: rc.last_timestamp ? new Date(rc.last_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Hoy',
            messages: (rc.messages || []).map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: m.timestamp || 'Ahora',
              status: m.status || 'sent',
              actionTaken: m.actionTaken
            }))
          }));
          updateConversationsIfChanged(mapped);

          // If current conversation is demo and real conversation exists, switch to real on initial load
          if (mapped.length > 0) {
            setActiveConvId(prev => {
              if (!prev || prev.startsWith('conv-')) {
                return mapped[0].id;
              }
              return prev;
            });
          }
        }
      }
    } catch (e) {
      // silent catch
    } finally {
      if (isManual) setIsSyncingChats(false);
    }
  };

  // Lightweight fetch from server in-memory store
  const fetchLocalConversations = async () => {
    try {
      const res = await fetch('/api/evolution/conversations');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.conversations)) {
          const mapped: Conversation[] = data.conversations.map((rc: any) => ({
            id: rc.id,
            patient_name: rc.patient_name || rc.patient_first_name || 'Paciente WhatsApp',
            patient_phone: rc.patient_phone || '',
            patient_avatar: rc.patient_avatar || undefined,
            unread_count: rc.unread_count || 0,
            ai_handled: rc.ai_handled !== false,
            last_message: rc.last_message || '',
            last_message_time: rc.last_timestamp ? new Date(rc.last_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Hoy',
            messages: (rc.messages || []).map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: m.timestamp || 'Ahora',
              status: m.status || 'sent',
              actionTaken: m.actionTaken
            }))
          }));
          updateConversationsIfChanged(mapped);
        }
      }
    } catch (e) {
      // silent
    }
  };

  const handleClearAllChats = async () => {
    setIsClearingChats(true);
    try {
      await fetch('/api/evolution/clear-chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {});

      clearAllConversations();
      setRealConversations([]);
      setActiveConvId('');
      setShowClearConfirmModal(false);
    } catch (err) {
      console.error('Error clearing chats:', err);
    } finally {
      setIsClearingChats(false);
    }
  };

  // Real-time polling: non-intrusive lightweight checks every 3s, background sync every 10s
  useEffect(() => {
    fetchAndSyncRealChats(false);
    const lightInterval = setInterval(fetchLocalConversations, 3000);
    const syncInterval = setInterval(() => fetchAndSyncRealChats(false), 10000);
    return () => {
      clearInterval(lightInterval);
      clearInterval(syncInterval);
    };
  }, [practiceSettings.evolution_api_url, practiceSettings.evolution_api_key, practiceSettings.evolution_instance_name]);

  // Combined conversations: Real WhatsApp conversations first, then local demo conversations
  const allConversations: Conversation[] = [
    ...realConversations,
    ...conversations.filter(c => !realConversations.some(rc => rc.id === c.id))
  ];

  const activeConv = allConversations.find(c => c.id === activeConvId) || allConversations[0];

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior
      });
    }
  };

  // Handle scroll events inside the messages container
  const handleMessagesScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isNearBottom = distanceFromBottom < 100;
    isUserNearBottomRef.current = isNearBottom;
    setShowScrollBottomBtn(!isNearBottom);
  };

  // Scroll to bottom immediately when switching active chat
  useEffect(() => {
    isUserNearBottomRef.current = true;
    setShowScrollBottomBtn(false);
    requestAnimationFrame(() => {
      scrollToBottom('auto');
    });
  }, [activeConvId]);

  // Scroll to bottom when new messages arrive ONLY if user was already at bottom
  useEffect(() => {
    const currentCount = activeConv?.messages.length || 0;
    if (currentCount > prevMessagesCountRef.current) {
      if (isUserNearBottomRef.current) {
        requestAnimationFrame(() => {
          scrollToBottom('smooth');
        });
      }
    }
    prevMessagesCountRef.current = currentCount;
  }, [activeConv?.messages]);

  // Filtered conversations
  const filteredConversations = allConversations.filter(conv => {
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

    // Ensure scroll moves to bottom on user message
    isUserNearBottomRef.current = true;
    requestAnimationFrame(() => scrollToBottom('smooth'));

    // If active conversation is a real WhatsApp session from Evolution
    if (activeConv.id.startsWith('wa-')) {
      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: textToSend,
        timestamp: nowTime,
        status: 'sent'
      };

      setRealConversations(prev =>
        prev.map(c =>
          c.id === activeConv.id
            ? {
                ...c,
                last_message: textToSend,
                messages: [...c.messages, newMsg]
              }
            : c
        )
      );

      try {
        await fetch(`/api/evolution/conversations/${activeConv.id}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToSend,
            apiUrl: practiceSettings.evolution_api_url,
            apiKey: practiceSettings.evolution_api_key,
            instanceName: practiceSettings.evolution_instance_name
          })
        });
      } catch (err) {
        console.error('Error sending message to Evolution API:', err);
      }
      return;
    }

    // Standard simulation flow
    addChatMessage(activeConv.id, {
      role: 'user',
      content: textToSend,
      timestamp: nowTime,
      status: 'read'
    });

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
    let text = '';

    if (type === 'portal') {
      text = `Hola ${activeConv.patient_name}, puedes ver todos nuestros tratamientos y agendar tu turno online en cualquier momento ingresando aquí: ${window.location.origin}/#portal`;
    } else if (type === 'cbu') {
      text = `Datos bancarios para señas o transferencias:\n• CBU/CVU: 0000003100098765432100\n• Alias: ${practiceSettings.handle}.MEDICA\n• Titular: ${practiceSettings.professional_name}\nPor favor envía el comprobante por este medio.`;
    } else if (type === 'reminder') {
      text = `Hola ${activeConv.patient_name}, te recordamos tu turno en ${practiceSettings.practice_name} con ${practiceSettings.professional_name}. Por favor responde 'CONFIRMO' para asegurar tu espacio o avísanos si necesitas reprogramar.`;
    }

    handleSendMessage(text);
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

  const [qrErrorMessage, setQrErrorMessage] = useState<string | null>(null);

  const fetchInstanceQr = async (isBackgroundPoll = false) => {
    if (!isBackgroundPoll) {
      setQrFetchLoading(true);
      setQrErrorMessage(null);
    }
    try {
      const targetInstance = practiceSettings.evolution_instance_name?.trim() || (practiceSettings.practice_name
        ? practiceSettings.practice_name.toLowerCase().replace(/[^a-z0-9_-]/g, '')
        : 'consultorio-principal');
      const res = await fetch('/api/evolution/instance-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName: targetInstance,
          apiUrl: practiceSettings.evolution_api_url,
          apiKey: practiceSettings.evolution_api_key,
          practiceSettings,
          appUrl: typeof window !== 'undefined' ? window.location.origin : undefined
        })
      });
      const data = await res.json();
      
      if (data.connected || data.status === 'connected') {
        setQrConnectedSuccess(true);
        updatePracticeSettings({
          whatsapp_connected: true,
          whatsapp_session_phone: customPhoneInput || practiceSettings.whatsapp_number
        });
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.5 } });
        setTimeout(() => {
          setShowQrModal(false);
          setQrConnectedSuccess(false);
        }, 1800);
        return;
      }

      if (data.qrcode) {
        setEvolutionQrCode(data.qrcode);
        setQrErrorMessage(null);
      } else if (!data.connected && data.message) {
        setQrErrorMessage(data.message);
      } else if (!data.success && data.error) {
        setQrErrorMessage(data.error);
      }
    } catch (err: any) {
      if (!isBackgroundPoll) {
        console.warn('Error fetching Evolution QR code:', err);
        setQrErrorMessage(err.message || 'No se pudo contactar al servidor de Evolution API.');
      }
    } finally {
      if (!isBackgroundPoll) {
        setQrFetchLoading(false);
      }
    }
  };

  const handleOpenQrModal = () => {
    setShowQrModal(true);
    setQrConnectedSuccess(false);
    setEvolutionQrCode(null);
    setQrErrorMessage(null);
    fetchInstanceQr(false);
  };

  // Poll for QR state change while modal is open
  useEffect(() => {
    if (!showQrModal || qrConnectedSuccess) return;
    const interval = setInterval(() => {
      fetchInstanceQr(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [showQrModal, qrConnectedSuccess]);

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
    try {
      const targetInstance = practiceSettings.evolution_instance_name?.trim() || (practiceSettings.practice_name
        ? practiceSettings.practice_name.toLowerCase().replace(/[^a-z0-9_-]/g, '')
        : 'consultorio-principal');
      await fetch('/api/evolution/disconnect-instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName: targetInstance,
          apiUrl: practiceSettings.evolution_api_url,
          apiKey: practiceSettings.evolution_api_key
        })
      });
    } catch (err) {
      console.warn('Error disconnecting instance:', err);
    }
    updatePracticeSettings({
      whatsapp_connected: false,
      whatsapp_session_phone: undefined
    });
    setEvolutionQrCode(null);
    setShowDisconnectConfirm(false);
  };

  // Find appointments for active patient
  const activePatientAppointments = appointments.filter(
    a => a.patient_phone.replace(/\D/g, '') === activeConv?.patient_phone.replace(/\D/g, '')
  );

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* Top Header Bar: WhatsApp Status & Actions */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-neutral-200/75 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full max-w-full min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
            {isPro ? <MessageSquare className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-semibold text-neutral-900 font-display truncate">
                {isPro ? 'WhatsApp & Mensajería' : 'Asistente Virtual & WhatsApp'}
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

              {isSuperAdmin && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-600" />
                  {practiceSettings.bot_ai_model || 'gemini-2.5-flash'}
                </span>
              )}

              {/* Bot Global Switch Badge */}
              <button
                type="button"
                onClick={() => updatePracticeSettings({ bot_enabled: practiceSettings.bot_enabled === false ? true : false })}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-all border shadow-2xs cursor-pointer ${
                  practiceSettings.bot_enabled !== false
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                }`}
                title="Haga clic para pausar o activar la respuesta automática del bot en todos los chats"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${practiceSettings.bot_enabled !== false ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span>{practiceSettings.bot_enabled !== false ? 'Bot General Activo' : 'Bot General Pausado'}</span>
              </button>
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5 max-w-2xl">
              Configuración de personalidad del bot, identidad, requisitos de turnos y chat en vivo con simulación estilo WhatsApp Web.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-start sm:justify-end flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (isPro) {
                handleOpenQrModal();
              } else {
                setShowProUpgradeModal(true);
              }
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer ${
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
            onClick={() => {
              setSubTab('chats');
              setShowNewSimModal(true);
            }}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Chat</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div 
        onWheel={(e) => {
          if (e.deltaY !== 0 && e.currentTarget.scrollWidth > e.currentTarget.clientWidth) {
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
        className="flex items-center gap-1.5 p-1 bg-neutral-100/90 rounded-xl border border-neutral-200/80 w-full overflow-x-auto max-w-full min-w-0 scroll-touch-x subtle-scrollbar"
      >
        <button
          type="button"
          onClick={() => setSubTab('chats')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
            subTab === 'chats'
              ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Bandeja & Simulador en Vivo</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('personality')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
            subTab === 'personality'
              ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-sky-600" />
          <span>{isSuperAdmin ? 'Personalidad, Motor IA & Reglas' : 'Personalidad, Identidad & Reglas'}</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('fields')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
            subTab === 'fields'
              ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
          <span>Requisitos de Reserva (Bot & Web)</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('connection')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
            subTab === 'connection'
              ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <QrCode className="w-3.5 h-3.5 text-neutral-700" />
          <span>Conexión WhatsApp QR</span>
        </button>
      </div>

      {/* SUB-TAB 1: PERSONALIDAD, MODELO IA Y REGLAS */}
      {subTab === 'personality' && (
        <BotPersonalitySettings
          onSaveSuccess={() => {
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
          }}
        />
      )}

      {/* SUB-TAB 2: DATOS OBLIGATORIOS Y OPCIONALES (UNIFICADOS) */}
      {subTab === 'fields' && (
        <RequiredFieldsSettings
          standalone={true}
          onSaveSuccess={() => {
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
          }}
        />
      )}

      {/* SUB-TAB 3: CONEXIÓN DIRECTA */}
      {subTab === 'connection' && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-6 max-w-3xl">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold">
                <QrCode className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 font-display">
                  Conexión con WhatsApp Business
                </h3>
                <p className="text-xs text-neutral-500">
                  Vincula tu número oficial para que el Bot IA responda turnos las 24 hs.
                </p>
              </div>
            </div>

            {practiceSettings.whatsapp_connected ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                Conectado ({practiceSettings.whatsapp_session_phone || practiceSettings.whatsapp_number})
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                Línea Desconectada
              </span>
            )}
          </div>

          <div className="space-y-4">
            {/* Warning banner */}
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-xs text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Uso responsable de Evolution API (No Oficial)</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Este método vincula tu dispositivo de forma similar a WhatsApp Web. Recomendamos enfáticamente utilizar un chip o línea exclusiva para el consultorio/negocio y no la línea personal diaria.
              </p>
            </div>

            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
              <label className="block text-xs font-bold text-neutral-900">
                Número de WhatsApp Asignado:
              </label>
              <input
                type="tel"
                value={customPhoneInput}
                onChange={e => setCustomPhoneInput(e.target.value)}
                placeholder="+54 9 11 5000-0000"
                className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-neutral-900"
              />
              <p className="text-[11px] text-neutral-500">
                Ingresa el número con código de país (+54 9 para Argentina) donde atenderá el bot.
              </p>
            </div>

            {/* Webhook Status Info */}
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Recepción Automática de Mensajes (Webhook)</span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Sincroniza en tiempo real los mensajes entrantes y despacha las respuestas del Bot IA.
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const targetInstance = practiceSettings.evolution_instance_name?.trim() || 'consultorio';
                    const res = await fetch('/api/evolution/configure-webhook', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        apiUrl: practiceSettings.evolution_api_url,
                        apiKey: practiceSettings.evolution_api_key,
                        instanceName: targetInstance,
                        appUrl: window.location.origin
                      })
                    });
                    const data = await res.json();
                    if (data.success) {
                      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
                      alert('Webhook vinculado correctamente con Evolution API.');
                    } else {
                      alert(`Respuesta de Evolution API: ${data.error || 'Verifica la URL y API Key en SuperAdmin.'}`);
                    }
                  } catch (err: any) {
                    alert(`Error al vincular webhook: ${err.message}`);
                  }
                }}
                className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200 rounded-lg text-[11px] font-semibold transition-colors shrink-0 shadow-2xs cursor-pointer"
              >
                Re-vincular Webhook
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleOpenQrModal}
                className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>{practiceSettings.whatsapp_connected ? 'Ver Código QR / Reconectar' : 'Generar Código QR'}</span>
              </button>

              {practiceSettings.whatsapp_connected && (
                <button
                  type="button"
                  onClick={() => setShowDisconnectConfirm(true)}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Desconectar Sesión
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 0: BANDEJA DE MENSAJES & SIMULADOR EN VIVO */}
      {subTab === 'chats' && (
        <div className="bg-white rounded-xl border border-neutral-200/75 shadow-2xs overflow-hidden grid lg:grid-cols-12 h-[calc(100vh-14rem)] min-h-[580px] max-h-[820px] w-full max-w-full min-w-0">
        {/* Column 1: Conversations List */}
        <div className={`${mobileView === 'chat' ? 'hidden lg:flex' : 'flex'} lg:col-span-4 border-r border-neutral-200/80 flex-col bg-neutral-50/40 w-full max-w-full min-w-0 h-full overflow-hidden`}>
          {/* Search, Sync Status and Filters */}
          <div className="p-3 border-b border-neutral-200/70 space-y-2 bg-white w-full min-w-0 shrink-0">
            {/* Live Sync Indicator & Actions */}
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-neutral-50 rounded-lg border border-neutral-200 text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${isSyncingChats ? 'bg-amber-500 animate-ping' : (realConversations.length > 0 || practiceSettings.whatsapp_connected ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400')}`} />
                <span className="font-medium text-neutral-800 truncate">
                  {isSyncingChats ? 'Sincronizando...' : (realConversations.length > 0 ? `${realConversations.length} chat(s) activos` : 'Esperando mensajes nuevos')}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => fetchAndSyncRealChats(true)}
                  disabled={isSyncingChats}
                  title="Sincronizar mensajes recientes"
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncingChats ? 'animate-spin' : ''}`} />
                  <span>Sincronizar</span>
                </button>
                {allConversations.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirmModal(true)}
                    title="Vaciar lista de chats para ver sólo mensajes nuevos"
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Vaciar</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Buscar por paciente o teléfono..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>
            </div>

            <div 
              onWheel={(e) => {
                if (e.deltaY !== 0 && e.currentTarget.scrollWidth > e.currentTarget.clientWidth) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
              className="flex items-center gap-1 text-[11px] overflow-x-auto scroll-touch-x subtle-scrollbar pb-1 w-full max-w-full min-w-0"
            >
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2 py-0.5 rounded font-medium whitespace-nowrap cursor-pointer ${filterType === 'all' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
              >
                Todos ({allConversations.length})
              </button>
              {realConversations.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterType('ai')}
                  className={`px-2 py-0.5 rounded font-semibold whitespace-nowrap cursor-pointer flex items-center gap-1 ${filterType === 'ai' ? 'bg-emerald-800 text-white' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  WhatsApp ({realConversations.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => setFilterType('unread')}
                className={`px-2 py-0.5 rounded font-medium whitespace-nowrap cursor-pointer ${filterType === 'unread' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
              >
                No leídos
              </button>
              <button
                type="button"
                onClick={() => setFilterType('manual')}
                className={`px-2 py-0.5 rounded font-medium whitespace-nowrap cursor-pointer ${filterType === 'manual' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
              >
                Manual
              </button>
            </div>
          </div>

          {/* List items */}
          <div className="divide-y divide-neutral-100 overflow-y-auto flex-1 min-h-0 w-full min-w-0">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400 space-y-2">
                <MessageSquare className="w-8 h-8 text-neutral-300 mx-auto" />
                <p>No hay conversaciones en esta vista.</p>
                <p className="text-[11px] text-neutral-400">Los mensajes nuevos que lleguen a tu WhatsApp vinculado aparecerán aquí al instante.</p>
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isSelected = conv.id === activeConv?.id;
                const isReal = conv.id.startsWith('wa-');
                const initials = (conv.patient_name || 'WA').slice(0, 2).toUpperCase();

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveConvId(conv.id);
                      setMobileView('chat');
                    }}
                    className={`p-3 cursor-pointer transition-colors flex items-center gap-2.5 ${
                      isSelected
                        ? (isReal ? 'bg-emerald-50/60 border-l-2 border-l-emerald-600' : 'bg-neutral-100/70 border-l-2 border-l-neutral-900')
                        : 'hover:bg-neutral-100/50'
                    }`}
                  >
                    {conv.patient_avatar ? (
                      <img
                        src={conv.patient_avatar}
                        alt={conv.patient_name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover shrink-0 border border-neutral-200"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${isReal ? 'bg-emerald-700 text-white' : 'bg-neutral-900 text-white'}`}>
                        {initials}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5 gap-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-xs font-semibold text-neutral-900 truncate">
                            {conv.patient_name}
                          </span>
                          {isReal && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded border border-emerald-200 shrink-0">
                              WA Real
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-neutral-400 font-mono shrink-0">
                          {conv.last_message_time}
                        </span>
                      </div>

                      <p className="text-[11px] text-neutral-500 truncate">
                        {conv.last_message || 'Sin mensajes'}
                      </p>

                      <div className="flex items-center justify-between gap-1.5 mt-1">
                        <div className="flex items-center gap-1">
                          {conv.patient_phone && (
                            <span className="text-[10px] font-mono text-neutral-500">
                              {conv.patient_phone}
                            </span>
                          )}
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
                          <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center">
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
        <div className={`${mobileView === 'list' ? 'hidden lg:flex' : 'flex'} lg:col-span-8 flex-col bg-[#fafafa] relative w-full max-w-full min-w-0 h-full overflow-hidden`}>
          {activeConv ? (
            <>
              {/* Chat Header with Mobile Back Button */}
              <div className="px-3 sm:px-4 py-2.5 bg-white border-b border-neutral-200/80 flex items-center justify-between gap-2 shadow-2xs z-10 w-full min-w-0 shrink-0">
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setMobileView('list')}
                    className="p-1.5 -ml-1 text-neutral-600 hover:bg-neutral-100 rounded-lg lg:hidden shrink-0 cursor-pointer"
                    title="Volver a la lista de chats"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  {activeConv.patient_avatar ? (
                    <img
                      src={activeConv.patient_avatar}
                      alt={activeConv.patient_name}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full object-cover shrink-0 border border-neutral-200"
                    />
                  ) : (
                    <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${activeConv.id.startsWith('wa-') ? 'bg-emerald-700 text-white' : 'bg-neutral-900 text-white'}`}>
                      {(activeConv.patient_name || 'WA').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-semibold text-neutral-900 truncate">
                      {activeConv.patient_name}
                    </h3>
                    <p className="text-[11px] text-neutral-500 flex items-center gap-1.5 truncate">
                      <span className="font-mono truncate">{activeConv.patient_phone}</span>
                      {activeConv.patient_phone && (
                        <>
                          <span>•</span>
                          <a
                            href={`https://wa.me/${activeConv.patient_phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-neutral-700 hover:underline inline-flex items-center gap-0.5 shrink-0 font-medium"
                          >
                            <span>WhatsApp</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  {/* On Mobile: Single clean interactive toggle button */}
                  <div className="sm:hidden">
                    <button
                      type="button"
                      onClick={() => toggleAiHandled(activeConv.id)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                        activeConv.ai_handled
                          ? 'bg-emerald-600 text-white'
                          : 'bg-neutral-800 text-white'
                      }`}
                      title={activeConv.ai_handled ? 'Bot IA respondiendo. Clic para cambiar a Manual.' : 'Atención manual activa. Clic para activar Bot.'}
                    >
                      {activeConv.ai_handled ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-pulse" />
                          <span>Bot IA</span>
                        </>
                      ) : (
                        <>
                          <PauseCircle className="w-3 h-3 text-amber-300" />
                          <span>Manual</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* On sm and desktop: Full two-button toggle switch */}
                  <div className="hidden sm:flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg border border-neutral-200">
                    <button
                      type="button"
                      onClick={() => {
                        if (!activeConv.ai_handled) {
                          toggleAiHandled(activeConv.id);
                        }
                      }}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeConv.ai_handled
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                      title="Activar Bot IA para este chat"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Bot Activo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (activeConv.ai_handled) {
                          toggleAiHandled(activeConv.id);
                        }
                      }}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                        !activeConv.ai_handled
                          ? 'bg-neutral-800 text-white shadow-2xs'
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                      title="Pausar Bot y atender manualmente este chat"
                    >
                      <PauseCircle className="w-3.5 h-3.5" />
                      <span>Pausado (Manual)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div 
                onWheel={(e) => {
                  if (e.deltaY !== 0 && e.currentTarget.scrollWidth > e.currentTarget.clientWidth) {
                    e.currentTarget.scrollLeft += e.deltaY;
                  }
                }}
                className="px-3 sm:px-4 py-2 bg-neutral-100/70 border-b border-neutral-200/60 flex items-center gap-1.5 sm:gap-2 overflow-x-auto text-[11px] scroll-touch-x subtle-scrollbar w-full max-w-full min-w-0"
              >
                <span className="text-neutral-400 font-medium whitespace-nowrap shrink-0 hidden xs:inline">Respuestas rápidas:</span>
                <button
                  type="button"
                  onClick={() => handleSendQuickAction('portal')}
                  className="px-2.5 py-1 bg-white hover:bg-neutral-50 border border-neutral-200/80 rounded text-neutral-700 font-medium whitespace-nowrap flex items-center gap-1 transition-colors shrink-0 shadow-2xs cursor-pointer"
                >
                  <Link className="w-3 h-3 text-neutral-500" />
                  <span>Link de Turnos</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendQuickAction('reminder')}
                  className="px-2.5 py-1 bg-white hover:bg-neutral-50 border border-neutral-200/80 rounded text-neutral-700 font-medium whitespace-nowrap flex items-center gap-1 transition-colors shrink-0 shadow-2xs cursor-pointer"
                >
                  <Clock className="w-3 h-3 text-neutral-500" />
                  <span>Recordatorio</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendQuickAction('cbu')}
                  className="px-2.5 py-1 bg-white hover:bg-neutral-50 border border-neutral-200/80 rounded text-neutral-700 font-medium whitespace-nowrap flex items-center gap-1 transition-colors shrink-0 shadow-2xs cursor-pointer"
                >
                  <DollarSign className="w-3 h-3 text-neutral-500" />
                  <span>Datos CBU / Seña</span>
                </button>

                {onOpenNewAppointmentWithPatient && (
                  <button
                    type="button"
                    onClick={() => onOpenNewAppointmentWithPatient(activeConv.patient_name, activeConv.patient_phone)}
                    className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded font-medium whitespace-nowrap flex items-center gap-1 transition-colors shrink-0 shadow-2xs cursor-pointer sm:ml-auto"
                  >
                    <Calendar className="w-3 h-3" />
                    <span>Agendar Turno</span>
                  </button>
                )}
              </div>

              {/* Message Stream */}
              <div
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
                className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto space-y-3 bg-[#f0f2f5] bg-[radial-gradient(#00000008_1px,transparent_1px)] [background-size:16px_16px] w-full min-w-0 relative"
              >
                {/* Global Paused Banner if bot_enabled is false */}
                {practiceSettings.bot_enabled === false && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-900 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>El <strong>Bot General está Pausado</strong> globalmente. Las respuestas automáticas están suspendidas.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => updatePracticeSettings({ bot_enabled: true })}
                      className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium text-[11px] whitespace-nowrap transition-colors shrink-0 cursor-pointer"
                    >
                      Reanudar Bot
                    </button>
                  </div>
                )}

                {/* Per-chat Paused Notice */}
                {!activeConv.ai_handled && practiceSettings.bot_enabled !== false && (
                  <div className="p-2 bg-neutral-100/90 border border-neutral-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 text-[11px] text-neutral-600">
                    <div className="flex items-center gap-1.5">
                      <PauseCircle className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      <span>Bot pausado para este paciente. Las respuestas que envíes serán 100% manuales.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleAiHandled(activeConv.id)}
                      className="text-neutral-900 font-semibold hover:underline shrink-0 cursor-pointer"
                    >
                      Activar Bot
                    </button>
                  </div>
                )}

                <div className="text-center my-1">
                  <span className="text-[10px] bg-white border border-neutral-200 text-neutral-500 px-2.5 py-0.5 rounded font-mono shadow-2xs inline-block max-w-full truncate">
                    Sesión de WhatsApp activa • Encriptación de extremo a extremo
                  </span>
                </div>

                {activeConv.messages.map(msg => {
                  const isAssistant = msg.role === 'assistant';

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${isAssistant ? 'items-start justify-start' : 'items-end justify-end'}`}
                    >
                      {/* Synchronized Bot Profile Photo */}
                      {isAssistant && (
                        <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-neutral-200 shadow-2xs mt-0.5 bg-neutral-100 flex items-center justify-center">
                          {practiceSettings.bot_avatar_url ? (
                            <img
                              src={practiceSettings.bot_avatar_url}
                              alt={practiceSettings.bot_assistant_name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full bg-emerald-700 text-white flex items-center justify-center text-[10px] font-bold">
                              {practiceSettings.bot_assistant_name.slice(0, 1)}
                            </div>
                          )}
                        </div>
                      )}

                      <div
                        className={`max-w-[88%] sm:max-w-[75%] rounded-xl p-3 text-xs leading-relaxed shadow-2xs break-words [overflow-wrap:anywhere] ${
                          isAssistant
                            ? 'bg-white text-neutral-800 border border-neutral-200/80 rounded-tl-xs'
                            : 'bg-[#d9fdd3] text-neutral-900 border border-emerald-200/60 rounded-tr-xs'
                        }`}
                      >
                        {isAssistant && (
                          <div className="flex items-center gap-1.5 pb-1 mb-1 border-b border-neutral-100 text-[10px] font-semibold text-emerald-800">
                            <span>{practiceSettings.bot_assistant_name}</span>
                            <span className="text-neutral-400">• Asistente Virtual</span>
                          </div>
                        )}

                        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.content}</p>

                        {/* If an action was taken (e.g. appointment created) */}
                        {msg.actionTaken && (
                          <div className="mt-2.5 p-2 bg-neutral-50 rounded-lg border border-neutral-200/80 text-[11px] text-neutral-800 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
                              <span className="font-semibold">{msg.actionTaken.details}</span>
                            </div>
                            <span className="px-1.5 py-0.2 rounded bg-neutral-200 text-[10px] font-mono shrink-0">
                              Turno Creado
                            </span>
                          </div>
                        )}

                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                            isAssistant ? 'text-neutral-400' : 'text-neutral-500'
                          }`}
                        >
                          <span>{msg.timestamp}</span>
                          {isAssistant && <CheckCheck className="w-3.5 h-3.5 text-sky-500 shrink-0" />}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {loading && (
                  <div className="flex items-center gap-2 text-xs text-neutral-600 p-2.5 bg-white border border-neutral-200 rounded-xl w-fit shadow-2xs">
                    <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-neutral-200 bg-neutral-100">
                      {practiceSettings.bot_avatar_url ? (
                        <img
                          src={practiceSettings.bot_avatar_url}
                          alt={practiceSettings.bot_assistant_name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full bg-emerald-700 text-white flex items-center justify-center text-[9px] font-bold">
                          {practiceSettings.bot_assistant_name.slice(0, 1)}
                        </div>
                      )}
                    </div>
                    <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
                    <span>{practiceSettings.bot_assistant_name} está escribiendo respuesta...</span>
                  </div>
                )}

                {/* Floating scroll to bottom button if user scrolled up */}
                {showScrollBottomBtn && (
                  <button
                    type="button"
                    onClick={() => {
                      isUserNearBottomRef.current = true;
                      scrollToBottom('smooth');
                      setShowScrollBottomBtn(false);
                    }}
                    className="sticky bottom-2 ml-auto z-20 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full shadow-lg text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                    <span>Ir al último mensaje</span>
                  </button>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-2.5 sm:p-3 bg-white border-t border-neutral-200/80 w-full min-w-0">
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2 w-full min-w-0"
                >
                  <input
                    type="text"
                    placeholder={
                      activeConv.ai_handled
                        ? "Escribe un mensaje o prueba una pregunta..."
                        : "Escribe una respuesta como profesional..."
                    }
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || loading}
                    className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Enviar</span>
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
      )}

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
              {/* Unofficial API Warning & Best Practices Banner */}
              <div className="p-3.5 bg-amber-50/90 rounded-xl border border-amber-200/90 text-amber-950 space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Aviso Importante: Conexión mediante Evolution API</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Esta integración conecta tu sesión mediante el protocolo web de WhatsApp (no utiliza la API oficial de Cloud API de Meta). 
                </p>
                <div className="pt-1 border-t border-amber-200/60 text-[10px] space-y-1 text-amber-900 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="w-3 h-3 text-amber-700 shrink-0" />
                    <span><strong>Recomendación:</strong> Usar una línea exclusiva de trabajo o chip corporativo, nunca tu número personal principal.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-amber-700 shrink-0" />
                    <span>El bot respeta los intervalos de espera configurados ({practiceSettings.bot_response_delay_seconds || 20}s) para evitar bloqueos por automatización rápida.</span>
                  </div>
                </div>
              </div>

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

              {qrErrorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Aviso de Evolution API:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{qrErrorMessage}</p>
                </div>
              )}

              {/* QR Code graphic container */}
              <div className="p-4 bg-white border border-neutral-200 rounded-lg flex flex-col items-center justify-center space-y-2.5 text-center">
                <div className="w-52 h-52 border-2 border-neutral-900 rounded-lg p-2 bg-neutral-900 flex items-center justify-center relative overflow-hidden">
                  {qrConnectedSuccess ? (
                    <div className="text-white flex flex-col items-center justify-center gap-2 text-xs p-4 animate-in zoom-in-95">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Check className="w-7 h-7" />
                      </div>
                      <span className="font-bold text-emerald-400 text-sm">¡WhatsApp Vinculado!</span>
                      <span className="text-[11px] text-neutral-300">Sesión iniciada correctamente</span>
                    </div>
                  ) : qrFetchLoading ? (
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

                <div className="text-[11px] text-neutral-600 max-w-xs space-y-1">
                  {evolutionQrCode ? (
                    <div className="space-y-1 text-left bg-emerald-50/80 p-2 rounded-md border border-emerald-200/80 text-[11px] text-emerald-950">
                      <p className="font-semibold flex items-center gap-1 text-emerald-800">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                        Esperando escaneo desde tu teléfono...
                      </p>
                      <ol className="list-decimal list-inside text-[10.5px] text-emerald-900 space-y-0.5">
                        <li>Abre WhatsApp en tu teléfono</li>
                        <li>Toca <strong>Dispositivos vinculados</strong> &gt; <strong>Vincular un dispositivo</strong></li>
                        <li>Apunta la cámara a este código QR</li>
                      </ol>
                    </div>
                  ) : (
                    <p>Abre WhatsApp en tu teléfono &gt; Ajustes &gt; Dispositivos vinculados &gt; Vincular dispositivo.</p>
                  )}
                </div>
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
                  onClick={() => setShowDisconnectConfirm(true)}
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
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-md font-medium transition-colors cursor-pointer"
                >
                  Cerrar
                </button>

                <button
                  type="button"
                  onClick={handleOpenQrModal}
                  disabled={qrFetchLoading}
                  className="px-3 py-1.5 text-xs text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-md font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Solicitar nuevo código QR a Evolution API"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${qrFetchLoading ? 'animate-spin' : ''}`} />
                  <span>Actualizar QR</span>
                </button>

                <button
                  type="button"
                  onClick={handleSimulateQrScan}
                  disabled={qrScanning}
                  className="px-3.5 py-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 text-white rounded-md font-semibold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
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
                  <span>Tu Trial de 14 días incluye:</span>
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

      {/* Confirmation Dialog for WhatsApp Session Disconnect */}
      <ConfirmModal
        isOpen={showDisconnectConfirm}
        onClose={() => setShowDisconnectConfirm(false)}
        onConfirm={handleDisconnectWhatsApp}
        title="¿Desvincular WhatsApp?"
        message="¿Está seguro de que desea desvincular la sesión actual de WhatsApp? Las respuestas automáticas y recordatorios quedarán pausados hasta que vuelva a escanear el código QR."
        confirmText="Sí, Desvincular"
        variant="danger"
      />

      {/* Confirmation Dialog for Clearing Chats */}
      <ConfirmModal
        isOpen={showClearConfirmModal}
        onClose={() => setShowClearConfirmModal(false)}
        onConfirm={handleClearAllChats}
        title="¿Vaciar bandeja de chats?"
        message="Esta acción limpiará todas las conversaciones previas de la pantalla. La bandeja quedará limpia y sólo se registrarán y responderán los mensajes nuevos que ingresen a partir de este momento."
        confirmText={isClearingChats ? "Limpiando..." : "Sí, Vaciar Bandeja"}
        variant="danger"
      />
    </div>
  );
};
