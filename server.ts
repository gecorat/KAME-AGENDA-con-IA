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
      const practiceName = practiceSettings.practice_name || "AgendaPro AI";
      const assistantName = practiceSettings.bot_assistant_name || "Asistente Virtual";
      const botTone = practiceSettings.bot_tone || "cálido, profesional y conciso";

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

      const systemInstruction = `Eres ${assistantName}, la asistente virtual inteligente de "${practiceName}".
Tu tono es ${botTone}. Respondes en español rioplatense o neutro claro y amigable, con emojis sutiles, de forma conversacional y concisa como en WhatsApp.

Fecha y hora actual del consultorio: ${todayString}.

INFORMACIÓN DEL CONSULTORIO:
Servicios y aranceles:
${servicesList}

Horarios de atención habituales:
${scheduleList}

Turnos ya reservados (NO disponibles):
${bookedList}

OBJETIVOS:
1. Responder preguntas sobre servicios, precios, duración y cómo reservar.
2. Ayudar al paciente a elegir un horario disponible. Recuerda verificar que el día y horario solicitado esté dentro de los horarios de atención y NO coincida con turnos ya reservados.
3. DATOS OBLIGATORIOS QUE DEBES PEDIR Y RECOLECTAR ANTES DE CONFIRMAR LA CITA:
${requiredFieldsDescriptions}
No cierres ni confirmes la reserva hasta que el paciente te haya proporcionado TODOS estos datos obligatorios. Si falta alguno, pídeselo amablemente.
4. Si el paciente confirma explícitamente un día, hora y servicio disponible, y ya te proporcionó los datos obligatorios solicitados, indícale una confirmación cálida con el resumen y emite el bloque JSON estructurado al final con tag 'json_action'.

FORMATO DE RESPUESTA:
Provee tu mensaje amigable para el paciente.
Si se concreta o confirma una reserva, agrega al final un bloque de código markdown con tag 'json_action':
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
Si aún falta definir algún dato obligatorio o no se confirmó, NO incluyas el bloque 'json_action'.`;

      if (ai) {
        // Prepare conversation
        const conversationText = history
          .slice(-10)
          .map((m: any) => `${m.role === "user" ? "Paciente" : "Asistente"}: ${m.content}`)
          .join("\n");

        const fullPrompt = `${systemInstruction}\n\n=== HISTORIAL DE LA CONVERSACIÓN ===\n${conversationText}\n\nPaciente: ${message}\nAsistente:`;

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
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

      const prompt = `Como asistente de consultorio médico/profesional (${practiceSettings?.practice_name || "AgendaPro"}), sugiere una respuesta rápida, empática y profesional para este mensaje del paciente:
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

  // Create Checkout Preference for Deposit / Seña
  app.post("/api/mercadopago/create-preference", async (req, res) => {
    try {
      const {
        title = "Seña de Consulta Médica",
        price = 5000,
        appointmentId,
        patientName = "Paciente",
        patientEmail = "paciente@email.com",
        accessToken
      } = req.body;

      const token = accessToken || process.env.MERCADOPAGO_ACCESS_TOKEN;
      const appUrl = (process.env.APP_URL || "https://agendapro.ai").replace(/\/$/, "");

      if (!token) {
        // Fallback simulation link for testing
        return res.json({
          success: true,
          simulated: true,
          init_point: `${appUrl}/#demo-mercadopago-success?apt=${appointmentId || "new"}&amount=${price}`,
          preferenceId: `pref-demo-${Date.now()}`,
          message: "Preferencia de pago simulada (agregue MERCADOPAGO_ACCESS_TOKEN para checkout real en vivo)."
        });
      }

      const preferenceData = {
        items: [
          {
            id: appointmentId || `apt-${Date.now()}`,
            title: title,
            quantity: 1,
            unit_price: Number(price),
            currency_id: "ARS"
          }
        ],
        payer: {
          name: patientName,
          email: patientEmail
        },
        back_urls: {
          success: `${appUrl}/#payment-success?apt=${appointmentId}`,
          pending: `${appUrl}/#payment-pending?apt=${appointmentId}`,
          failure: `${appUrl}/#payment-failure?apt=${appointmentId}`
        },
        auto_return: "approved",
        external_reference: appointmentId || `apt-${Date.now()}`,
        statement_descriptor: "AGENDA PRO",
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
            <h2 style="margin: 0; font-size: 18px; color: #0a0a0a; font-weight: 700;">${practiceName || "AgendaPro AI"}</h2>
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
            Enviado automáticamente por ${practiceName || "AgendaPro AI"} • Sistema de gestión clínica
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
    console.log(`AgendaPro AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
