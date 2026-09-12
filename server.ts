import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    }
  }
  return aiClient;
}

// In-memory store for real Evolution WhatsApp conversations & messages
export interface RealWhatsAppMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  actionTaken?: any;
}

export interface RealWhatsAppConversation {
  id: string;
  patient_name: string;
  patient_first_name?: string;
  patient_phone: string;
  patient_avatar?: string;
  unread_count: number;
  ai_handled: boolean;
  last_message?: string;
  last_timestamp?: string;
  messages: RealWhatsAppMessage[];
}

const realWhatsAppConversations: Map<string, RealWhatsAppConversation> = new Map();
let instanceConnectedAt: number = Date.now();
let lastKnownEvolutionConfig = {
  apiUrl: process.env.EVOLUTION_API_URL || "",
  apiKey: process.env.EVOLUTION_API_KEY || "",
  instanceName: process.env.EVOLUTION_INSTANCE_NAME || "consultorio"
};
let cachedPracticeSettings: any = {};

async function generateAiBotResponse(params: {
  message: string;
  history?: any[];
  practiceSettings?: any;
  services?: any[];
  availability?: any[];
  existingAppointments?: any[];
}) {
  const {
    message,
    history = [],
    practiceSettings = cachedPracticeSettings || {},
    services = [],
    availability = [],
    existingAppointments = []
  } = params;

  if (practiceSettings && Object.keys(practiceSettings).length > 0) {
    cachedPracticeSettings = { ...cachedPracticeSettings, ...practiceSettings };
  }

  const ai = getAI();
  const effectiveSettings = { ...cachedPracticeSettings, ...practiceSettings };
  const practiceName = effectiveSettings.practice_name || "Agenfacil";
  const professionalName = effectiveSettings.professional_name || "el profesional a cargo";
  const professionalTitle = effectiveSettings.professional_title || "Especialista";
  const isProfessionalIdentity = effectiveSettings.bot_identity_mode === 'professional';
  const assistantName = effectiveSettings.bot_assistant_name || "Sofía (IA)";
  const botTone = effectiveSettings.bot_tone || "cálido, profesional, empático y conciso";
  const customRules = effectiveSettings.bot_custom_instructions ? `\n\nREGLAS Y RESTRICCIONES ESPECÍFICAS DEL CONSULTORIO (OBLIGATORIAS):\n${effectiveSettings.bot_custom_instructions}` : "";

  // Features enabled
  const featPricing = effectiveSettings.bot_feature_pricing ?? true;
  const featBooking = effectiveSettings.bot_feature_booking ?? true;
  const featLocation = effectiveSettings.bot_feature_location ?? true;
  const featDeposit = effectiveSettings.bot_feature_deposit_info ?? true;
  const featHandoff = effectiveSettings.bot_feature_human_handoff ?? true;

  // Services context
  const servicesList = services.length > 0
    ? services.map((s: any) => `- ${s.name}: $${s.price?.toLocaleString()} (${s.duration_minutes} min)${s.description ? ` - ${s.description}` : ""}`).join("\n")
    : "- Consulta Médica General / Evaluación: $15.000 (30 min)\n- Control / Seguimiento: $10.000 (20 min)";

  // Availability context
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const scheduleList = availability.length > 0
    ? availability.map((a: any) => `- ${days[a.day_of_week] || "Día"}: ${a.start_time} a ${a.end_time}`).join("\n")
    : "- Lunes a Viernes: 09:00 a 18:00";

  // Existing booked appointments
  const bookedList = existingAppointments.length > 0
    ? existingAppointments.map((a: any) => `- ${a.start_datetime} (${a.service_name || "Turno"})`).join("\n")
    : "No hay turnos registrados en este momento.";

  const now = new Date();
  const todayString = now.toLocaleString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires"
  });

  const botReq = effectiveSettings.bot_required_fields || {
    full_name: true,
    phone: true,
    dni: false,
    email: false,
    insurance: false,
    reason: false,
    address: false
  };

  const requiredFieldsDescriptions = [
    botReq.full_name ? "- Nombre y Apellido completo" : null,
    botReq.phone ? "- Número de WhatsApp / Celular" : null,
    botReq.dni ? "- DNI o documento de identidad" : null,
    botReq.email ? "- Correo electrónico" : null,
    botReq.insurance ? "- Obra social o Prepaga (o Particular)" : null,
    botReq.reason ? "- Motivo de consulta o afección" : null,
    botReq.address ? "- Domicilio o localidad de residencia" : null,
  ].filter(Boolean).join("\n");

  let identityPrompt = "";
  if (isProfessionalIdentity) {
    identityPrompt = `Eres ${professionalName} (${professionalTitle}), el profesional a cargo de "${practiceName}".
Respondes directamente tú en primera persona a tus pacientes con trato cercano, humano y profesional.
Tu tono es ${botTone}. Respondes en español rioplatense o neutro claro, natural, humano y empático, con emojis sutiles, de forma conversacional y concisa como en WhatsApp (mensajes no excesivamente largos, directos y fluidos).`;
  } else {
    identityPrompt = `Eres ${assistantName}, la asistente virtual inteligente de "${practiceName}" del profesional ${professionalName}.
Tu tono es ${botTone}. Respondes en español rioplatense o neutro claro, natural, humano y empático, con emojis sutiles, de forma conversacional y concisa como en WhatsApp (mensajes no excesivamente largos, directos y fluidos).`;
  }

  const systemInstruction = `${identityPrompt}

Fecha y hora actual del consultorio: ${todayString}.
Dirección del consultorio: ${effectiveSettings.address || "Consultorio céntrico"}, ${effectiveSettings.city || "Ciudad"}.
Teléfono de contacto: ${effectiveSettings.phone || effectiveSettings.whatsapp_number || ""}.

INFORMACIÓN DEL CONSULTORIO:
Servicios y aranceles:
${featPricing ? servicesList : "Informar que los aranceles se coordinan en la consulta presencial."}

Horarios de atención disponibles:
${scheduleList}

Turnos ya ocupados / no disponibles:
${bookedList}

INSTRUCCIONES CLAVE DE ATENCIÓN Y CONVERSACIÓN:
1. FLUIDEZ Y CONTEXTO: Mantén una conversación continua, empática y lógica con el paciente. NUNCA repitas el saludo inicial si ya te has presentado en mensajes anteriores. Responde concretamente a la última duda o mensaje del paciente.
2. RIGOR Y CERO ALUCINACIONES: Basa tus respuestas ÚNICAMENTE en la información explícita de los servicios, aranceles, horarios y dirección listados arriba. NO inventes precios, promociones, diagnósticos, indicaciones médicas ni servicios que no estén configurados. Si el paciente pregunta por un tratamiento o arancel que no figura en la lista, responde amablemente que no dispones de ese dato en el sistema y que dejas asentada la consulta para que el profesional a cargo lo revise.
3. SERVICIOS Y PRECIOS: Responder preguntas sobre servicios${featPricing ? ", precios" : ""}, duración y ubicación según los datos oficiales del consultorio.
4. ${featBooking ? "HORARIOS Y TURNOS: Ayudar al paciente a elegir un horario disponible según los huecos libres y días de atención configurados. NUNCA inventes turnos ni confirmes horarios ocupados." : "Informar los horarios de atención y pedirle que aguarde confirmación del equipo."}
5. DATOS REQUERIDOS PARA AGENDAR:
${requiredFieldsDescriptions || "- Nombre y Apellido\n- Teléfono"}
Pide estos datos de forma natural y progresiva a lo largo del diálogo.
6. ${featDeposit && effectiveSettings.patient_deposit_alias ? `PAGOS Y SEÑAS: Si el paciente desea señar su turno o pregunta por transferencias, indícale el Alias de seña: ${effectiveSettings.patient_deposit_alias}.` : ""}
7. ${featHandoff ? "DERIVACIÓN HUMANA: Si el paciente solicita hablar con una persona real o tiene un caso complejo, indícale con calidez que su mensaje queda guardado para contacto por el profesional." : ""}
8. ${featBooking ? "CONFIRMACIÓN DE RESERVA: Si el paciente confirma explícitamente un día, hora y servicio disponible, y ya te proporcionó los datos requeridos, resume los datos confirmados y emite el bloque JSON estructurado con tag 'json_action'." : ""}
${customRules}

FORMATO DE RESPUESTA:
Provee tu mensaje amigable y humano para el paciente.
${featBooking ? `Si se concreta o confirma una reserva con todos los datos requeridos, agrega al final un bloque de código markdown con tag 'json_action':
\`\`\`json_action
{
  "action": "book_appointment",
  "service_name": "Nombre del servicio exacto",
  "datetime": "YYYY-MM-DDTHH:mm:ss",
  "patient_name": "Nombre del paciente",
  "patient_phone": "Teléfono si se conoce",
  "patient_email": "Email si se conoce",
  "notes": "Notas adicionales"
}
\`\`\`
Si aún falta definir algún dato obligatorio o la fecha/hora no está confirmada por el paciente, NO incluyas el bloque 'json_action'.` : ""}`;

  if (ai) {
    const candidateModels = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-pro-preview"];
    for (const modelName of candidateModels) {
      try {
        const conversationText = history
          .slice(-12)
          .map((m: any) => `${m.role === "user" ? "Paciente" : (isProfessionalIdentity ? professionalName : "Asistente")}: ${m.content}`)
          .join("\n");

        const fullPrompt = `${systemInstruction}\n\n=== HISTORIAL DE LA CONVERSACIÓN ===\n${conversationText || "(Inicio de la conversación)"}\n\nPaciente: ${message}\n${isProfessionalIdentity ? professionalName : "Asistente"}:`;

        const response = await ai.models.generateContent({
          model: modelName,
          contents: fullPrompt,
        });

        const replyRaw = response.text?.trim();
        if (replyRaw) {
          let actionData: any = null;
          const match = replyRaw.match(/```json_action\s*([\s\S]*?)\s*```/);
          let cleanReply = replyRaw;

          if (match && match[1]) {
            try {
              actionData = JSON.parse(match[1]);
              cleanReply = replyRaw.replace(/```json_action\s*[\s\S]*?\s*```/, "").trim();
            } catch (err) {
              console.error("Failed to parse json_action:", err);
            }
          }

          return {
            reply: cleanReply,
            action: actionData,
            aiPowered: true
          };
        }
      } catch (aiErr: any) {
        console.warn(`Gemini AI error with ${modelName}:`, aiErr?.message || aiErr);
      }
    }
  }

  // Dynamic context-aware heuristic fallback if Gemini is offline or quota limited
  const lower = message.toLowerCase().trim();
  const hasHistory = history.length > 0;
  let reply = "";
  let actionData: any = null;

  if (lower.includes("precio") || lower.includes("cuanto") || lower.includes("arancel") || lower.includes("costo") || lower.includes("valor")) {
    reply = `Con gusto te paso la información de nuestros servicios y aranceles:\n\n${services.length > 0 ? services.map((s: any) => `• *${s.name}*: $${s.price?.toLocaleString()} (${s.duration_minutes} min)`).join("\n") : "• Consulta General: $15.000"}\n\n¿Te gustaría que te reservemos un turno para alguno de ellos? 😊`;
  } else if (lower.includes("horario") || lower.includes("atienden") || lower.includes("dias") || lower.includes("días") || lower.includes("abierto")) {
    reply = `Nuestros horarios de atención son:\n${scheduleList}\n\n¿Qué día y franja horaria (mañana o tarde) te quedaría más cómodo?`;
  } else if (lower.includes("turno") || lower.includes("agendar") || lower.includes("reservar") || lower.includes("cita") || lower.includes("consulta")) {
    const firstService = services[0]?.name || "Consulta Médica";
    reply = `¡Claro que sí! Con mucho gusto te ayudo a coordinar tu turno para *${firstService}*. ¿Prefieres venir por la mañana o por la tarde? Y por favor indícame tu nombre completo para la ficha.`;
  } else if (lower.includes("donde") || lower.includes("dirección") || lower.includes("direccion") || lower.includes("ubicacion") || lower.includes("ubicación")) {
    reply = `Estamos ubicados en *${effectiveSettings.address || "nuestro consultorio central"}*, ${effectiveSettings.city || ""}. ¿Necesitas indicaciones para llegar o te ayudo a agendar un turno?`;
  } else if (lower.includes("gracias") || lower.includes("dale") || lower.includes("perfecto") || lower.includes("genial") || lower.includes("bueno") || lower.includes("ok")) {
    reply = `¡Un placer! Quedo a tu total disposición por cualquier otra consulta sobre tus turnos o atención. ¡Que tengas un excelente día! ✨`;
  } else if (lower.match(/\b(hola|buen dia|buenas|buenos dias|buenas tardes|buenas noches|que tal)\b/)) {
    if (hasHistory) {
      reply = `¡Hola de nuevo! ¿En qué te podemos colaborar hoy? ¿Deseas consultar servicios, horarios o solicitar un turno?`;
    } else {
      reply = `¡Hola! Te damos la bienvenida a *${practiceName}*. Soy tu asistente virtual. ¿En qué te puedo ayudar hoy? (Consultar precios, horarios disponibles o agendar un turno)`;
    }
  } else {
    if (hasHistory) {
      reply = `Entendido. Tomo nota de tu mensaje: "${message}". ¿Deseas que coordinemos un turno para esta semana o tienes alguna consulta sobre los servicios y aranceles?`;
    } else {
      reply = `¡Hola! Gracias por comunicarte con *${practiceName}*. He recibido tu consulta sobre "${message}". ¿Te gustaría agendar una cita o necesitas información sobre aranceles y horarios? 😊`;
    }
  }

  return {
    reply,
    action: actionData,
    aiPowered: false
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString()
    });
  });

  // Assistant Chat with Gemini
  app.post("/api/assistant/chat", async (req, res) => {
    try {
      const {
        message,
        history = [],
        practiceSettings = {},
        services = [],
        availability = [],
        existingAppointments = []
      } = req.body;

      if (!message) {
        return res.status(400).json({ error: "El mensaje es requerido" });
      }

      const botResponse = await generateAiBotResponse({
        message,
        history,
        practiceSettings,
        services,
        availability,
        existingAppointments
      });

      // Bot human-like response delay pacing
      const delaySeconds = Math.min(Math.max(Number(practiceSettings.bot_response_delay_seconds) || 0, 0), 60);
      if (delaySeconds > 0) {
        await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
      }

      return res.json(botResponse);
    } catch (error: any) {
      console.error("Error in /api/assistant/chat:", error);
      res.status(500).json({ error: error.message || "Error procesando mensaje con IA" });
    }
  });

  // Suggest smart AI response for staff in chat
  app.post("/api/assistant/smart-reply", async (req, res) => {
    try {
      const { lastPatientMessage, practiceSettings, services } = req.body;
      const ai = getAI();
      if (!ai) {
        return res.json({
          suggestion: "¡Hola! Claro que sí, tenemos disponibilidad para esta semana. ¿Prefieres turno matutino o vespertino?"
        });
      }

      const prompt = `Como asistente de consultorio médico/profesional (${practiceSettings?.practice_name || "Agenfacil"}), sugiere una respuesta rápida, empática y profesional para este mensaje del paciente:
"${lastPatientMessage}"
Responde ÚNICAMENTE con el texto sugerido en español rioplatense o neutro, sin comillas ni intros.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
      });

      return res.json({ suggestion: response.text?.trim() || "¡Hola! Con gusto te ayudo a coordinar tu cita." });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Doctor & Staff Internal Copilot AI (Strictly isolated per authenticated professional)
  app.post("/api/copilot/chat", async (req, res) => {
    try {
      const {
        message,
        history = [],
        context = {}
      } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "El mensaje es requerido" });
      }

      const {
        doctorName = "Doctor/a",
        doctorEmail = "",
        practiceName = "Consultorio Médico",
        specialty = "Medicina",
        todayDateStr = new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
        todayAppointments = [],
        upcomingAppointments = [],
        financials = {},
        services = [],
        patientsCount = 0,
        settingsSummary = {}
      } = context;

      // Prepare clear, deterministic context representations
      const todayAptsFormatted = (todayAppointments.length > 0)
        ? todayAppointments.map((a: any, idx: number) => 
            `${idx + 1}. [${a.time || a.start_datetime?.split("T")[1]?.slice(0, 5) || "Horario a confirmar"}] Paciente: ${a.patient_name} | Servicio: ${a.service_name || "Consulta"} | Estado: ${a.status === "confirmed" ? "Confirmado" : a.status === "pending" ? "Pendiente" : a.status} | Pago: ${a.payment_status === "paid" ? "Abonado" : "Pendiente"}${a.deposit_amount ? ` (Seña: $${a.deposit_amount.toLocaleString("es-AR")})` : ""}`
          ).join("\n")
        : "Sin turnos agendados para el día de hoy.";

      const upcomingAptsFormatted = (upcomingAppointments.length > 0)
        ? upcomingAppointments.map((a: any, idx: number) => 
            `${idx + 1}. ${a.date || a.start_datetime?.split("T")[0]} a las ${a.time || a.start_datetime?.split("T")[1]?.slice(0, 5)} - ${a.patient_name} (${a.service_name})`
          ).join("\n")
        : "No hay turnos agendados para los próximos días.";

      const servicesFormatted = (services.length > 0)
        ? services.map((s: any) => `- ${s.name}: $${(s.price || 0).toLocaleString("es-AR")} (${s.duration_minutes || 30} min)`).join("\n")
        : "No hay aranceles de servicios configurados aún.";

      const pendingPatientsFormatted = (financials.pending_patients && financials.pending_patients.length > 0)
        ? financials.pending_patients.map((p: any) => `- ${p.patient_name}: $${(p.amount || p.price || 0).toLocaleString("es-AR")} (${p.service_name || "Consulta"}${p.date ? ` del ${p.date}` : ""})`).join("\n")
        : "No hay pacientes con pagos pendientes.";

      const systemInstruction = `Eres el Copiloto Inteligente de Agenfacil para ${doctorName}, en su consultorio "${practiceName}" (${specialty || "Salud / Consultorio"}).
Tu misión es asistir de forma ejecutiva, rápida y precisa al profesional sobre todo lo relativo a su cuenta, consultorio y funcionamiento de la aplicación.

POLÍTICA ESTRICTA DE PRIVACIDAD Y SEGURIDAD MULTI-CUENTA (REGLA FUNDAMENTAL):
- Toda la información proporcionada pertenece EXCLUSIVAMENTE al consultorio de ${doctorName} (cuenta: ${doctorEmail || "profesional"}).
- TIENES PROHIBIDO mezclar, deducir o mencionar información de cualquier otra cuenta, médico, consultorio o usuario del sistema.
- Basa tus respuestas de forma ESTRICTA en los datos reales del consultorio provistos abajo. Si algo no existe o está en cero, dilo claramente sin inventar.

DATOS EN TIEMPO REAL DEL CONSULTORIO (${todayDateStr}):
- Nombre del profesional: ${doctorName}
- Consultorio: ${practiceName} (${specialty})
- Total de pacientes registrados en la ficha: ${patientsCount}

MÉTRICAS FINANCIERAS REALES DEL PROFESIONAL:
- Facturación total del mes en curso: $${(financials.month_revenue || 0).toLocaleString("es-AR")} ARS
- Recaudación cobrada hoy: $${(financials.today_revenue || 0).toLocaleString("es-AR")} ARS
- Saldo pendiente de cobro: $${(financials.pending_amount || 0).toLocaleString("es-AR")} ARS (${financials.pending_appointments_count || 0} turnos sin abonar)
- Detalle de pacientes con deuda / pago pendiente:
${pendingPatientsFormatted}

AGENDA DE HOY:
${todayAptsFormatted}

PRÓXIMOS TURNOS:
${upcomingAptsFormatted}

SERVICIOS Y ARANCELES OFICIALES:
${servicesFormatted}

CONFIGURACIÓN DE LA APP:
- Señas por adelantado: ${settingsSummary.patient_deposit_enabled ? `ACTIVADAS (${settingsSummary.patient_deposit_type === "percent" ? `${settingsSummary.patient_deposit_percent}%` : `$${settingsSummary.patient_deposit_fixed_amount} fijo`} vía ${settingsSummary.patient_deposit_method || "Mercado Pago / Alias"})` : "Desactivadas"}
- Alias/CBU para señas: ${settingsSummary.patient_deposit_alias || "No configurado"}
- WhatsApp Bot: ${settingsSummary.bot_assistant_name || "Asistente Virtual"} (Activo en pestaña Asistente)
- Enlace público de reserva: /u/${settingsSummary.handle || "consultorio"}
- Recordatorios automáticos: WhatsApp y Email (24h y 2h antes del turno).

GUÍA RÁPIDA DE USO DE AGENFACIL (Para responder dudas sobre la app):
- ¿Cómo agendar un turno? En el botón "+ Nuevo Turno" arriba a la derecha o en la pestaña "Agenda".
- ¿Cómo cobrar señas automáticas? En la pestaña "Cobros" o "Configuración", sección "Señas y Depósitos": se puede pedir porcentaje o monto fijo por Mercado Pago o Alias CBU.
- ¿Cómo ver o crear historias clínicas? En la pestaña "Consultas / Historias Clínicas" o dentro del turno haciendo clic en "Iniciar Consulta SOAP" con opción de dictado por voz.
- ¿Cómo conectar WhatsApp? En la pestaña "Asistente Virtual", mediante escaneo de código QR.
- ¿Dónde ver balances de caja diaria? En la pestaña "Cobros", subpestaña "Caja Diaria", permite abrir caja, registrar ingresos/egresos y cerrar caja con arqueo.
- ¿Dónde proponer mejoras o sugerencias? En la pestaña "Buzón de Sugerencias" (tab: "sugerencias"), donde se pueden proponer nuevas funciones, votar ideas y seguir el roadmap de la app.

INSTRUCCIONES DE RESPUESTA:
1. Responde de forma muy clara, concisa, profesional y amigable en español rioplatense o neutro.
2. Usa viñetas y negritas para que la información se lea de un vistazo rápido.
3. Si el doctor pide agendar un turno o consultar turnos, facilítale los datos y si es oportuno ofrece un bloque de acción JSON al final:
\`\`\`copilot_action
{
  "label": "Ir a Agenda",
  "tab": "agenda" 
}
\`\`\`
Opciones de tab válidas: "agenda", "cobros", "pacientes", "consultas", "servicios", "horarios", "asistente", "configuracion".
Si te pide agendar un turno para alguien específico:
\`\`\`copilot_action
{
  "label": "Agendar Turno",
  "actionType": "new_appointment",
  "patientName": "Nombre",
  "date": "YYYY-MM-DD"
}
\`\`\`
Si no requiere acción, no agregues el bloque de código.`;

      const ai = getAI();
      let aiHandled = false;
      if (ai) {
        try {
          // Build multi-turn chat contents
          const conversationText = history
            .slice(-8)
            .map((m: any) => `${m.role === "user" ? "Doctor" : "Copiloto"}: ${m.content}`)
            .join("\n");

          const fullPrompt = `${systemInstruction}\n\n=== CONVERSACIÓN RECIENTE ===\n${conversationText}\n\nDoctor: ${message}\nCopiloto:`;

          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
          });

          const replyRaw = response.text || "Disculpa, no pude procesar la consulta en este momento.";

          // Extract copilot_action if present
          let actionData: any = null;
          let cleanReply = replyRaw;
          const match = replyRaw.match(/```(?:copilot_action|json_action)?\s*([\s\S]*?)\s*```/);
          if (match && match[1]) {
            try {
              actionData = JSON.parse(match[1]);
              cleanReply = replyRaw.replace(/```(?:copilot_action|json_action)?\s*[\s\S]*?\s*```/, "").trim();
            } catch (e) {
              // Ignored if not valid json
            }
          }

          return res.json({
            reply: cleanReply,
            action: actionData,
            aiPowered: true
          });
        } catch (geminiErr: any) {
          console.warn("Gemini model unavailable or high demand, falling back to local copilot engine:", geminiErr?.message || geminiErr);
          // Fall through to deterministic engine
        }
      }

      // Intelligent deterministic fallback if GEMINI_API_KEY is not set or temporary model outage
      const lower = message.toLowerCase();
        let reply = "";
        let actionData: any = null;

        if (lower.includes("factura") || lower.includes("ingreso") || lower.includes("cuanto llevo") || lower.includes("plata") || lower.includes("dinero") || lower.includes("recaud")) {
          reply = `📊 **Estado Financiero de tu Consultorio:**\n\n• **Facturación del mes actual:** $${(financials.month_revenue || 0).toLocaleString("es-AR")} ARS\n• **Cobrado hoy:** $${(financials.today_revenue || 0).toLocaleString("es-AR")} ARS\n• **Saldos pendientes de cobro:** $${(financials.pending_amount || 0).toLocaleString("es-AR")} ARS (${financials.pending_appointments_count || 0} turnos pendientes)`;
          actionData = { label: "Ver Detalle en Cobros", tab: "cobros" };
        } else if (lower.includes("hoy") || lower.includes("agenda") || lower.includes("quien viene") || lower.includes("proximo paciente") || lower.includes("citas")) {
          if (todayAppointments.length > 0) {
            reply = `📅 **Agenda de Hoy (${todayDateStr}):**\nTienes ${todayAppointments.length} turno(s) agendado(s):\n\n` +
              todayAppointments.map((a: any) => `• **${a.time || "Horario"}**: ${a.patient_name} - *${a.service_name}* (${a.status === "confirmed" ? "✅ Confirmado" : "⏳ Pendiente"})`).join("\n");
          } else {
            reply = `📅 **Agenda de Hoy:**\nNo tienes turnos agendados para el día de hoy (${todayDateStr}). ¡Tienes la jornada despejada o puedes agendar nuevas consultas!`;
          }
          actionData = { label: "Abrir Agenda", tab: "agenda" };
        } else if (lower.includes("pendiente") || lower.includes("deuda") || lower.includes("quien debe") || lower.includes("falta pagar")) {
          if (financials.pending_patients && financials.pending_patients.length > 0) {
            reply = `⚠️ **Pacientes con Pagos Pendientes:**\n\n` +
              financials.pending_patients.map((p: any) => `• **${p.patient_name}**: $${(p.amount || p.price || 0).toLocaleString("es-AR")} (${p.service_name || "Consulta"})`).join("\n") +
              `\n\nTotal pendiente acumulado: **$${(financials.pending_amount || 0).toLocaleString("es-AR")} ARS**.`;
          } else {
            reply = `✨ **Al día:** No registras turnos ni pacientes con pagos pendientes en tu consultorio.`;
          }
          actionData = { label: "Gestionar Cobros", tab: "cobros" };
        } else if (lower.includes("agendar") || lower.includes("nuevo turno") || lower.includes("crear cita")) {
          reply = `➕ **Agendar un Turno:**\nPuedes hacer clic en el botón "+ Nuevo Turno" en la barra superior o ir a la Agenda interactiva para elegir el horario y servicio.`;
          actionData = { label: "Crear Nuevo Turno", actionType: "new_appointment" };
        } else if (lower.includes("whatsapp") || lower.includes("bot")) {
          reply = `🤖 **Bot de WhatsApp:**\nTu bot responde automáticamente preguntas sobre precios, horarios disponibles y reserva citas por WhatsApp. Puedes ver los chats y configurarlo en la sección **"Asistente Virtual"**.`;
          actionData = { label: "Ir a Asistente", tab: "asistente" };
        } else if (lower.includes("seña") || lower.includes("deposito") || lower.includes("mercado pago")) {
          reply = `💳 **Cobro de Señas:**\nPuedes exigir una seña obligatoria (porcentaje o monto fijo) a los pacientes al reservar. Se configura en la pestaña **"Cobros"** o **"Configuración"** vinculando tu cuenta de Mercado Pago o indicando tu Alias CBU bancario.`;
          actionData = { label: "Configurar Señas", tab: "cobros" };
        } else if (lower.includes("suger") || lower.includes("mejora") || lower.includes("idea") || lower.includes("roadmap") || lower.includes("buzon") || lower.includes("feedback")) {
          reply = `💡 **Buzón de Sugerencias & Hoja de Ruta:**\n¡Tu opinión es fundamental para nosotros! Puedes proponer nuevas funciones, reportar mejoras o votar por las ideas más solicitadas por la comunidad médica en nuestra sección de sugerencias.`;
          actionData = { label: "Abrir Buzón de Sugerencias", tab: "sugerencias" };
        } else {
          reply = `👋 ¡Hola ${doctorName}! Soy tu **Copiloto Inteligente de Agenfacil**.\nPuedo ayudarte en tiempo real con:\n• **Facturación**: "¿Cuánto llevo facturado este mes?"\n• **Agenda**: "¿Qué turnos tengo hoy?" o "¿Quién es mi próximo paciente?"\n• **Cobros**: "¿Quiénes tienen pagos pendientes?"\n• **Sugerencias**: "¿Cómo propongo una mejora para la app?"\n• **Uso de la App**: "¿Cómo configuro las señas?" o "¿Cómo agendo un turno?"\n\n¿En qué te puedo colaborar ahora?`;
        }

        return res.json({
          reply,
          action: actionData,
          aiPowered: false
        });
    } catch (err: any) {
      console.error("Error in /api/copilot/chat:", err);
      res.status(500).json({ error: err.message || "Error procesando consulta con el Copiloto" });
    }
  });

  // Copilot Audio Voice Transcription with Gemini
  app.post("/api/copilot/transcribe-voice", async (req, res) => {
    try {
      const { audioBase64, mimeType = "audio/webm" } = req.body;
      if (!audioBase64) {
        return res.status(400).json({ error: "No se proporcionó audio" });
      }

      const ai = getAI();
      const rawBase64 = audioBase64.replace(/^data:audio\/[a-zA-Z0-9.\-_]+;base64,/, "");

      if (ai) {
        const cleanMime = mimeType.split(";")[0].trim() || "audio/webm";
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: rawBase64
              }
            },
            {
              text: "Transcribe con la máxima precisión el audio en español de la consulta médica o administrativa. Devuelve ÚNICAMENTE el texto transcripto de lo que dice el usuario, sin introducciones, sin comillas, sin explicaciones ni formato adicional."
            }
          ]
        });

        const transcription = response.text?.trim() || "";
        return res.json({ transcription });
      }

      return res.json({ transcription: "Audio procesado con éxito." });
    } catch (err: any) {
      console.error("Error in /api/copilot/transcribe-voice:", err);
      res.status(500).json({ error: err.message || "Error al transcribir audio" });
    }
  });

  // Audio Voice Note Transcription & Clinical SOAP Structuring
  app.post("/api/consultations/transcribe-voice", async (req, res) => {
    try {
      const { audioBase64, mimeType = "audio/webm", patientName = "", specialty = "" } = req.body;

      if (!audioBase64) {
        return res.status(400).json({ error: "No se proporcionó audio para transcribir" });
      }

      const ai = getAI();
      const rawBase64 = audioBase64.replace(/^data:audio\/[a-zA-Z0-9.\-_]+;base64,/, "");

      if (ai) {
        // Clean mimeType (remove parameters like codecs=opus)
        const cleanMime = mimeType.split(";")[0].trim() || "audio/webm";

        const audioPart = {
          inlineData: {
            mimeType: cleanMime,
            data: rawBase64
          }
        };

        const prompt = `Eres un asistente clínico de máxima precisión médica para consultorios (${specialty || "Medicina General / Especialidades"}).
El profesional de la salud grabó una nota de voz durante o tras la consulta del paciente ${patientName || ""}.

INSTRUCCIONES CLÍNICAS:
1. Transcribe textualmente y con la mayor fidelidad lo que dice el profesional.
2. Analiza el audio y estructura la evolución médica en formato SOAP riguroso:
   - S (Subjetivo): Motivo de consulta, sintomatología referida por el paciente, cronología y antecedentes relevantes.
   - O (Objetivo): Examen físico, signos vitales si se mencionaron, hallazgos clínicos y estudios previos.
   - A (Análisis / Diagnóstico): Juicio clínico, diagnóstico presuntivo o diferencial (términos médicos precisos).
   - P (Plan): Tratamiento farmacológico y no farmacológico, indicaciones higiénico-dietéticas, estudios solicitados y fecha/pautas de control.
3. Si en el audio se dictan medicamentos o recetas, extrae cada uno con su posología y duración.
4. Si se menciona necesidad de reposo médico o certificado laboral, calcula los días sugeridos.

Responde ÚNICAMENTE con un objeto JSON válido con este formato:
\`\`\`json
{
  "transcription": "Texto transcripto íntegro del audio...",
  "soap": {
    "subjective": "Texto del subjetivo...",
    "objective": "Texto del objetivo...",
    "analysis": "Texto del análisis/diagnóstico...",
    "plan": "Texto del plan terapéutico..."
  },
  "prescriptions": [
    {
      "medication": "Nombre del fármaco y concentración",
      "dosage": "Dosis y frecuencia (ej. 1 comprimido cada 8 horas)",
      "duration": "Duración (ej. 7 días)",
      "instructions": "Indicaciones (ej. con alimentos)"
    }
  ],
  "certificate": {
    "needed": false,
    "type": "reposo",
    "rest_days": 2,
    "reason": ""
  }
}
\`\`\``;

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: {
            parts: [
              audioPart,
              { text: prompt }
            ]
          }
        });

        const textOutput = response.text || "";
        // Extract JSON
        const jsonMatch = textOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, textOutput];
        let parsedData: any = {};
        try {
          parsedData = JSON.parse((jsonMatch[1] || textOutput).trim());
        } catch (parseErr) {
          console.error("Error parsing Gemini consultation response:", parseErr);
          parsedData = {
            transcription: textOutput,
            soap: {
              subjective: "Consulta clínica registrada.",
              objective: "Examen clínico evaluado.",
              analysis: "Diagnóstico médico profesional.",
              plan: "Indicaciones terapéuticas registradas."
            },
            prescriptions: []
          };
        }

        return res.json({
          success: true,
          aiPowered: true,
          ...parsedData
        });
      } else {
        // Fallback demo structure if GEMINI_API_KEY is not configured
        return res.json({
          success: true,
          aiPowered: false,
          transcription: "Nota de voz grabada en consulta. Paciente refiere mejoría parcial con tratamiento actual. Se evalúan signos estables y se ajustan indicaciones terapéuticas.",
          soap: {
            subjective: "Paciente refiere evolución de síntomas y consulta para control del cuadro. Manifiesta buena tolerancia general.",
            objective: "Paciente lúcido, afebril, normotenso. Examen regional sin signos agudos de complicación.",
            analysis: "Cuadro clínico en seguimiento con evolución favorable.",
            plan: "Continuar con pautas higiénico-dietéticas, control de síntomas y nueva cita en 15 días si persisten molestias."
          },
          prescriptions: [],
          note: "Configure GEMINI_API_KEY para transcripción y estructuración médica automática mediante IA generativa."
        });
      }
    } catch (error: any) {
      console.error("Error in /api/consultations/transcribe-voice:", error);
      res.status(500).json({ error: error.message || "Error procesando nota de voz" });
    }
  });

  // Structure SOAP from Text (dictation / quick notes)
  app.post("/api/consultations/structure-soap", async (req, res) => {
    try {
      const { text, patientName, specialty } = req.body;
      if (!text) {
        return res.status(400).json({ error: "El texto es requerido" });
      }

      const ai = getAI();
      if (!ai) {
        // Heuristic fallback
        return res.json({
          soap: {
            subjective: text,
            objective: "Examen físico realizado.",
            analysis: "Evaluación clínica general.",
            plan: "Pautas de cuidado y seguimiento."
          },
          prescriptions: []
        });
      }

      const prompt = `Eres un asistente de redacción médica profesional (${specialty || "Medicina General"}).
Transforma las siguientes notas rápidas/dictado del profesional sobre el paciente ${patientName || ""} en una evolución médica en formato SOAP riguroso, formal y claro:
"${text}"

Responde ÚNICAMENTE con un JSON con la estructura:
\`\`\`json
{
  "soap": {
    "subjective": "...",
    "objective": "...",
    "analysis": "...",
    "plan": "..."
  },
  "prescriptions": [
    { "medication": "...", "dosage": "...", "duration": "...", "instructions": "..." }
  ]
}
\`\`\``;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt
      });

      const textOutput = response.text || "";
      const jsonMatch = textOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, textOutput];
      let parsed = JSON.parse((jsonMatch[1] || textOutput).trim());

      return res.json(parsed);
    } catch (err: any) {
      console.error("Error in /api/consultations/structure-soap:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // EVOLUTION API (WhatsApp Microservice)
  // ==========================================

  // Check Evolution API Connection Status
  app.post("/api/evolution/test-connection", async (req, res) => {
    try {
      const { apiUrl, apiKey, instanceName } = req.body;
      const targetUrl = (apiUrl || process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
      const targetKey = apiKey || process.env.EVOLUTION_API_KEY || "";
      const targetInstance = (instanceName || process.env.EVOLUTION_INSTANCE_NAME || "consultorio-principal").trim();

      if (!targetUrl || !targetKey) {
        return res.status(400).json({
          success: false,
          error: "Falta la URL de Evolution API o la API Key (global/instance)",
          status: "disconnected"
        });
      }

      // First test: Check if Evolution Server is alive and accepts the Global API key by fetching instances
      let instancesList: any[] = [];
      let globalKeyValid = false;
      try {
        const fetchInstancesRes = await fetch(`${targetUrl}/instance/fetchInstances`, {
          method: "GET",
          headers: {
            "apikey": targetKey,
            "Content-Type": "application/json"
          }
        });
        if (fetchInstancesRes.ok) {
          const list = await fetchInstancesRes.json();
          instancesList = Array.isArray(list) ? list : (list?.response || []);
          globalKeyValid = true;
        }
      } catch (e) {
        // Continue to check individual instance
      }

      // Second test: Check connection state of the requested instance
      const response = await fetch(`${targetUrl}/instance/connectionState/${targetInstance}`, {
        method: "GET",
        headers: {
          "apikey": targetKey,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const errText = await response.text();
        
        // If the instance does not exist yet (404), BUT the server and Global API key are valid!
        if (response.status === 404 && (globalKeyValid || errText.includes("does not exist"))) {
          const availableInstances = instancesList.map((inst: any) => inst?.instance?.instanceName || inst?.name).filter(Boolean);
          return res.json({
            success: true,
            status: "instance_not_created_yet",
            serverAlive: true,
            message: `¡Servidor Evolution conectado exitosamente! La Global API Key es válida. La instancia "${targetInstance}" aún no ha sido creada en Evolution (se creará automáticamente al escanear el QR o puedes usar una existente: ${availableInstances.length > 0 ? availableInstances.join(', ') : 'ninguna aún'}).`,
            availableInstances
          });
        }

        return res.json({
          success: false,
          status: "error",
          statusCode: response.status,
          message: `Error al consultar la instancia: ${errText || response.statusText}`
        });
      }

      const data = await response.json();
      return res.json({
        success: true,
        status: data?.instance?.state || data?.state || "connected",
        message: `¡Conexión exitosa con Evolution API! Estado de la instancia "${targetInstance}": ${data?.instance?.state || data?.state || "operativa"}.`,
        data
      });
    } catch (err: any) {
      console.error("Error in /api/evolution/test-connection:", err);
      res.json({
        success: false,
        status: "error",
        error: err.message || "No se pudo conectar con el servidor de Evolution API"
      });
    }
  });

  // Sync Evolution and Practice config with backend
  app.post("/api/evolution/sync-config", (req, res) => {
    try {
      const { apiUrl, apiKey, instanceName, practiceSettings, appUrl } = req.body;
      if (apiUrl) lastKnownEvolutionConfig.apiUrl = apiUrl.replace(/\/$/, "");
      if (apiKey) lastKnownEvolutionConfig.apiKey = apiKey;
      if (instanceName) lastKnownEvolutionConfig.instanceName = instanceName.trim();
      if (practiceSettings) {
        cachedPracticeSettings = { ...cachedPracticeSettings, ...practiceSettings };
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Universal phone normalization and conversation lookup helper
  const normalizePhoneNumber = (raw: string) => {
    const digits = (raw || "").replace(/\D/g, "");
    let core10 = digits;
    if (digits.startsWith("549") && digits.length === 13) {
      core10 = digits.slice(3);
    } else if (digits.startsWith("54") && digits.length === 12) {
      core10 = digits.slice(2);
    } else if (digits.length > 10) {
      core10 = digits.slice(-10);
    }
    const full = digits.startsWith("54") ? digits : (digits.length === 10 ? `549${digits}` : digits);
    const display = `+${full.startsWith("54") ? full : (full.length === 10 ? `549${full}` : full)}`;
    return { digits, core10, full, display };
  };

  const formatDisplayPhone = (raw: string) => {
    const digits = (raw || "").replace(/\D/g, "");
    if (!digits) return raw;
    if (digits.startsWith("549") && digits.length === 13) {
      const area = digits.slice(3, 6);
      const mid = digits.slice(6, 9);
      const end = digits.slice(9);
      return `+54 9 ${area} ${mid}-${end}`;
    }
    if (digits.startsWith("54") && digits.length === 12) {
      const area = digits.slice(2, 5);
      const mid = digits.slice(5, 8);
      const end = digits.slice(8);
      return `+54 9 ${area} ${mid}-${end}`;
    }
    if (digits.length === 10) {
      const area = digits.slice(0, 3);
      const mid = digits.slice(3, 6);
      const end = digits.slice(6);
      return `+54 9 ${area} ${mid}-${end}`;
    }
    return `+${digits}`;
  };

  const extractFirstName = (fullName: string) => {
    if (!fullName) return "";
    const cleaned = fullName.replace(/^\+?\d+.*$/, "").trim();
    if (!cleaned) return "";
    const parts = cleaned.split(/\s+/);
    return parts[0] || cleaned;
  };

  const findOrCreateConversation = (senderPhone: string, pushName?: string, avatarUrl?: string): RealWhatsAppConversation => {
    const norm = normalizePhoneNumber(senderPhone);
    const formattedPhone = formatDisplayPhone(senderPhone);
    const hasValidPushName = pushName && pushName !== `+${senderPhone}` && !pushName.startsWith(norm.digits);
    const displayName = hasValidPushName ? pushName : formattedPhone;
    const firstName = extractFirstName(displayName);
    
    // Look for existing conversation by full phone or matching last 10 digits
    for (const [id, conv] of realWhatsAppConversations.entries()) {
      const convNorm = normalizePhoneNumber(conv.patient_phone);
      if (
        conv.patient_phone.replace(/\D/g, "") === norm.full ||
        convNorm.core10 === norm.core10 ||
        conv.patient_phone.includes(norm.core10) ||
        conv.id === `wa-${norm.full}` ||
        conv.id === `wa-${norm.digits}`
      ) {
        if (hasValidPushName && (!conv.patient_name || conv.patient_name.startsWith("+") || conv.patient_name.startsWith("Paciente "))) {
          conv.patient_name = pushName;
          conv.patient_first_name = extractFirstName(pushName);
        }
        if (avatarUrl && !conv.patient_avatar) {
          conv.patient_avatar = avatarUrl;
        }
        return conv;
      }
    }

    const convId = `wa-${norm.full}`;
    const newConv: RealWhatsAppConversation = {
      id: convId,
      patient_name: displayName,
      patient_first_name: firstName,
      patient_phone: formattedPhone,
      patient_avatar: avatarUrl || undefined,
      unread_count: 0,
      ai_handled: true,
      last_message: "",
      last_timestamp: new Date().toISOString(),
      messages: []
    };
    realWhatsAppConversations.set(convId, newConv);
    return newConv;
  };

  // Helper to extract message text from any WhatsApp Baileys / Evolution payload
  const extractEvolutionMessageText = (msgObj: any): string => {
    if (!msgObj) return "";
    if (typeof msgObj === "string") return msgObj.trim();

    // Direct properties
    if (typeof msgObj.body === "string" && msgObj.body.trim()) return msgObj.body.trim();
    if (typeof msgObj.text === "string" && msgObj.text.trim()) return msgObj.text.trim();
    if (typeof msgObj.content === "string" && msgObj.content.trim()) return msgObj.content.trim();
    if (typeof msgObj.messageText === "string" && msgObj.messageText.trim()) return msgObj.messageText.trim();

    // Nested message payload (Baileys)
    const msg = msgObj.message || msgObj.data?.message || msgObj.data || msgObj.msg || msgObj;
    if (typeof msg === "string") return msg.trim();
    if (!msg || typeof msg !== "object") return "";

    // Drill down ephemeral, view once, or edited wrappers
    const inner = msg.ephemeralMessage?.message ||
      msg.viewOnceMessage?.message ||
      msg.viewOnceMessageV2?.message ||
      msg.documentWithCaptionMessage?.message ||
      msg.editedMessage?.message?.protocolMessage?.editedMessage ||
      msg.protocolMessage?.editedMessage ||
      msg;

    if (inner.audioMessage) return "[Nota de voz]";
    if (inner.imageMessage && !inner.imageMessage.caption) return "[Imagen]";
    if (inner.videoMessage && !inner.videoMessage.caption) return "[Video]";
    if (inner.documentMessage && !inner.documentMessage.caption) return inner.documentMessage.fileName || "[Documento]";

    return (
      inner.conversation ||
      inner.extendedTextMessage?.text ||
      inner.imageMessage?.caption ||
      inner.videoMessage?.caption ||
      inner.documentMessage?.caption ||
      inner.buttonsResponseMessage?.selectedDisplayText ||
      inner.buttonsResponseMessage?.selectedButtonId ||
      inner.templateButtonReplyMessage?.selectedDisplayText ||
      inner.templateButtonReplyMessage?.selectedId ||
      inner.listResponseMessage?.singleSelectReply?.selectedRowId ||
      inner.listResponseMessage?.title ||
      inner.interactiveResponseMessage?.body?.text ||
      inner.text ||
      inner.body ||
      msg.text ||
      msg.body ||
      ""
    ).trim();
  };

  // Helper to process any raw message or chat item into realWhatsAppConversations
  const processIncomingOrSyncedMessage = async (item: any, options?: {
    targetUrl?: string;
    targetKey?: string;
    targetInstance?: string;
    services?: any[];
    availability?: any[];
    existingAppointments?: any[];
    autoReplyIfPatient?: boolean;
  }) => {
    if (!item) return null;

    const fromMe = Boolean(item.key?.fromMe ?? item.fromMe);
    const remoteJid = item.key?.remoteJid || item.remoteJid || item.jid || item.id || "";
    
    // Ignore status broadcasts, group chats, newsletters
    if (!remoteJid || remoteJid.includes("status@broadcast") || remoteJid.includes("@g.us") || remoteJid.includes("@newsletter")) {
      return null;
    }

    const senderPhone = remoteJid.replace(/@.*$/, "").replace(/\D/g, "");
    if (!senderPhone || senderPhone.length < 6) return null;

    const text = extractEvolutionMessageText(item);
    if (!text) return null;

    const timestampSec = item.messageTimestamp ? Number(item.messageTimestamp) : Math.floor(Date.now() / 1000);
    const msgTimeMs = timestampSec * 1000;

    // Filter out messages that are older than instanceConnectedAt ONLY if instanceConnectedAt is set and msgTimeMs is clearly before it (allow up to 60s tolerance)
    if (instanceConnectedAt && msgTimeMs > 0 && msgTimeMs < (instanceConnectedAt - 60000)) {
      return null;
    }

    const pushName = item.pushName || item.name || item.verifiedName || `+${senderPhone}`;
    const avatarUrl = item.profilePicUrl || item.pictureUrl || item.profilePictureUrl || item.avatarUrl || undefined;
    const timeStr = new Date(timestampSec * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const msgId = item.key?.id || item.id || `msg-${Date.now()}-${Math.random()}`;
    const conv = findOrCreateConversation(senderPhone, pushName, avatarUrl);

    // Asynchronously fetch profile picture from Evolution API if not cached yet
    if (!conv.patient_avatar && options?.targetUrl && options?.targetKey && options?.targetInstance) {
      fetch(`${options.targetUrl}/chat/fetchProfilePictureUrl/${options.targetInstance}`, {
        method: "POST",
        headers: {
          "apikey": options.targetKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ number: senderPhone })
      }).then(async (res) => {
        if (res.ok) {
          const picData = await res.json();
          const foundPic = picData?.profilePictureUrl || picData?.picture || picData?.profilePicUrl;
          if (foundPic && typeof foundPic === 'string' && foundPic.startsWith('http')) {
            conv.patient_avatar = foundPic;
          }
        }
      }).catch(() => {});
    }

    // Check if message already exists
    const exists = conv.messages.some(m => m.id === msgId || (m.content === text && m.role === (fromMe ? 'assistant' : 'user')));
    if (!exists) {
      const newMsg: RealWhatsAppMessage = {
        id: msgId,
        role: fromMe ? 'assistant' : 'user',
        content: text,
        timestamp: timeStr,
        status: 'read'
      };
      conv.messages.push(newMsg);
      if (!fromMe) conv.unread_count += 1;
      conv.last_message = text;
      conv.last_timestamp = new Date(timestampSec * 1000).toISOString();

      // STRICT SAFETY: ONLY auto-reply if explicitly allowed (live webhook ONLY, NEVER during sync/polling)
      // AND message is fresh (less than 90 seconds old)
      const nowSec = Math.floor(Date.now() / 1000);
      const isFreshMessage = Math.abs(nowSec - timestampSec) < 90;

      if (!fromMe && options?.autoReplyIfPatient && isFreshMessage) {
        const isBotActive = cachedPracticeSettings.bot_enabled !== false && conv.ai_handled !== false;
        if (isBotActive) {
          try {
            console.log(`[WhatsApp Bot] Generating auto-reply for incoming live message from ${conv.patient_name} (${senderPhone}): "${text}"`);
            const botResult = await generateAiBotResponse({
              message: text,
              history: conv.messages.slice(-10),
              practiceSettings: cachedPracticeSettings,
              services: options.services || [],
              availability: options.availability || [],
              existingAppointments: options.existingAppointments || []
            });

            if (botResult && botResult.reply && options.targetUrl && options.targetKey && options.targetInstance) {
              const cleanSendPhone = senderPhone.startsWith("54") ? senderPhone : (senderPhone.length === 10 ? `549${senderPhone}` : senderPhone);

              await fetch(`${options.targetUrl}/message/sendText/${options.targetInstance}`, {
                method: "POST",
                headers: {
                  "apikey": options.targetKey,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  number: cleanSendPhone,
                  text: botResult.reply,
                  textMessage: { text: botResult.reply },
                  options: { delay: 1000, presence: "composing" },
                  delay: 1000
                })
              }).catch(err => console.error("Error sending auto-reply:", err));

              const assistantMsg: RealWhatsAppMessage = {
                id: `bot-msg-${Date.now()}`,
                role: 'assistant',
                content: botResult.reply,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'sent',
                actionTaken: botResult.action
              };

              conv.messages.push(assistantMsg);
              conv.last_message = botResult.reply;
              conv.last_timestamp = new Date().toISOString();
            }
          } catch (botErr) {
            console.error("Bot auto-reply error:", botErr);
          }
        }
      }
    }

    return conv;
  };

  // Helper to configure Webhook on Evolution API for any instance
  const configureEvolutionWebhook = async (params: {
    targetUrl: string;
    targetKey: string;
    targetInstance: string;
    appUrl?: string;
  }) => {
    const { targetUrl, targetKey, targetInstance, appUrl } = params;
    if (!targetUrl || !targetKey || !targetInstance) return { success: false, error: "Missing parameters" };

    const webhookUrl = `${(appUrl || "").replace(/\/$/, "")}/api/evolution/webhook`;
    if (!webhookUrl || webhookUrl.startsWith("/api")) {
      return { success: false, error: "Invalid public app URL" };
    }

    const eventsList = [
      "MESSAGES_UPSERT",
      "MESSAGES_UPDATE",
      "MESSAGES_DELETE",
      "SEND_MESSAGE",
      "CONNECTION_UPDATE",
      "messages.upsert",
      "messages.update",
      "messages.delete",
      "send.message",
      "connection.update"
    ];

    try {
      // Send both v1 and v2 payload format to support all Evolution API releases
      const res = await fetch(`${targetUrl}/webhook/set/${targetInstance}`, {
        method: "POST",
        headers: {
          "apikey": targetKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: webhookUrl,
          enabled: true,
          webhook_by_events: false,
          events: eventsList,
          webhook: {
            url: webhookUrl,
            enabled: true,
            byEvents: false,
            base64: false,
            events: eventsList
          }
        })
      });

      const data = await res.json().catch(() => ({}));
      console.log(`[Evolution API] Webhook configured for ${targetInstance} -> ${webhookUrl}. Status: ${res.status}`);
      return { success: res.ok, data, webhookUrl };
    } catch (err: any) {
      console.warn(`[Evolution API] Error configuring webhook for ${targetInstance}:`, err);
      return { success: false, error: err.message };
    }
  };

  // Dedicated endpoint to set or re-sync Webhook
  app.post("/api/evolution/configure-webhook", async (req, res) => {
    try {
      const { apiUrl, apiKey, instanceName, appUrl } = req.body;
      const targetUrl = (apiUrl || lastKnownEvolutionConfig.apiUrl || cachedPracticeSettings.evolution_api_url || process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
      const targetKey = apiKey || lastKnownEvolutionConfig.apiKey || cachedPracticeSettings.evolution_api_key || process.env.EVOLUTION_API_KEY || "";
      const targetInstance = (instanceName || lastKnownEvolutionConfig.instanceName || cachedPracticeSettings.evolution_instance_name || process.env.EVOLUTION_INSTANCE_NAME || "consultorio").trim();

      const resolvedAppUrl = (
        appUrl ||
        req.headers.origin ||
        (req.headers["x-forwarded-host"] ? `${req.headers["x-forwarded-proto"] || "https"}://${req.headers["x-forwarded-host"]}` : "") ||
        process.env.APP_URL ||
        ""
      ).replace(/\/$/, "");

      const result = await configureEvolutionWebhook({
        targetUrl,
        targetKey,
        targetInstance,
        appUrl: resolvedAppUrl
      });

      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Active Sync: Query Evolution API directly for recent messages & trigger bot reply if pending
  app.post("/api/evolution/sync-chats", async (req, res) => {
    try {
      const { apiUrl, apiKey, instanceName, practiceSettings, services, availability, existingAppointments, appUrl } = req.body;
      const targetUrl = (apiUrl || lastKnownEvolutionConfig.apiUrl || cachedPracticeSettings.evolution_api_url || process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
      const targetKey = apiKey || lastKnownEvolutionConfig.apiKey || cachedPracticeSettings.evolution_api_key || process.env.EVOLUTION_API_KEY || "";
      const targetInstance = (instanceName || lastKnownEvolutionConfig.instanceName || cachedPracticeSettings.evolution_instance_name || process.env.EVOLUTION_INSTANCE_NAME || "consultorio").trim();

      if (apiUrl) lastKnownEvolutionConfig.apiUrl = targetUrl;
      if (apiKey) lastKnownEvolutionConfig.apiKey = targetKey;
      if (instanceName) lastKnownEvolutionConfig.instanceName = targetInstance;
      if (practiceSettings) {
        cachedPracticeSettings = { ...cachedPracticeSettings, ...practiceSettings };
      }

      if (!targetUrl || !targetKey) {
        const list = Array.from(realWhatsAppConversations.values()).sort((a, b) => {
          const timeA = a.last_timestamp ? new Date(a.last_timestamp).getTime() : 0;
          const timeB = b.last_timestamp ? new Date(b.last_timestamp).getTime() : 0;
          return timeB - timeA;
        });
        return res.json({ success: true, conversations: list, note: "Evolution API credentials not set" });
      }

      // 1. Ensure webhook is registered
      const resolvedAppUrl = (
        appUrl ||
        req.headers.origin ||
        (req.headers["x-forwarded-host"] ? `${req.headers["x-forwarded-proto"] || "https"}://${req.headers["x-forwarded-host"]}` : "") ||
        ""
      ).replace(/\/$/, "");

      if (resolvedAppUrl && !resolvedAppUrl.includes("localhost")) {
        configureEvolutionWebhook({
          targetUrl,
          targetKey,
          targetInstance,
          appUrl: resolvedAppUrl
        }).catch(() => {});
      }

      // 2. Proactive Sync: Query recent messages and active threads from Evolution API
      const syncOptions = {
        targetUrl,
        targetKey,
        targetInstance,
        services: services || [],
        availability: availability || [],
        existingAppointments: existingAppointments || [],
        autoReplyIfPatient: false // DO NOT auto-reply during sync polling
      };

      // Query recent messages directly (this guarantees only people who actually sent/received messages appear)
      try {
        let msgRes = await fetch(`${targetUrl}/chat/findMessages/${targetInstance}`, {
          method: "POST",
          headers: { "apikey": targetKey, "Content-Type": "application/json" },
          body: JSON.stringify({})
        });
        if (!msgRes.ok) {
          msgRes = await fetch(`${targetUrl}/chat/findMessages/${targetInstance}`, {
            method: "GET",
            headers: { "apikey": targetKey }
          });
        }

        if (msgRes.ok) {
          const msgData = await msgRes.json();
          const messagesArray = Array.isArray(msgData) ? msgData : (Array.isArray(msgData?.data) ? msgData.data : (Array.isArray(msgData?.messages) ? msgData.messages : (Array.isArray(msgData?.records) ? msgData.records : [])));
          for (const item of messagesArray) {
            await processIncomingOrSyncedMessage(item, syncOptions);
          }
        }
      } catch (msgErr) {
        // non-blocking
      }

      // Check for any active real WhatsApp conversations that have at least one message
      const list = Array.from(realWhatsAppConversations.values())
        .filter(c => c.messages && c.messages.length > 0)
        .sort((a, b) => {
          const timeA = a.last_timestamp ? new Date(a.last_timestamp).getTime() : 0;
          const timeB = b.last_timestamp ? new Date(b.last_timestamp).getTime() : 0;
          return timeB - timeA;
        });

      return res.json({
        success: true,
        conversations: list,
        totalRealConversations: list.length
      });
    } catch (err: any) {
      console.error("Error in /api/evolution/sync-chats:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Clear all real WhatsApp conversations from server in-memory store
  app.post("/api/evolution/clear-chats", (req, res) => {
    try {
      realWhatsAppConversations.clear();
      instanceConnectedAt = Date.now();
      console.log(`[Evolution API] Cleared all WhatsApp chats. instanceConnectedAt set to ${new Date(instanceConnectedAt).toISOString()}`);
      return res.json({
        success: true,
        message: "Lista de chats vaciada exitosamente. A partir de ahora sólo se registrarán y atenderán los mensajes nuevos que ingresen."
      });
    } catch (err: any) {
      console.error("Error in /api/evolution/clear-chats:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Get real WhatsApp conversations list from in-memory store
  app.get("/api/evolution/conversations", (req, res) => {
    const list = Array.from(realWhatsAppConversations.values()).sort((a, b) => {
      const timeA = a.last_timestamp ? new Date(a.last_timestamp).getTime() : 0;
      const timeB = b.last_timestamp ? new Date(b.last_timestamp).getTime() : 0;
      return timeB - timeA;
    });
    res.json({ conversations: list });
  });

  // Send human message from staff in real WhatsApp conversation
  app.post("/api/evolution/conversations/:id/send", async (req, res) => {
    try {
      const { id } = req.params;
      const { text, apiUrl, apiKey, instanceName } = req.body;
      const conv = realWhatsAppConversations.get(id) || Array.from(realWhatsAppConversations.values()).find(c => c.id === id || c.patient_phone.includes(id.replace(/\D/g, "")));
      if (!conv) {
        return res.status(404).json({ error: "Conversación no encontrada" });
      }

      const targetUrl = (apiUrl || lastKnownEvolutionConfig.apiUrl || cachedPracticeSettings.evolution_api_url || process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
      const targetKey = apiKey || lastKnownEvolutionConfig.apiKey || cachedPracticeSettings.evolution_api_key || process.env.EVOLUTION_API_KEY || "";
      const targetInstance = (instanceName || lastKnownEvolutionConfig.instanceName || cachedPracticeSettings.evolution_instance_name || process.env.EVOLUTION_INSTANCE_NAME || "consultorio").trim();
      
      const rawDigits = conv.patient_phone.replace(/\D/g, "");
      // Format number for WhatsApp / Evolution API
      // If it's an Argentine number (e.g. 3425526816 -> 5493425526816, or 54342... -> 549342...)
      let cleanPhone = rawDigits;
      if (rawDigits.length === 10) {
        cleanPhone = `549${rawDigits}`;
      } else if (rawDigits.startsWith("54") && rawDigits.length === 12 && !rawDigits.startsWith("549")) {
        cleanPhone = `549${rawDigits.slice(2)}`;
      }

      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newMsg: RealWhatsAppMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: text,
        timestamp: nowTime,
        status: 'sent'
      };

      conv.messages.push(newMsg);
      conv.last_message = text;
      conv.last_timestamp = new Date().toISOString();

      let apiResponse = null;
      if (targetUrl && targetKey) {
        try {
          console.log(`[Evolution API] Dispatching manual message to ${cleanPhone} on instance ${targetInstance}: "${text}"`);
          const evoRes = await fetch(`${targetUrl}/message/sendText/${targetInstance}`, {
            method: "POST",
            headers: {
              "apikey": targetKey,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              number: cleanPhone,
              text: text,
              textMessage: { text: text },
              options: { delay: 500, presence: "composing" },
              delay: 500
            })
          });
          
          apiResponse = await evoRes.json().catch(() => ({}));
          console.log(`[Evolution API] Send message result status: ${evoRes.status}`, apiResponse);
          
          if (!evoRes.ok) {
            // Fallback attempt without the 9 prefix (e.g., 543425526816 instead of 5493425526816) if Baileys expects standard international format
            if (cleanPhone.startsWith("549")) {
              const fallbackPhone = `54${cleanPhone.slice(3)}`;
              console.log(`[Evolution API] Retrying send to fallback number ${fallbackPhone}`);
              await fetch(`${targetUrl}/message/sendText/${targetInstance}`, {
                method: "POST",
                headers: {
                  "apikey": targetKey,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  number: fallbackPhone,
                  text: text,
                  textMessage: { text: text },
                  options: { delay: 500, presence: "composing" },
                  delay: 500
                })
              }).catch(() => {});
            }
          }
        } catch (fetchErr) {
          console.error("Error dispatching manual message to Evolution API:", fetchErr);
        }
      }

      return res.json({ success: true, message: newMsg, apiResponse });
    } catch (err: any) {
      console.error("Error in /api/evolution/conversations/:id/send:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get or Generate QR Code for an Instance
  app.post("/api/evolution/instance-qr", async (req, res) => {
    try {
      const { instanceName, apiUrl, apiKey, practiceSettings, appUrl } = req.body;
      const targetUrl = (apiUrl || lastKnownEvolutionConfig.apiUrl || process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
      const targetKey = apiKey || lastKnownEvolutionConfig.apiKey || process.env.EVOLUTION_API_KEY || "";
      const targetInstance = (instanceName || lastKnownEvolutionConfig.instanceName || process.env.EVOLUTION_INSTANCE_NAME || "consultorio").trim();

      if (apiUrl) lastKnownEvolutionConfig.apiUrl = targetUrl;
      if (apiKey) lastKnownEvolutionConfig.apiKey = targetKey;
      if (instanceName) lastKnownEvolutionConfig.instanceName = targetInstance;
      if (practiceSettings) {
        cachedPracticeSettings = { ...cachedPracticeSettings, ...practiceSettings };
      }

      if (!targetUrl || !targetKey) {
        return res.json({
          success: false,
          status: "not_configured",
          message: "Evolution API aún no ha sido configurada. El administrador debe guardar la URL y Global API Key en 'SuperAdmin > Configuración de APIs'."
        });
      }

      const resolvedAppUrl = (
        appUrl ||
        req.headers.origin ||
        (req.headers["x-forwarded-host"] ? `${req.headers["x-forwarded-proto"] || "https"}://${req.headers["x-forwarded-host"]}` : "") ||
        ""
      ).replace(/\/$/, "");

      // Check current connection state
      try {
        const checkRes = await fetch(`${targetUrl}/instance/connectionState/${targetInstance}`, {
          headers: { "apikey": targetKey }
        });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          const currentState = checkData?.instance?.state || checkData?.state || "unknown";
          if (currentState === "open") {
            if (resolvedAppUrl) {
              configureEvolutionWebhook({ targetUrl, targetKey, targetInstance, appUrl: resolvedAppUrl }).catch(() => {});
            }
            return res.json({
              success: true,
              status: "connected",
              connected: true,
              instanceName: targetInstance
            });
          }
        }
      } catch (checkErr) {
        console.warn("Error checking connection state:", checkErr);
      }

      // 1. Request QR code via /instance/connect/:instance
      let connectRes = await fetch(`${targetUrl}/instance/connect/${targetInstance}`, {
        method: "GET",
        headers: { "apikey": targetKey }
      });

      // 2. If instance doesn't exist (404), create the instance in Evolution API
      if (connectRes.status === 404) {
        const createRes = await fetch(`${targetUrl}/instance/create`, {
          method: "POST",
          headers: {
            "apikey": targetKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            instanceName: targetInstance,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS"
          })
        });

        const createData = await createRes.json();
        if (resolvedAppUrl) {
          configureEvolutionWebhook({ targetUrl, targetKey, targetInstance, appUrl: resolvedAppUrl }).catch(() => {});
        }

        let qrString = createData?.qrcode?.base64 || createData?.base64 || createData?.instance?.qrcode?.base64 || createData?.qrcode?.code || null;

        if (!qrString) {
          const retryConnect = await fetch(`${targetUrl}/instance/connect/${targetInstance}`, {
            method: "GET",
            headers: { "apikey": targetKey }
          });
          if (retryConnect.ok) {
            const retryData = await retryConnect.json();
            qrString = retryData?.base64 || retryData?.qrcode?.base64 || retryData?.code || null;
          }
        }

        return res.json({
          success: true,
          status: "connecting",
          instanceName: targetInstance,
          qrcode: qrString,
          pairingCode: createData?.pairingCode || null,
          message: qrString ? undefined : "Instancia creada en Evolution API. Haz clic en Actualizar QR."
        });
      }

      const connectData = await connectRes.json();
      if (resolvedAppUrl) {
        configureEvolutionWebhook({ targetUrl, targetKey, targetInstance, appUrl: resolvedAppUrl }).catch(() => {});
      }

      let qrString = connectData?.base64 || connectData?.qrcode?.base64 || connectData?.code || connectData?.instance?.qrcode?.base64 || null;

      return res.json({
        success: true,
        status: "connecting",
        instanceName: targetInstance,
        qrcode: qrString,
        code: connectData?.code || null,
        pairingCode: connectData?.pairingCode || null,
        message: qrString ? undefined : "Esperando generación del código QR por parte de Evolution API."
      });
    } catch (err: any) {
      console.error("Error in /api/evolution/instance-qr:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Error al obtener código QR de Evolution API"
      });
    }
  });

  // Disconnect / Logout WhatsApp instance
  app.post("/api/evolution/disconnect-instance", async (req, res) => {
    try {
      const { instanceName, apiUrl, apiKey } = req.body;
      const targetUrl = (apiUrl || lastKnownEvolutionConfig.apiUrl || process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
      const targetKey = apiKey || lastKnownEvolutionConfig.apiKey || process.env.EVOLUTION_API_KEY || "";
      const targetInstance = (instanceName || lastKnownEvolutionConfig.instanceName || process.env.EVOLUTION_INSTANCE_NAME || "consultorio").trim();

      if (targetUrl && targetKey) {
        await fetch(`${targetUrl}/instance/logout/${targetInstance}`, {
          method: "DELETE",
          headers: { "apikey": targetKey }
        });
      }

      return res.json({ success: true, status: "disconnected" });
    } catch (err: any) {
      console.error("Error in /api/evolution/disconnect-instance:", err);
      res.json({ success: true, status: "disconnected" });
    }
  });

  // Send WhatsApp message via Evolution API
  app.post("/api/evolution/send-message", async (req, res) => {
    try {
      const { phone, text, apiUrl, apiKey, instanceName } = req.body;
      const targetUrl = (apiUrl || lastKnownEvolutionConfig.apiUrl || process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
      const targetKey = apiKey || lastKnownEvolutionConfig.apiKey || process.env.EVOLUTION_API_KEY || "";
      const targetInstance = instanceName || lastKnownEvolutionConfig.instanceName || process.env.EVOLUTION_INSTANCE_NAME || "consultorio";

      if (!phone || !text) {
        return res.status(400).json({ error: "Número y texto son obligatorios" });
      }

      const cleanPhone = phone.replace(/\D/g, "");

      if (!targetUrl || !targetKey) {
        return res.json({
          success: true,
          simulated: true,
          message: `Mensaje simulado enviado a ${cleanPhone}: "${text.slice(0, 40)}..."`,
          note: "Configure EVOLUTION_API_URL y EVOLUTION_API_KEY para envíos reales por WhatsApp."
        });
      }

      const response = await fetch(`${targetUrl}/message/sendText/${targetInstance}`, {
        method: "POST",
        headers: {
          "apikey": targetKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          number: cleanPhone,
          text: text,
          delay: 1200
        })
      });

      const data = await response.json();
      return res.json({
        success: response.ok,
        data
      });
    } catch (err: any) {
      console.error("Error in /api/evolution/send-message:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Incoming Webhook from Evolution API
  app.post("/api/evolution/webhook", async (req, res) => {
    try {
      const eventData = req.body;
      const eventType = (eventData?.event || eventData?.type || "").toLowerCase();
      console.log(`[Evolution Webhook] Received event: "${eventType}"`);

      // Extract all potential message items from event payload
      const msgList: any[] = [];
      if (Array.isArray(eventData?.data)) {
        msgList.push(...eventData.data);
      } else if (Array.isArray(eventData?.data?.messages)) {
        msgList.push(...eventData.data.messages);
      } else if (Array.isArray(eventData?.messages)) {
        msgList.push(...eventData.messages);
      } else if (eventData?.data && (eventData.data.key || eventData.data.message)) {
        msgList.push(eventData.data);
      } else if (eventData?.key && (eventData.message || eventData.body)) {
        msgList.push(eventData);
      } else if (eventData?.message) {
        msgList.push(eventData);
      }

      const syncOptions = {
        targetUrl: lastKnownEvolutionConfig.apiUrl || cachedPracticeSettings.evolution_api_url || process.env.EVOLUTION_API_URL || "",
        targetKey: lastKnownEvolutionConfig.apiKey || cachedPracticeSettings.evolution_api_key || process.env.EVOLUTION_API_KEY || "",
        targetInstance: (lastKnownEvolutionConfig.instanceName || cachedPracticeSettings.evolution_instance_name || process.env.EVOLUTION_INSTANCE_NAME || "consultorio").trim(),
        autoReplyIfPatient: true
      };

      for (const msgObj of msgList) {
        await processIncomingOrSyncedMessage(msgObj, syncOptions);
      }

      return res.status(200).json({ received: true });
    } catch (err: any) {
      console.error("[Evolution Webhook] Handler error:", err);
      return res.status(200).json({ received: false, error: err.message });
    }
  });

  // ==========================================
  // MERCADO PAGO API (Deposit & Payment Checkout)
  // ==========================================

  // Helper to dynamically get application base URL for callbacks & webhooks
  const getAppBaseUrl = (req: express.Request): string => {
    const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
    if (origin && !origin.includes("localhost:3000")) {
      return origin.replace(/\/$/, "");
    }
    const host = req.headers.host;
    if (host && !host.includes("localhost:3000")) {
      const proto = req.headers["x-forwarded-proto"] || "https";
      return `${proto}://${host}`.replace(/\/$/, "");
    }
    return (process.env.APP_URL || "https://agenfacil.com").replace(/\/$/, "");
  };

  // Create Checkout Preference for Deposit / Seña or Full Appointment Payment
  app.post("/api/mercadopago/create-preference", async (req, res) => {
    try {
      const {
        title = "Consulta Médica",
        price = 5000,
        amount,
        appointmentId,
        patientName = "Paciente",
        patientEmail = "paciente@email.com",
        patientPhone = "",
        accessToken
      } = req.body;

      const finalAmount = Number(amount !== undefined ? amount : price);
      const token = accessToken || process.env.MERCADOPAGO_ACCESS_TOKEN;
      const appUrl = getAppBaseUrl(req);
      const aptId = appointmentId || `apt-${Date.now()}`;

      if (!token) {
        // Fallback simulation link for testing and instant preview
        return res.json({
          success: true,
          simulated: true,
          init_point: `${appUrl}/#payment-success?apt=${aptId}&amount=${finalAmount}&status=approved`,
          sandbox_init_point: `${appUrl}/#payment-success?apt=${aptId}&amount=${finalAmount}&status=approved`,
          preferenceId: `pref-demo-${Date.now()}`,
          message: "Preferencia generada en modo desarrollo/simulación con retorno automático."
        });
      }

      const preferenceData = {
        items: [
          {
            id: aptId,
            title: title,
            quantity: 1,
            unit_price: finalAmount,
            currency_id: "ARS"
          }
        ],
        payer: {
          name: patientName,
          email: patientEmail || "paciente@consultorio.com",
          phone: patientPhone ? { number: patientPhone.replace(/\D/g, "") } : undefined
        },
        back_urls: {
          success: `${appUrl}/#payment-success?apt=${aptId}&status=approved`,
          pending: `${appUrl}/#payment-pending?apt=${aptId}&status=pending`,
          failure: `${appUrl}/#payment-failure?apt=${aptId}&status=failure`
        },
        auto_return: "approved",
        external_reference: aptId,
        statement_descriptor: "AGENFACIL",
        notification_url: `${appUrl}/api/mercadopago/webhook`
      };

      const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(preferenceData)
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: data?.message || "Error al crear la preferencia en Mercado Pago"
        });
      }

      return res.json({
        success: true,
        init_point: data.init_point,
        sandbox_init_point: data.sandbox_init_point,
        preferenceId: data.id
      });
    } catch (err: any) {
      console.error("Error in /api/mercadopago/create-preference:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Mercado Pago Subscription / Preapproval for SaaS Plans
  app.post("/api/mercadopago/create-subscription", async (req, res) => {
    try {
      const {
        planId = "pro",
        planName = "Plan Pro AI",
        billingCycle = "monthly",
        amount = 49000,
        currency = "ARS",
        payerEmail = "gonzalocorat@gmail.com",
        accessToken
      } = req.body;

      const appUrl = getAppBaseUrl(req);
      const effectiveToken = accessToken || process.env.MERCADOPAGO_ACCESS_TOKEN;
      const orderId = `mp_sub_${planId}_${Date.now()}`;
      const backUrl = `${appUrl}/#mercadopago-success?plan=${planId}&cycle=${billingCycle}&order=${orderId}&status=PAID`;

      if (!effectiveToken) {
        return res.json({
          success: true,
          simulated: true,
          orderId,
          init_point: `${appUrl}/#mercadopago-checkout-simulate?plan=${planId}&cycle=${billingCycle}&amount=${amount}&currency=${currency}&order=${orderId}&email=${encodeURIComponent(payerEmail)}`,
          message: "Modo simulado activo. Conecta tus credenciales de Mercado Pago en Super Admin para cobro real en producción."
        });
      }

      // Try creating recurring preapproval (subscription)
      const subPayload = {
        reason: `Suscripción ${planName} (${billingCycle === 'annual' ? 'Anual' : 'Mensual'}) - Agenfacil`,
        auto_recurring: {
          frequency: billingCycle === 'annual' ? 12 : 1,
          frequency_type: "months",
          transaction_amount: Number(amount),
          currency_id: currency
        },
        back_url: backUrl,
        payer_email: payerEmail
      };

      const mpResponse = await fetch("https://api.mercadopago.com/preapproval", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${effectiveToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(subPayload)
      });

      const data = await mpResponse.json();

      if (mpResponse.ok && data.init_point) {
        return res.json({
          success: true,
          init_point: data.init_point,
          preapproval_id: data.id,
          orderId
        });
      }

      // Fallback to standard preference if preapproval fails (e.g., test accounts)
      const prefPayload = {
        items: [
          {
            id: `plan_${planId}`,
            title: `Suscripción ${planName} - Agenfacil`,
            unit_price: Number(amount),
            quantity: 1,
            currency_id: currency
          }
        ],
        payer: {
          email: payerEmail
        },
        back_urls: {
          success: backUrl,
          failure: `${appUrl}/#subscription-plans`,
          pending: backUrl
        },
        auto_return: "approved"
      };

      const prefRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${effectiveToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(prefPayload)
      });

      const prefData = await prefRes.json();
      return res.json({
        success: true,
        init_point: prefData.init_point || prefData.sandbox_init_point,
        orderId
      });
    } catch (err: any) {
      console.error("Error in /api/mercadopago/create-subscription:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Mercado Pago IPN / Webhook endpoint
  app.post("/api/mercadopago/webhook", async (req, res) => {
    try {
      const topic = req.query.topic || req.body.type;
      const paymentId = req.query.id || req.body.data?.id;

      console.log(`Mercado Pago notification: topic=${topic}, id=${paymentId}`);

      if ((topic === "payment" || req.body.action === "payment.created") && paymentId) {
        const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
        if (token) {
          const checkRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const paymentInfo = await checkRes.json();
          console.log(`Payment ${paymentId} status: ${paymentInfo.status}, external_ref: ${paymentInfo.external_reference}`);
        }
      }

      return res.status(200).json({ status: "ok" });
    } catch (err: any) {
      console.error("Error in /api/mercadopago/webhook:", err);
      return res.status(200).json({ received: true });
    }
  });

  // ==========================================
  // DLOCAL GO (Checkout Pro Latam & Global)
  // ==========================================

  // Create DLocal Go Checkout Session for Subscriptions or Payments
  app.post("/api/dlocalgo/create-checkout", async (req, res) => {
    try {
      const {
        planId = "pro",
        planName = "Plan Pro AI",
        billingCycle = "monthly",
        amount = 49000,
        currency = "ARS",
        country = "AR",
        userEmail = "gonzalocorat@gmail.com",
        userName = "Usuario Agenfacil",
        apiKey,
        secretKey
      } = req.body;

      const appUrl = getAppBaseUrl(req);
      const effectiveApiKey = apiKey || process.env.DLOCAL_GO_API_KEY;
      const effectiveSecret = secretKey || process.env.DLOCAL_GO_SECRET_KEY;
      const orderId = `order_dlocal_${planId}_${Date.now()}`;

      const successUrl = `${appUrl}/#dlocal-success?plan=${planId}&cycle=${billingCycle}&order=${orderId}&status=PAID`;
      const backUrl = `${appUrl}/#subscription-plans`;
      const notificationUrl = `${appUrl}/api/dlocalgo/webhook`;

      // If no DLocal Go live key is provided, provide Checkout Pro experience with immediate automatic return
      if (!effectiveApiKey) {
        return res.json({
          success: true,
          simulated: true,
          orderId: orderId,
          redirect_url: `${appUrl}/#dlocal-checkout-simulate?plan=${planId}&cycle=${billingCycle}&amount=${amount}&currency=${currency}&order=${orderId}&email=${encodeURIComponent(userEmail)}`,
          success_url: successUrl,
          message: "Sesión de DLocal Go Checkout Pro generada (Modo interactivo/simulación con redirección automática al confirmar)."
        });
      }

      // Call DLocal Go Payments API
      const dlocalPayload = {
        amount: Number(amount),
        currency: currency,
        country: country,
        payment_method_flow: "REDIRECT",
        order_id: orderId,
        description: `Suscripción ${planName} (${billingCycle === 'annual' ? 'Anual' : 'Mensual'}) - Agenfacil`,
        payer: {
          name: userName,
          email: userEmail
        },
        success_url: successUrl,
        back_url: backUrl,
        notification_url: notificationUrl
      };

      const response = await fetch("https://api.dlocalgo.com/v1/payments", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${effectiveApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(dlocalPayload)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("DLocal Go API Error:", data);
        return res.status(response.status).json({
          success: false,
          error: data?.message || data?.error || "Error al generar Checkout con DLocal Go",
          details: data
        });
      }

      return res.json({
        success: true,
        orderId: orderId,
        paymentId: data.id,
        redirect_url: data.redirect_url || data.url,
        status: data.status
      });
    } catch (err: any) {
      console.error("Error in /api/dlocalgo/create-checkout:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Test DLocal Go API Connection
  app.post("/api/dlocalgo/test-connection", async (req, res) => {
    try {
      const { apiKey } = req.body;
      const keyToTest = apiKey || process.env.DLOCAL_GO_API_KEY;

      if (!keyToTest) {
        return res.status(400).json({
          success: false,
          error: "No se proporcionó API Key de DLocal Go."
        });
      }

      // Try fetching account or payments endpoint
      const response = await fetch("https://api.dlocalgo.com/v1/payments?limit=1", {
        headers: {
          "Authorization": `Bearer ${keyToTest}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok || response.status === 200 || response.status === 404) {
        return res.json({
          success: true,
          message: "¡Conexión exitosa con la API de DLocal Go! Credenciales válidas."
        });
      }

      const errData = await response.json().catch(() => ({}));
      return res.json({
        success: false,
        message: errData.message || `DLocal Go respondió con estado ${response.status}. Verifica tus credenciales.`
      });
    } catch (e: any) {
      return res.status(500).json({
        success: false,
        message: e.message || "Error al conectar con DLocal Go."
      });
    }
  });

  // DLocal Go Webhook IPN
  app.post("/api/dlocalgo/webhook", async (req, res) => {
    try {
      console.log("DLocal Go Webhook Notification received:", JSON.stringify(req.body));
      return res.status(200).json({ status: "ok" });
    } catch (err: any) {
      console.error("Error in /api/dlocalgo/webhook:", err);
      return res.status(200).json({ received: true });
    }
  });

  // ==========================================
  // LEMON SQUEEZY (Merchant of Record SaaS)
  // ==========================================

  // Create Lemon Squeezy Checkout Session
  app.post("/api/lemonsqueezy/create-checkout", async (req, res) => {
    try {
      const {
        planId = "pro",
        planName = "Plan Pro AI",
        billingCycle = "monthly",
        amount = 49000,
        currency = "ARS",
        userEmail = "gonzalocorat@gmail.com",
        userName = "Doctor Agenfacil",
        variantId,
        storeId,
        apiKey
      } = req.body;

      const appUrl = getAppBaseUrl(req);
      const effectiveApiKey = apiKey || process.env.LEMONSQUEEZY_API_KEY;
      const effectiveStoreId = storeId || process.env.LEMONSQUEEZY_STORE_ID;
      const effectiveVariantId = variantId || process.env[`LEMONSQUEEZY_VARIANT_${planId.toUpperCase()}`];
      const orderId = `ls_order_${planId}_${Date.now()}`;
      const successUrl = `${appUrl}/#lemon-success?plan=${planId}&cycle=${billingCycle}&order=${orderId}&status=PAID`;

      // If no live credentials provided, provide seamless interactive checkout experience
      if (!effectiveApiKey || !effectiveStoreId || !effectiveVariantId) {
        return res.json({
          success: true,
          simulated: true,
          orderId,
          checkout_url: `${appUrl}/#lemonsqueezy-checkout-simulate?plan=${planId}&cycle=${billingCycle}&amount=${amount}&currency=${currency}&order=${orderId}&email=${encodeURIComponent(userEmail)}`,
          success_url: successUrl,
          message: "Sesión de Lemon Squeezy generada en modo simulación (con redirección automática y confirmación de suscripción)."
        });
      }

      // Call real Lemon Squeezy Checkouts API
      const lsPayload = {
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: userEmail,
              name: userName,
              custom: {
                user_email: userEmail,
                plan_id: planId,
                billing_cycle: billingCycle,
                order_id: orderId
              }
            },
            product_options: {
              redirect_url: successUrl,
              receipt_button_text: "Regresar a Agenfacil"
            }
          },
          relationships: {
            store: {
              data: {
                type: "stores",
                id: String(effectiveStoreId)
              }
            },
            variant: {
              data: {
                type: "variants",
                id: String(effectiveVariantId)
              }
            }
          }
        }
      };

      const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
        method: "POST",
        headers: {
          "Accept": "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json",
          "Authorization": `Bearer ${effectiveApiKey}`
        },
        body: JSON.stringify(lsPayload)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Lemon Squeezy API Error:", data);
        return res.status(response.status).json({
          success: false,
          error: data?.errors?.[0]?.detail || "Error al crear checkout con Lemon Squeezy",
          details: data
        });
      }

      const checkoutUrl = data?.data?.attributes?.url;
      return res.json({
        success: true,
        orderId,
        checkout_url: checkoutUrl,
        data: data.data
      });
    } catch (err: any) {
      console.error("Error in /api/lemonsqueezy/create-checkout:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Test Lemon Squeezy API Connection
  app.post("/api/lemonsqueezy/test-connection", async (req, res) => {
    try {
      const { apiKey } = req.body;
      const keyToTest = apiKey || process.env.LEMONSQUEEZY_API_KEY;

      if (!keyToTest) {
        return res.status(400).json({
          success: false,
          error: "No se proporcionó API Key de Lemon Squeezy."
        });
      }

      const response = await fetch("https://api.lemonsqueezy.com/v1/users/me", {
        headers: {
          "Accept": "application/vnd.api+json",
          "Authorization": `Bearer ${keyToTest}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const userName = data?.data?.attributes?.name || "Usuario de Lemon Squeezy";
        const userEmail = data?.data?.attributes?.email || "";
        return res.json({
          success: true,
          message: `¡Conexión exitosa con Lemon Squeezy! Autenticado como ${userName}${userEmail ? ` (${userEmail})` : ''}.`
        });
      }

      const errData = await response.json().catch(() => ({}));
      const errorMsg = errData?.errors?.[0]?.detail || `Error de autenticación HTTP ${response.status}. Revisa que tu API Key sea correcta.`;
      return res.json({
        success: false,
        message: errorMsg
      });
    } catch (e: any) {
      return res.status(500).json({
        success: false,
        message: e.message || "Error al conectar con Lemon Squeezy."
      });
    }
  });

  // Lemon Squeezy Webhook
  app.post("/api/lemonsqueezy/webhook", async (req, res) => {
    try {
      const eventName = req.headers["x-event-name"] || req.body?.meta?.event_name;
      console.log(`Lemon Squeezy Webhook received [${eventName}]:`, JSON.stringify(req.body));
      return res.status(200).json({ received: true });
    } catch (err: any) {
      console.error("Error in /api/lemonsqueezy/webhook:", err);
      return res.status(200).json({ received: true });
    }
  });

  // ==========================================
  // TRANSACTIONAL EMAIL REMINDERS (Resend / SMTP)
  // ==========================================
  app.post("/api/reminders/send-email", async (req, res) => {
    try {
      const {
        to,
        patientName,
        practiceName,
        date,
        time,
        serviceName,
        modality,
        address,
        meetUrl,
        resendApiKey,
        senderEmail
      } = req.body;

      if (!to) {
        return res.status(400).json({ error: "El email del destinatario es obligatorio" });
      }

      const key = resendApiKey || process.env.RESEND_API_KEY;
      const fromAddress = senderEmail || process.env.EMAIL_FROM || "turnos@resend.dev";

      const htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 24px; color: #171717;">
          <div style="border-bottom: 1px solid #f0f0f0; padding-bottom: 16px; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 18px; color: #0a0a0a; font-weight: 700;">${practiceName || "Agenfacil"}</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #737373;">Recordatorio de turno médico / profesional</p>
          </div>
          
          <p style="font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
            Hola <strong>${patientName}</strong>, te recordamos tu próximo turno:
          </p>

          <div style="background: #fafafa; border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <div style="margin-bottom: 8px; font-size: 13px;"><strong>Tratamiento:</strong> ${serviceName || "Consulta"}</div>
            <div style="margin-bottom: 8px; font-size: 13px;"><strong>Fecha:</strong> ${date}</div>
            <div style="margin-bottom: 8px; font-size: 13px;"><strong>Hora:</strong> ${time} hs</div>
            <div style="margin-bottom: 8px; font-size: 13px;"><strong>Modalidad:</strong> ${modality === "telemedicine" ? "Telemedicina (Videollamada)" : "Presencial en consultorio"}</div>
            ${modality === "telemedicine" && meetUrl ? `<div style="font-size: 13px;"><strong>Enlace de llamada:</strong> <a href="${meetUrl}" style="color: #0284c7;">${meetUrl}</a></div>` : ""}
            ${modality !== "telemedicine" && address ? `<div style="font-size: 13px;"><strong>Dirección:</strong> ${address}</div>` : ""}
          </div>

          <p style="font-size: 13px; color: #525252; line-height: 1.5; margin-bottom: 24px;">
            Por favor, te solicitamos presentarte 10 minutos antes. Si necesitas reprogramar o cancelar, responde a este correo o contáctanos por WhatsApp con al menos 24 hs de anticipación.
          </p>

          <div style="border-top: 1px solid #f0f0f0; padding-top: 16px; font-size: 11px; color: #a3a3a3; text-align: center;">
            Enviado automáticamente por ${practiceName || "Agenfacil"} • Sistema de gestión clínica
          </div>
        </div>
      `;

      if (!key) {
        // Fallback simulation response for demo/preview
        return res.json({
          success: true,
          simulated: true,
          message: `Recordatorio por correo simulado con éxito a ${to}`,
          details: {
            to,
            subject: `Recordatorio de turno: ${date} ${time} hs - ${practiceName || "Consultorio"}`,
            sender: fromAddress
          }
        });
      }

      // Call Resend REST API
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [to],
          subject: `Recordatorio de turno: ${date} ${time} hs - ${practiceName || "Consultorio"}`,
          html: htmlBody
        })
      });

      const resendData = await resendRes.json();
      return res.json({
        success: resendRes.ok,
        data: resendData
      });
    } catch (err: any) {
      console.error("Error in /api/reminders/send-email:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development vs static production serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Agenfacil Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
