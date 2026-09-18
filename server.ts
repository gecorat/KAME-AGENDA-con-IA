// Safeguard: ensure relative __dirname '.' introduced by tsx runtime does not break ESM loaders (like vite-plugin-pwa)
if (typeof globalThis !== "undefined" && (globalThis as any).__dirname === ".") {
  delete (globalThis as any).__dirname;
}
if (typeof global !== "undefined" && (global as any).__dirname === ".") {
  delete (global as any).__dirname;
}

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Ensure Argentina timezone is enforced across the entire Node backend environment
process.env.TZ = "America/Argentina/Buenos_Aires";

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
  status: 'sent' | 'delivered' | 'read' | 'failed';
  actionTaken?: any;
}

export interface RealWhatsAppConversation {
  id: string;
  patient_name: string;
  patient_first_name?: string;
  patient_phone: string;
  patient_avatar?: string;
  remote_jid?: string;
  needs_human?: boolean;
  bot_paused_until?: number;
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

// ============================================================================
// CONTEXTO REAL DEL NEGOCIO (servicios, horarios y turnos ya tomados).
// El front lo envia en cada /api/evolution/sync-chats. El bot SOLO responde si
// este contexto existe y esta fresco: sin agenda real preferimos no contestar
// antes que inventar precios u horarios.
// ============================================================================
// Ultimo intento de registro del webhook, para poder diagnosticarlo desde fuera.
let lastWebhookResult: any = null;

// ============================================================================
// PERSISTENCIA EN FIRESTORE (REST)
// Hasta ahora las conversaciones vivian solo en memoria: cada reinicio o
// republicacion vaciaba la bandeja. Aca hablamos con Firestore directamente
// desde el servidor, firmando un token con la cuenta de servicio.
// Si no hay credencial cargada, todo sigue funcionando en memoria como antes.
// ============================================================================
const FIREBASE_PROJECT_ID = "gen-lang-client-0700931315";
const FIREBASE_DATABASE_ID = "ai-studio-kameagendaia-7c97d798-89c9-4a66-bba0-fd548dfaf219";
const CONVERSACIONES_COLECCION = "whatsapp_conversations";

let serviceAccount: any = null;
try {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || "";
  if (raw.trim()) {
    serviceAccount = JSON.parse(raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
  }
} catch (err) {
  console.error("[Firestore] FIREBASE_SERVICE_ACCOUNT no es un JSON valido:", (err as any)?.message);
}

const hayPersistencia = () => Boolean(serviceAccount?.client_email && serviceAccount?.private_key);

let tokenCache: { token: string; exp: number } | null = null;

const obtenerTokenFirestore = async (): Promise<string | null> => {
  if (!hayPersistencia()) return null;
  const ahora = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.exp - 60 > ahora) return tokenCache.token;

  try {
    const crypto = await import("crypto");
    const header = { alg: "RS256", typ: "JWT" };
    const claim = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp: ahora + 3600,
      iat: ahora
    };
    const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const sinFirma = `${b64(header)}.${b64(claim)}`;
    const firma = crypto.createSign("RSA-SHA256").update(sinFirma).sign(serviceAccount.private_key, "base64url");
    const jwt = `${sinFirma}.${firma}`;

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt
      }).toString()
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
      console.error("[Firestore] No se pudo obtener el token:", res.status, JSON.stringify(data).slice(0, 200));
      return null;
    }
    tokenCache = { token: data.access_token, exp: ahora + (data.expires_in || 3600) };
    return tokenCache.token;
  } catch (err: any) {
    console.error("[Firestore] Error firmando el token:", err?.message || err);
    return null;
  }
};

const baseFirestoreUrl = () =>
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIREBASE_DATABASE_ID}/documents`;

// Conversion de valores JS al formato de campos de Firestore.
const aValorFirestore = (v: any): any => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(aValorFirestore) } };
  if (typeof v === "object") {
    const fields: any = {};
    for (const k of Object.keys(v)) fields[k] = aValorFirestore(v[k]);
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
};

const guardarDocumento = async (coleccion: string, docId: string, datos: any): Promise<boolean> => {
  const token = await obtenerTokenFirestore();
  if (!token) return false;
  try {
    const fields: any = {};
    for (const k of Object.keys(datos)) fields[k] = aValorFirestore(datos[k]);
    const res = await fetch(`${baseFirestoreUrl()}/${coleccion}/${encodeURIComponent(docId)}`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error(`[Firestore] Error guardando ${coleccion}/${docId}: ${res.status} ${t.slice(0, 200)}`);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error("[Firestore] Error de red guardando documento:", err?.message || err);
    return false;
  }
};

// PATCH con updateMask: toca SOLO los campos indicados. Sin la mascara,
// Firestore borra todo lo que no se envie.
const actualizarCampos = async (coleccion: string, docId: string, campos: any): Promise<boolean> => {
  const token = await obtenerTokenFirestore();
  if (!token) return false;
  try {
    const claves = Object.keys(campos);
    if (claves.length === 0) return true;
    const mask = claves.map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
    const fields: any = {};
    for (const k of claves) fields[k] = aValorFirestore(campos[k]);
    const res = await fetch(`${baseFirestoreUrl()}/${coleccion}/${encodeURIComponent(docId)}?${mask}`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error(`[Firestore] Error actualizando ${coleccion}/${docId}: ${res.status} ${t.slice(0, 200)}`);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error("[Firestore] Error de red actualizando campos:", err?.message || err);
    return false;
  }
};

const crearDocumento = async (coleccion: string, datos: any): Promise<string | null> => {
  const token = await obtenerTokenFirestore();
  if (!token) return null;
  try {
    const fields: any = {};
    for (const k of Object.keys(datos)) fields[k] = aValorFirestore(datos[k]);
    const res = await fetch(`${baseFirestoreUrl()}/${coleccion}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[Firestore] Error creando en ${coleccion}: ${res.status} ${JSON.stringify(data).slice(0, 200)}`);
      return null;
    }
    return String(data?.name || "").split("/").pop() || null;
  } catch (err: any) {
    console.error("[Firestore] Error de red creando documento:", err?.message || err);
    return null;
  }
};

const borrarDocumento = async (coleccion: string, docId: string): Promise<boolean> => {
  const token = await obtenerTokenFirestore();
  if (!token) return false;
  try {
    const res = await fetch(`${baseFirestoreUrl()}/${coleccion}/${encodeURIComponent(docId)}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    return res.ok;
  } catch {
    return false;
  }
};

// Conversion inversa: de campos de Firestore a valores JS.
const deValorFirestore = (v: any): any => {
  if (!v || typeof v !== "object") return v;
  if ("nullValue" in v) return null;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("timestampValue" in v) return v.timestampValue;
  if ("stringValue" in v) return v.stringValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(deValorFirestore);
  if ("mapValue" in v) {
    const o: any = {};
    const f = v.mapValue.fields || {};
    for (const k of Object.keys(f)) o[k] = deValorFirestore(f[k]);
    return o;
  }
  return null;
};

const leerDocumento = async (coleccion: string, docId: string): Promise<any | null> => {
  const token = await obtenerTokenFirestore();
  if (!token) return null;
  try {
    const res = await fetch(`${baseFirestoreUrl()}/${coleccion}/${encodeURIComponent(docId)}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const data: any = await res.json().catch(() => ({}));
    const out: any = {};
    for (const k of Object.keys(data.fields || {})) out[k] = deValorFirestore(data.fields[k]);
    return out;
  } catch {
    return null;
  }
};

const listarColeccion = async (coleccion: string, limite = 300): Promise<any[]> => {
  const token = await obtenerTokenFirestore();
  if (!token) return [];
  try {
    const res = await fetch(`${baseFirestoreUrl()}/${coleccion}?pageSize=${limite}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const data: any = await res.json().catch(() => ({}));
    return (data.documents || []).map((d: any) => {
      const out: any = { id: String(d.name || "").split("/").pop() };
      for (const k of Object.keys(d.fields || {})) out[k] = deValorFirestore(d.fields[k]);
      return out;
    });
  } catch {
    return [];
  }
};

// ---------------------------------------------------------------------------
// El servidor ya no depende de que alguien tenga la app abierta: lee la
// configuracion y la agenda de la base al arrancar y cada pocos minutos.
// Antes, tras cada reinicio, la configuracion quedaba vacia y el bot no
// respondia aunque estuviera activo en Ajustes.
// ---------------------------------------------------------------------------
const RUNTIME_DOC = "bot_runtime";

const guardarContextoEnBase = async () => {
  if (!hayPersistencia()) return;
  await guardarDocumento("settings", RUNTIME_DOC, {
    services: JSON.stringify(businessContext.services || []),
    availability: JSON.stringify(businessContext.availability || []),
    updated_at: new Date().toISOString()
  });
};

// ============================================================================
// RECORDATORIOS AUTOMATICOS (24 h y 2 h antes del turno)
// Reglas:
//  - Si el turno se reservo con menos anticipacion que el recordatorio, ese
//    recordatorio no se manda (reservar 3 h antes no dispara el de 24 h).
//  - Cada recordatorio se manda una sola vez: queda marcado en el turno.
//  - Si el servidor estuvo caido, se recupera mientras la ventana siga vigente.
// ============================================================================
const REMINDER_DOC = "reminder_config";
const HORA_MS = 60 * 60 * 1000;

// Anticipacion minima con la que tiene que estar reservado el turno para que
// cada aviso tenga sentido. Si alguien reserva 3 h antes ya recibio el mensaje
// de confirmacion: mandarle un "recordatorio" al rato es spam.
const MINIMO_PARA_24H = 30 * HORA_MS;
const MINIMO_PARA_2H = 6 * HORA_MS;

// Canales habilitados segun el plan contratado. Se valida en el servidor: si
// solo se ocultara el boton en la interfaz, cualquiera lo saltea.
const canalesDelPlan = (): { whatsapp: boolean; email: boolean } => {
  const plan = String(cachedPracticeSettings.subscription_plan || "trial").toLowerCase();
  if (plan === "pro") return { whatsapp: true, email: true };
  return { whatsapp: false, email: true }; // trial y basic: solo correo
};

let reminderConfig: any = null;

const guardarReminderConfig = async (cfg: any) => {
  if (!hayPersistencia() || !cfg) return;
  await guardarDocumento("settings", REMINDER_DOC, {
    config: JSON.stringify(cfg),
    updated_at: new Date().toISOString()
  });
};

const aplicarPlantilla = (texto: string, datos: Record<string, string>) =>
  String(texto || "").replace(/\{(\w+)\}/g, (_, clave) => datos[clave] ?? "");

const datosDelTurno = (turno: any, config?: any) => {
  const cfg = config || cachedPracticeSettings || {};
  const inicio = new Date(turno.start_datetime);
  const fecha = inicio.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" });
  const hora = inicio.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });
  return {
    paciente: turno.patient_name || "",
    profesional: cfg.professional_name || cfg.practice_name || "el profesional",
    consultorio: cfg.practice_name || "el consultorio",
    servicio: turno.service_name || "",
    fecha,
    hora,
    direccion: cfg.address || "",
    ciudad: cfg.city || "",
    whatsapp: cfg.whatsapp_number || ""
  };
};

const enviarEmailRecordatorio = async (para: string, asunto: string, cuerpo: string): Promise<boolean> => {
  const key = cachedPracticeSettings.resend_api_key || process.env.RESEND_API_KEY;
  const remitente = cachedPracticeSettings.sender_email || process.env.EMAIL_FROM;
  if (!key || !para || !remitente) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: remitente,
        to: [para],
        subject: asunto,
        html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:14px;line-height:1.6;color:#171717;white-space:pre-wrap;">${cuerpo}</div>`
      })
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error(`[Recordatorios] Resend rechazo el envio (${res.status}): ${t.slice(0, 200)}`);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error("[Recordatorios] Error enviando email:", err?.message || err);
    return false;
  }
};

const registrarEnvioRecordatorio = async (turno: any, canal: string, momento: string, estado: string, vistaPrevia: string) => {
  await crearDocumento("reminder_logs", {
    appointment_id: turno.id || "",
    patient_name: turno.patient_name || "",
    patient_phone: turno.patient_phone || "",
    patient_email: turno.patient_email || "",
    channel: canal,
    timing: momento,
    status: estado,
    sent_at: new Date().toISOString(),
    appointment_datetime: turno.start_datetime || "",
    service_name: turno.service_name || "",
    message_preview: String(vistaPrevia || "").slice(0, 160)
  });
};

const enviarRecordatorio = async (turno: any, momento: "24h" | "2h") => {
  let cfg = reminderConfig || {};
  let cfgPractice: any = {};
  if (turno.owner_id) {
    try {
      const docRem = await leerDocumento("settings", "reminder_config_" + turno.owner_id);
      cfgPractice = (await leerDocumento("settings", "practice_config_" + turno.owner_id)) || {};
      if (docRem?.config) {
        try { cfg = { ...cfg, ...JSON.parse(docRem.config) }; } catch {}
      } else if (docRem) {
        cfg = { ...cfg, ...docRem };
      }
      if (cfgPractice) {
        cfg = { ...cfg, ...cfgPractice };
      }
    } catch {}
  }
  const datos = datosDelTurno(turno, cfgPractice);
  const marca = momento === "24h" ? "reminder_24h_sent_at" : "reminder_2h_sent_at";
  let algunoSalio = false;

  const plan = canalesDelPlan();

  // WhatsApp (solo plan pro)
  const telLimpio = String(turno.patient_phone || "").replace(/\D/g, "");
  if (plan.whatsapp && cfg.whatsapp_enabled !== false && telLimpio.length >= 10) {
    const plantilla = momento === "24h" ? cfg.whatsapp_template_24h : cfg.whatsapp_template_2h;
    const texto = aplicarPlantilla(plantilla || "", datos);
    if (texto.trim()) {
      const targetUrl = (lastKnownEvolutionConfig.apiUrl || cfgPractice.evolution_api_url || process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
      const targetKey = lastKnownEvolutionConfig.apiKey || cfgPractice.evolution_api_key || process.env.EVOLUTION_API_KEY || "";
      const targetInstance = (String(cfgPractice.evolution_instance_name || cfg.evolution_instance_name || "").trim() || lastKnownEvolutionConfig.instanceName || process.env.EVOLUTION_INSTANCE_NAME || "").trim();
      const r = await sendEvolutionText({ targetUrl, targetKey, targetInstance, to: telLimpio, text: texto });
      algunoSalio = algunoSalio || r.ok;
      await registrarEnvioRecordatorio(turno, "whatsapp", momento, r.ok ? "sent" : "failed", texto);
      console.log(`[Recordatorios] ${momento} WhatsApp a ${turno.patient_name}: ${r.ok ? "enviado" : "fallo"}`);
    }
  } else if (plan.whatsapp && cfg.whatsapp_enabled !== false && turno.patient_phone && telLimpio.length < 10) {
    console.warn(`[Recordatorios] ${momento} WhatsApp omitido para ${turno.patient_name}: telefono incompleto ("${turno.patient_phone}")`);
  }

  // Email (todos los planes)
  if (plan.email && cfg.email_enabled !== false && turno.patient_email) {
    const asunto = aplicarPlantilla(momento === "24h" ? cfg.email_subject_24h : cfg.email_subject_2h, datos);
    const cuerpo = aplicarPlantilla(momento === "24h" ? cfg.email_body_24h : cfg.email_body_2h, datos);
    if (cuerpo.trim()) {
      const ok = await enviarEmailRecordatorio(turno.patient_email, asunto || "Recordatorio de turno", cuerpo);
      algunoSalio = algunoSalio || ok;
      await registrarEnvioRecordatorio(turno, "email", momento, ok ? "sent" : "failed", cuerpo);
      console.log(`[Recordatorios] ${momento} email a ${turno.patient_email}: ${ok ? "enviado" : "fallo"}`);
    }
  }

  // Marcamos aunque haya fallado: evita reintentos infinitos cada 5 minutos.
  // El fallo queda registrado en reminder_logs para que puedas verlo.
  await actualizarCampos("appointments", turno.id, { [marca]: new Date().toISOString() });
  return algunoSalio;
};

// Encuesta de Satisfacción Post-Consulta (NPS automatizado)
const enviarEncuestaSatisfaccion = async (turno: any): Promise<boolean> => {
  if (!turno || !turno.id) return false;
  let cfgPractice: any = {};
  if (turno.owner_id) {
    try {
      cfgPractice = (await leerDocumento("settings", "practice_config_" + turno.owner_id)) || {};
    } catch {}
  }
  const datos = datosDelTurno(turno, cfgPractice);
  const nombre = datos.paciente || "Paciente";
  const profesional = datos.profesional || "el profesional";
  const servicio = datos.servicio || "tu consulta";
  
  const texto = `¡Hola ${nombre}! Esperamos que hayas tenido una excelente atención en tu consulta de ${servicio} con ${profesional}. 😊\n\n¿Cómo calificarías tu experiencia del 1 al 5? ⭐\n(Podés respondernos con un número del 1 al 5 o dejarnos cualquier comentario que nos ayude a seguir mejorando). ¡Muchas gracias!`;

  let salio = false;
  const telLimpio = String(turno.patient_phone || "").replace(/\D/g, "");
  if (telLimpio.length >= 10) {
    const targetUrl = (lastKnownEvolutionConfig.apiUrl || cfgPractice.evolution_api_url || process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
    const targetKey = lastKnownEvolutionConfig.apiKey || cfgPractice.evolution_api_key || process.env.EVOLUTION_API_KEY || "";
    const targetInstance = (String(cfgPractice.evolution_instance_name || "").trim() || lastKnownEvolutionConfig.instanceName || process.env.EVOLUTION_INSTANCE_NAME || "").trim();
    if (targetUrl && targetKey && targetInstance) {
      const r = await sendEvolutionText({ targetUrl, targetKey, targetInstance, to: telLimpio, text: texto });
      salio = r.ok;
      console.log(`[Encuestas NPS] Encuesta enviada por WhatsApp a ${nombre}: ${r.ok ? "enviada" : "fallo"}`);
    }
  } else if (turno.patient_phone) {
    console.warn(`[Encuestas NPS] Encuesta omitida para ${nombre}: telefono incompleto ("${turno.patient_phone}")`);
  }

  await actualizarCampos("appointments", turno.id, {
    satisfaction_survey_sent_at: new Date().toISOString()
  });
  return salio;
};

const procesarRecordatorios = async () => {
  if (!hayPersistencia()) return;
  const cfg = reminderConfig;
  if (!cfg) return;
  if (cfg.whatsapp_enabled === false && cfg.email_enabled === false) return;

  try {
    const turnos = await listarColeccion("appointments", 500);
    const ahora = Date.now();

    for (const t of turnos) {
      if (!t.id || !t.start_datetime) continue;
      const inicio = new Date(t.start_datetime).getTime();
      if (isNaN(inicio) || inicio <= ahora) continue;

      const estado = String(t.status || "").toLowerCase();
      if (estado.includes("cancel")) continue;
      // Un turno que todavia espera que el profesional lo confirme NO genera
      // recordatorios: el paciente recibiria un aviso de algo que no esta cerrado.
      if (estado === "pending" || estado.includes("pendiente de confirmacion")) continue;

      const restante = inicio - ahora;
      const creado = new Date(t.created_at || 0).getTime();
      // Sin fecha de alta asumimos que se reservo con mucha anticipacion.
      const anticipacion = (!creado || isNaN(creado)) ? Infinity : inicio - creado;

      // 24 h: solo si se reservo con mas de 24 h (+ margen) de anticipacion.
      if (
        cfg.send_24h_before !== false &&
        !t.reminder_24h_sent_at &&
        restante <= 24 * HORA_MS &&
        restante > 2 * HORA_MS &&
        anticipacion >= MINIMO_PARA_24H
      ) {
        await enviarRecordatorio(t, "24h");
        continue; // no mandamos los dos juntos en la misma pasada
      }

      // 2 h: solo si se reservo con mas de 2 h (+ margen) de anticipacion.
      if (
        cfg.send_2h_before !== false &&
        !t.reminder_2h_sent_at &&
        restante <= 2 * HORA_MS &&
        restante > 0 &&
        anticipacion >= MINIMO_PARA_2H
      ) {
        await enviarRecordatorio(t, "2h");
      }
    }
  } catch (err: any) {
    console.error("[Recordatorios] Error procesando:", err?.message || err);
  }
};

// La configuracion dejo de vivir en un unico "practice_config": desde la
// migracion a multicuenta cada profesional tiene el suyo. El servidor seguia
// leyendo el viejo, asi que al reiniciarse arrancaba sin la configuracion real:
// sin la personalidad del bot, sin los tiempos de respuesta, con los textos de
// recordatorio por defecto y, por precaucion, con el bot sin responder.
const configDeLaCuentaDelBot = async (): Promise<any | null> => {
  try {
    // Sin atajos ni dependencias de otras funciones: leemos la coleccion y nos
    // quedamos con el documento de configuracion de la cuenta.
    const docs = (await listarColeccion("settings", 300))
      .filter((d: any) => String(d.id || "").startsWith("practice_config_"));
    if (!docs.length) {
      console.error("[Config] No hay ningun documento de configuracion de cuenta en la base.");
      return null;
    }
    if (docs.length === 1) return docs[0];

    const porEnv = process.env.EVOLUTION_OWNER_UID
      ? docs.find((d: any) => String(d.id) === "practice_config_" + process.env.EVOLUTION_OWNER_UID)
      : null;
    if (porEnv) return porEnv;

    const instancia = String(lastKnownEvolutionConfig.instanceName || "").toLowerCase().trim();
    const porInstancia = instancia
      ? docs.find((d: any) => [d.evolution_instance_name, d.evolution_instance, d.whatsapp_instance]
          .some((x: any) => String(x || "").toLowerCase().trim() === instancia))
      : null;
    if (porInstancia) return porInstancia;

    console.error("[Config] Hay " + docs.length + " cuentas y ninguna declara su instancia de WhatsApp: no se cual es la del bot.");
    return null;
  } catch (err: any) {
    console.error("[Config] No pude leer la configuracion de la cuenta: " + (err?.message || err));
    return null;
  }
};

// Los turnos ya no piden confirmacion al paciente. Las plantillas viejas que la
// pedian se reemplazan solas: el profesional no tiene que apretar nada.
const PLANTILLA_24H = "¡Hola {paciente}! Te recordamos tu turno de *{servicio}* para mañana *{fecha}* a las *{hora} hs* con {profesional} en {direccion}.\n\n¡Te esperamos! Si necesitás hacer alguna modificación o consulta previa, avisame por acá. 😊";
const PLANTILLA_2H = "¡Hola {paciente}! Te recordamos que tu turno de *{servicio}* es hoy a las *{hora} hs* con {profesional} en {direccion}.\n\n¡Te esperamos! Si necesitás hacer alguna modificación o consulta previa, avisame por acá. 😊";

const pedeConfirmacion = (texto: any) =>
  typeof texto === "string" &&
  /\{link_confirmar\}|responde \*?1\*?|Para confirmar tu asistencia|confirmar tu asistencia/i.test(texto);

const migrarPlantillasViejas = async () => {
  if (!reminderConfig) return;
  let cambio = false;
  if (!reminderConfig.whatsapp_template_24h || pedeConfirmacion(reminderConfig.whatsapp_template_24h)) {
    reminderConfig.whatsapp_template_24h = PLANTILLA_24H;
    cambio = true;
  }
  if (!reminderConfig.whatsapp_template_2h || pedeConfirmacion(reminderConfig.whatsapp_template_2h)) {
    reminderConfig.whatsapp_template_2h = PLANTILLA_2H;
    cambio = true;
  }
  if (reminderConfig.require_confirmation) {
    reminderConfig.require_confirmation = false;
    cambio = true;
  }
  if (cambio) {
    console.log("[Recordatorios] Plantillas actualizadas: ya no piden confirmacion al paciente.");
    await guardarReminderConfig(reminderConfig).catch(() => {});
  }
};

// El navegador manda su configuracion por varias vias. Ninguna puede prender ni
// apagar el bot: eso lo decide la base. Un navegador con datos viejos dejaba el
// bot mudo sin que nadie se enterara.
let ultimaCargaConfig = 0;

const fusionarSettingsDelFront = (settings: any) => {
  if (!settings || typeof settings !== "object") return;
  const { bot_enabled, ...resto } = settings;
  cachedPracticeSettings = { ...cachedPracticeSettings, ...resto };
};

const cargarConfigDesdeBase = async () => {
  if (!hayPersistencia()) return;
  try {
    const config = await leerDocumento("settings", "practice_config");
    if (config && Object.keys(config).length > 0) {
      cachedPracticeSettings = { ...cachedPracticeSettings, ...config };
    }

    // La de la cuenta manda sobre la vieja generica.
    const propia = await configDeLaCuentaDelBot();
    if (!propia) console.error("[Config] Arranco sin la configuracion de la cuenta: el bot queda en pausa por precaucion.");
    if (propia && Object.keys(propia).length > 0) {
      cachedPracticeSettings = { ...cachedPracticeSettings, ...propia };
      console.log("[Config] Configuracion de la cuenta cargada: bot_enabled=" + cachedPracticeSettings.bot_enabled);
      // Los horarios viajan en el mismo documento desde que el profesional los guarda.
      try {
        const crudo = (propia as any).availability_json;
        if (typeof crudo === "string" && crudo.trim()) {
          const lista = JSON.parse(crudo);
          if (Array.isArray(lista) && lista.length) {
            businessContext.availability = lista;
            businessContext.updatedAt = Date.now();
          }
        }
      } catch {}
    }

    const rc = await leerDocumento("settings", REMINDER_DOC);
    if (rc?.config) {
      try { reminderConfig = JSON.parse(rc.config); } catch { /* documento corrupto */ }
    }
    await migrarPlantillasViejas();

    const runtime = await leerDocumento("settings", RUNTIME_DOC);
    if (runtime) {
      try {
        const servicios = JSON.parse(runtime.services || "[]");
        const horarios = JSON.parse(runtime.availability || "[]");
        if (Array.isArray(servicios) && servicios.length) businessContext.services = servicios;
        if (Array.isArray(horarios) && horarios.length) businessContext.availability = horarios;
      } catch { /* documento viejo o corrupto */ }
    }

    // Los turnos se leen de la coleccion real, asi el bot nunca ofrece un
    // horario que se ocupo mientras el servidor estaba apagado.
    const turnos = await listarColeccion("appointments", 500);
    if (turnos.length >= 0) {
      const desde = Date.now() - 60 * 60 * 1000;
      businessContext.existingAppointments = turnos.filter((t: any) => {
        const ms = new Date(t.start_datetime || "").getTime();
        return !isNaN(ms) && ms > desde;
      });
    }

    if (businessContext.availability.length > 0) {
      businessContext.updatedAt = Date.now();
    }

    ultimaCargaConfig = Date.now();

    console.log(`[Config] Cargada desde la base: bot_enabled=${cachedPracticeSettings.bot_enabled}, ${businessContext.services.length} servicios, ${businessContext.availability.length} franjas, ${businessContext.existingAppointments.length} turnos futuros.`);
  } catch (err: any) {
    console.error("[Config] Error leyendo la configuracion:", err?.message || err);
  }
};

// ---------------------------------------------------------------------------
// Conversaciones: se guardan como un unico documento por chat, con el contenido
// serializado. Solo las usa el servidor para rehidratarse, asi que no necesitan
// estructura de campos.
// ---------------------------------------------------------------------------
const guardadosPendientes = new Map<string, any>();
let temporizadorGuardado: any = null;

const persistirConversacion = (conv: any) => {
  if (!hayPersistencia() || !conv?.id) return;
  guardadosPendientes.set(conv.id, conv);
  if (temporizadorGuardado) return;
  temporizadorGuardado = setTimeout(async () => {
    const pendientes = Array.from(guardadosPendientes.values());
    guardadosPendientes.clear();
    temporizadorGuardado = null;
    for (const c of pendientes) {
      await guardarDocumento(CONVERSACIONES_COLECCION, c.id, {
        id: c.id,
        patient_phone: c.patient_phone || "",
        patient_name: c.patient_name || "",
        last_timestamp: c.last_timestamp || new Date().toISOString(),
        contenido: JSON.stringify(c)
      });
    }
  }, 2500);
};

// Helper to parse dates in Argentina timezone (-03:00)
const parseArgentinaDate = (dtStr: string): Date => {
  if (!dtStr) return new Date(NaN);
  let s = String(dtStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T00:00:00-03:00`);
  }
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(s)) {
    s = s.replace(' ', 'T');
    if (s.length === 16) s += ':00';
    return new Date(`${s}-03:00`);
  }
  return new Date(s);
};

// ---------------------------------------------------------------------------
// Ficha del paciente: buscamos por telefono para no duplicar. Comparamos los
// ultimos 8 digitos, asi no falla por el 0, el 15 o el +54.
// ---------------------------------------------------------------------------
const soloDigitos = (v: any) => String(v || "").replace(/\D/g, "");

const mismoTelefono = (a: any, b: any) => {
  const x = soloDigitos(a), y = soloDigitos(b);
  if (x.length < 8 || y.length < 8) return false;
  return x.slice(-8) === y.slice(-8);
};

// Que cuenta esta detras de un enlace publico o de una instancia de WhatsApp.
// Vive aca arriba porque lo usan tanto el bot como las rutas publicas.
let cachePerfiles: { cuando: number; docs: any[] } = { cuando: 0, docs: [] };

const settingsDeCuentas = async (): Promise<any[]> => {
  const ahora = Date.now();
  if (ahora - cachePerfiles.cuando < 60000 && cachePerfiles.docs.length) return cachePerfiles.docs;
  const docs = (await listarColeccion("settings", 300)).filter((d: any) => String(d.id || "").startsWith("practice_config_"));
  if (docs.length) cachePerfiles = { cuando: ahora, docs };
  return docs;
};

const normalizarHandle = (h: any) => String(h || "").toLowerCase().trim().replace(/^\/+|\/+$/g, "");

const uidDelDoc = (d: any) => String(d?.id || "").replace("practice_config_", "");

// A que cuenta pertenece una instancia de WhatsApp. Hoy hay una sola conexion,
// pero cuando cada profesional tenga la suya el turno ya cae en su agenda.
const duenoDeLaInstancia = async (instancia?: string): Promise<string | null> => {
  try {
    const buscada = String(instancia || lastKnownEvolutionConfig.instanceName || "").toLowerCase().trim();
    const docs = await settingsDeCuentas();
    if (buscada) {
      const encontrado = docs.find((d: any) =>
        [d.evolution_instance_name, d.evolution_instance, d.whatsapp_instance, d.instance_name]
          .some((x: any) => String(x || "").toLowerCase().trim() === buscada));
      if (encontrado) return uidDelDoc(encontrado);
    }
    if (process.env.EVOLUTION_OWNER_UID) return String(process.env.EVOLUTION_OWNER_UID);
    if (docs.length === 1) return uidDelDoc(docs[0]);
    return null;
  } catch {
    return null;
  }
};

// Un modelo que no existe o esta saturado puede tardar minutos en fallar. El
// paciente ve al bot mudo y despues le contesta un texto generico. Cortamos.
const conLimiteDeTiempo = async <T>(tarea: Promise<T>, ms: number, queEs: string): Promise<T> => {
  let reloj: any = null;
  try {
    return await Promise.race([
      tarea,
      new Promise<T>((_, rechazar) => {
        reloj = setTimeout(() => rechazar(new Error(queEs + " tardo mas de " + Math.round(ms / 1000) + " segundos")), ms);
      })
    ]);
  } finally {
    if (reloj) clearTimeout(reloj);
  }
};

// Contexto de UNA cuenta: sus servicios, sus horarios y sus turnos. Sirve para
// que el bot conteste con la agenda del consultorio que recibio el mensaje.
const cacheContextos: Map<string, { cuando: number; datos: any }> = new Map();

const contextoDeCuenta = async (uid: string): Promise<any | null> => {
  if (!uid || !hayPersistencia()) return null;
  const guardado = cacheContextos.get(uid);
  if (guardado && Date.now() - guardado.cuando < 120000) return guardado.datos;
  try {
    const [config, servicios, turnos] = await Promise.all([
      leerDocumento("settings", "practice_config_" + uid),
      listarColeccion("services", 500),
      listarColeccion("appointments", 500)
    ]);
    if (!config) return null;
    let disponibilidad: any[] = [];
    try {
      const crudo = (config as any).availability_json;
      if (typeof crudo === "string" && crudo.trim()) disponibilidad = JSON.parse(crudo);
    } catch {}
    const ahora = Date.now();
    const datos = {
      config,
      services: servicios.filter((s: any) => String(s.owner_id || "") === uid),
      availability: disponibilidad,
      existingAppointments: turnos.filter((tu: any) => {
        if (String(tu.owner_id || "") !== uid) return false;
        const f = Date.parse(tu.start_datetime || "");
        return Number.isFinite(f) && f > ahora - 86400000;
      }),
      instancia: String((config as any).evolution_instance_name || (config as any).evolution_instance || "").trim()
    };
    cacheContextos.set(uid, { cuando: ahora, datos });
    return datos;
  } catch (err: any) {
    console.error("[Bot] No pude cargar el contexto de la cuenta:", err?.message || err);
    return null;
  }
};

// Un mismo numero puede ser de varias personas (una familia comparte telefono).
// La identidad es TELEFONO + NOMBRE, nunca el telefono solo.
const normalizarNombre = (n: any) =>
  String(n || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Todas las fichas de esa cuenta que comparten el numero.
const personasDelTelefono = async (telefono: string, ownerId?: string | null): Promise<any[]> => {
  if (!hayPersistencia() || soloDigitos(telefono).length < 8) return [];
  try {
    const pacientes = await listarColeccion("patients", 500);
    return pacientes.filter((pa: any) => {
      if (!mismoTelefono(pa.phone, telefono)) return false;
      if (ownerId) return String(pa.owner_id || "") === ownerId;
      return true;
    });
  } catch (err: any) {
    console.error("[Pacientes] Error buscando fichas por telefono: " + (err?.message || err));
    return [];
  }
};

// La ficha de ESA persona: mismo numero y mismo nombre. Si el numero ya existe
// pero el nombre es otro, es otra persona y le corresponde su propia ficha.
const buscarPacientePorTelefono = async (
  telefono: string,
  nombre?: string,
  ownerId?: string | null
): Promise<any | null> => {
  const candidatas = await personasDelTelefono(telefono, ownerId);
  if (!candidatas.length) return null;

  const buscado = normalizarNombre(nombre);
  if (!buscado) return candidatas[0];

  const nombreDeFicha = (pa: any) =>
    normalizarNombre(((pa.first_name || "") + " " + (pa.last_name || "")).trim() || pa.name);

  const exacta = candidatas.find((pa: any) => nombreDeFicha(pa) === buscado);
  if (exacta) return exacta;

  // "Juan" contra "Juan Perez": misma persona si uno contiene al otro.
  const parecida = candidatas.find((pa: any) => {
    const ficha = nombreDeFicha(pa);
    if (!ficha) return false;
    return ficha.startsWith(buscado + " ") || buscado.startsWith(ficha + " ");
  });
  if (parecida) return parecida;

  console.log("[Pacientes] El numero ya tiene " + candidatas.length + " ficha(s), pero ninguna es " + nombre + ": creo una nueva.");
  return null;
};

// Crea el turno en la coleccion que lee la app. Devuelve null si no se pudo,
// para que la conversacion quede marcada para revision humana.
const crearTurnoDesdeBot = async (accion: any, conv: any): Promise<{ id: string; detalle: string; start_datetime?: string; status?: string; owner_id?: string } | null> => {
  if (!hayPersistencia()) {
    console.error("[Turnos] Sin credencial de Firestore no se puede crear el turno.");
    return null;
  }
  try {
    const servicios = businessContext.services || [];
    const servicio =
      servicios.find((s: any) => String(s.name || "").toLowerCase() === String(accion.service_name || "").toLowerCase()) ||
      servicios.find((s: any) => String(s.name || "").toLowerCase().includes(String(accion.service_name || "").toLowerCase())) ||
      servicios[0];

    const inicio = parseArgentinaDate(accion.datetime);
    if (isNaN(inicio.getTime())) return null;
    const duracion = Number(servicio?.duration_minutes) > 0 ? Number(servicio.duration_minutes) : 30;
    const fin = new Date(inicio.getTime() + duracion * 60000);

    // De quien es este turno. Sin esto quedaba sin dueño y, con el filtro por
    // cuenta activo, no aparecia en la agenda de nadie.
    const duenoTurno = await duenoDeLaInstancia(conv?.instancia || conv?.instanceName);
    if (!duenoTurno) console.error("[Turnos] No pude determinar de que cuenta es este turno del bot.");

    // Bloqueo preventivo: verificar que el horario no esté ocupado en la agenda de este profesional
    if (duenoTurno && hayPersistencia()) {
      const turnosAgenda = await listarColeccion("appointments", 500);
      const reqStart = inicio.getTime();
      const reqEnd = fin.getTime();
      const solapado = turnosAgenda.find((a: any) => {
        if (a.owner_id !== duenoTurno) return false;
        const st = String(a.status || "").toLowerCase();
        if (st === "cancelled" || st === "no_show" || st.includes("cancel")) return false;
        if (!a.start_datetime) return false;
        const aStart = new Date(a.start_datetime).getTime();
        const aEnd = a.end_datetime ? new Date(a.end_datetime).getTime() : (aStart + 30 * 60000);
        return reqStart < aEnd && reqEnd > aStart;
      });
      if (solapado) {
        console.warn(`[Turnos Bot] Horario solicitado (${inicio.toISOString()}) ya ocupado para la cuenta ${duenoTurno}`);
        return null;
      }
    }

    const autoPhone = (accion.patient_phone || conv.patient_phone || conv.id || "").replace(/@.*$/, "").replace(/\D/g, "");
    const cleanFormattedPhone = autoPhone ? (autoPhone.startsWith("+") ? autoPhone : `+${autoPhone}`) : (accion.patient_phone || conv.patient_phone || "");
    const patientName = accion.patient_name || conv.patient_name || "Paciente";

    // 1. Registrar o vincular al paciente primero
    const nameParts = patientName.trim().split(" ");
    let patientDocId = "pat-bot";
    let fichaPaciente: any = null;
    try {
      // Si ya existe la ficha, la reutilizamos: antes se creaba una nueva en
      // cada reserva y el mismo paciente quedaba duplicado, sin su correo.
      // Telefono + nombre, y solo entre las fichas de esta cuenta.
      fichaPaciente = await buscarPacientePorTelefono(cleanFormattedPhone, patientName, duenoTurno);
      if (fichaPaciente?.id) {
        patientDocId = fichaPaciente.id;
        console.log(`[Turnos] Vinculado a la ficha existente de ${fichaPaciente.first_name || ""} ${fichaPaciente.last_name || ""}`.trim());
        await actualizarCampos("patients", fichaPaciente.id, {
          total_appointments: Number(fichaPaciente.total_appointments || 0) + 1,
          last_appointment_at: new Date().toISOString()
        });
      } else {
      const createdPid = await crearDocumento("patients", {
        first_name: nameParts[0] || "Paciente",
        last_name: nameParts.slice(1).join(" ") || "Prospecto",
        phone: cleanFormattedPhone,
        relationship_status: "prospect",
        inquiry_channel: "whatsapp",
        first_inquiry_at: new Date().toISOString(),
        total_appointments: 1,
        completed_appointments_count: 0,
        notes: "Futuro cliente agendado automáticamente por el Bot de WhatsApp.",
        owner_id: duenoTurno || "",
        created_at: new Date().toISOString()
      });
      if (createdPid) {
        patientDocId = createdPid;
        console.log(`[Turnos] Ficha nueva creada para ${patientName}`);
      }
      }
    } catch (e: any) {
      console.warn("[Turnos] No se pudo persistir el paciente en Firestore:", e?.message || e);
    }

    // 2. Registrar el turno con el ID del paciente vinculado
    const configPractice = duenoTurno ? ((await leerDocumento("settings", "practice_config_" + duenoTurno)) || {}) : {};
    const aMano = (configPractice as any).auto_confirm_bookings === false;
    const initialStatus = aMano ? "pending" : "confirmed";

    const id = await crearDocumento("appointments", {
      patient_id: patientDocId,
      patient_name: patientName,
      patient_phone: cleanFormattedPhone,
      // Si la ficha ya tenia correo, el recordatorio por mail sale solo.
      patient_email: fichaPaciente?.email || "",
      service_id: servicio?.id || "",
      service_name: servicio?.name || accion.service_name || "Consulta",
      service_price: Number(servicio?.price) || 0,
      start_datetime: inicio.toISOString(),
      end_datetime: fin.toISOString(),
      status: initialStatus,
      payment_status: "pending",
      notes: `Agendado por el bot de WhatsApp. ${accion.notes || ""}`.trim(),
      origin: "bot_whatsapp",
      owner_id: duenoTurno || "",
      created_at: new Date().toISOString()
    });

    if (!id) return null;

    // Lo sumamos al contexto para que el bot no ofrezca ese horario de nuevo
    // antes del proximo sync.
    businessContext.existingAppointments = [
      ...(businessContext.existingAppointments || []),
      { start_datetime: inicio.toISOString(), duration_minutes: duracion, status: initialStatus, service_name: servicio?.name }
    ];

    const fechaStr = inicio.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "long", day: "numeric", month: "long" });
    const horaStr = inicio.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit" });
    const detalle = `${servicio?.name || "Consulta"} el ${fechaStr} a las ${horaStr} hs`;
    console.log(`[Turnos] Turno creado por el bot: ${id} (${detalle}) - estado: ${initialStatus}`);
    return { id, detalle, start_datetime: inicio.toISOString(), status: initialStatus, owner_id: duenoTurno };
  } catch (err: any) {
    console.error("[Turnos] Error creando el turno:", err?.message || err);
    return null;
  }
};

const cargarConversacionesGuardadas = async () => {
  if (!hayPersistencia()) {
    console.log("[Firestore] Sin FIREBASE_SERVICE_ACCOUNT: las conversaciones viven solo en memoria.");
    return;
  }
  const token = await obtenerTokenFirestore();
  if (!token) return;
  try {
    const res = await fetch(`${baseFirestoreUrl()}/${CONVERSACIONES_COLECCION}?pageSize=300`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[Firestore] No se pudieron cargar las conversaciones:", res.status);
      return;
    }
    let cargadas = 0;
    for (const doc of data.documents || []) {
      const crudo = doc?.fields?.contenido?.stringValue;
      if (!crudo) continue;
      try {
        const conv = JSON.parse(crudo);
        if (conv?.id) {
          realWhatsAppConversations.set(conv.id, conv);
          cargadas++;
        }
      } catch { /* documento corrupto: lo ignoramos */ }
    }
    console.log(`[Firestore] ${cargadas} conversaciones restauradas desde la base.`);
  } catch (err: any) {
    console.error("[Firestore] Error cargando conversaciones:", err?.message || err);
  }
};

let businessContext: {
  services: any[];
  availability: any[];
  existingAppointments: any[];
  updatedAt: number;
} = { services: [], availability: [], existingAppointments: [], updatedAt: 0 };

const BUSINESS_CONTEXT_MAX_AGE_MS = 20 * 60 * 1000; // 20 minutos

const updateBusinessContext = (data: { services?: any[]; availability?: any[]; existingAppointments?: any[] }) => {
  if (!data) return;
  if (Array.isArray(data.services)) businessContext.services = data.services;
  if (Array.isArray(data.availability)) businessContext.availability = data.availability;
  if (Array.isArray(data.existingAppointments)) businessContext.existingAppointments = data.existingAppointments;
  businessContext.updatedAt = Date.now();
};

const isBusinessContextFresh = () =>
  businessContext.updatedAt > 0 &&
  (Date.now() - businessContext.updatedAt) < BUSINESS_CONTEXT_MAX_AGE_MS &&
  businessContext.availability.length > 0;

// Idempotencia: Evolution reintenta el webhook si tarda en responder.
// Sin esto, el mismo mensaje genera dos respuestas encimadas.
const processedMessageIds = new Set<string>();
const alreadyProcessed = (id: string) => {
  if (!id) return false;
  if (processedMessageIds.has(id)) return true;
  processedMessageIds.add(id);
  if (processedMessageIds.size > 5000) {
    const arr = Array.from(processedMessageIds);
    processedMessageIds.clear();
    arr.slice(-2000).forEach(x => processedMessageIds.add(x));
  }
  return false;
};

// ---------------------------------------------------------------------------
// Envio a Evolution API.
// Valida el numero de telefono antes de enviarlo para evitar errores 400 (exists: false).
// Soporta Evolution API v2 ({ number, text }) y fallback seguro v1 ({ number, text, textMessage }).
// ---------------------------------------------------------------------------
const sendEvolutionText = async (params: {
  targetUrl: string;
  targetKey: string;
  targetInstance: string;
  to: string;          // remoteJid tal cual vino, o numero en digitos
  text: string;
}): Promise<{ ok: boolean; status?: number; error?: string }> => {
  const { targetUrl, targetKey, targetInstance, to, text } = params;
  if (!targetUrl || !targetKey || !targetInstance || !to || !text) {
    return { ok: false, error: "Faltan datos para enviar el mensaje" };
  }

  const isGroup = to.includes("@g.us");
  const cleanDigits = to.split("@")[0].replace(/\D/g, "");

  // Numeros incompletos como "54911" (solo codigo de pais y area) no existen en WhatsApp
  // y hacen fallar a la Evolution API con error 400 (exists: false).
  if (!isGroup && cleanDigits.length < 10) {
    console.warn(`[Evolution API] Omitiendo mensaje a "${to}": numero incompleto (${cleanDigits.length} digitos, minimo requerido 10).`);
    return { ok: false, status: 400, error: "invalid_phone_number" };
  }

  // En Evolution API v2 el parametro number se prefiere en digitos puros o JID si es grupo
  const destination = isGroup ? to : cleanDigits;
  const url = `${targetUrl.replace(/\/$/, "")}/message/sendText/${targetInstance}`;
  const headers = { "apikey": targetKey, "Content-Type": "application/json" };

  try {
    const v2 = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ number: destination, text, delay: 1200 })
    });
    if (v2.ok) return { ok: true, status: v2.status };

    const bodyTxt = await v2.text().catch(() => "");

    // Si WhatsApp informa que el numero no existe o no tiene cuenta, no reintentamos
    const noExisteEnWhatsApp = bodyTxt.includes('"exists":false') ||
                               bodyTxt.toLowerCase().includes("not a whatsapp user") ||
                               bodyTxt.toLowerCase().includes("number does not exist");
    if (noExisteEnWhatsApp) {
      console.warn(`[Evolution API] El numero ${destination} no esta registrado en WhatsApp (exists: false). Omitiendo reintento.`);
      return { ok: false, status: 400, error: "not_on_whatsapp" };
    }

    console.warn(`[Evolution API] sendText v2 fallo (${v2.status}): ${bodyTxt.slice(0, 300)}`);

    // Si fallo por incompatibilidad de version o endpoint, probamos fallback manteniendo "text" para validar esquema
    if (v2.status === 400 || v2.status === 404 || v2.status === 422) {
      const v1 = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          number: destination,
          text, // Evita error: 'instance requires property "text"'
          textMessage: { text },
          options: { delay: 1200, presence: "composing" }
        })
      });
      if (v1.ok) return { ok: true, status: v1.status };
      const b1 = await v1.text().catch(() => "");
      console.error(`[Evolution API] sendText v1 tambien fallo (${v1.status}): ${b1.slice(0, 300)}`);
      return { ok: false, status: v1.status, error: b1.slice(0, 300) };
    }
    return { ok: false, status: v2.status, error: bodyTxt.slice(0, 300) };
  } catch (err: any) {
    console.error("[Evolution API] Error de red enviando mensaje:", err?.message || err);
    return { ok: false, error: err?.message || "network error" };
  }
};

// ---------------------------------------------------------------------------
// Validacion del turno CONTRA LA AGENDA REAL antes de aceptar una reserva.
// El modelo puede proponer un horario ocupado o fuera de atencion; si no pasa
// por aca, la reserva no se confirma.
// ---------------------------------------------------------------------------
const toMinutes = (hhmm: string) => {
  const m = String(hhmm || "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};

const getArgentinaDayOfWeek = (dateInput: Date | string): number => {
  const d = typeof dateInput === 'string' ? parseArgentinaDate(dateInput) : dateInput;
  if (isNaN(d.getTime())) return 0;
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
  const [y, m, day] = dateStr.split('-').map(Number);
  const temp = new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
  return temp.getUTCDay();
};

const getArgentinaMinutesFromMidnight = (dateInput: Date | string): number => {
  const d = typeof dateInput === 'string' ? parseArgentinaDate(dateInput) : dateInput;
  if (isNaN(d.getTime())) return 0;
  const timeStr = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d);
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const validateSlot = (params: {
  datetime: string;
  durationMinutes: number;
  availability: any[];
  existingAppointments: any[];
}): { valid: boolean; reason?: string } => {
  const { datetime, durationMinutes, availability, existingAppointments } = params;
  if (!datetime) return { valid: false, reason: "sin fecha" };

  const start = parseArgentinaDate(datetime);
  if (isNaN(start.getTime())) return { valid: false, reason: "fecha invalida" };
  // Tolerancia de 5 min en el pasado por desfases de red
  if (start.getTime() < Date.now() - 5 * 60 * 1000) return { valid: false, reason: "fecha en el pasado" };

  const dur = Number(durationMinutes) > 0 ? Number(durationMinutes) : 30;
  const end = new Date(start.getTime() + dur * 60000);

  // 1) Debe caer dentro de una franja de atencion configurada en hora argentina
  const dow = getArgentinaDayOfWeek(start);
  const startMin = getArgentinaMinutesFromMidnight(start);
  const endMin = startMin + dur;
  const franjas = (availability || []).filter((a: any) => Number(a.day_of_week) === dow && a.enabled !== false);
  if (franjas.length === 0) return { valid: false, reason: "dia sin atencion" };

  const entra = franjas.some((a: any) => {
    const ini = toMinutes(a.start_time);
    const fin = toMinutes(a.end_time);
    if (ini === null || fin === null) return false;
    if (a.break_start && a.break_end) {
      const bStart = toMinutes(a.break_start);
      const bEnd = toMinutes(a.break_end);
      if (bStart !== null && bEnd !== null && startMin < bEnd && endMin > bStart) {
        return false;
      }
    }
    return startMin >= ini && endMin <= fin;
  });
  if (!entra) return { valid: false, reason: "fuera del horario de atencion" };

  // 2) No debe solaparse con un turno ya tomado
  const choca = (existingAppointments || []).some((ap: any) => {
    const apStart = parseArgentinaDate(ap.start_datetime || ap.datetime || ap.start);
    if (isNaN(apStart.getTime())) return false;
    const apDur = Number(ap.duration_minutes) > 0 ? Number(ap.duration_minutes) : 30;
    const apEnd = new Date(apStart.getTime() + apDur * 60000);
    const cancelado = String(ap.status || "").toLowerCase().includes("cancel");
    if (cancelado) return false;
    return start < apEnd && apStart < end;
  });
  if (choca) return { valid: false, reason: "horario ya ocupado" };

  return { valid: true };
};

async function generateAiBotResponse(params: {
  message: string;
  history?: any[];
  practiceSettings?: any;
  services?: any[];
  availability?: any[];
  existingAppointments?: any[];
  senderPhone?: string;
  patientName?: string;
  personasDelNumero?: any[];
}) {
  const {
    message,
    history = [],
    practiceSettings = cachedPracticeSettings || {},
    services = [],
    availability = [],
    existingAppointments = [],
    senderPhone = "",
    patientName = "",
    personasDelNumero = []
  } = params;

  if (practiceSettings && Object.keys(practiceSettings).length > 0) {
    fusionarSettingsDelFront(practiceSettings);
  }

  const ai = getAI();
  const effectiveSettings = { ...cachedPracticeSettings, ...practiceSettings };
  const practiceName = effectiveSettings.practice_name || "Agenfacil";
  const professionalName = effectiveSettings.professional_name || "el profesional a cargo";
  const professionalTitle = effectiveSettings.professional_title || "Especialista";
  const isProfessionalIdentity = effectiveSettings.bot_identity_mode === 'professional';
  const assistantName = effectiveSettings.bot_assistant_name || "Sofía";
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
    : "(SIN DATOS CARGADOS - no informes ningun servicio ni arancel)";

  // Availability context
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const scheduleList = availability.length > 0
    ? availability.map((a: any) => `- ${days[a.day_of_week] || "Día"}: ${a.start_time} a ${a.end_time}`).join("\n")
    : "(SIN DATOS CARGADOS - no informes ningun horario ni ofrezcas turnos)";

  // Existing booked appointments formatted in Argentina timezone
  const bookedList = existingAppointments.length > 0
    ? existingAppointments.map((a: any) => {
        const start = parseArgentinaDate(a.start_datetime || a.datetime || a.start);
        if (isNaN(start.getTime())) return `- ${a.start_datetime || a.datetime} (${a.service_name || "Turno ocupado"})`;
        const fDate = start.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "short", day: "numeric", month: "short", year: "numeric" });
        const fTime = start.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit" });
        return `- ${fDate} a las ${fTime} hs (${a.service_name || "Turno ocupado"})`;
      }).join("\n")
    : "No hay turnos ocupados registrados para las próximas fechas.";

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

  const cleanPhone = String(senderPhone || "").replace(/\D/g, "");
  const hasSenderPhone = cleanPhone.length >= 6;
  const knownPhoneStr = hasSenderPhone ? (cleanPhone.startsWith("+") ? cleanPhone : `+${cleanPhone}`) : "";

  // Un numero puede ser de varias personas (familia, pareja, un cuidador). El bot
  // tiene que preguntar para quien es el turno en vez de asumir.
  const nombresDelNumero = (personasDelNumero || [])
    .map((p: any) => ((p.first_name || "") + " " + (p.last_name || "")).trim() || p.name || "")
    .filter(Boolean);
  const avisoPersonas = nombresDelNumero.length === 0
    ? "Este numero todavia no tiene ninguna ficha: pedile el nombre y apellido completo antes de agendar."
    : nombresDelNumero.length === 1
      ? `Este numero ya figura a nombre de ${nombresDelNumero[0]}. Si el turno es para esa persona, no le pidas el nombre de nuevo. Si te dice que es para otra persona, pedile el nombre y apellido de ESA persona: cada una lleva su propia ficha.`
      : `Este numero lo comparten varias personas ya registradas: ${nombresDelNumero.join(", ")}. ANTES de agendar preguntá para cual de ellas es el turno, o si es para alguien mas. Usá exactamente el nombre de la persona elegida en patient_name.`;

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
    // Si ya tenemos el teléfono de WhatsApp, NO se lo pedimos al paciente
    (!hasSenderPhone && botReq.phone) ? "- Número de WhatsApp / Celular" : null,
    botReq.dni ? "- DNI o documento de identidad" : null,
    botReq.email ? "- Correo electrónico" : null,
    botReq.insurance ? "- Obra social o Prepaga (o Particular)" : null,
    botReq.reason ? "- Motivo de consulta o afección" : null,
    botReq.address ? "- Domicilio o localidad de residencia" : null,
  ].filter(Boolean).join("\n");

  const phoneInstructionText = hasSenderPhone
    ? `⚠️ TELÉFONO DE WHATSAPP DEL PACIENTE: Ya estás chateando directamente por WhatsApp con el paciente (${knownPhoneStr}). YA TIENES SU NÚMERO DE TELÉFONO. ESTÁ TERMINANTEMENTE PROHIBIDO PEDIRLE SU TELÉFONO O NÚMERO DE WHATSAPP. Úsalo automáticamente en la acción de reserva.`
    : `Si necesitas el teléfono para agendar, pídeselo cordialmente.`;

  const patientNameNotice = (patientName && !patientName.startsWith("+") && !/^\d+$/.test(patientName))
    ? `Nombre identificado en el perfil: "${patientName}". Puedes saludarlo/a cordialmente por su nombre si es apropiado.`
    : "";

  let identityPrompt = "";
  if (isProfessionalIdentity) {
    identityPrompt = `Eres ${professionalName} (${professionalTitle}), el profesional a cargo de "${practiceName}".
Respondes directamente tú en primera persona a tus pacientes con un trato sumamente humano, cercano, cálido, empático y profesional.
PERSONALIDAD Y TONO:
- Habla de manera natural y cercana, como una persona real en WhatsApp de Argentina (usando modismos amables y respetuosos como "¡Hola!", "¡Buenas!", "¿Cómo estás?", "¡Dale, perfecto!", "¡Genial!", "Te anoto...", "Te queda cómodo...?").
- Usa emojis de forma natural y expresiva acorde al contexto del mensaje (por ejemplo: 😊, 👋, 🙌, 📅, 🩺, ✨, 🙏, 👍). ¡Que tus respuestas se sientan vivas, cálidas y humanas, jamás un bot frío o robótico!
- Mantén las respuestas claras, concisas y fluidas (sin textos interminables ni lenguaje acartonado).`;
  } else {
    identityPrompt = `Eres ${assistantName}, la asistente y recepcionista de "${practiceName}" del profesional ${professionalName}.
PERSONALIDAD Y TONO:
- Eres una asistente sumamente atenta, empática, simpática y profesional. Hablas como una recepcionista real de consultorio en Argentina, súper amable y predispuesta.
- Usa lenguaje conversacional natural y cálido ("¡Hola!", "¡Buenas!", "¿Cómo estás?", "¡Dale, genial!", "¡Buenísimo!", "Te cuento...", "¿Te queda bien ese horario?").
- Incluye emojis de forma simpática y apropiada según la respuesta (por ejemplo: 😊, ✨, 🙌, 📅, 🩺, 👋, 🙏, 👍). Que no se sienta un contestador automático ni un menú numérico.
- Respuestas directas, ágiles y agradables para leer en WhatsApp.`;
  }

  const systemInstruction = `${identityPrompt}

Zona horaria oficial del consultorio: Argentina (GMT-3, America/Argentina/Buenos_Aires).
Fecha y hora actual en Argentina: ${todayString}.
Dirección del consultorio: ${effectiveSettings.address || "Consultorio céntrico"}, ${effectiveSettings.city || "Ciudad"}.
Teléfono / WhatsApp de contacto: ${effectiveSettings.phone || effectiveSettings.whatsapp_number || ""}.
${patientNameNotice}

QUIEN ESCRIBE: ${avisoPersonas}

INFORMACIÓN OFICIAL DEL CONSULTORIO (HORARIOS Y SERVICIOS EN HORA ARGENTINA):
Servicios y aranceles:
${featPricing ? servicesList : "Informar que los aranceles se coordinan en la consulta presencial."}

Horarios de atención disponibles:
${scheduleList}

Turnos ya ocupados / no disponibles:
${bookedList}

${phoneInstructionText}

INSTRUCCIONES CLAVE DE ATENCIÓN Y CONVERSACIÓN:
1. FLUIDEZ Y CALIDEZ: Mantén una conversación empática, fluida y lógica. NUNCA repitas el saludo inicial si ya te has presentado o si la conversación ya está en curso. Responde de forma directa al mensaje del paciente con buena onda y calidez.
2. TELÉFONO AUTOMÁTICO: ${hasSenderPhone ? `EL TELÉFONO YA ES CONOCIDO (${knownPhoneStr}). NO LO SOLICITES. Cuando generes la reserva en json_action, asigna "patient_phone": "${knownPhoneStr}".` : "Pide el teléfono solo si no lo tienes."}
3. REGLA ABSOLUTA - SI NO ESTÁ EN LA LISTA, NO EXISTE: Si arriba dice "(SIN DATOS CARGADOS)" en servicios o en horarios, tienes PROHIBIDO inventar precios, duraciones, días u horarios, y PROHIBIDO ofrecer o confirmar turnos. En ese caso responde amablemente que en breve le responderá el equipo del consultorio.
4. NUNCA OFREZCAS UN HORARIO OCUPADO: Antes de proponer un día y hora verifica que esté dentro de los horarios de atención y que NO coincida con turnos ocupados. Si el paciente pide un horario no disponible, explícaselo con amabilidad y ofrécele 2 opciones libres cercanas.
5. NO INVENTAR NI DIAGNOSTICAR: Basa tus respuestas únicamente en los datos reales del consultorio. Nunca des diagnósticos médicos ni indiques medicamentos. Ante consultas clínicas complejas, indica amablemente que dejas anotada la consulta para el profesional.
6. SERVICIOS Y PRECIOS: Brinda información clara y cordial sobre los servicios${featPricing ? " y aranceles" : ""}.
7. ${featBooking ? "RESERVA DE TURNOS: Ayuda al paciente a coordinar su cita en los huecos disponibles (horario Argentina)." : "Informa los horarios y solicita que aguarde respuesta."}
8. DATOS REQUERIDOS PARA AGENDAR:
${requiredFieldsDescriptions || "- Nombre y Apellido completo"}
Pide los datos faltantes con naturalidad en el diálogo.
9. ${featDeposit && effectiveSettings.patient_deposit_alias ? `SEÑA / PAGOS: Si el paciente pregunta por señas o transferencias, infórmale el Alias oficial: ${effectiveSettings.patient_deposit_alias}.` : ""}
10. ${featHandoff ? "DERIVACIÓN HUMANA: Si el paciente pide hablar con una persona real, confírmale con calidez que un miembro del equipo se pondrá en contacto pronto." : ""}
11. ${featBooking ? "CONFIRMACIÓN DE RESERVA: Si el paciente confirma un turno disponible y tienes sus datos (nombre y horario, y el teléfono que ya tienes de WhatsApp), confírmale el turno con entusiasmo y calidez, e incluye el bloque json_action al final. En el resumen del turno NO pongas una línea de Paciente (el paciente ya sabe quién es): en su lugar pon Profesional: ${professionalName}. El resumen lleva Profesional, Servicio, Fecha y Hora, en ese orden." : ""}
${customRules}

FORMATO DE ACCIÓN (solo cuando se confirme un turno con todos los datos):
${featBooking ? `\`\`\`json_action
{
  "action": "book_appointment",
  "service_name": "Nombre exacto del servicio",
  "datetime": "YYYY-MM-DDTHH:mm:00",
  "patient_name": "Nombre del paciente",
  "patient_phone": "${knownPhoneStr || "Teléfono del paciente"}",
  "patient_email": "Email si fue provisto",
  "notes": "Notas del turno"
}
\`\`\`
Nota importante sobre datetime: La fecha y hora deben estar en hora local de Argentina (formato ISO YYYY-MM-DDTHH:mm:00).` : ""}`;

  if (ai) {
    // El modelo elegido en Ajustes manda; los demas quedan como respaldo si falla.
    // Los modelos viejos ya no existen en la API: si quedaron elegidos en Ajustes,
    // TODAS las llamadas fallaban y el bot contestaba con el texto generico.
    const MODELOS_RETIRADOS: Record<string, string> = {
      "gemini-2.5-flash": "gemini-3.5-flash-lite",
      "gemini-2.5-pro": "gemini-3.5-flash",
      "gemini-2.0-flash": "gemini-3.5-flash-lite",
      "gemini-1.5-flash": "gemini-3.5-flash-lite",
      "gemini-1.5-pro": "gemini-3.5-flash"
    };
    const elegidoCrudo = String(effectiveSettings.bot_ai_model || "");
    const modeloElegido = MODELOS_RETIRADOS[elegidoCrudo] || elegidoCrudo;
    if (elegidoCrudo && modeloElegido !== elegidoCrudo) {
      console.error("[Bot IA] El modelo " + elegidoCrudo + " ya no existe: uso " + modeloElegido + ". Cambialo en Ajustes.");
    }
    const candidateModels = Array.from(new Set([
      ...(modeloElegido ? [modeloElegido] : []),
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-3.5-flash",
      "gemini-3.8-flash",
      "gemini-flash-latest"
    ]));
    for (const modelName of candidateModels) {
      try {
        const conversationText = history
          .slice(-12)
          .map((m: any) => `${m.role === "user" ? "Paciente" : (isProfessionalIdentity ? professionalName : "Asistente")}: ${m.content}`)
          .join("\n");

        const fullPrompt = `${systemInstruction}\n\n=== HISTORIAL DE LA CONVERSACIÓN ===\n${conversationText || "(Inicio de la conversación)"}\n\nPaciente: ${message}\n${isProfessionalIdentity ? professionalName : "Asistente"}:`;

        const response: any = await conLimiteDeTiempo(
          ai.models.generateContent({ model: modelName, contents: fullPrompt }),
          15000,
          "el modelo " + modelName
        );

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

          // El modelo puede proponer un horario ocupado o fuera de atencion.
          // Validamos SIEMPRE contra la agenda real antes de dar la reserva por buena.
          if (actionData && actionData.action === "book_appointment") {
            const svc = services.find((x: any) => x.name === actionData.service_name);
            const check = validateSlot({
              datetime: actionData.datetime,
              durationMinutes: svc?.duration_minutes || 30,
              availability,
              existingAppointments
            });
            if (!check.valid) {
              console.warn(`[WhatsApp Bot] Reserva rechazada por la agenda (${check.reason}):`, actionData.datetime);
              actionData = null;
              cleanReply = "Perdon, ese horario no me figura disponible en la agenda. ¿Te paso las opciones libres mas cercanas para que elijas? 🙏";
            }
          }

          return {
            reply: cleanReply,
            action: actionData,
            aiPowered: true
          };
        }
      } catch (aiErr: any) {
        // Con console.warn el motivo no llegaba al panel y el bot parecia "tonto" sin explicacion.
        console.error(`[Bot IA] Fallo el modelo ${modelName}: ${aiErr?.message || aiErr}`);
      }
    }
  }

  if (ai) console.error("[Bot IA] Ningun modelo contesto: respondo con el texto de respaldo, sin IA. Revisa el modelo elegido en Ajustes.");

  // Fallback si Gemini esta caido o sin cuota.
  // Solo usa datos REALES: si no hay servicios u horarios cargados, no informa
  // nada y deriva al equipo. Nunca inventa precios ni ofrece turnos.
  const lower = message.toLowerCase().trim();
  const hasHistory = history.length > 0;
  let reply = "";
  let actionData: any = null;

  const tieneServicios = services.length > 0;
  const tieneHorarios = availability.length > 0;

  if (!tieneServicios && !tieneHorarios) {
    return {
      reply: `¡Hola! Gracias por escribir a *${practiceName}*. Tomamos tu mensaje y en un momento te responde el equipo del consultorio. 🙌`,
      action: null,
      aiPowered: false
    };
  }

  if (lower.includes("precio") || lower.includes("cuanto") || lower.includes("arancel") || lower.includes("costo") || lower.includes("valor")) {
    reply = `Con gusto te paso la información de nuestros servicios y aranceles:\n\n${services.map((s: any) => `• *${s.name}*: $${s.price?.toLocaleString()} (${s.duration_minutes} min)`).join("\n")}\n\n¿Te gustaría que te reservemos un turno para alguno de ellos? 😊`;
  } else if (lower.includes("horario") || lower.includes("atienden") || lower.includes("dias") || lower.includes("días") || lower.includes("abierto")) {
    reply = `Nuestros horarios de atención son:\n${scheduleList}\n\n¿Qué día y franja horaria (mañana o tarde) te quedaría más cómodo?`;
  } else if (!tieneServicios && (lower.includes("precio") || lower.includes("cuanto") || lower.includes("arancel"))) {
    reply = `Los aranceles te los confirma el equipo del consultorio. Ya dejo asentada tu consulta para que te respondan a la brevedad. 🙌`;
  } else if (lower.includes("turno") || lower.includes("agendar") || lower.includes("reservar") || lower.includes("cita") || lower.includes("consulta")) {
    const firstService = services[0]?.name || "una consulta";
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
  // AI Studio infrastructure routes external traffic exclusively to port 3000
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
        existingAppointments = [],
        senderPhone = "",
        patientName = ""
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
        existingAppointments,
        senderPhone,
        patientName
      });

      // Si el bot va a agendar un turno, usamos el texto EXACTO oficial configurado para la cuenta (sin inventos de la IA)
      if (botResponse.action?.action === "book_appointment") {
        const aMano = practiceSettings.auto_confirm_bookings === false;
        const datosTurno = {
          patient_name: botResponse.action.patient_name || patientName || "Paciente",
          start_datetime: botResponse.action.datetime,
          service_name: botResponse.action.service_name || "Consulta"
        };
        botResponse.reply = aMano
          ? armarMensajeSolicitudRecibida(datosTurno, practiceSettings)
          : armarMensajeTurnoAgendado(datosTurno, practiceSettings);
      }

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
  app.post("/api/evolution/sync-config", async (req, res) => {
    try {
      const { apiUrl, apiKey, instanceName, practiceSettings, appUrl } = req.body;
      if (apiUrl) lastKnownEvolutionConfig.apiUrl = apiUrl.replace(/\/$/, "");
      if (apiKey) lastKnownEvolutionConfig.apiKey = apiKey;
      if (instanceName) lastKnownEvolutionConfig.instanceName = instanceName.trim();
      if (practiceSettings) {
        fusionarSettingsDelFront(practiceSettings);
        // Para prender o apagar el bot manda lo que dice la base, no lo que traiga
        // el navegador: con datos viejos en el navegador el bot quedaba en pausa.
        try {
          const propia = await configDeLaCuentaDelBot();
          if (propia && typeof (propia as any).bot_enabled === "boolean") {
            cachedPracticeSettings.bot_enabled = (propia as any).bot_enabled;
          }
        } catch {}
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

    // NO creamos ficha de cliente por escribir un mensaje: puede ser un curioso.
    // La ficha se crea recien cuando el turno queda agendado (crearTurnoDesdeBot).

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

  // ============================================================================
  // FORMATO OFICIAL DE MENSAJES Y NOTIFICACIONES PUSH REALES
  // ============================================================================
  const armarDetalleTurno = (turno: any, config: any) => {
    const cuando = new Date(turno.start_datetime);
    const fecha = cuando.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" });
    const hora = cuando.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });
    const profesional = (config as any)?.professional_name || (config as any)?.practice_name || "el profesional";
    const lugar = [(config as any)?.address, (config as any)?.city].filter(Boolean).join(", ");
    const servicio = turno.service_name || "la consulta";
    const paciente = turno.patient_name || "";

    const detalle = [
      "🗓️ *Fecha:* " + fecha,
      "⏰ *Horario:* " + hora + " hs",
      "👤 *Profesional:* " + profesional,
      "💼 *Servicio:* " + servicio,
      lugar ? "📍 *Lugar:* " + lugar : ""
    ].filter(Boolean).join("\n");

    return { fecha, hora, profesional, lugar, servicio, paciente, detalle };
  };

  const armarMensajeTurnoAgendado = (turno: any, config: any) => {
    const { paciente, detalle } = armarDetalleTurno(turno, config);
    return "¡Hola " + paciente + "! Quería recordarte que tu turno quedó agendado, te paso los detalles:\n\n" + detalle +
      "\n\n¡Te esperamos! Si necesitás hacer alguna modificación o consulta previa, avisame por acá. 😊";
  };

  const armarMensajeSolicitudRecibida = (turno: any, config: any) => {
    const { paciente, profesional, detalle } = armarDetalleTurno(turno, config);
    return "¡Hola " + paciente + "! Recibimos tu solicitud de turno, te paso los detalles:\n\n" + detalle +
      "\n\nEn cuanto " + profesional + " la confirme te aviso por acá. 😊";
  };

  const ownerFcmTokensMap = new Map<string, Set<string>>();

  const tokensFcmDeLaCuenta = async (ownerId: string): Promise<string[]> => {
    if (!ownerId) return [];
    if (!ownerFcmTokensMap.has(ownerId)) {
      const docPush = await leerDocumento("settings", "push_tokens_" + ownerId);
      const list = Array.isArray(docPush?.tokens) ? docPush.tokens : [];
      ownerFcmTokensMap.set(ownerId, new Set(list.filter(Boolean)));
    }
    return Array.from(ownerFcmTokensMap.get(ownerId) || []);
  };

  const guardarTokenFcm = async (ownerId: string, token: string) => {
    if (!ownerId || !token) return;
    const tokens = await tokensFcmDeLaCuenta(ownerId);
    if (!tokens.includes(token)) {
      tokens.push(token);
      ownerFcmTokensMap.set(ownerId, new Set(tokens));
      if (hayPersistencia()) {
        await guardarDocumento("settings", "push_tokens_" + ownerId, {
          owner_id: ownerId,
          tokens,
          updated_at: new Date().toISOString()
        });
      }
    }
  };

  const enviarPushReal = async (params: {
    ownerId: string;
    title: string;
    body: string;
    data?: Record<string, string>;
    priority?: "high" | "normal";
    critical?: boolean;
  }) => {
    const { ownerId, title, body, data, priority, critical } = params;
    if (!ownerId) return { ok: false, error: "Sin ownerId" };
    const tokens = await tokensFcmDeLaCuenta(ownerId);
    if (!tokens.length) return { ok: false, sent: 0, reason: "No tokens registered" };

    const authToken = await obtenerTokenFirestore();
    if (!authToken) return { ok: false, error: "Sin auth token" };

    let enviados = 0;
    const invalidTokens: string[] = [];
    const isCritical = critical === true || priority === "high";

    for (const token of tokens) {
      try {
        const fcmUrl = `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`;
        const res = await fetch(fcmUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${authToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: {
              token,
              notification: {
                title,
                body
              },
              data: {
                ...(data || {}),
                title,
                body,
                critical: isCritical ? "true" : "false",
                priority: isCritical ? "high" : "normal"
              },
              android: {
                priority: "high",
                notification: {
                  channel_id: isCritical ? "critical_turnos" : "general_turnos",
                  priority: "high",
                  default_sound: true,
                  default_vibrate_timings: true
                }
              },
              webpush: {
                headers: {
                  Urgency: isCritical ? "high" : "normal"
                },
                notification: {
                  title,
                  body,
                  icon: "/pwa-192x192.png",
                  badge: "/icon.svg",
                  requireInteraction: isCritical,
                  vibrate: isCritical ? [300, 100, 300, 100, 300] : [200, 100, 200],
                  tag: isCritical ? "agenfacil-critical" : "agenfacil-general"
                }
              }
            }
          })
        });

        if (res.ok) {
          enviados++;
        } else {
          const errJson: any = await res.json().catch(() => ({}));
          const status = errJson?.error?.status || "";
          if (status === "UNREGISTERED" || status === "INVALID_ARGUMENT") {
            invalidTokens.push(token);
          }
          console.warn(`[Push FCM] Error enviando a token: ${res.status}`, errJson?.error?.message);
        }
      } catch (pushErr: any) {
        console.warn("[Push FCM] Error de red enviando push:", pushErr?.message);
      }
    }

    if (invalidTokens.length) {
      const actuales = ownerFcmTokensMap.get(ownerId);
      if (actuales) {
        invalidTokens.forEach(t => actuales.delete(t));
        if (hayPersistencia()) {
          guardarDocumento("settings", "push_tokens_" + ownerId, {
            owner_id: ownerId,
            tokens: Array.from(actuales),
            updated_at: new Date().toISOString()
          }).catch(() => {});
        }
      }
    }

    console.log(`[Push FCM] Enviados ${enviados}/${tokens.length} para cuenta ${ownerId}`);
    return { ok: true, sent: enviados };
  };

  // Endpoints para registro y prueba de notificaciones Push (Firebase Cloud Messaging)
  app.post("/api/push/registrar-token", async (req, res) => {
    try {
      const { owner_id, token } = req.body || {};
      if (!owner_id || !token) {
        return res.status(400).json({ ok: false, error: "Faltan owner_id o token" });
      }
      await guardarTokenFcm(String(owner_id).trim(), String(token).trim());
      console.log(`[Push FCM] Token registrado correctamente para la cuenta ${owner_id}`);
      return res.json({ ok: true, message: "Token FCM registrado con éxito" });
    } catch (err: any) {
      console.error("[Push FCM] Error al registrar token:", err);
      return res.status(500).json({ ok: false, error: err?.message || "Error al registrar token" });
    }
  });

  app.post("/api/push/test", async (req, res) => {
    try {
      const { owner_id, title, body } = req.body || {};
      if (!owner_id) {
        return res.status(400).json({ ok: false, error: "Falta owner_id para enviar notificación de prueba" });
      }
      const resultado = await enviarPushReal({
        ownerId: String(owner_id).trim(),
        title: title || "🔔 Agenfacil: Notificación de Prueba",
        body: body || "¡Excelente! Tu dispositivo está correctamente conectado para recibir alertas de turnos al celular.",
        data: { type: "test", timestamp: new Date().toISOString() },
        priority: "high",
        critical: true
      });
      return res.json(resultado);
    } catch (err: any) {
      console.error("[Push FCM] Error enviando push de prueba:", err);
      return res.status(500).json({ ok: false, error: err?.message || "Error enviando push" });
    }
  });

  // Enviar alerta crítica de turnos al celular del profesional
  app.post("/api/push/send-alert", async (req, res) => {
    try {
      const { owner_id, title, body, priority, critical, appointment_id, url } = req.body || {};
      if (!owner_id || !title) {
        return res.status(400).json({ ok: false, error: "Faltan owner_id o title" });
      }
      const resultado = await enviarPushReal({
        ownerId: String(owner_id).trim(),
        title: String(title),
        body: String(body || "Aviso de turno urgente"),
        priority: priority === "high" ? "high" : "normal",
        critical: critical !== false,
        data: {
          type: "critical_appointment",
          appointment_id: String(appointment_id || ""),
          url: String(url || "/#agenda"),
          timestamp: new Date().toISOString()
        }
      });
      return res.json(resultado);
    } catch (err: any) {
      console.error("[Push FCM] Error enviando alerta crítica:", err);
      return res.status(500).json({ ok: false, error: err?.message || "Error enviando alerta" });
    }
  });

  // Helper to process any raw message or chat item into realWhatsAppConversations
  const processIncomingOrSyncedMessage = async (item: any, options?: {
    targetUrl?: string;
    targetKey?: string;
    targetInstance?: string;
    services?: any[];
    availability?: any[];
    existingAppointments?: any[];
    autoReplyIfPatient?: boolean;
    isLive?: boolean;
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
    // Solo filtramos historico en el sync. Un mensaje en vivo siempre entra:
    // al reiniciarse el proceso, instanceConnectedAt vuelve a "ahora" y este
    // filtro descartaba mensajes nuevos legitimos.
    if (!options?.isLive && instanceConnectedAt && msgTimeMs > 0 && msgTimeMs < (instanceConnectedAt - 60000)) {
      return null;
    }

    const pushName = item.pushName || item.name || item.verifiedName || `+${senderPhone}`;
    const avatarUrl = item.profilePicUrl || item.pictureUrl || item.profilePictureUrl || item.avatarUrl || undefined;
    const timeStr = new Date(timestampSec * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const msgId = item.key?.id || item.id || `msg-${Date.now()}-${Math.random()}`;
    const conv = findOrCreateConversation(senderPhone, pushName, avatarUrl);
    // Guardamos el JID exacto: responder a este valor evita el lio del 9 argentino.
    if (remoteJid) conv.remote_jid = remoteJid;

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
    // Dedupe SOLO por id de mensaje. Antes tambien se comparaba por contenido,
    // y eso hacia desaparecer mensajes legitimos repetidos ("hola" dos veces).
    const exists = conv.messages.some(m => m.id === msgId);
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

      // SEGURIDAD: solo auto-responde desde el webhook en vivo, nunca en el sync.
      // Ventana de 10 min (antes 90 s: si el webhook demoraba, no contestaba nunca).
      const nowSec = Math.floor(Date.now() / 1000);
      const isFreshMessage = Math.abs(nowSec - timestampSec) < 600;

      if (!fromMe && options?.autoReplyIfPatient && isFreshMessage) {
        // FAIL-CLOSED: si no hay configuracion cargada, el bot NO responde.
        // Antes era `!== false`, y con settings vacios (undefined) daba true:
        // el bot contestaba aunque estuviera pausado.
        const botEnabled = cachedPracticeSettings.bot_enabled === true;
        const convEnabled = conv.ai_handled === true;
        const contextoOk = isBusinessContextFresh();
        // Pausa temporal: si acabas de responder a mano, el bot no se mete.
        const enPausaManual = Boolean(conv.bot_paused_until && conv.bot_paused_until > Date.now());
        if (enPausaManual) {
          console.log(`[WhatsApp Bot] En pausa manual hasta ${new Date(conv.bot_paused_until!).toISOString()}.`);
        }

        if (!botEnabled || !convEnabled) {
          console.error(`[WhatsApp Bot] No responde: bot activo=${botEnabled}, conversacion activa=${convEnabled}. El mensaje queda en la bandeja.`);
        } else if (!contextoOk) {
          // Sin agenda real cargada preferimos el silencio a inventar horarios.
          conv.needs_human = true;
          console.error("[WhatsApp Bot] No responde: no tengo la agenda cargada (servicios y horarios) para contestar sin inventar.");
        }

        const isBotActive = botEnabled && convEnabled && contextoOk && !enPausaManual;
        if (isBotActive) {
          try {
            console.log(`[WhatsApp Bot] Generating auto-reply for incoming live message from ${conv.patient_name} (${senderPhone}): "${text}"`);
            // Demora configurada en Ajustes: hasta ahora solo se aplicaba en el
            // chat interno y el bot de WhatsApp respondia al instante.
            const demoraSeg = Math.min(Math.max(Number(cachedPracticeSettings.bot_response_delay_seconds) || 0, 0), 60);
            if (demoraSeg > 0) await new Promise(r => setTimeout(r, demoraSeg * 1000));

            // (la creacion del turno se hace mas abajo, con crearTurnoDesdeBot)
            // Siempre la agenda REAL: el webhook no recibia estos datos y el bot
            // terminaba contestando con los valores por defecto del prompt.
            // Quienes ya estan registrados con este numero, para que el bot
            // pregunte para quien es el turno en vez de asumir.
            const duenoDeEsteChat = await duenoDeLaInstancia(options?.targetInstance);
            const personasDelNumero = await personasDelTelefono(senderPhone, duenoDeEsteChat);

            const botResult = await generateAiBotResponse({
              message: text,
              personasDelNumero,
              history: conv.messages.slice(-10),
              practiceSettings: cachedPracticeSettings,
              services: options.services?.length ? options.services : businessContext.services,
              availability: options.availability?.length ? options.availability : businessContext.availability,
              existingAppointments: options.existingAppointments?.length ? options.existingAppointments : businessContext.existingAppointments,
              senderPhone: senderPhone,
              patientName: conv.patient_name
            });

            if (botResult && botResult.reply && options.targetUrl && options.targetKey && options.targetInstance) {
              // Respondemos al JID exacto que mando el mensaje.
              const destino = conv.remote_jid || remoteJid || senderPhone;

              // Si el bot va a agendar un turno, PRIMERO lo creamos en Firestore
              // y usamos el texto EXACTO oficial configurado para la cuenta (sin inventos de la IA)
              let creado: any = null;
              if (botResult.action?.action === "book_appointment") {
                creado = await crearTurnoDesdeBot(botResult.action, { ...conv, instancia: options?.targetInstance });
                if (creado) {
                  const duenoBot = creado.owner_id || (await duenoDeLaInstancia(options?.targetInstance));
                  const configPractice = duenoBot ? ((await leerDocumento("settings", "practice_config_" + duenoBot)) || {}) : cachedPracticeSettings;
                  const aMano = (configPractice as any).auto_confirm_bookings === false;

                  const datosTurno = {
                    patient_name: botResult.action.patient_name || conv.patient_name || "Paciente",
                    start_datetime: creado.start_datetime || botResult.action.datetime,
                    service_name: botResult.action.service_name || "Consulta"
                  };

                  // TEXTO EXACTO OFICIAL
                  botResult.reply = aMano
                    ? armarMensajeSolicitudRecibida(datosTurno, configPractice)
                    : armarMensajeTurnoAgendado(datosTurno, configPractice);

                  // 🔔 PUSH REAL AL CELULAR DEL PROFESIONAL
                  if (duenoBot) {
                    enviarPushReal({
                      ownerId: duenoBot,
                      title: aMano ? "🔔 Solicitud de Turno por WhatsApp" : "✅ Turno Agendado por WhatsApp",
                      body: `${datosTurno.patient_name} - ${datosTurno.service_name}`,
                      data: {
                        type: aMano ? "bot_booking_pending" : "bot_booking_confirmed",
                        appointment_id: creado.id || ""
                      }
                    }).catch(() => {});
                  }
                } else {
                  conv.needs_human = true;
                  botResult.reply = "Disculpá, hubo un inconveniente al registrar ese horario o ya no se encuentra disponible. ¿Te gustaría coordinar en otro horario?";
                }
              }

              // Simulacion de tipeo: le avisamos a WhatsApp que estamos escribiendo.
              if (cachedPracticeSettings.bot_typing_simulation) {
                await fetch(`${options.targetUrl}/chat/sendPresence/${options.targetInstance}`, {
                  method: "POST",
                  headers: { "apikey": options.targetKey, "Content-Type": "application/json" },
                  body: JSON.stringify({ number: conv.remote_jid || remoteJid || senderPhone, presence: "composing", delay: 2000 })
                }).catch(() => {});
              }

              const sendResult = await sendEvolutionText({
                targetUrl: options.targetUrl,
                targetKey: options.targetKey,
                targetInstance: options.targetInstance,
                to: destino,
                text: botResult.reply
              });

              if (!sendResult.ok) {
                // Antes el error se tragaba en un .catch() y parecia enviado.
                conv.needs_human = true;
                console.error(`[WhatsApp Bot] No se pudo entregar la respuesta a ${destino}:`, sendResult.error);
              }

              const assistantMsg: RealWhatsAppMessage = {
                id: `bot-msg-${Date.now()}`,
                role: 'assistant',
                content: botResult.reply,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: sendResult.ok ? 'sent' : 'failed',
                actionTaken: creado ? {
                  type: "appointment_created",
                  appointmentId: creado.id,
                  details: creado.detalle
                } : botResult.action
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

    persistirConversacion(conv);
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

    // La URL publicada manda siempre: si el pedido viene del preview de
    // desarrollo (ais-dev...), el webhook igual queda apuntando a produccion.
    const urlPublica = (process.env.PUBLIC_APP_URL || "https://agenfacil.ai.studio").replace(/\/$/, "");
    const esDesarrollo = (u: string) => /ais-dev|localhost|127\.0\.0\.1/.test(u || "");
    const baseWebhook = (appUrl && !esDesarrollo(appUrl)) ? appUrl.replace(/\/$/, "") : urlPublica;
    const webhookUrl = `${baseWebhook}/api/evolution/webhook`;
    if (!webhookUrl || webhookUrl.startsWith("/api")) {
      return { success: false, error: "Invalid public app URL" };
    }

    // Solo nombres de evento validos. Antes se mandaban los dos formatos
    // ("MESSAGES_UPSERT" y "messages.upsert") en la misma lista: Evolution v2
    // valida el enum y rechazaba TODA la peticion con 400, asi que el webhook
    // nunca quedaba registrado.
    const eventsList = [
      "MESSAGES_UPSERT",
      "MESSAGES_UPDATE",
      "SEND_MESSAGE",
      "CONNECTION_UPDATE"
    ];

    const url = `${targetUrl}/webhook/set/${targetInstance}`;
    const headers = { "apikey": targetKey, "Content-Type": "application/json" };

    // v2 espera el body anidado; v1 lo espera plano. Probamos uno y despues el otro.
    const cuerpoV2 = {
      webhook: {
        url: webhookUrl,
        enabled: true,
        webhookByEvents: false,
        webhookBase64: false,
        events: eventsList
      }
    };
    const cuerpoV1 = {
      url: webhookUrl,
      enabled: true,
      webhook_by_events: false,
      webhook_base64: false,
      events: eventsList
    };

    const intentar = async (cuerpo: any, etiqueta: string) => {
      const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(cuerpo) });
      const texto = await res.text().catch(() => "");
      let data: any = {};
      try { data = texto ? JSON.parse(texto) : {}; } catch { data = { raw: texto.slice(0, 300) }; }
      return { ok: res.ok, status: res.status, data, etiqueta, detalle: texto.slice(0, 300) };
    };

    try {
      let r = await intentar(cuerpoV2, "v2");
      if (!r.ok) {
        console.warn(`[Evolution API] webhook/set v2 fallo (${r.status}): ${r.detalle}`);
        r = await intentar(cuerpoV1, "v1");
      }

      lastWebhookResult = {
        at: new Date().toISOString(),
        instancia: targetInstance,
        webhookUrl,
        formato: r.etiqueta,
        ok: r.ok,
        status: r.status,
        detalle: r.ok ? "" : r.detalle
      };

      if (r.ok) {
        console.log(`[Evolution API] Webhook registrado (${r.etiqueta}) para ${targetInstance} -> ${webhookUrl}`);
      } else {
        console.error(`[Evolution API] NO se pudo registrar el webhook (${r.status}): ${r.detalle}`);
      }
      return { success: r.ok, data: r.data, webhookUrl, status: r.status, detalle: r.detalle };
    } catch (err: any) {
      lastWebhookResult = {
        at: new Date().toISOString(),
        instancia: targetInstance,
        webhookUrl,
        formato: "error",
        ok: false,
        status: 0,
        detalle: err?.message || "network error"
      };
      console.error(`[Evolution API] Error de red configurando webhook para ${targetInstance}:`, err);
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
        fusionarSettingsDelFront(practiceSettings);
      }

      // Guardamos servicios, horarios y turnos para que el WEBHOOK pueda usarlos.
      // Sin esto el bot respondia el webhook con listas vacias e inventaba datos.
      updateBusinessContext({ services, availability, existingAppointments });
      // La configuracion de recordatorios vive en el navegador: la guardamos en
      // la base para que el motor automatico pueda usarla sin la app abierta.
      if (req.body?.reminderConfig) {
        reminderConfig = req.body.reminderConfig;
        guardarReminderConfig(reminderConfig).catch(() => {});
      }
      // Lo dejamos guardado para que el servidor lo tenga tras un reinicio.
      guardarContextoEnBase().catch(() => {});

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
        // Antes esto terminaba en .catch(() => {}) y un fallo de registro era invisible.
        configureEvolutionWebhook({
          targetUrl,
          targetKey,
          targetInstance,
          appUrl: resolvedAppUrl
        }).catch(err => {
          lastWebhookResult = {
            at: new Date().toISOString(),
            instancia: targetInstance,
            webhookUrl: `${resolvedAppUrl}/api/evolution/webhook`,
            formato: "error",
            ok: false,
            status: 0,
            detalle: err?.message || "error desconocido"
          };
          console.error("[Evolution API] Fallo el registro del webhook durante el sync:", err);
        });
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
  app.post("/api/evolution/clear-chats", async (req, res) => {
    try {
      // Borramos tambien lo guardado: si no, volverian al reiniciar.
      const ids = Array.from(realWhatsAppConversations.keys());
      realWhatsAppConversations.clear();
      if (hayPersistencia()) {
        for (const id of ids) await borrarDocumento(CONVERSACIONES_COLECCION, id);
      }
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

      let apiResponse: any = null;
      let delivered = false;

      if (targetUrl && targetKey) {
        // Preferimos el JID exacto de la conversacion; recien si no lo tenemos
        // armamos el numero a mano (ahi si aplica el fallback del 9).
        const destino = conv.remote_jid || cleanPhone;
        console.log(`[Evolution API] Enviando mensaje manual a ${destino} en la instancia ${targetInstance}`);

        let result = await sendEvolutionText({ targetUrl, targetKey, targetInstance, to: destino, text });

        if (!result.ok && !conv.remote_jid && cleanPhone.startsWith("549")) {
          const fallbackPhone = `54${cleanPhone.slice(3)}`;
          console.log(`[Evolution API] Reintentando sin el 9: ${fallbackPhone}`);
          result = await sendEvolutionText({ targetUrl, targetKey, targetInstance, to: fallbackPhone, text });
        }

        delivered = result.ok;
        apiResponse = result;

        if (!delivered) {
          // Antes se marcaba como enviado igual y el error quedaba invisible.
          newMsg.status = 'failed';
          conv.needs_human = true;
          console.error(`[Evolution API] El mensaje manual NO se entrego:`, result.error);
          return res.status(502).json({
            success: false,
            error: "No se pudo entregar el mensaje por WhatsApp. Revisa que la instancia este conectada.",
            detail: result.error,
            message: newMsg
          });
        }
      } else {
        newMsg.status = 'failed';
        return res.status(400).json({
          success: false,
          error: "Faltan las credenciales de Evolution API (URL o apikey).",
          message: newMsg
        });
      }

      // Pausa automatica: al responder a mano, el bot se calla un rato en
      // esta conversacion. Configurable en Ajustes; 30 minutos por defecto.
      const minutosPausa = Number(cachedPracticeSettings.bot_auto_pause_minutes);
      const minutos = Number.isFinite(minutosPausa) && minutosPausa >= 0 ? minutosPausa : 30;
      if (minutos > 0) {
        conv.bot_paused_until = Date.now() + minutos * 60000;
      }

      persistirConversacion(conv);
      return res.json({
        success: true,
        message: newMsg,
        apiResponse,
        bot_paused_until: conv.bot_paused_until || null,
        pausa_minutos: minutos
      });
    } catch (err: any) {
      console.error("Error in /api/evolution/conversations/:id/send:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get or Generate QR Code for an Instance
  app.post("/api/evolution/instance-qr", async (req, res) => {
    try {
      const { instanceName, apiUrl, apiKey, practiceSettings, appUrl, owner_id } = req.body;
      const targetUrl = (apiUrl || lastKnownEvolutionConfig.apiUrl || process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
      const targetKey = apiKey || lastKnownEvolutionConfig.apiKey || process.env.EVOLUTION_API_KEY || "";
      const targetInstance = (instanceName || lastKnownEvolutionConfig.instanceName || process.env.EVOLUTION_INSTANCE_NAME || "consultorio").trim();
      const ownerId = String(owner_id || practiceSettings?.owner_id || "").trim();

      if (apiUrl) lastKnownEvolutionConfig.apiUrl = targetUrl;
      if (apiKey) lastKnownEvolutionConfig.apiKey = targetKey;
      if (instanceName) lastKnownEvolutionConfig.instanceName = targetInstance;
      if (practiceSettings) {
        fusionarSettingsDelFront(practiceSettings);
      }

      // Si tenemos la cuenta del profesional, asociamos de inmediato la instancia con su cuenta
      if (ownerId && targetInstance) {
        actualizarCampos("settings", "practice_config_" + ownerId, {
          evolution_instance_name: targetInstance
        }).catch(() => {});
        cacheContextos.delete(ownerId);
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
      if (cleanPhone.length < 10) {
        return res.status(400).json({ error: "El teléfono debe contener al menos 10 dígitos (código de país + área + número)." });
      }

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
  // Inicia una conversacion REAL: manda el primer mensaje por WhatsApp y crea
  // el chat en la bandeja. Antes el boton solo creaba una simulacion local.
  app.post("/api/evolution/conversations/start", async (req, res) => {
    try {
      const { phone, name, text, apiUrl, apiKey, instanceName } = req.body || {};
      if (!phone || !text) {
        return res.status(400).json({ success: false, error: "Faltan el telefono o el mensaje." });
      }

      const targetUrl = (apiUrl || lastKnownEvolutionConfig.apiUrl || cachedPracticeSettings.evolution_api_url || process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
      const targetKey = apiKey || lastKnownEvolutionConfig.apiKey || cachedPracticeSettings.evolution_api_key || process.env.EVOLUTION_API_KEY || "";
      const targetInstance = (instanceName || lastKnownEvolutionConfig.instanceName || cachedPracticeSettings.evolution_instance_name || process.env.EVOLUTION_INSTANCE_NAME || "").trim();

      if (!targetUrl || !targetKey || !targetInstance) {
        return res.status(400).json({ success: false, error: "Falta la configuracion de Evolution API." });
      }

      // Normalizamos el numero a digitos y validamos longitud internacional.
      const soloDigitos = String(phone).replace(/\D/g, "");
      if (soloDigitos.length < 10) {
        return res.status(400).json({ success: false, error: "El teléfono debe contener al menos 10 dígitos (código de país + área + número)." });
      }
      const destino = `${soloDigitos}@s.whatsapp.net`;

      const envio = await sendEvolutionText({ targetUrl, targetKey, targetInstance, to: soloDigitos, text });
      if (!envio.ok) {
        return res.status(502).json({
          success: false,
          error: "WhatsApp rechazo el envio. Revisa el numero y que la instancia este conectada.",
          detail: envio.error
        });
      }

      const conv = findOrCreateConversation(soloDigitos, name || soloDigitos, undefined);
      conv.remote_jid = destino;
      conv.messages.push({
        id: `manual-${Date.now()}`,
        role: "assistant",
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: "sent"
      });
      conv.last_message = text;
      conv.last_timestamp = new Date().toISOString();
      conv.unread_count = 0;

      const minutosPausa = Number(cachedPracticeSettings.bot_auto_pause_minutes);
      const minutos = Number.isFinite(minutosPausa) && minutosPausa >= 0 ? minutosPausa : 30;
      if (minutos > 0) conv.bot_paused_until = Date.now() + minutos * 60000;

      persistirConversacion(conv);
      return res.json({ success: true, conversation: conv });
    } catch (err: any) {
      console.error("Error iniciando conversacion:", err);
      return res.status(500).json({ success: false, error: err?.message || "error" });
    }
  });

  // Marca una conversacion como leida: pone el contador en cero y pasa los
  // mensajes del paciente a 'read'. Lo llama el front al abrir el chat.
  app.post("/api/evolution/conversations/:id/read", (req, res) => {
    const conv = realWhatsAppConversations.get(req.params.id);
    if (!conv) return res.status(404).json({ success: false, error: "Conversacion no encontrada" });
    conv.unread_count = 0;
    conv.messages.forEach(m => { if (m.role === 'user') m.status = 'read'; });
    persistirConversacion(conv);
    return res.json({ success: true, id: conv.id });
  });

  // ---------------------------------------------------------------------------
  // Migracion: asigna dueño a los datos creados antes del multi-cuenta.
  // Se corre UNA vez, antes de encender el filtro por cuenta en el front.
  // Con aplicar:false solo informa que haria (simulacion).
  // ---------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // SUPER ADMIN. El navegador puede mentir sobre quien es: por eso cada pedido
  // del panel trae el idToken de Firebase y el servidor verifica la firma
  // contra las claves publicas de Google antes de devolver un solo dato.
  // -------------------------------------------------------------------------
  const SUPER_ADMIN_EMAILS = ["gonzalocorat" + "@gmail.com", "gecorat" + "@gmail.com"];
  const SUPER_ADMIN_UIDS = ["FiQCY7iMmubpXZlqs1YuZTYulXz1"];

  // Bitacora de errores del servidor para mostrarlos en el panel.
  const erroresPlataforma: Array<{ cuando: string; detalle: string }> = [];
  const consoleErrorOriginal = console.error.bind(console);
  console.error = (...args: any[]) => {
    try {
      const detalle = args.map(a => (a && a.message) ? String(a.message) : String(a)).join(" ").slice(0, 300);
      erroresPlataforma.push({ cuando: new Date().toISOString(), detalle });
      if (erroresPlataforma.length > 50) erroresPlataforma.shift();
    } catch {}
    consoleErrorOriginal(...args);
  };

  let cacheClavesGoogle: { claves: Record<string, string>; exp: number } = { claves: {}, exp: 0 };

  const clavesPublicasGoogle = async (): Promise<Record<string, string>> => {
    const ahora = Math.floor(Date.now() / 1000);
    if (cacheClavesGoogle.exp > ahora && Object.keys(cacheClavesGoogle.claves).length) return cacheClavesGoogle.claves;
    try {
      const r = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken" + "@" + "system.gserviceaccount.com");
      if (!r.ok) return cacheClavesGoogle.claves;
      const data: any = await r.json();
      cacheClavesGoogle = { claves: data, exp: ahora + 3600 };
      return data;
    } catch {
      return cacheClavesGoogle.claves;
    }
  };

  const verificarIdToken = async (idToken: string): Promise<{ uid: string; email: string } | null> => {
    try {
      if (!idToken || idToken.split(".").length !== 3) return null;
      const cripto: any = await import("crypto");
      const partes = idToken.split(".");
      const header = JSON.parse(Buffer.from(partes[0], "base64url").toString("utf8"));
      const datos = JSON.parse(Buffer.from(partes[1], "base64url").toString("utf8"));
      const claves = await clavesPublicasGoogle();
      const certificado = claves[header.kid];
      if (!certificado) return null;
      const publica = new cripto.X509Certificate(certificado).publicKey;
      const firmaOk = cripto.createVerify("RSA-SHA256")
        .update(partes[0] + "." + partes[1])
        .verify(publica, Buffer.from(partes[2], "base64url"));
      if (!firmaOk) return null;
      const ahora = Math.floor(Date.now() / 1000);
      if (datos.aud !== FIREBASE_PROJECT_ID) return null;
      if (datos.iss !== "https://securetoken.google.com/" + FIREBASE_PROJECT_ID) return null;
      if (Number(datos.exp || 0) < ahora) return null;
      const uid = String(datos.user_id || datos.sub || "");
      if (!uid) return null;
      return { uid, email: String(datos.email || "").toLowerCase() };
    } catch (err: any) {
      consoleErrorOriginal("[SuperAdmin] No se pudo verificar la sesion:", err?.message || err);
      return null;
    }
  };

  const exigirSuperAdmin = async (req: any, res: any): Promise<{ uid: string; email: string } | null> => {
    const cabecera = String(req.headers?.authorization || "");
    const idToken = cabecera.startsWith("Bearer ") ? cabecera.slice(7) : "";
    if (!idToken) { res.status(401).json({ ok: false, error: "Falta la sesion" }); return null; }
    const sesion = await verificarIdToken(idToken);
    if (!sesion) { res.status(401).json({ ok: false, error: "Sesion invalida o vencida" }); return null; }
    const esSuper = SUPER_ADMIN_UIDS.includes(sesion.uid) || SUPER_ADMIN_EMAILS.includes(sesion.email);
    if (!esSuper) {
      console.warn("[SuperAdmin] Acceso denegado a " + (sesion.email || sesion.uid));
      res.status(403).json({ ok: false, error: "No autorizado" });
      return null;
    }
    return sesion;
  };

  // Lee una coleccion entera paginando: listarColeccion corta en una sola pagina.
  const listarTodo = async (coleccion: string, tope = 5000): Promise<any[]> => {
    const token = await obtenerTokenFirestore();
    if (!token) return [];
    const salida: any[] = [];
    let pageToken = "";
    try {
      while (salida.length < tope) {
        const url = baseFirestoreUrl() + "/" + coleccion + "?pageSize=300" + (pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : "");
        const res = await fetch(url, { headers: { "Authorization": "Bearer " + token } });
        if (!res.ok) break;
        const data: any = await res.json().catch(() => ({}));
        for (const d of (data.documents || [])) {
          const out: any = { id: String(d.name || "").split("/").pop() };
          for (const k of Object.keys(d.fields || {})) out[k] = deValorFirestore(d.fields[k]);
          salida.push(out);
        }
        pageToken = data.nextPageToken || "";
        if (!pageToken) break;
      }
    } catch (err: any) {
      console.error("[SuperAdmin] Error leyendo " + coleccion + ":", err?.message || err);
    }
    return salida;
  };

  // -------------------------------------------------------------------------
  // PAGINA PUBLICA DE RESERVAS. El enlace /u/<handle> no identificaba al
  // profesional: el navegador del paciente mostraba la configuracion que
  // tuviera a mano. Aca el servidor resuelve el enlace contra la base.
  // -------------------------------------------------------------------------
  // Aviso al paciente y al profesional cuando entra una reserva por la pagina.
  // Si el profesional eligio confirmar a mano, el paciente recibe un "recibimos
  // tu solicitud" y el turno queda esperando; si no, sale la confirmacion.
  app.post("/api/publico/aviso-reserva", async (req, res) => {
    try {
      const turno = req.body?.turno || {};
      const ownerId = String(req.body?.owner_id || turno.owner_id || "").trim();
      if (!ownerId || !turno.start_datetime) {
        return res.status(400).json({ ok: false, error: "Faltan datos del turno" });
      }

      const config = (await leerDocumento("settings", "practice_config_" + ownerId)) || {};
      const aMano = (config as any).auto_confirm_bookings === false;

      const cuando = new Date(turno.start_datetime);
      const fecha = cuando.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" });
      const hora = cuando.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });
      const profesional = (config as any).professional_name || (config as any).practice_name || "el profesional";
      const lugar = [(config as any).address, (config as any).city].filter(Boolean).join(", ");
      const servicio = turno.service_name || "la consulta";
      const paciente = turno.patient_name || "";

      const detalle = [
        "🗓️ *Fecha:* " + fecha,
        "⏰ *Horario:* " + hora + " hs",
        "👤 *Profesional:* " + profesional,
        "💼 *Servicio:* " + servicio,
        lugar ? "📍 *Lugar:* " + lugar : ""
      ].filter(Boolean).join("\n");

      const textoPaciente = aMano
        ? "¡Hola " + paciente + "! Recibimos tu solicitud de turno, te paso los detalles:\n\n" + detalle +
          "\n\nEn cuanto " + profesional + " la confirme te aviso por acá. 😊"
        : "¡Hola " + paciente + "! Quería recordarte que tu turno quedó agendado, te paso los detalles:\n\n" + detalle +
          "\n\n¡Te esperamos! Si necesitás hacer alguna modificación o consulta previa, avisame por acá. 😊";

      const textoProfesional = aMano
        ? "🔔 Tenés un turno para confirmar:\n\n" + detalle + "\n\nPaciente: " + paciente + "\nEntrá a la app para confirmarlo."
        : "✅ Nuevo turno agendado por la página:\n\n" + detalle + "\n\nPaciente: " + paciente;

      const targetUrl = (lastKnownEvolutionConfig.apiUrl || process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
      const targetKey = lastKnownEvolutionConfig.apiKey || process.env.EVOLUTION_API_KEY || "";
      const targetInstance = (String((config as any).evolution_instance_name || "").trim() || lastKnownEvolutionConfig.instanceName || process.env.EVOLUTION_INSTANCE_NAME || "").trim();
      const puedeWhatsApp = Boolean(targetUrl && targetKey && targetInstance);

      const enviarWhatsApp = async (telefono: any, texto: string) => {
        const numero = String(telefono || "").replace(/\D/g, "");
        if (!puedeWhatsApp || numero.length < 10) return false;
        const r = await sendEvolutionText({
          targetUrl,
          targetKey,
          targetInstance,
          to: numero,
          text: texto
        });
        return Boolean(r?.ok);
      };

      const resultado: any = { aMano, paciente: {}, profesional: {} };

      resultado.paciente.whatsapp = await enviarWhatsApp(turno.patient_phone, textoPaciente);
      if (turno.patient_email) {
        resultado.paciente.email = await enviarEmailRecordatorio(
          turno.patient_email,
          aMano ? "Recibimos tu solicitud de turno" : "Tu turno quedó agendado",
          textoPaciente
        );
      }

      // Avisos al profesional, segun lo que eligio en Configuracion.
      const quiereCorreo = (config as any).avisar_prof_email !== false;
      const quiereWhatsApp = (config as any).avisar_prof_whatsapp === true;
      const correoProf = (config as any).email || (config as any).sender_email || "";
      const telProf = (config as any).whatsapp_number || (config as any).phone || "";

      if (quiereWhatsApp) {
        resultado.profesional.whatsapp = await enviarWhatsApp(telProf, textoProfesional);
      }
      if (quiereCorreo && correoProf) {
        resultado.profesional.email = await enviarEmailRecordatorio(
          correoProf,
          aMano ? "Tenés un turno para confirmar" : "Nuevo turno agendado",
          textoProfesional
        );
      }

      // 🔔 Aviso push real al celular del profesional (FCM)
      const quierePush = (config as any).avisar_prof_push !== false;
      if (quierePush && ownerId) {
        resultado.profesional.push = await enviarPushReal({
          ownerId,
          title: aMano ? "🔔 Solicitud de Turno para Confirmar" : "✅ Nuevo Turno Agendado",
          body: `${paciente} - ${servicio} (${fecha} ${hora} hs)`,
          data: {
            type: aMano ? "booking_pending" : "booking_confirmed",
            appointment_id: String(turno.id || "")
          }
        }).catch(() => ({ ok: false }));
      }

      console.log("[Reserva] Aviso enviado. Confirmacion a mano: " + aMano);
      res.json({ ok: true, ...resultado });
    } catch (err: any) {
      console.error("[Reserva] No se pudo avisar: " + (err?.message || err));
      res.status(500).json({ ok: false, error: "No se pudo avisar" });
    }
  });

  // ---------------------------------------------------------------------------
  // Secuencia de "Turno Agendado" cuando el profesional confirma a mano un turno
  // ---------------------------------------------------------------------------
  app.post("/api/turnos/confirmar-profesional", async (req, res) => {
    try {
      const { appointmentId, owner_id } = req.body || {};
      const turnoBody = req.body?.turno || {};
      let turno: any = Object.keys(turnoBody).length ? turnoBody : null;
      let ownerId = String(owner_id || turno?.owner_id || "").trim();

      if (!turno && appointmentId) {
        turno = await leerDocumento("appointments", appointmentId);
        if (turno && !ownerId) {
          ownerId = String(turno.owner_id || "").trim();
        }
      }

      if (!turno) {
        return res.status(404).json({ ok: false, error: "Turno no encontrado" });
      }

      if (!ownerId && turno.owner_id) ownerId = String(turno.owner_id).trim();

      const config = ownerId
        ? ((await leerDocumento("settings", "practice_config_" + ownerId)) || {})
        : cachedPracticeSettings;

      // Actualizamos estado en Firestore
      const aptId = appointmentId || turno.id;
      if (aptId) {
        await actualizarCampos("appointments", aptId, {
          status: "confirmed",
          confirmed_at: new Date().toISOString()
        });
      }

      // Generar el mensaje exacto oficial de Turno Agendado
      const textoTurnoAgendado = armarMensajeTurnoAgendado(turno, config);

      const targetUrl = (lastKnownEvolutionConfig.apiUrl || process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
      const targetKey = lastKnownEvolutionConfig.apiKey || process.env.EVOLUTION_API_KEY || "";
      const targetInstance = (String((config as any).evolution_instance_name || "").trim() || lastKnownEvolutionConfig.instanceName || process.env.EVOLUTION_INSTANCE_NAME || "").trim();
      const puedeWhatsApp = Boolean(targetUrl && targetKey && targetInstance);

      let whatsappEnviado = false;
      const numero = String(turno.patient_phone || "").replace(/\D/g, "");
      if (puedeWhatsApp && numero.length >= 10) {
        const r = await sendEvolutionText({
          targetUrl,
          targetKey,
          targetInstance,
          to: numero,
          text: textoTurnoAgendado
        });
        whatsappEnviado = Boolean(r?.ok);
      }

      let emailEnviado = false;
      if (turno.patient_email) {
        const practiceName = (config as any).practice_name || "Agenfacil";
        emailEnviado = await enviarEmailRecordatorio(
          turno.patient_email,
          `¡Tu turno ha sido confirmado! - ${practiceName}`,
          textoTurnoAgendado
        );
      }

      console.log(`[Confirmar Profesional] Turno ${aptId} confirmado por profesional. WA: ${whatsappEnviado}, Email: ${emailEnviado}`);
      return res.json({
        ok: true,
        message: "Turno confirmado exitosamente y secuencia de notificación enviada al paciente.",
        whatsapp: whatsappEnviado,
        email: emailEnviado
      });
    } catch (err: any) {
      console.error("[Confirmar Profesional] Error:", err);
      return res.status(500).json({ ok: false, error: err?.message || "Error al confirmar turno" });
    }
  });

  // ---------------------------------------------------------------------------
  // Reserva pública del lado del servidor (para cerrar reglas de Firestore por dueño)
  // ---------------------------------------------------------------------------
  app.post("/api/publico/crear-reserva", async (req, res) => {
    try {
      const { owner_id, turno } = req.body || {};
      const ownerId = String(owner_id || "").trim();

      if (!ownerId) {
        return res.status(400).json({ ok: false, error: "Identificador de consultorio (owner_id) requerido" });
      }

      if (!turno || !turno.patient_name || !turno.patient_phone || !turno.start_datetime) {
        return res.status(400).json({ ok: false, error: "Faltan datos obligatorios del turno (nombre, teléfono o fecha)" });
      }

      const config = (await leerDocumento("settings", "practice_config_" + ownerId)) || {};
      const aMano = (config as any).auto_confirm_bookings === false;
      const initialStatus = aMano ? "pending" : "confirmed";

      // Bloqueo atómico contra solapamientos (Double-Booking Prevention)
      if (hayPersistencia()) {
        const turnosExistentes = await listarColeccion("appointments", 500);
        const reqStart = new Date(turno.start_datetime).getTime();
        const reqEnd = new Date(turno.end_datetime || (reqStart + 30 * 60000)).getTime();

        const solapado = turnosExistentes.find((a: any) => {
          if (a.owner_id !== ownerId) return false;
          const st = String(a.status || "").toLowerCase();
          if (st === "cancelled" || st === "no_show" || st.includes("cancel")) return false;
          if (!a.start_datetime) return false;

          const aStart = new Date(a.start_datetime).getTime();
          const aEnd = a.end_datetime ? new Date(a.end_datetime).getTime() : (aStart + 30 * 60000);

          return reqStart < aEnd && reqEnd > aStart;
        });

        if (solapado) {
          return res.status(409).json({
            ok: false,
            error: "slot_taken",
            message: "El horario seleccionado acaba de ser reservado por otro paciente. Por favor selecciona otro horario disponible."
          });
        }
      }

      const nuevoTurno = {
        owner_id: ownerId,
        patient_id: `pat-web-${Date.now()}`,
        patient_name: String(turno.patient_name || "").trim(),
        patient_phone: String(turno.patient_phone || "").trim(),
        patient_email: String(turno.patient_email || "").trim() || null,
        patient_dni: String(turno.patient_dni || "").trim() || null,
        patient_insurance: String(turno.patient_insurance || "").trim() || null,
        patient_address: String(turno.patient_address || "").trim() || null,
        service_id: String(turno.service_id || ""),
        service_name: String(turno.service_name || "Consulta"),
        service_price: Number(turno.service_price) || 0,
        start_datetime: turno.start_datetime,
        end_datetime: turno.end_datetime || turno.start_datetime,
        status: initialStatus,
        payment_status: "pending",
        notes: turno.notes || "Reserva online por enlace público",
        origin: turno.origin || "public_booking",
        created_at: new Date().toISOString()
      };

      // Guardar directamente en Firestore con permisos de backend
      let docId: string | null = null;
      if (hayPersistencia()) {
        docId = await crearDocumento("appointments", nuevoTurno);
      }
      if (!docId) {
        docId = `apt-${Date.now()}`;
      }

      const turnoCompleto = { id: docId, ...nuevoTurno };

      // Disparar la secuencia de aviso (paciente + profesional)
      try {
        const cuando = new Date(nuevoTurno.start_datetime);
        const fecha = cuando.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" });
        const hora = cuando.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });
        const profesional = (config as any).professional_name || (config as any).practice_name || "el profesional";
        const lugar = [(config as any).address, (config as any).city].filter(Boolean).join(", ");
        const servicio = nuevoTurno.service_name;
        const paciente = nuevoTurno.patient_name;

        const detalle = [
          "🗓️ *Fecha:* " + fecha,
          "⏰ *Horario:* " + hora + " hs",
          "👤 *Profesional:* " + profesional,
          "💼 *Servicio:* " + servicio,
          lugar ? "📍 *Lugar:* " + lugar : ""
        ].filter(Boolean).join("\n");

        const textoPaciente = aMano
          ? "¡Hola " + paciente + "! Recibimos tu solicitud de turno, te paso los detalles:\n\n" + detalle +
            "\n\nEn cuanto " + profesional + " la confirme te aviso por acá. 😊"
          : "¡Hola " + paciente + "! Quería recordarte que tu turno quedó agendado, te paso los detalles:\n\n" + detalle +
            "\n\n¡Te esperamos! Si necesitás hacer alguna modificación o consulta previa, avisame por acá. 😊";

        const textoProfesional = aMano
          ? "🔔 Tenés un turno para confirmar:\n\n" + detalle + "\n\nPaciente: " + paciente + "\nEntrá a la app para confirmarlo."
          : "✅ Nuevo turno agendado por la página:\n\n" + detalle + "\n\nPaciente: " + paciente;

        const targetUrl = (lastKnownEvolutionConfig.apiUrl || process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
        const targetKey = lastKnownEvolutionConfig.apiKey || process.env.EVOLUTION_API_KEY || "";
        const targetInstance = (String((config as any).evolution_instance_name || "").trim() || lastKnownEvolutionConfig.instanceName || process.env.EVOLUTION_INSTANCE_NAME || "").trim();
        const puedeWhatsApp = Boolean(targetUrl && targetKey && targetInstance);

        if (puedeWhatsApp) {
          const numPaciente = String(nuevoTurno.patient_phone || "").replace(/\D/g, "");
          if (numPaciente.length >= 10) {
            sendEvolutionText({ targetUrl, targetKey, targetInstance, to: numPaciente, text: textoPaciente }).catch(() => {});
          }
          if ((config as any).avisar_prof_whatsapp) {
            const numProf = String((config as any).whatsapp_number || (config as any).phone || "").replace(/\D/g, "");
            if (numProf.length >= 10) {
              sendEvolutionText({ targetUrl, targetKey, targetInstance, to: numProf, text: textoProfesional }).catch(() => {});
            }
          }
        }

        if (nuevoTurno.patient_email) {
          enviarEmailRecordatorio(nuevoTurno.patient_email, aMano ? "Recibimos tu solicitud de turno" : "Tu turno quedó agendado", textoPaciente).catch(() => {});
        }

        const correoProf = (config as any).email || (config as any).sender_email || "";
        if ((config as any).avisar_prof_email !== false && correoProf) {
          enviarEmailRecordatorio(correoProf, aMano ? "Tenés un turno para confirmar" : "Nuevo turno agendado", textoProfesional).catch(() => {});
        }

        if ((config as any).avisar_prof_push !== false) {
          enviarPushReal({
            ownerId,
            title: aMano ? "🔔 Solicitud de Turno para Confirmar" : "✅ Nuevo Turno Agendado",
            body: `${paciente} - ${servicio} (${fecha} ${hora} hs)`,
            data: { type: aMano ? "booking_pending" : "booking_confirmed", appointment_id: docId }
          }).catch(() => {});
        }
      } catch (notifErr) {
        console.warn("[Crear Reserva Servidor] Error enviando notificaciones secundarias:", notifErr);
      }

      console.log(`[Crear Reserva Servidor] Turno ${docId} creado con éxito para ${ownerId}`);
      return res.json({
        ok: true,
        appointment: turnoCompleto,
        status: initialStatus,
        aMano
      });
    } catch (err: any) {
      console.error("[Crear Reserva Servidor] Error:", err);
      return res.status(500).json({ ok: false, error: err?.message || "Error al crear la reserva" });
    }
  });

  app.get("/api/publico/perfil/:handle", async (req, res) => {
    try {
      const handle = normalizarHandle(req.params.handle);
      if (!handle) return res.status(400).json({ ok: false, error: "Falta el enlace" });
      const docs = await settingsDeCuentas();
      const perfil = docs.find((d: any) => normalizarHandle(d.handle) === handle);
      if (!perfil) return res.status(404).json({ ok: false, error: "No encontramos ese consultorio" });
      const ownerId = String(perfil.id || "").replace("practice_config_", "");
      if (!ownerId) return res.status(404).json({ ok: false, error: "Consultorio sin cuenta" });

      const [servicios, turnos] = await Promise.all([
        listarTodo("services", 1000),
        listarTodo("appointments", 2000)
      ]);
      const delDueno = (lista: any[]) => lista.filter((x: any) => String(x.owner_id || "") === ownerId);

      // Solo lo que la pagina necesita mostrar: ninguna clave sale de aca.
      const publico: any = {};
      for (const k of Object.keys(perfil)) {
        if (/key|token|secret|password|_api|api_|instance|evolution/i.test(k)) continue;
        publico[k] = perfil[k];
      }
      delete publico.id;

      let disponibilidad: any[] = [];
      try {
        const crudo = perfil.availability_json;
        if (typeof crudo === "string" && crudo.trim()) disponibilidad = JSON.parse(crudo);
        else if (Array.isArray(perfil.availability)) disponibilidad = perfil.availability;
      } catch {}

      const desde = Date.now() - 86400000;
      const ocupados = delDueno(turnos)
        .filter((t: any) => {
          const f = Date.parse(t.start_datetime || "");
          return Number.isFinite(f) && f > desde && String(t.status || "") !== "cancelled";
        })
        .map((t: any) => ({ start_datetime: t.start_datetime, end_datetime: t.end_datetime }));

      res.json({
        ok: true,
        owner_id: ownerId,
        perfil: publico,
        servicios: delDueno(servicios).filter((s: any) => s.is_active !== false),
        disponibilidad,
        ocupados
      });
    } catch (err: any) {
      console.error("[Publico] Error armando el perfil:", err?.message || err);
      res.status(500).json({ ok: false, error: "No se pudo cargar el consultorio" });
    }
  });

  // Prueba de modelos de IA. Decide el super admin y se prueba de verdad contra
  // la API: si un modelo no contesta, no sirve por mas que figure en la lista.
  const MODELOS_CANDIDATOS = [
    { id: "gemini-3.5-flash-lite", nombre: "Gemini 3.5 Flash Lite", nota: "El mas barato" },
    { id: "gemini-3.1-flash-lite", nombre: "Gemini 3.1 Flash Lite", nota: "Muy barato" },
    { id: "gemini-3.5-flash", nombre: "Gemini 3.5 Flash", nota: "Equilibrado" },
    { id: "gemini-3.8-flash", nombre: "Gemini 3.8 Flash", nota: "El mas capaz de los rapidos" },
    { id: "gemini-flash-latest", nombre: "Gemini Flash (ultimo)", nota: "Sigue siempre al mas nuevo" }
  ];

  app.post("/api/superadmin/probar-modelos", async (req, res) => {
    const sesion = await exigirSuperAdmin(req, res);
    if (!sesion) return;
    const ai = getAI();
    if (!ai) {
      return res.status(400).json({ ok: false, error: "Falta la clave de Gemini en el servidor" });
    }
    const extra = String(req.body?.modelo || "").trim();
    const lista = extra && !MODELOS_CANDIDATOS.some(x => x.id === extra)
      ? [{ id: extra, nombre: extra, nota: "Elegido a mano" }, ...MODELOS_CANDIDATOS]
      : MODELOS_CANDIDATOS;
    const resultados: any[] = [];
    for (const modelo of lista) {
      const arranque = Date.now();
      try {
        const r: any = await conLimiteDeTiempo(
          ai.models.generateContent({
            model: modelo.id,
            contents: "Respondé solamente con la palabra: listo"
          }),
          12000,
          "el modelo " + modelo.id
        );
        const texto = String(r?.text || "").trim();
        resultados.push({
          ...modelo,
          funciona: Boolean(texto),
          demora_ms: Date.now() - arranque,
          respuesta: texto.slice(0, 60)
        });
      } catch (err: any) {
        resultados.push({
          ...modelo,
          funciona: false,
          demora_ms: Date.now() - arranque,
          motivo: String(err?.message || err).slice(0, 160)
        });
      }
    }
    const funcionan = resultados.filter(x => x.funciona);
    res.json({
      ok: true,
      modelos: resultados,
      recomendado: funcionan.length ? funcionan[0].id : null,
      elegido_actual: cachedPracticeSettings.bot_ai_model || null
    });
  });

  // Panel de Super Admin: todo sale de la base, nada de datos de ejemplo.
  // Registros que quedaron sin ficha: turnos, cobros e historias de un paciente
  // que ya no existe. Son los que hacen que la caja muestre plata de nadie.
  const calcularHuerfanos = (pacientes: any[], turnos: any[], pagos: any[], consultas: any[]) => {
    const ids = new Set(pacientes.map((p: any) => String(p.id)));
    const claveDe = (nombre: any, telefono: any) =>
      normalizarNombre(nombre) + "|" + soloDigitos(String(telefono || "")).slice(-8);
    const claves = new Set(
      pacientes.map((p: any) =>
        claveDe(((p.first_name || "") + " " + (p.last_name || "")).trim() || p.name, p.phone)
      )
    );

    const suelto = (x: any) => {
      if (x?.patient_id && ids.has(String(x.patient_id))) return false;
      const clave = claveDe(x?.patient_name, x?.patient_phone);
      if (clave !== "|" && claves.has(clave)) return false;
      return true;
    };

    const turnosSueltos = turnos.filter(suelto);
    const pagosSueltos = pagos.filter(suelto);
    const consultasSueltas = consultas.filter(suelto);

    return {
      turnos: turnosSueltos.length,
      cobros: pagosSueltos.length,
      consultas: consultasSueltas.length,
      plata_en_cobros_sueltos: pagosSueltos.reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0),
      ids: {
        turnos: turnosSueltos.map((x: any) => x.id),
        cobros: pagosSueltos.map((x: any) => x.id),
        consultas: consultasSueltas.map((x: any) => x.id)
      }
    };
  };

  // Borra lo que quedo suelto. Lo dispara el super admin desde el panel.
  app.post("/api/superadmin/limpiar-sueltos", async (req, res) => {
    const sesion = await exigirSuperAdmin(req, res);
    if (!sesion) return;
    try {
      const [pacientes, turnos, pagos, consultas] = await Promise.all([
        listarTodo("patients"),
        listarTodo("appointments"),
        listarTodo("payments"),
        listarTodo("consultations")
      ]);
      const sueltos = calcularHuerfanos(pacientes, turnos, pagos, consultas);

      let borrados = 0;
      for (const id of sueltos.ids.turnos) { if (await borrarDocumento("appointments", id)) borrados++; }
      for (const id of sueltos.ids.cobros) { if (await borrarDocumento("payments", id)) borrados++; }
      for (const id of sueltos.ids.consultas) { if (await borrarDocumento("consultations", id)) borrados++; }

      console.log("[Integridad] Se limpiaron " + borrados + " registros sin ficha.");
      res.json({ ok: true, borrados, detalle: { turnos: sueltos.turnos, cobros: sueltos.cobros, consultas: sueltos.consultas } });
    } catch (err: any) {
      console.error("[Integridad] Error limpiando: " + (err?.message || err));
      res.status(500).json({ ok: false, error: "No se pudo limpiar" });
    }
  });

  app.get("/api/superadmin/overview", async (req, res) => {
    const sesion = await exigirSuperAdmin(req, res);
    if (!sesion) return;
    try {
      const [usuarios, turnos, pacientes, transferencias, pagos, consultas] = await Promise.all([
        listarTodo("users"),
        listarTodo("appointments"),
        listarTodo("patients"),
        listarTodo("saas_transfers"),
        listarTodo("payments"),
        listarTodo("consultations")
      ]);

      const porDueno = (lista: any[]) => {
        const mapa: Record<string, number> = {};
        for (const d of lista) {
          const dueno = String(d.owner_id || "");
          if (!dueno) continue;
          mapa[dueno] = (mapa[dueno] || 0) + 1;
        }
        return mapa;
      };
      const turnosPorDueno = porDueno(turnos);
      const pacientesPorDueno = porDueno(pacientes);
      const hace30 = Date.now() - 30 * 24 * 60 * 60 * 1000;

      const lista = usuarios.map((u: any) => {
        const email = String(u.email || "").toLowerCase();
        return {
          ...u,
          email,
          es_super_admin: SUPER_ADMIN_EMAILS.includes(email) || SUPER_ADMIN_UIDS.includes(String(u.id || "")),
          appointments_count: turnosPorDueno[u.id] || 0,
          patients_count: pacientesPorDueno[u.id] || 0
        };
      });

      const clientes = lista.filter((u: any) => !u.es_super_admin && u.email);
      const idsSuper = lista.filter((u: any) => u.es_super_admin).map((u: any) => u.id);
      const activos = clientes.filter((u: any) => u.status === "active" && !u.trial_active);
      const enPrueba = clientes.filter((u: any) => u.status === "trial" || Boolean(u.trial_active));
      const mrr = activos.reduce((acc: number, u: any) => acc + Number(u.amount_monthly_ars || (u.plan === "pro" ? 59000 : 39000)), 0);
      const cobradoTotal = clientes.reduce((acc: number, u: any) => acc + Number(u.total_paid_ars || 0), 0);
      const turnosDeClientes = turnos.filter((t: any) => !idsSuper.includes(String(t.owner_id || "")));
      const turnos30 = turnos.filter((t: any) => {
        const f = Date.parse(t.start_datetime || t.created_at || "");
        return Number.isFinite(f) && f >= hace30;
      }).length;
      const transferenciasPendientes = transferencias.filter((t: any) => String(t.status || "pending") === "pending").length;

      res.json({
        ok: true,
        generado: new Date().toISOString(),
        admin: { uid: sesion.uid, email: sesion.email },
        usuarios: lista,
        totales: {
          usuarios: clientes.length,
          activos: activos.length,
          en_prueba: enPrueba.length,
          pro: clientes.filter((u: any) => u.plan === "pro").length,
          basic: clientes.filter((u: any) => u.plan === "basic").length,
          mrr,
          cobrado_total: cobradoTotal,
          turnos: turnos.length,
          turnos_sin_dueno: turnos.filter((t: any) => !String(t.owner_id || "").trim()).length,
          pacientes_sin_dueno: pacientes.filter((p: any) => !String(p.owner_id || "").trim()).length,
          turnos_de_clientes: turnosDeClientes.length,
          turnos_30_dias: turnos30,
          pacientes: pacientes.length,
          pagos_consultorios: pagos.length,
          transferencias_pendientes: transferenciasPendientes
        },
        sueltos: calcularHuerfanos(pacientes, turnos, pagos, consultas),
        integraciones: {
          whatsapp: {
            configurado: Boolean(lastKnownEvolutionConfig?.apiUrl && lastKnownEvolutionConfig?.apiKey),
            instancia: lastKnownEvolutionConfig?.instanceName || ""
          },
          correo: { configurado: Boolean(process.env.RESEND_API_KEY || cachedPracticeSettings?.resend_api_key) },
          mercadopago: { configurado: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN) },
          dlocal: { configurado: Boolean(process.env.DLOCAL_GO_API_KEY) },
          base_de_datos: { configurado: hayPersistencia() }
        },
        // Solo dice si la variable llego al servidor. Nunca viaja el valor.
        variables_cargadas: {
          RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
          EMAIL_FROM: Boolean(process.env.EMAIL_FROM),
          MERCADOPAGO_ACCESS_TOKEN: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN),
          DLOCAL_GO_API_KEY: Boolean(process.env.DLOCAL_GO_API_KEY),
          EVOLUTION_API_KEY: Boolean(process.env.EVOLUTION_API_KEY),
          GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY),
          FIREBASE_SERVICE_ACCOUNT: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT)
        },
        errores: erroresPlataforma.slice(-30).reverse()
      });
    } catch (err: any) {
      console.error("[SuperAdmin] Error armando el panel:", err?.message || err);
      res.status(500).json({ ok: false, error: "No se pudo armar el panel" });
    }
  });

  app.post("/api/admin/migrar-owner", async (req, res) => {
    const esperado = process.env.CRON_SECRET || "";
    const recibido = String(req.headers["x-cron-secret"] || req.query.secret || "");
    if (!esperado || recibido !== esperado) {
      return res.status(401).json({ ok: false, error: "No autorizado" });
    }
    if (!hayPersistencia()) {
      return res.status(400).json({ ok: false, error: "Falta la credencial de Firestore" });
    }

    const owner = String(req.body?.owner_id || "").trim();
    if (!owner) {
      return res.status(400).json({ ok: false, error: "Falta owner_id (el uid de la cuenta dueña)" });
    }
    const simulacion = req.body?.aplicar !== true;
    const colecciones = ["appointments", "patients", "services", "consultations", "payments", "waitlist"];
    const resumen: any = { owner_id: owner, simulacion, detalle: {} };

    try {
      for (const col of colecciones) {
        const docs = await listarColeccion(col, 1000);
        const sinDueno = docs.filter((d: any) => !d.owner_id);
        resumen.detalle[col] = { total: docs.length, sin_dueno: sinDueno.length, actualizados: 0 };
        if (simulacion) continue;
        for (const d of sinDueno) {
          if (await actualizarCampos(col, d.id, { owner_id: owner })) {
            resumen.detalle[col].actualizados++;
          }
        }
      }
      console.log(`[Migracion] ${simulacion ? "Simulacion" : "Aplicada"} para ${owner}:`, JSON.stringify(resumen.detalle));
      return res.json({ ok: true, ...resumen });
    } catch (err: any) {
      console.error("[Migracion] Error:", err?.message || err);
      return res.status(500).json({ ok: false, error: err?.message || "error" });
    }
  });

  // Cloud Run apaga el contenedor cuando no hay trafico y con el se van los
  // temporizadores. Este endpoint lo despierta: Cloud Scheduler lo llama cada
  // 5 minutos y ahi si los recordatorios salen aunque nadie use la app.
  app.all("/api/cron/reminders", async (req, res) => {
    const esperado = process.env.CRON_SECRET || "";
    let recibido = String(req.headers["x-cron-secret"] || req.query.secret || "");
    try {
      if (recibido.includes("%")) {
        recibido = decodeURIComponent(recibido);
      }
    } catch {}
    if (esperado && recibido !== esperado) {
      return res.status(401).json({ ok: false, error: "No autorizado" });
    }
    try {
      // Si el contenedor acaba de arrancar todavia no tiene la configuracion.
      if (!reminderConfig || businessContext.updatedAt === 0) {
        await cargarConfigDesdeBase();
      }
      await procesarRecordatorios();
      return res.json({ ok: true, at: new Date().toISOString() });
    } catch (err: any) {
      console.error("[Cron] Error procesando recordatorios:", err?.message || err);
      return res.status(500).json({ ok: false, error: err?.message || "error" });
    }
  });

  // Diagnostico: que webhook tiene registrado Evolution para la instancia y
  // como salio el ultimo intento de registro desde esta app.
  app.get("/api/evolution/webhook-status", async (req, res) => {
    try {
      const targetUrl = (lastKnownEvolutionConfig.apiUrl || cachedPracticeSettings.evolution_api_url || process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
      const targetKey = lastKnownEvolutionConfig.apiKey || cachedPracticeSettings.evolution_api_key || process.env.EVOLUTION_API_KEY || "";
      const targetInstance = (lastKnownEvolutionConfig.instanceName || cachedPracticeSettings.evolution_instance_name || process.env.EVOLUTION_INSTANCE_NAME || "").trim();

      // Diagnostico: que dice la BASE (no lo que tenga el navegador a mano).
      const propia = await configDeLaCuentaDelBot();
      const cuentaDelBot = await duenoDeLaInstancia();

      const base: any = {
        configEnLaBase: {
          cuenta: cuentaDelBot || null,
          cuentasConConfig: (await settingsDeCuentas()).length,
          instanciaBuscada: (lastKnownEvolutionConfig.instanceName || ""),
          documentoEncontrado: Boolean(propia && Object.keys(propia).length),
          bot_enabled: propia ? (propia as any).bot_enabled : null,
          tieneHorarios: Boolean(propia && typeof (propia as any).availability_json === "string" && (propia as any).availability_json.trim()),
          plantilla24h: Boolean(reminderConfig?.whatsapp_template_24h),
          plantilla2h: Boolean(reminderConfig?.whatsapp_template_2h)
        },
        ultimoIntento: lastWebhookResult,
        instancia: targetInstance || null,
        tieneCredenciales: Boolean(targetUrl && targetKey),
        persistenciaActiva: hayPersistencia(),
        botActivo: cachedPracticeSettings.bot_enabled === true,
        contextoFresco: isBusinessContextFresh(),
        servicios: businessContext.services.length,
        franjasHorarias: businessContext.availability.length,
        turnosFuturos: businessContext.existingAppointments.length,
        plan: cachedPracticeSettings.subscription_plan || "trial",
        canalesPorPlan: canalesDelPlan(),
        recordatorios: reminderConfig ? {
          whatsapp: reminderConfig.whatsapp_enabled !== false,
          email: reminderConfig.email_enabled !== false,
          antes24h: reminderConfig.send_24h_before !== false,
          antes2h: reminderConfig.send_2h_before !== false
        } : "sin configuracion cargada",
        conversacionesEnMemoria: realWhatsAppConversations.size
      };

      if (!targetUrl || !targetKey || !targetInstance) {
        return res.json({ ...base, registrado: null, nota: "El servidor todavia no recibio credenciales de Evolution (las manda el front al sincronizar)." });
      }

      const r = await fetch(`${targetUrl}/webhook/find/${targetInstance}`, {
        method: "GET",
        headers: { "apikey": targetKey, "Content-Type": "application/json" }
      });
      const txt = await r.text().catch(() => "");
      let data: any = {};
      try { data = txt ? JSON.parse(txt) : {}; } catch { data = { raw: txt.slice(0, 300) }; }

      const w = data?.webhook || data;
      return res.json({
        ...base,
        status: r.status,
        registrado: {
          url: w?.url || null,
          enabled: w?.enabled ?? null,
          eventos: w?.events || null,
          porEventos: w?.webhookByEvents ?? w?.webhook_by_events ?? null
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "error" });
    }
  });

  // Cloud Run apaga el contenedor cuando no hay trafico. Si el primer mensaje
  // llega mientras el servidor recien arranca, la configuracion todavia no esta
  // cargada: el bot se queda callado por precaucion y ese mensaje se pierde.
  // Antes de decidir nada, esperamos a tener la configuracion en la mano.
  let cargaDeConfigEnCurso: Promise<void> | null = null;

  const asegurarConfigCargada = async () => {
    const alDia = Date.now() - ultimaCargaConfig < 60000;
    if (typeof cachedPracticeSettings?.bot_enabled === "boolean" && isBusinessContextFresh() && alDia) return;
    if (!cargaDeConfigEnCurso) {
      cargaDeConfigEnCurso = cargarConfigDesdeBase().finally(() => { cargaDeConfigEnCurso = null; });
    }
    try {
      await cargaDeConfigEnCurso;
    } catch {}
  };

  app.post("/api/evolution/webhook", async (req, res) => {
    // Respondemos 200 ANTES de procesar. Evolution corta a los pocos segundos y
    // reintenta: esperar al modelo aca era lo que generaba respuestas duplicadas.
    res.status(200).json({ received: true });

    try {
      const eventData = req.body;
      const eventType = (eventData?.event || eventData?.type || "").toLowerCase().replace(/_/g, ".");
      console.log(`[Evolution Webhook] Received event: "${eventType}"`);

      // Solo mensajes entrantes nuevos. Antes entraba CUALQUIER evento
      // (messages.update, send.message, connection.update) por el mismo embudo,
      // y los ecos de nuestros propios envios disparaban respuestas.
      if (eventType && !eventType.includes("messages.upsert")) {
        console.log(`[Evolution Webhook] Evento ignorado: "${eventType}"`);
        return;
      }

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

      // De que consultorio es este mensaje. Con una sola conexion sigue siendo el
      // de siempre; cuando cada profesional tenga su numero, cada uno contesta con
      // su propia agenda y el turno cae en la suya.
      await asegurarConfigCargada();

      const instanciaEvento = String(eventData?.instance || eventData?.instanceName || eventData?.data?.instance || "").trim();
      const duenoMensaje = await duenoDeLaInstancia(instanciaEvento);
      const ctxCuenta = duenoMensaje ? await contextoDeCuenta(duenoMensaje) : null;
      const usarCuenta = Boolean(ctxCuenta && ((ctxCuenta.services || []).length || (ctxCuenta.availability || []).length));
      if (usarCuenta) console.log("[Evolution Webhook] Mensaje de la cuenta " + duenoMensaje);

      const syncOptions = {
        targetUrl: (lastKnownEvolutionConfig.apiUrl || cachedPracticeSettings.evolution_api_url || process.env.EVOLUTION_API_URL || "").replace(/\/$/, ""),
        targetKey: lastKnownEvolutionConfig.apiKey || cachedPracticeSettings.evolution_api_key || process.env.EVOLUTION_API_KEY || "",
        // Respondemos por la instancia de la cuenta o por la configurada, nunca
        // por un nombre que venga en el evento y que no conozcamos.
        targetInstance: (((usarCuenta && ctxCuenta?.instancia) ? ctxCuenta.instancia : "") || lastKnownEvolutionConfig.instanceName || cachedPracticeSettings.evolution_instance_name || process.env.EVOLUTION_INSTANCE_NAME || "consultorio").trim(),
        services: usarCuenta ? ctxCuenta.services : businessContext.services,
        availability: usarCuenta ? ctxCuenta.availability : businessContext.availability,
        existingAppointments: usarCuenta ? ctxCuenta.existingAppointments : businessContext.existingAppointments,
        autoReplyIfPatient: true,
        isLive: true
      };

      for (const msgObj of msgList) {
        // Idempotencia por id: si Evolution reintenta, no procesamos dos veces.
        const mid = msgObj?.key?.id || msgObj?.id;
        if (mid && alreadyProcessed(String(mid))) {
          console.log(`[Evolution Webhook] Mensaje duplicado ignorado: ${mid}`);
          continue;
        }
        await processIncomingOrSyncedMessage(msgObj, syncOptions);
      }
    } catch (err: any) {
      console.error("[Evolution Webhook] Handler error:", err);
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

  const practiceMercadoPagoTokens: Map<string, { token: string; email?: string; userId?: string; updatedAt: number }> = new Map();

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
        accessToken,
        practiceUid
      } = req.body;

      const finalAmount = Number(amount !== undefined ? amount : price);
      const token = (
        accessToken ||
        (practiceUid ? practiceMercadoPagoTokens.get(practiceUid)?.token : null) ||
        cachedPracticeSettings.patient_deposit_mp_token ||
        process.env.MERCADOPAGO_ACCESS_TOKEN ||
        ""
      ).trim();
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

      const cleanEmail = (patientEmail && patientEmail.includes("@") && !patientEmail.includes("example.com"))
        ? patientEmail.trim()
        : "paciente.reserva@gmail.com";

      const preferenceData: any = {
        items: [
          {
            id: aptId,
            title: (title || "Seña de Turno").slice(0, 120),
            quantity: 1,
            unit_price: Number(finalAmount.toFixed(2)),
            currency_id: "ARS"
          }
        ],
        payer: {
          name: (patientName || "Paciente").slice(0, 50),
          email: cleanEmail
        },
        back_urls: {
          success: `${appUrl}/#payment-success?apt=${aptId}&amount=${finalAmount}&status=approved`,
          pending: `${appUrl}/#payment-pending?apt=${aptId}&amount=${finalAmount}&status=pending`,
          failure: `${appUrl}/#payment-failure?apt=${aptId}&amount=${finalAmount}&status=failure`
        },
        external_reference: aptId,
        statement_descriptor: "AGENFACIL"
      };

      if (appUrl.startsWith("https://")) {
        preferenceData.auto_return = "approved";
        preferenceData.notification_url = `${appUrl}/api/mercadopago/webhook`;
      }

      if (patientPhone) {
        const numOnly = patientPhone.replace(/\D/g, "");
        if (numOnly.length >= 8) {
          preferenceData.payer.phone = { number: numOnly.slice(-10) };
        }
      }

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
        console.error("Mercado Pago create-preference failed:", data);
        return res.status(response.status).json({
          success: false,
          error: data?.message || data?.cause?.[0]?.description || "Error al crear la preferencia en Mercado Pago"
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

  // Verify any Mercado Pago Access Token
  app.post("/api/mercadopago/verify-token", async (req, res) => {
    try {
      const token = (req.body?.accessToken || req.body?.token || process.env.MERCADOPAGO_ACCESS_TOKEN || "").trim();
      if (!token) {
        return res.status(400).json({ valid: false, error: "Debes ingresar un Access Token de Mercado Pago." });
      }

      const mpRes = await fetch("https://api.mercadopago.com/users/me", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data: any = await mpRes.json();
      if (!mpRes.ok) {
        return res.status(400).json({
          valid: false,
          error: data?.message || `Error de Mercado Pago (${mpRes.status}): no se pudo autenticar la cuenta.`
        });
      }

      const isLive = token.startsWith("APP_USR-");
      const isTest = token.startsWith("TEST-");

      // Test creating a preference with this token
      let canCreatePreferences = false;
      let prefWarning: string | null = null;
      try {
        const dryPrefRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            items: [
              {
                id: "test-verif",
                title: "Verificación de Seña",
                quantity: 1,
                unit_price: 100,
                currency_id: "ARS"
              }
            ]
          })
        });
        const dryData = await dryPrefRes.json();
        if (dryPrefRes.ok && dryData.id) {
          canCreatePreferences = true;
        } else {
          prefWarning = dryData?.message || "No se pudo verificar creación de preferencias";
        }
      } catch (e: any) {
        prefWarning = e?.message || "Error al verificar preferencia";
      }

      return res.json({
        valid: true,
        userId: data.id,
        nickname: data.nickname,
        email: data.email,
        name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || data.nickname,
        countryId: data.country_id,
        siteId: data.site_id,
        liveMode: isLive,
        testMode: isTest,
        canCreatePreferences,
        prefWarning,
        collectorId: data.id
      });
    } catch (err: any) {
      console.error("Error in /api/mercadopago/verify-token:", err);
      res.status(500).json({ valid: false, error: err.message });
    }
  });

  // Save practice credentials in server memory / cache
  app.post("/api/mercadopago/save-credentials", (req, res) => {
    try {
      const { practiceUid, token, email, userId } = req.body;
      if (!token) {
        return res.status(400).json({ error: "Token requerido" });
      }
      const cleanToken = String(token).trim();
      const id = practiceUid || "default";
      practiceMercadoPagoTokens.set(id, {
        token: cleanToken,
        email: email || "",
        userId: userId ? String(userId) : "",
        updatedAt: Date.now()
      });
      cachedPracticeSettings.patient_deposit_mp_token = cleanToken;
      cachedPracticeSettings.patient_deposit_mp_connected = true;
      if (email) cachedPracticeSettings.patient_deposit_mp_email = email;
      if (userId) cachedPracticeSettings.patient_deposit_mp_user_id = String(userId);
      return res.json({ success: true, connected: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Mercado Pago Subscription / Preapproval for SaaS Plans
  app.post("/api/mercadopago/create-subscription", async (req, res) => {
    try {
      const {
        planId = "pro",
        planName = "Plan Pro AI",
        billingCycle = "monthly",
        amount = 59000,
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
        const token = process.env.MERCADOPAGO_ACCESS_TOKEN || cachedPracticeSettings.patient_deposit_mp_token;
        if (token) {
          const checkRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const paymentInfo: any = await checkRes.json();
          console.log(`[Mercado Pago] Payment ${paymentId} status: ${paymentInfo?.status}, external_ref: ${paymentInfo?.external_reference}`);
          
          if (paymentInfo?.status === "approved" && paymentInfo?.external_reference) {
            const aptId = String(paymentInfo.external_reference);
            try {
              await actualizarCampos("appointments", aptId, {
                payment_status: "paid",
                deposit_paid: true,
                deposit_method: "mercadopago_connect",
                deposit_paid_at: new Date().toISOString(),
                mercadopago_payment_id: String(paymentId)
              });
              console.log(`[Mercado Pago Webhook] Turno ${aptId} confirmado y marcado como abonado.`);
            } catch (e: any) {
              console.error(`[Mercado Pago Webhook] Error al actualizar turno ${aptId}:`, e?.message);
            }
          }
        }
      }

      return res.status(200).json({ status: "ok" });
    } catch (err: any) {
      console.error("Error in /api/mercadopago/webhook:", err);
      return res.status(200).json({ received: true });
    }
  });

  // Mercado Pago Connect OAuth authorization endpoint
  app.get("/api/mercadopago/oauth/authorize-url", (req, res) => {
    try {
      const clientId = process.env.MERCADOPAGO_CLIENT_ID;
      const appUrl = getAppBaseUrl(req);
      const redirectUri = `${appUrl}/api/mercadopago/oauth/callback`;
      const state = req.query.state || "mp_connect_practice";

      if (clientId) {
        const authUrl = `https://auth.mercadopago.com.ar/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${encodeURIComponent(String(state))}&redirect_uri=${encodeURIComponent(redirectUri)}`;
        return res.json({
          configured: true,
          authUrl,
          redirectUri
        });
      }

      return res.json({
        configured: false,
        authUrl: null,
        message: "MERCADOPAGO_CLIENT_ID no configurado en el servidor. Modo conexión rápida disponible."
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Mercado Pago Connect OAuth callback endpoint
  app.get("/api/mercadopago/oauth/callback", async (req, res) => {
    const appUrl = getAppBaseUrl(req);
    try {
      const { code, error, error_description } = req.query;

      if (error || !code) {
        return res.redirect(`${appUrl}/#settings?tab=deposits&mp_error=${encodeURIComponent(String(error_description || error || "cancelled"))}`);
      }

      const clientId = process.env.MERCADOPAGO_CLIENT_ID;
      const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;
      const redirectUri = `${appUrl}/api/mercadopago/oauth/callback`;

      if (!clientId || !clientSecret) {
        return res.redirect(`${appUrl}/#settings?tab=deposits&mp_connected=true&mp_email=consultorio@mercadopago.com`);
      }

      const tokenRes = await fetch("https://api.mercadopago.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          code: String(code),
          redirect_uri: redirectUri
        })
      });

      const tokenData: any = await tokenRes.json();
      if (tokenRes.ok && tokenData.access_token) {
        const accessToken = String(tokenData.access_token).trim();
        practiceMercadoPagoTokens.set("default", {
          token: accessToken,
          email: tokenData.email || "",
          userId: String(tokenData.user_id || ""),
          updatedAt: Date.now()
        });
        cachedPracticeSettings.patient_deposit_mp_token = accessToken;
        cachedPracticeSettings.patient_deposit_mp_connected = true;
        if (tokenData.email) cachedPracticeSettings.patient_deposit_mp_email = tokenData.email;

        return res.redirect(`${appUrl}/#settings?tab=deposits&mp_connected=true&mp_token=${encodeURIComponent(accessToken)}&mp_public_key=${encodeURIComponent(tokenData.public_key || "")}&mp_user_id=${tokenData.user_id || ""}&mp_email=${encodeURIComponent(tokenData.email || "consultorio@mercadopago.com")}`);
      } else {
        return res.redirect(`${appUrl}/#settings?tab=deposits&mp_error=${encodeURIComponent(tokenData.message || "Error al autenticar con Mercado Pago")}`);
      }
    } catch (err: any) {
      console.error("Error in /api/mercadopago/oauth/callback:", err);
      return res.redirect(`${appUrl}/#settings?tab=deposits&mp_error=${encodeURIComponent(err.message)}`);
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
        amount = 59000,
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
        console.warn("DLocal Go API Error:", data);
        // Do not return HTTP 403 / 500 to prevent reverse-proxy / Vite HTML error interception.
        // Fallback to interactive Checkout Pro simulation so user and testers are never blocked.
        return res.json({
          success: true,
          simulated: true,
          orderId: orderId,
          redirect_url: `${appUrl}/#dlocal-checkout-simulate?plan=${planId}&cycle=${billingCycle}&amount=${amount}&currency=${currency}&order=${orderId}&email=${encodeURIComponent(userEmail)}`,
          success_url: successUrl,
          warning: data?.message || "Credenciales de DLocal Go en revisión o inválidas (código 3001). Modo interactivo Checkout Pro activado.",
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
      const appUrl = getAppBaseUrl(req);
      const planId = req.body?.planId || "pro";
      const billingCycle = req.body?.billingCycle || "monthly";
      const userEmail = req.body?.userEmail || "gonzalocorat@gmail.com";
      const orderId = `order_dlocal_${planId}_${Date.now()}`;
      return res.json({
        success: true,
        simulated: true,
        orderId: orderId,
        redirect_url: `${appUrl}/#dlocal-checkout-simulate?plan=${planId}&cycle=${billingCycle}&amount=59000&currency=ARS&order=${orderId}&email=${encodeURIComponent(userEmail)}`,
        warning: err.message
      });
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
        amount = 59000,
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
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : undefined
      },
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

  // Restauramos bandeja y configuracion antes de empezar a atender pedidos.
  cargarConversacionesGuardadas().catch(err =>
    console.error("[Firestore] Fallo la restauracion inicial:", err?.message || err)
  );
  cargarConfigDesdeBase().catch(() => {});
  // Refresco periodico: turnos y configuracion cambian mientras el bot atiende.
  setInterval(() => { cargarConfigDesdeBase().catch(() => {}); }, 5 * 60 * 1000);

  // Recordatorios: revisamos cada 5 minutos. La primera pasada espera un minuto
  // para que la configuracion ya este cargada.
  setTimeout(() => { procesarRecordatorios().catch(() => {}); }, 60 * 1000);
  setInterval(() => { procesarRecordatorios().catch(() => {}); }, 5 * 60 * 1000);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Agenfacil Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
