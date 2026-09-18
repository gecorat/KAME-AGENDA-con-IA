import React, { useState } from 'react';
import {
  Database,
  Download,
  FileSpreadsheet,
  FileJson,
  CheckCircle2,
  Users,
  Calendar,
  Stethoscope,
  ShieldCheck,
  AlertCircle,
  FolderArchive,
  ArrowDownToLine,
  Table,
  Sparkles,
  Info,
  Check
} from 'lucide-react';
import { useAgendaStore } from '../../lib/store';
import { Patient, Appointment, ConsultationRecord } from '../../types';

export const DataBackupSettings: React.FC = () => {
  const {
    practiceSettings,
    patients,
    appointments,
    consultations
  } = useAgendaStore();

  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);
  const [csvDelimiter, setCsvDelimiter] = useState<';' | ','>(';');
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [activePreview, setActivePreview] = useState<'none' | 'patients' | 'appointments' | 'consultations'>('none');

  const showSuccess = (msg: string) => {
    setDownloadSuccessMessage(msg);
    setTimeout(() => {
      setDownloadSuccessMessage(null);
    }, 3500);
  };

  // Safe file name slug generator
  const getCleanSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '_')
      .replace(/^-+|-+$/g, '') || 'consultorio';
  };

  const practiceSlug = getCleanSlug(practiceSettings.practice_name || 'agenfacil');
  const todayStr = new Date().toISOString().split('T')[0];

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const escapeCsv = (val: any): string => {
    if (val === null || val === undefined) return '""';
    if (typeof val === 'object') {
      try {
        return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      } catch {
        return '""';
      }
    }
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  // 1. Export JSON Full Backup
  const handleExportFullJson = () => {
    const backupData = {
      version: '3.0',
      exported_at: new Date().toISOString(),
      metadata: {
        practice_name: practiceSettings.practice_name || 'Consultorio Médico',
        professional_name: practiceSettings.professional_name || 'Profesional a Cargo',
        medical_license: practiceSettings.medical_license || '',
        specialty: practiceSettings.specialty || '',
        total_patients: patients.length,
        total_appointments: appointments.length,
        total_consultations: consultations.length
      },
      data: {
        pacientes: patients,
        turnos: appointments,
        consultas_clinicas: consultations
      }
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    downloadFile(
      jsonString,
      `respaldo_completo_${practiceSlug}_${todayStr}.json`,
      'application/json;charset=utf-8;'
    );
    showSuccess('Respaldo completo (.JSON) generado y descargado correctamente.');
  };

  // 2. Export Individual JSONs
  const handleExportPatientsJson = () => {
    const jsonString = JSON.stringify(patients, null, 2);
    downloadFile(jsonString, `pacientes_${practiceSlug}_${todayStr}.json`, 'application/json;charset=utf-8;');
    showSuccess('Archivo de Pacientes (.JSON) descargado.');
  };

  const handleExportAppointmentsJson = () => {
    const jsonString = JSON.stringify(appointments, null, 2);
    downloadFile(jsonString, `turnos_${practiceSlug}_${todayStr}.json`, 'application/json;charset=utf-8;');
    showSuccess('Archivo de Turnos (.JSON) descargado.');
  };

  const handleExportConsultationsJson = () => {
    const jsonString = JSON.stringify(consultations, null, 2);
    downloadFile(jsonString, `consultas_${practiceSlug}_${todayStr}.json`, 'application/json;charset=utf-8;');
    showSuccess('Archivo de Consultas Clínicas (.JSON) descargado.');
  };

  // 3. Export CSV: Patients
  const handleExportPatientsCsv = () => {
    const headers = [
      'ID Paciente',
      'Nombre',
      'Apellido',
      'Nombre Completo',
      'DNI / Identificación',
      'Teléfono / WhatsApp',
      'Email',
      'Fecha de Nacimiento',
      'Obra Social / Prepaga',
      'Número de Afiliado',
      'Grupo Sanguíneo',
      'Alergias',
      'Estado Relación',
      'Total Citas',
      'Citas Completadas',
      'Notas Médicas',
      'Fecha de Registro'
    ];

    const rows = patients.map(p => {
      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sin Nombre';
      const allergies = Array.isArray(p.allergies) ? p.allergies.join(', ') : (p.allergies || '');
      const state = p.relationship_status === 'prospect' ? 'Prospecto / Futuro' : 'Activo';

      return [
        escapeCsv(p.id),
        escapeCsv(p.first_name || ''),
        escapeCsv(p.last_name || ''),
        escapeCsv(fullName),
        escapeCsv(p.dni || ''),
        escapeCsv(p.phone || ''),
        escapeCsv(p.email || ''),
        escapeCsv(p.birth_date || ''),
        escapeCsv(p.insurance_provider || p.insurance_company || ''),
        escapeCsv(p.insurance_number || ''),
        escapeCsv(p.blood_type || ''),
        escapeCsv(allergies),
        escapeCsv(state),
        escapeCsv(p.total_appointments ?? 0),
        escapeCsv(p.completed_appointments_count ?? 0),
        escapeCsv(p.notes || ''),
        escapeCsv(p.created_at || '')
      ].join(csvDelimiter);
    });

    // \uFEFF for UTF-8 BOM in Excel
    const csvContent = '\uFEFF' + [headers.map(h => escapeCsv(h)).join(csvDelimiter), ...rows].join('\r\n');
    downloadFile(csvContent, `pacientes_${practiceSlug}_${todayStr}.csv`, 'text/csv;charset=utf-8;');
    showSuccess('Exportación de Pacientes (.CSV) generada para Excel y planillas.');
  };

  // 4. Export CSV: Appointments
  const handleExportAppointmentsCsv = () => {
    const headers = [
      'ID Turno',
      'Fecha y Hora Inicio',
      'Fecha y Hora Fin',
      'Fecha',
      'Hora',
      'Paciente',
      'DNI Paciente',
      'Teléfono Paciente',
      'Email Paciente',
      'Servicio',
      'Precio ($)',
      'Estado del Turno',
      'Estado de Pago',
      'Método de Pago',
      'Canal de Origen',
      'Confirmado por Paciente',
      'Fecha Confirmación',
      'Seña Declarada',
      'Monto Seña ($)',
      'Enlace Telemedicina',
      'Notas del Turno'
    ];

    const getStatusLabel = (status: string) => {
      switch (status) {
        case 'confirmed': return 'Confirmado';
        case 'completed': return 'Completado / Atendido';
        case 'pending': return 'Pendiente';
        case 'cancelled': return 'Cancelado';
        case 'no_show': return 'No Asistió';
        default: return status;
      }
    };

    const getPaymentStatusLabel = (status: string) => {
      switch (status) {
        case 'paid': return 'Cobrado / Pagado';
        case 'pending': return 'Pendiente de Pago';
        case 'partial': return 'Pago Parcial / Seña';
        case 'refunded': return 'Reembolsado';
        default: return status;
      }
    };

    const rows = appointments.map(a => {
      const dateOnly = a.start_datetime ? a.start_datetime.split('T')[0] : (a.date || '');
      const timeOnly = a.start_datetime && a.start_datetime.includes('T')
        ? a.start_datetime.split('T')[1].substring(0, 5)
        : (a.time || '');

      return [
        escapeCsv(a.id),
        escapeCsv(a.start_datetime || ''),
        escapeCsv(a.end_datetime || ''),
        escapeCsv(dateOnly),
        escapeCsv(timeOnly),
        escapeCsv(a.patient_name || ''),
        escapeCsv(a.patient_dni || ''),
        escapeCsv(a.patient_phone || ''),
        escapeCsv(a.patient_email || ''),
        escapeCsv(a.service_name || ''),
        escapeCsv(a.service_price ?? a.price ?? 0),
        escapeCsv(getStatusLabel(a.status)),
        escapeCsv(getPaymentStatusLabel(a.payment_status)),
        escapeCsv(a.payment_method || ''),
        escapeCsv(a.origin || 'manual'),
        escapeCsv(a.patient_confirmed || a.status === 'confirmed' || a.status === 'completed' ? 'Sí' : 'No'),
        escapeCsv(a.patient_confirmed_at || ''),
        escapeCsv(a.deposit_declared ? 'Sí' : 'No'),
        escapeCsv(a.deposit_amount ?? 0),
        escapeCsv(a.meet_url || ''),
        escapeCsv(a.notes || '')
      ].join(csvDelimiter);
    });

    const csvContent = '\uFEFF' + [headers.map(h => escapeCsv(h)).join(csvDelimiter), ...rows].join('\r\n');
    downloadFile(csvContent, `turnos_${practiceSlug}_${todayStr}.csv`, 'text/csv;charset=utf-8;');
    showSuccess('Exportación de Turnos (.CSV) generada correctamente.');
  };

  // 5. Export CSV: Consultations
  const handleExportConsultationsCsv = () => {
    const headers = [
      'ID Consulta',
      'Fecha',
      'Paciente',
      'Teléfono Paciente',
      'Servicio',
      'Motivo de Consulta',
      'Tipo de Consulta',
      'Evolución Clínica',
      'SOAP Subjetivo (Síntomas)',
      'SOAP Objetivo (Examen)',
      'SOAP Análisis (Diagnóstico)',
      'SOAP Plan (Tratamiento)',
      'Procedimiento Realizado',
      'Signos Vitales Registrados',
      'Presión Arterial',
      'Frecuencia Cardíaca',
      'Temperatura',
      'Peso (kg)',
      'Altura (cm)',
      'Recetas Prescriptas',
      'Certificados Emitidos',
      'Fecha Creación Registro'
    ];

    const rows = consultations.map(c => {
      const vs = c.vital_signs;
      const vsSummary = vs
        ? `PA: ${vs.blood_pressure || '-'} | FC: ${vs.heart_rate || '-'} | T: ${vs.temperature || '-'} | Peso: ${vs.weight_kg || '-'}`
        : 'No registrados';

      const prescriptionsSummary = c.prescriptions && c.prescriptions.length > 0
        ? c.prescriptions.map(p => `${p.medication} (${p.dosage || ''} - ${p.instructions || ''})`).join('; ')
        : 'Sin recetas';

      const certificatesSummary = c.certificates && c.certificates.length > 0
        ? c.certificates.map(cert => `${cert.certificate_type || 'Certificado'}: ${cert.diagnosis || ''}`).join('; ')
        : 'Sin certificados';

      return [
        escapeCsv(c.id),
        escapeCsv(c.date || ''),
        escapeCsv(c.patient_name || ''),
        escapeCsv(c.patient_phone || ''),
        escapeCsv(c.service_name || ''),
        escapeCsv(c.reason_for_visit || ''),
        escapeCsv(c.consultation_type || 'general'),
        escapeCsv(c.clinical_evolution || ''),
        escapeCsv(c.soap_subjective || ''),
        escapeCsv(c.soap_objective || ''),
        escapeCsv(c.soap_analysis || ''),
        escapeCsv(c.soap_plan || ''),
        escapeCsv(c.treatment_performed || ''),
        escapeCsv(vsSummary),
        escapeCsv(vs?.blood_pressure || ''),
        escapeCsv(vs?.heart_rate || ''),
        escapeCsv(vs?.temperature || ''),
        escapeCsv(vs?.weight_kg || ''),
        escapeCsv(vs?.height_cm || ''),
        escapeCsv(prescriptionsSummary),
        escapeCsv(certificatesSummary),
        escapeCsv(c.created_at || '')
      ].join(csvDelimiter);
    });

    const csvContent = '\uFEFF' + [headers.map(h => escapeCsv(h)).join(csvDelimiter), ...rows].join('\r\n');
    downloadFile(csvContent, `consultas_${practiceSlug}_${todayStr}.csv`, 'text/csv;charset=utf-8;');
    showSuccess('Exportación de Consultas e Historias Clínicas (.CSV) descargada.');
  };

  // 6. Bulk Export All CSVs
  const handleExportAllCsvs = () => {
    setIsExportingAll(true);
    handleExportPatientsCsv();
    setTimeout(() => {
      handleExportAppointmentsCsv();
    }, 400);
    setTimeout(() => {
      handleExportConsultationsCsv();
      setIsExportingAll(false);
      showSuccess('¡Los 3 archivos CSV (Pacientes, Turnos y Consultas) fueron descargados!');
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Stats & Portability Guarantee */}
      <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-sky-400 border border-white/10 shadow-inner shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-display text-white">
                  Respaldo & Portabilidad de Datos
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  Portabilidad Garantizada
                </span>
              </div>
              <p className="text-xs text-neutral-300 mt-1 max-w-2xl leading-relaxed">
                Tus datos te pertenecen por completo. Descarga en cualquier momento una copia íntegra de tus 
                <strong> pacientes</strong>, <strong> agenda de turnos</strong> y <strong> consultas médicas / historias clínicas</strong> en 
                formatos abiertos y universales (JSON y CSV para Excel).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Privado & Seguro</span>
            </span>
          </div>
        </div>

        {/* Real-time Data Inventory Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/10">
          <div className="bg-white/5 hover:bg-white/10 transition p-3.5 rounded-xl border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-300 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">Pacientes</p>
                <p className="text-base font-bold text-white font-mono">{patients.length}</p>
              </div>
            </div>
            <span className="text-[10px] text-neutral-400 font-medium">Registrados</span>
          </div>

          <div className="bg-white/5 hover:bg-white/10 transition p-3.5 rounded-xl border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">Turnos & Citas</p>
                <p className="text-base font-bold text-white font-mono">{appointments.length}</p>
              </div>
            </div>
            <span className="text-[10px] text-neutral-400 font-medium">En Agenda</span>
          </div>

          <div className="bg-white/5 hover:bg-white/10 transition p-3.5 rounded-xl border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">Consultas / Fichas</p>
                <p className="text-base font-bold text-white font-mono">{consultations.length}</p>
              </div>
            </div>
            <span className="text-[10px] text-neutral-400 font-medium">Evoluciones</span>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {downloadSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-900 animate-in fade-in slide-in-from-top duration-300 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1 text-xs">
            <p className="font-bold text-emerald-950">¡Descarga exitosa!</p>
            <p className="text-emerald-800">{downloadSuccessMessage}</p>
          </div>
        </div>
      )}

      {/* Grid of 2 Main Export Engines: JSON vs CSV */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MODULE 1: EXPORTACIÓN COMPLETA JSON */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <FileJson className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 font-display">
                    Copia de Respaldo Completa (JSON)
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    Formato ideal para migraciones técnicas, desarrolladores y resguardo integral
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                .JSON
              </span>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              El archivo JSON almacena la estructura jerárquica exacta de la base de datos, incluyendo notas SOAP, signos vitales detallados, metadatos del consultorio, prescripciones y estados de pago.
            </p>

            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-[11px] space-y-1.5">
              <div className="flex items-center justify-between font-mono text-neutral-600">
                <span>• Pacientes:</span>
                <span className="font-bold text-neutral-900">{patients.length} registros</span>
              </div>
              <div className="flex items-center justify-between font-mono text-neutral-600">
                <span>• Agenda de Turnos:</span>
                <span className="font-bold text-neutral-900">{appointments.length} registros</span>
              </div>
              <div className="flex items-center justify-between font-mono text-neutral-600">
                <span>• Fichas y Consultas:</span>
                <span className="font-bold text-neutral-900">{consultations.length} registros</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={handleExportFullJson}
              className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <FolderArchive className="w-4 h-4 text-indigo-300" />
              <span>Descargar Respaldo Total Unificado (.JSON)</span>
            </button>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={handleExportPatientsJson}
                className="py-1.5 px-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-[11px] font-medium transition flex items-center justify-center gap-1 cursor-pointer"
                title="Solo la lista de pacientes en JSON"
              >
                <FileJson className="w-3.5 h-3.5 text-neutral-500" />
                <span>Solo Pacientes</span>
              </button>

              <button
                type="button"
                onClick={handleExportAppointmentsJson}
                className="py-1.5 px-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-[11px] font-medium transition flex items-center justify-center gap-1 cursor-pointer"
                title="Solo los turnos en JSON"
              >
                <FileJson className="w-3.5 h-3.5 text-neutral-500" />
                <span>Solo Turnos</span>
              </button>

              <button
                type="button"
                onClick={handleExportConsultationsJson}
                className="py-1.5 px-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-[11px] font-medium transition flex items-center justify-center gap-1 cursor-pointer"
                title="Solo las consultas en JSON"
              >
                <FileJson className="w-3.5 h-3.5 text-neutral-500" />
                <span>Solo Consultas</span>
              </button>
            </div>
          </div>
        </div>

        {/* MODULE 2: EXPORTACIÓN TABULAR CSV (EXCEL / SHEETS) */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 font-display">
                    Exportación para Planillas (CSV / Excel)
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    Formato tabular compatible con Microsoft Excel, Google Sheets y LibreOffice
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                .CSV
              </span>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Exporta cada módulo en tablas estructuradas con soporte de caracteres en español (tildes y ñ). Selecciona el delimitador compatible con tu versión de Excel:
            </p>

            {/* Delimiter Selector */}
            <div className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs">
              <span className="text-[11px] text-neutral-600 font-medium">Delimitador de columnas:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCsvDelimiter(';')}
                  className={`px-2 py-1 rounded-md text-[11px] font-mono transition cursor-pointer ${
                    csvDelimiter === ';'
                      ? 'bg-neutral-900 text-white font-bold'
                      : 'bg-white text-neutral-600 border border-neutral-200'
                  }`}
                  title="Punto y coma: Estándar para Excel en Argentina, España y Latinoamérica"
                >
                  Punto y coma (;)
                </button>
                <button
                  type="button"
                  onClick={() => setCsvDelimiter(',')}
                  className={`px-2 py-1 rounded-md text-[11px] font-mono transition cursor-pointer ${
                    csvDelimiter === ','
                      ? 'bg-neutral-900 text-white font-bold'
                      : 'bg-white text-neutral-600 border border-neutral-200'
                  }`}
                  title="Coma: Estándar internacional en inglés"
                >
                  Coma (,)
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={handleExportAllCsvs}
              disabled={isExportingAll}
              className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ArrowDownToLine className="w-4 h-4 text-emerald-200" />
              <span>{isExportingAll ? 'Generando descargas...' : 'Descargar Todos los CSVs (3 Archivos)'}</span>
            </button>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={handleExportPatientsCsv}
                className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg text-[11px] font-medium border border-emerald-200 transition flex items-center justify-center gap-1 cursor-pointer"
                title="Descargar lista de pacientes en CSV"
              >
                <Table className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pacientes CSV</span>
              </button>

              <button
                type="button"
                onClick={handleExportAppointmentsCsv}
                className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg text-[11px] font-medium border border-emerald-200 transition flex items-center justify-center gap-1 cursor-pointer"
                title="Descargar turnos en CSV"
              >
                <Table className="w-3.5 h-3.5 text-emerald-600" />
                <span>Turnos CSV</span>
              </button>

              <button
                type="button"
                onClick={handleExportConsultationsCsv}
                className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg text-[11px] font-medium border border-emerald-200 transition flex items-center justify-center gap-1 cursor-pointer"
                title="Descargar consultas clínicas en CSV"
              >
                <Table className="w-3.5 h-3.5 text-emerald-600" />
                <span>Consultas CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Previews / Field Dictionaries Section */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-600" />
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-display">
              Diccionario de Datos & Campos Incluidos
            </h4>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActivePreview(activePreview === 'patients' ? 'none' : 'patients')}
              className={`px-2.5 py-1 text-xs rounded-lg transition cursor-pointer font-medium ${
                activePreview === 'patients'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              Campos de Pacientes ({patients.length})
            </button>
            <button
              type="button"
              onClick={() => setActivePreview(activePreview === 'appointments' ? 'none' : 'appointments')}
              className={`px-2.5 py-1 text-xs rounded-lg transition cursor-pointer font-medium ${
                activePreview === 'appointments'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              Campos de Turnos ({appointments.length})
            </button>
            <button
              type="button"
              onClick={() => setActivePreview(activePreview === 'consultations' ? 'none' : 'consultations')}
              className={`px-2.5 py-1 text-xs rounded-lg transition cursor-pointer font-medium ${
                activePreview === 'consultations'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              Campos de Consultas ({consultations.length})
            </button>
          </div>
        </div>

        {activePreview === 'none' && (
          <p className="text-xs text-neutral-500 leading-relaxed">
            Haz clic en cualquiera de las pestañas superiores para revisar los campos exactos que se exportan y garantizar la compatibilidad con tu sistema de destino o planillas contables.
          </p>
        )}

        {activePreview === 'patients' && (
          <div className="space-y-2 text-xs">
            <p className="font-semibold text-neutral-800">Campos exportados para Pacientes:</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                'ID Paciente',
                'Nombre y Apellido',
                'DNI / Identificación',
                'Teléfono / WhatsApp',
                'Email',
                'Fecha de Nacimiento',
                'Obra Social / Prepaga',
                'Número de Afiliado',
                'Grupo Sanguíneo',
                'Alergias Conocidas',
                'Estado Relacional (Prospecto o Activo)',
                'Historial de Citas Asistidas',
                'Notas y Observaciones',
                'Fecha de Alta'
              ].map(f => (
                <span key={f} className="px-2 py-1 rounded-md bg-neutral-100 text-neutral-700 font-mono text-[11px] border border-neutral-200">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {activePreview === 'appointments' && (
          <div className="space-y-2 text-xs">
            <p className="font-semibold text-neutral-800">Campos exportados para Turnos y Agenda:</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                'ID Turno',
                'Fecha y Hora Inicio / Fin (ISO)',
                'Fecha y Hora Legibles',
                'Nombre del Paciente',
                'DNI Paciente',
                'Teléfono Paciente',
                'Email Paciente',
                'Servicio Solicitado',
                'Precio del Servicio',
                'Estado del Turno (Confirmado, Atendido, etc.)',
                'Estado de Pago (Pagado, Pendiente, etc.)',
                'Medio de Pago Utilizado',
                'Canal de Origen (Bot WhatsApp, Web, etc.)',
                'Confirmación por Paciente',
                'Seña Declarada y Monto',
                'Enlace de Telemedicina',
                'Notas del Turno'
              ].map(f => (
                <span key={f} className="px-2 py-1 rounded-md bg-neutral-100 text-neutral-700 font-mono text-[11px] border border-neutral-200">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {activePreview === 'consultations' && (
          <div className="space-y-2 text-xs">
            <p className="font-semibold text-neutral-800">Campos exportados para Consultas e Historias Clínicas:</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                'ID Consulta',
                'Fecha de Atención',
                'Paciente',
                'Teléfono',
                'Servicio',
                'Motivo Principal de Consulta',
                'Tipo de Consulta',
                'Evolución Clínica General',
                'SOAP Subjetivo (Síntomas y Antecedentes)',
                'SOAP Objetivo (Examen Clínico)',
                'SOAP Análisis (Diagnósticos presuntivos / CIE-10)',
                'SOAP Plan (Conducta Terapéutica)',
                'Procedimiento Quirúrgico / Práctico Realizado',
                'Signos Vitales (Presión, Pulso, Temperatura, Peso, Altura)',
                'Recetas Médicas y Dosis',
                'Certificados Emitidos',
                'Fecha de Creación'
              ].map(f => (
                <span key={f} className="px-2 py-1 rounded-md bg-neutral-100 text-neutral-700 font-mono text-[11px] border border-neutral-200">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Security & Confidentiality Advisory */}
      <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200/80 text-xs text-amber-900 space-y-1">
        <div className="flex items-center gap-2 font-bold text-amber-950">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Seguridad y Privacidad de Datos Sensibles de Salud</span>
        </div>
        <p className="text-amber-800 leading-relaxed text-[11px]">
          Los archivos descargados contienen datos de contacto e historias clínicas protegidas por leyes de confidencialidad profesional y secreto médico. Asegúrate de almacenar las copias de seguridad en dispositivos con contraseña o unidades cifradas.
        </p>
      </div>
    </div>
  );
};
