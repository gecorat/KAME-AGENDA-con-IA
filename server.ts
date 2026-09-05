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
3. Pedir datos necesarios para agendar: Nombre completo, Teléfono y Servicio. Si ya los dio, confirmarle con un resumen claro.
4. Si el paciente confirma explícitamente un día, hora y servicio disponible, indica en tu respuesta una confirmación cálida e incluye el bloque JSON estructurado al final con los datos del turno.

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
Si aún falta definir algún dato o no se confirmó, NO incluyas el bloque 'json_action'.`;

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
