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

      const ai = getAI();
      const practiceName = practiceSettings.practice_name || "Agenfacil";
      const professionalName = practiceSettings.professional_name || "el profesional a cargo";
      const professionalTitle = practiceSettings.professional_title || "Especialista";
      const isProfessionalIdentity = practiceSettings.bot_identity_mode === 'professional';
      const assistantName = practiceSettings.bot_assistant_name || "Sofía (IA)";
      const botTone = practiceSettings.bot_tone || "cálido, profesional y conciso";
      const modelToUse = practiceSettings.bot_ai_model || "gemini-3.8-flash";
      const customRules = practiceSettings.bot_custom_instructions ? `\n\nREGLAS Y RESTRICCIONES ESPECÍFICAS DEL CONSULTORIO (OBLIGATORIAS):\n${practiceSettings.bot_custom_instructions}` : "";

      // Features enabled
      const featPricing = practiceSettings.bot_feature_pricing ?? true;
      const featBooking = practiceSettings.bot_feature_booking ?? true;
      const featLocation = practiceSettings.bot_feature_location ?? true;
      const featDeposit = practiceSettings.bot_feature_deposit_info ?? true;
      const featHandoff = practiceSettings.bot_feature_human_handoff ?? true;

      // Services context
      const servicesList = services.length > 0
        ? services.map((s: any) => `- ${s.name}: $${s.price || 0} (${s.duration_minutes || 30} min) - ${s.description || "Sin descripción"}`).join("\n")
        : "- Consulta General: $15.000 (30 min)";

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

      const botReq = practiceSettings.bot_required_fields || {
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
        botReq.phone ? "- Número de WhatsApp / Celular (con código de país ej +54 9 y código de área)" : null,
        botReq.dni ? "- DNI o documento de identidad (obligatorio para la ficha médica)" : null,
        botReq.email ? "- Correo electrónico" : null,
        botReq.insurance ? "- Obra social o Prepaga (o indicar Particular)" : null,
        botReq.reason ? "- Motivo de consulta o afección" : null,
        botReq.address ? "- Domicilio o localidad de residencia" : null,
      ].filter(Boolean).join("\n");

      let identityPrompt = "";
      if (isProfessionalIdentity) {
        identityPrompt = `Eres ${professionalName} (${professionalTitle}), el profesional a cargo de "${practiceName}".
Respondes directamente tú en primera persona a tus pacientes con trato cercano y profesional.
Tu tono es ${botTone}. Respondes en español rioplatense o neutro claro, natural, humano y empático, con emojis sutiles, de forma conversacional y concisa como en WhatsApp.`;
      } else {
        identityPrompt = `Eres ${assistantName}, la asistente virtual inteligente de "${practiceName}" del profesional ${professionalName}.
Tu tono es ${botTone}. Respondes en español rioplatense o neutro claro, natural, humano y empático, con emojis sutiles, de forma conversacional y concisa como en WhatsApp.`;
      }

      const systemInstruction = `${identityPrompt}

Fecha y hora actual del consultorio: ${todayString}.
Dirección del consultorio: ${practiceSettings.address || "Consultorio céntrico"}, ${practiceSettings.city || "Ciudad"}.
Teléfono de contacto: ${practiceSettings.phone || practiceSettings.whatsapp_number || ""}.

INFORMACIÓN DEL CONSULTORIO:
Servicios y aranceles:
${featPricing ? servicesList : "Informar que los aranceles se coordinan en la consulta presencial."}

Horarios de atención habituales:
${scheduleList}

Turnos ya reservados (NO disponibles):
${bookedList}
${customRules}

OBJETIVOS Y FUNCIONES HABILITADAS:
1. Responder preguntas sobre servicios${featPricing ? ", precios" : ""}, duración y ubicación.
2. ${featBooking ? "Ayudar al paciente a elegir un horario disponible según los huecos libres y horarios de atención." : "Informar los horarios de atención y pedirle que aguarde confirmación del equipo."}
3. DATOS OBLIGATORIOS QUE DEBES PEDIR Y RECOLECTAR ANTES DE CONFIRMAR LA CITA:
${requiredFieldsDescriptions || "- Nombre y Apellido\n- Teléfono"}
No cierres ni confirmes la reserva hasta que el paciente te haya proporcionado TODOS estos datos obligatorios. Si falta alguno, pídeselo con amabilidad y naturalidad.
4. ${featDeposit && practiceSettings.patient_deposit_alias ? `Si el paciente desea señar su turno o pregunta por pagos, puedes informarle que la seña se realiza al Alias: ${practiceSettings.patient_deposit_alias}.` : ""}
5. ${featHandoff ? "Si el paciente solicita hablar con una persona real o tiene un reclamo complejo, dile amablemente que dejas su mensaje registrado para que el equipo humano lo contacte a la brevedad." : ""}
6. ${featBooking ? "Si el paciente confirma explícitamente un día, hora y servicio disponible, y ya te proporcionó los datos obligatorios solicitados, indícale una confirmación cálida con el resumen y emite el bloque JSON estructurado al final con tag 'json_action'." : ""}

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
Si aún falta definir algún dato obligatorio o no se confirmó, NO incluyas el bloque 'json_action'.` : ""}`;

      if (ai) {
        // Prepare conversation
        const conversationText = history
          .slice(-10)
          .map((m: any) => `${m.role === "user" ? "Paciente" : (isProfessionalIdentity ? professionalName : "Asistente")}: ${m.content}`)
          .join("\n");

        const fullPrompt = `${systemInstruction}\n\n=== HISTORIAL DE LA CONVERSACIÓN ===\n${conversationText}\n\nPaciente: ${message}\n${isProfessionalIdentity ? professionalName : "Asistente"}:`;

        const response = await ai.models.generateContent({
          model: modelToUse,
          contents: fullPrompt,
        });

        const replyRaw = response.text || "¡Hola! ¿En qué te puedo ayudar hoy con tus turnos?";

        // Check if there is a json_action in the reply
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

        // Bot human-like response delay pacing (e.g. 10s, 15s, 30s)
        const delaySeconds = Math.min(Math.max(Number(practiceSettings.bot_response_delay_seconds) || 0, 0), 60);
        if (delaySeconds > 0) {
          await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
        }

        return res.json({
          reply: cleanReply,
          action: actionData,
          aiPowered: true
        });
      } else {
        // Fallback intelligent heuristic if GEMINI_API_KEY is not configured yet
        const lower = message.toLowerCase();
        let reply = "";
        let actionData: any = null;

        if (lower.includes("precio") || lower.includes("cuanto") || lower.includes("arancel") || lower.includes("costo")) {
          reply = `¡Hola! Con gusto. Aquí tienes nuestros servicios y aranceles actuales:\n\n${services.map((s: any) => `• *${s.name}*: $${s.price?.toLocaleString()} (${s.duration_minutes} min)`).join("\n")}\n\n¿Te gustaría que te reserve un turno para alguno de ellos? 😊`;
        } else if (lower.includes("horario") || lower.includes("atienden") || lower.includes("dias")) {
          reply = `Atendemos de lunes a viernes en los siguientes rangos:\n• Mañanas: 09:00 a 13:00\n• Tardes: 14:00 a 18:30\n\n¿Qué día te quedaría más cómodo acercarte?`;
        } else if (lower.includes("turno") || lower.includes("agendar") || lower.includes("reservar") || lower.includes("cita")) {
          const firstService = services[0]?.name || "Consulta General";
          reply = `¡Claro que sí! Para coordinar tu turno para *${firstService}*, ¿prefieres un horario por la mañana o por la tarde? Y por favor indícame tu nombre completo.`;
        } else {
          reply = `¡Hola! Soy la asistente virtual de ${practiceName}. Puedo ayudarte a consultar aranceles, horarios disponibles o agendar y reprogramar turnos fácilmente. ¿En qué te puedo asesorar hoy? ✨`;
        }

        const delaySeconds = Math.min(Math.max(Number(practiceSettings.bot_response_delay_seconds) || 0, 0), 60);
        if (delaySeconds > 0) {
          await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
        }

        return res.json({
          reply,
          action: actionData,
          aiPowered: false,
          note: "Configure GEMINI_API_KEY en los secretos para activar la inteligencia generativa completa."
        });
      }
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
      const targetInstance = instanceName || process.env.EVOLUTION_INSTANCE_NAME || "consultorio";

      if (!targetUrl || !targetKey) {
        return res.status(400).json({
          success: false,
          error: "Falta la URL de Evolution API o la API Key (global/instance)",
          status: "disconnected"
        });
      }

      const response = await fetch(`${targetUrl}/instance/connectionState/${targetInstance}`, {
        method: "GET",
        headers: {
          "apikey": targetKey,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const errText = await response.text();
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

  // Get or Generate QR Code for a Doctor's Instance (Used by regular doctors without seeing API keys)
  app.post("/api/evolution/instance-qr", async (req, res) => {
    try {
      const { instanceName } = req.body;
      const targetUrl = (process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
      const targetKey = process.env.EVOLUTION_API_KEY || "";
      const targetInstance = instanceName || process.env.EVOLUTION_INSTANCE_NAME || "consultorio";

      if (!targetUrl || !targetKey) {
        // Master APIs not configured in .env yet -> Return simulated QR response for immediate testing
        return res.json({
          success: true,
          simulated: true,
          status: "connecting",
          instanceName: targetInstance,
          qrcode: null,
          message: "Modo simulación activo. El administrador (gonzalocorat@gmail.com) puede configurar EVOLUTION_API_URL y EVOLUTION_API_KEY en el servidor para generar QRs de WhatsApp en vivo."
        });
      }

      // Check current connection state
      const checkRes = await fetch(`${targetUrl}/instance/connectionState/${targetInstance}`, {
        headers: { "apikey": targetKey }
      });

      if (checkRes.ok) {
        const checkData = await checkRes.json();
        const state = checkData?.instance?.state || checkData?.state;
        if (state === "open") {
          return res.json({
            success: true,
            status: "connected",
            connected: true,
            instanceName: targetInstance
          });
        }
      }

      // Request or create instance connection QR from Evolution API
      let connectRes = await fetch(`${targetUrl}/instance/connect/${targetInstance}`, {
        method: "GET",
        headers: { "apikey": targetKey }
      });

      // If instance doesn't exist, create it first
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
        return res.json({
          success: true,
          status: "connecting",
          instanceName: targetInstance,
          qrcode: createData?.qrcode?.base64 || createData?.base64 || null,
          pairingCode: createData?.pairingCode || null
        });
      }

      const connectData = await connectRes.json();
      return res.json({
        success: true,
        status: "connecting",
        instanceName: targetInstance,
        qrcode: connectData?.base64 || connectData?.qrcode?.base64 || null,
        code: connectData?.code || null,
        pairingCode: connectData?.pairingCode || null
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
      const { instanceName } = req.body;
      const targetUrl = (process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
      const targetKey = process.env.EVOLUTION_API_KEY || "";
      const targetInstance = instanceName || process.env.EVOLUTION_INSTANCE_NAME || "consultorio";

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
      const targetUrl = (apiUrl || process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
      const targetKey = apiKey || process.env.EVOLUTION_API_KEY || "";
      const targetInstance = instanceName || process.env.EVOLUTION_INSTANCE_NAME || "consultorio";

      if (!phone || !text) {
        return res.status(400).json({ error: "Número y texto son obligatorios" });
      }

      // Format phone (remove spaces, symbols)
      const cleanPhone = phone.replace(/\D/g, "");

      if (!targetUrl || !targetKey) {
        // Fallback simulated success for preview
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
      console.log("Evolution Webhook received:", eventData?.event);

      // Evolution API event: messages.upsert
      if (eventData?.event === "messages.upsert" && eventData?.data) {
        const messageData = eventData.data;
        const fromMe = messageData?.key?.fromMe;
        const senderPhone = messageData?.key?.remoteJid?.replace(/@.*$/, "") || "";
        const messageText =
          messageData?.message?.conversation ||
          messageData?.message?.extendedTextMessage?.text ||
          "";

        // If not sent by our bot and has text
        if (!fromMe && messageText && senderPhone) {
          console.log(`Incoming WhatsApp from ${senderPhone}: "${messageText}"`);
          // Note: In full deployment, this webhook triggers getAI() and replies back via /message/sendText
        }
      }

      return res.status(200).json({ received: true });
    } catch (err: any) {
      console.error("Error in /api/evolution/webhook:", err);
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
