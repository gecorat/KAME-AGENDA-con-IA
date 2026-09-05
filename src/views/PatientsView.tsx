import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  FileText,
  Tag,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAgendaStore } from '../lib/store';
import { Patient } from '../types';

interface PatientsViewProps {
  onOpenNewPatient: () => void;
  onEditPatient: (patient: Patient) => void;
  onScheduleForPatient: (patient: Patient) => void;
}

export const PatientsView: React.FC<PatientsViewProps> = ({
  onOpenNewPatient,
  onEditPatient,
  onScheduleForPatient
}) => {
  const { patients, appointments, deletePatient } = useAgendaStore();

  const [search, setSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '');

  const filteredPatients = patients.filter(p => {
    const q = search.toLowerCase();
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    const phone = p.phone.toLowerCase();
    const dni = p.dni?.toLowerCase() || '';
    return fullName.includes(q) || phone.includes(q) || dni.includes(q);
  });

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || patients[0];

  // Appointments of selected patient
  const patientAppointments = selectedPatient
    ? appointments
        .filter(a => a.patient_id === selectedPatient.id || a.patient_phone === selectedPatient.phone)
        .sort((a, b) => new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime())
    : [];

  return (
    <div className="space-y-4">
      {/* Header and Search */}
      <div className="bg-white p-3.5 rounded-xl border border-neutral-200/75 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-neutral-900 font-display">Directorio de Pacientes</h2>
            <p className="text-[11px] text-neutral-500">
              {patients.length} pacientes registrados con ficha e historial clínico
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, tel o DNI..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
          </div>

          <button
            onClick={onOpenNewPatient}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo Paciente
          </button>
        </div>
      </div>

      {/* Main Grid: Patients List + Detail Card */}
      <div className="grid lg:grid-cols-12 gap-4">
        {/* Left Col: Patient List */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-neutral-200/75 shadow-2xs overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-neutral-200/80 bg-neutral-50/50 text-xs font-semibold text-neutral-700 font-display">
            Pacientes ({filteredPatients.length})
          </div>

          <div className="divide-y divide-neutral-100 max-h-[600px] overflow-y-auto">
            {filteredPatients.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400">
                No se encontraron pacientes con esa búsqueda.
              </div>
            ) : (
              filteredPatients.map(p => {
                const isSelected = selectedPatient?.id === p.id;
                const initials = `${p.first_name[0] || ''}${p.last_name[0] || ''}`.toUpperCase();

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPatientId(p.id)}
                    className={`p-3 cursor-pointer transition-colors flex items-center justify-between gap-3 ${isSelected ? 'bg-neutral-100/70 border-l-2 border-l-neutral-900' : 'hover:bg-neutral-50'}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-800 font-semibold text-xs flex items-center justify-center shrink-0 border border-neutral-200/60">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-neutral-900 truncate">
                          {p.first_name} {p.last_name}
                        </div>
                        <div className="text-[11px] text-neutral-500 truncate flex items-center gap-1">
                          <span>{p.phone}</span>
                          {p.dni && <span>• DNI {p.dni}</span>}
                        </div>
                        {p.tags && p.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {p.tags.slice(0, 2).map((t, idx) => (
                              <span key={idx} className="text-[9px] bg-neutral-100 text-neutral-600 px-1.5 py-0.2 rounded font-medium">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] bg-neutral-100 text-neutral-700 font-medium px-2 py-0.5 rounded border border-neutral-200/60">
                        {p.total_appointments || 0} turnos
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Col: Selected Patient File */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-neutral-200/75 shadow-2xs p-4 flex flex-col justify-between">
          {selectedPatient ? (
            <div className="space-y-4">
              {/* Header profile */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-neutral-200/75">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-neutral-900 text-white font-bold text-sm flex items-center justify-center">
                    {selectedPatient.first_name[0]}{selectedPatient.last_name[0]}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-neutral-900 font-display">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500 mt-0.5">
                      <span>DNI: {selectedPatient.dni || 'No registrado'}</span>
                      {selectedPatient.birth_date && <span>• Nac.: {selectedPatient.birth_date}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onScheduleForPatient(selectedPatient)}
                    className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Agendar Turno
                  </button>
                  <button
                    onClick={() => onEditPatient(selectedPatient)}
                    className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-600 transition-colors"
                    title="Editar paciente"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Contact & Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 bg-neutral-50/70 rounded-lg border border-neutral-200/80 text-xs">
                  <div className="text-neutral-500 flex items-center gap-1.5 mb-1 font-medium text-[11px]">
                    <Phone className="w-3.5 h-3.5 text-neutral-400" /> WhatsApp / Teléfono
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-900">{selectedPatient.phone}</span>
                    <a
                      href={`https://wa.me/${selectedPatient.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-neutral-700 hover:underline text-[11px] font-medium"
                    >
                      WhatsApp →
                    </a>
                  </div>
                </div>

                <div className="p-3 bg-neutral-50/70 rounded-lg border border-neutral-200/80 text-xs">
                  <div className="text-neutral-500 flex items-center gap-1.5 mb-1 font-medium text-[11px]">
                    <Mail className="w-3.5 h-3.5 text-neutral-400" /> Correo Electrónico
                  </div>
                  <div className="font-semibold text-neutral-900 truncate">
                    {selectedPatient.email || 'Sin correo cargado'}
                  </div>
                </div>
              </div>

              {/* Clinical Notes */}
              <div>
                <h4 className="text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-neutral-400" /> Antecedentes & Notas Clínicas
                </h4>
                <div className="p-3 bg-neutral-50/70 rounded-lg border border-neutral-200/80 text-xs text-neutral-700 leading-relaxed">
                  {selectedPatient.notes || 'No hay notas registradas para este paciente todavía.'}
                </div>
              </div>

              {/* Appointment History */}
              <div>
                <h4 className="text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" /> Historial de Turnos ({patientAppointments.length})
                </h4>

                {patientAppointments.length === 0 ? (
                  <div className="p-4 bg-neutral-50/70 rounded-lg border border-neutral-200/60 text-center text-xs text-neutral-400">
                    Aún no tiene turnos registrados.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {patientAppointments.map(apt => (
                      <div
                        key={apt.id}
                        className="p-2.5 rounded-lg border border-neutral-200/80 flex items-center justify-between text-xs hover:bg-neutral-50"
                      >
                        <div>
                          <span className="font-medium text-neutral-900 block">{apt.service_name}</span>
                          <span className="text-neutral-500 text-[11px]">
                            {new Date(apt.start_datetime).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })} a las {new Date(apt.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200/60">
                            {apt.status}
                          </span>
                          <span className="block text-[11px] font-semibold text-neutral-900 mt-0.5">
                            ${apt.service_price?.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-neutral-400">
              Selecciona un paciente para ver su ficha completa.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
