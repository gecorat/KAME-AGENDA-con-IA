import React, { useState, useEffect } from 'react';
import { X, UserPlus, Clock, Sparkles, AlertCircle } from 'lucide-react';
import { useAgendaStore } from '../lib/store';
import { WaitlistEntry, WaitlistPriority } from '../types';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryToEdit?: WaitlistEntry | null;
  defaultPatientName?: string;
  defaultPhone?: string;
}

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const WaitlistModal: React.FC<WaitlistModalProps> = ({
  isOpen,
  onClose,
  entryToEdit,
  defaultPatientName = '',
  defaultPhone = ''
}) => {
  const { services, patients, addWaitlistEntry, updateWaitlistEntry } = useAgendaStore();

  const [patientName, setPatientName] = useState(defaultPatientName);
  const [patientPhone, setPatientPhone] = useState(defaultPhone);
  const [patientEmail, setPatientEmail] = useState('');
  const [serviceId, setServiceId] = useState(services[0]?.id || '');
  const [priority, setPriority] = useState<WaitlistPriority>('normal');
  const [preferredDays, setPreferredDays] = useState<string[]>(['Lunes', 'Miércoles', 'Viernes']);
  const [preferredTimeRange, setPreferredTimeRange] = useState<'any' | 'morning' | 'afternoon'>('any');
  const [notes, setNotes] = useState('');

  // Selected patient autocomplete helper
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  useEffect(() => {
    if (entryToEdit) {
      setPatientName(entryToEdit.patient_name);
      setPatientPhone(entryToEdit.patient_phone);
      setPatientEmail(entryToEdit.patient_email || '');
      setServiceId(entryToEdit.service_id || (services[0]?.id || ''));
      setPriority(entryToEdit.priority);
      setPreferredDays(entryToEdit.preferred_days || []);
      setPreferredTimeRange(entryToEdit.preferred_time_range || 'any');
      setNotes(entryToEdit.notes || '');
      setSelectedPatientId(entryToEdit.patient_id || '');
    } else {
      setPatientName(defaultPatientName);
      setPatientPhone(defaultPhone);
      setPatientEmail('');
      setServiceId(services[0]?.id || '');
      setPriority('normal');
      setPreferredDays(['Lunes', 'Miércoles', 'Viernes']);
      setPreferredTimeRange('any');
      setNotes('');
      setSelectedPatientId('');
    }
  }, [entryToEdit, isOpen, defaultPatientName, defaultPhone, services]);

  if (!isOpen) return null;

  const handleSelectExistingPatient = (pId: string) => {
    setSelectedPatientId(pId);
    if (!pId) return;
    const p = patients.find(item => item.id === pId);
    if (p) {
      setPatientName(`${p.first_name} ${p.last_name}`);
      setPatientPhone(p.phone);
      if (p.email) setPatientEmail(p.email);
    }
  };

  const handleToggleDay = (day: string) => {
    setPreferredDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !patientPhone.trim()) {
      alert('Por favor completa el nombre y teléfono del paciente.');
      return;
    }

    const selectedService = services.find(s => s.id === serviceId);

    if (entryToEdit) {
      updateWaitlistEntry(entryToEdit.id, {
        patient_id: selectedPatientId || undefined,
        patient_name: patientName,
        patient_phone: patientPhone,
        patient_email: patientEmail || undefined,
        service_id: serviceId || undefined,
        service_name: selectedService?.name || 'Tratamiento General',
        priority,
        preferred_days: preferredDays,
        preferred_time_range: preferredTimeRange,
        notes: notes || undefined
      });
    } else {
      addWaitlistEntry({
        patient_id: selectedPatientId || undefined,
        patient_name: patientName,
        patient_phone: patientPhone,
        patient_email: patientEmail || undefined,
        service_id: serviceId || undefined,
        service_name: selectedService?.name || 'Tratamiento General',
        priority,
        preferred_days: preferredDays,
        preferred_time_range: preferredTimeRange,
        notes: notes || undefined
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                {entryToEdit ? 'Editar en Lista de Espera' : 'Anotar en Lista de Espera'}
              </h3>
              <p className="text-[11px] text-neutral-500">
                Se avisará automáticamente cuando se libere un turno afín
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Quick autocomplete from existing patients */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">
              Seleccionar paciente registrado (opcional)
            </label>
            <select
              value={selectedPatientId}
              onChange={e => handleSelectExistingPatient(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">-- Ingresar nuevo paciente manual --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.last_name}, {p.first_name} ({p.phone})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Nombre y Apellido *
              </label>
              <input
                type="text"
                value={patientName}
                onChange={e => setPatientName(e.target.value)}
                placeholder="Ej. Martín Gómez"
                className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Teléfono / WhatsApp *
              </label>
              <input
                type="tel"
                value={patientPhone}
                onChange={e => setPatientPhone(e.target.value)}
                placeholder="+54 9 11 ..."
                className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Tratamiento o Servicio
              </label>
              <select
                value={serviceId}
                onChange={e => setServiceId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {services.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} (${s.price.toLocaleString()} ARS)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Nivel de Prioridad
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as WaitlistPriority)}
                className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
              >
                <option value="normal">Normal (espera flexible)</option>
                <option value="high">Alta (necesita turno pronto)</option>
                <option value="urgent">Urgente (dolor o evento próximo)</option>
              </select>
            </div>
          </div>

          {/* Preferred time range */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
              Franja Horaria Preferida
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'any', label: 'Cualquiera' },
                { id: 'morning', label: 'Mañanas (08 - 13)' },
                { id: 'afternoon', label: 'Tardes (13 - 19)' }
              ].map(opt => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setPreferredTimeRange(opt.id as any)}
                  className={`py-2 px-2 text-xs rounded-xl border text-center font-medium transition-all ${preferredTimeRange === opt.id ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold shadow-2xs' : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred days */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
              Días de la semana con disponibilidad
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS_OF_WEEK.map(day => {
                const isSelected = preferredDays.includes(day);
                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => handleToggleDay(day)}
                    className={`px-3 py-1.5 text-xs rounded-xl border transition-all ${isSelected ? 'bg-neutral-900 text-white border-neutral-900 font-semibold' : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">
              Notas u Observaciones
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej. Avisar con al menos 2 horas de anticipación, trabaja cerca."
              className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors"
            >
              {entryToEdit ? 'Guardar Cambios' : 'Anotar en Lista de Espera'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
