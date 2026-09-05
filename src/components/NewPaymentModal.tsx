import React, { useState, useEffect } from 'react';
import { X, DollarSign, User, FileText, CreditCard, Landmark, QrCode, Shield, Check, Calendar } from 'lucide-react';
import { PaymentRecord, PaymentMethod, Appointment } from '../types';
import { useAgendaStore } from '../lib/store';

interface NewPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedAppointment?: Appointment | null;
  onPaymentSuccess?: (payment: PaymentRecord) => void;
}

export const NewPaymentModal: React.FC<NewPaymentModalProps> = ({
  isOpen,
  onClose,
  preselectedAppointment,
  onPaymentSuccess
}) => {
  const { patients, services, appointments, addPayment } = useAgendaStore();

  const [patientId, setPatientId] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [patientDni, setPatientDni] = useState<string>('');
  const [appointmentId, setAppointmentId] = useState<string>('');
  const [concept, setConcept] = useState<string>('');
  const [serviceName, setServiceName] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [insuranceProvider, setInsuranceProvider] = useState<string>('');
  const [copayAmount, setCopayAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  // When preselectedAppointment changes
  useEffect(() => {
    if (preselectedAppointment) {
      setAppointmentId(preselectedAppointment.id);
      setPatientId(preselectedAppointment.patient_id);
      setPatientName(preselectedAppointment.patient_name);
      setPatientPhone(preselectedAppointment.patient_phone);
      setConcept(preselectedAppointment.service_name);
      setServiceName(preselectedAppointment.service_name);
      setAmount(preselectedAppointment.service_price || 0);

      const p = patients.find(pat => pat.id === preselectedAppointment.patient_id);
      if (p?.dni) setPatientDni(p.dni);
    } else if (isOpen) {
      if (patients.length > 0 && !patientId) {
        const firstP = patients[0];
        setPatientId(firstP.id);
        setPatientName(`${firstP.first_name} ${firstP.last_name}`);
        setPatientPhone(firstP.phone);
        setPatientDni(firstP.dni || '');
      }
      if (services.length > 0 && !concept) {
        setConcept(services[0].name);
        setServiceName(services[0].name);
        setAmount(services[0].price);
      }
    }
  }, [preselectedAppointment, isOpen, patients, services]);

  if (!isOpen) return null;

  const handlePatientSelect = (pId: string) => {
    setPatientId(pId);
    const p = patients.find(item => item.id === pId);
    if (p) {
      setPatientName(`${p.first_name} ${p.last_name}`);
      setPatientPhone(p.phone);
      setPatientDni(p.dni || '');
    }
  };

  const handleServiceSelect = (sId: string) => {
    const s = services.find(item => item.id === sId);
    if (s) {
      setConcept(s.name);
      setServiceName(s.name);
      setAmount(s.price);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientName.trim()) {
      alert('Por favor ingrese el nombre del paciente.');
      return;
    }
    if (amount <= 0) {
      alert('El monto del cobro debe ser mayor a 0.');
      return;
    }

    const created = addPayment({
      appointment_id: appointmentId || undefined,
      patient_id: patientId || `pat-temp-${Date.now()}`,
      patient_name: patientName.trim(),
      patient_phone: patientPhone.trim() || undefined,
      patient_dni: patientDni.trim() || undefined,
      concept: concept.trim() || 'Consulta Profesional',
      service_name: serviceName.trim() || undefined,
      amount: Number(amount),
      method,
      insurance_provider: method === 'insurance' ? insuranceProvider.trim() : undefined,
      copay_amount: method === 'insurance' && copayAmount > 0 ? Number(copayAmount) : undefined,
      notes: notes.trim() || undefined
    });

    if (onPaymentSuccess) {
      onPaymentSuccess(created);
    }
    onClose();
  };

  const pendingAppointments = appointments.filter(a => a.payment_status === 'pending');

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              $
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Registrar Cobro</h2>
              <p className="text-xs text-neutral-500">Emisión de recibo y actualización de cuenta</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Quick link from pending appointments if not preselected */}
          {!preselectedAppointment && pendingAppointments.length > 0 && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80">
              <label className="text-[11px] font-bold text-amber-900 block mb-1">
                Turnos pendientes de cobro recientes:
              </label>
              <select
                className="w-full text-xs bg-white border border-amber-300 rounded-lg p-1.5 text-neutral-800"
                value={appointmentId}
                onChange={e => {
                  const apt = appointments.find(a => a.id === e.target.value);
                  if (apt) {
                    setAppointmentId(apt.id);
                    setPatientId(apt.patient_id);
                    setPatientName(apt.patient_name);
                    setPatientPhone(apt.patient_phone);
                    setConcept(apt.service_name);
                    setServiceName(apt.service_name);
                    setAmount(apt.service_price);
                  } else {
                    setAppointmentId('');
                  }
                }}
              >
                <option value="">-- Cobro manual / No vincular a turno específico --</option>
                {pendingAppointments.map(apt => (
                  <option key={apt.id} value={apt.id}>
                    {apt.patient_name} - {apt.service_name} (${apt.service_price?.toLocaleString()}) - {new Date(apt.start_datetime).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Patient Info */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-neutral-500" />
              Paciente
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={patientId}
                onChange={e => handlePatientSelect(e.target.value)}
                className="px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="DNI / CUIT del paciente"
                value={patientDni}
                onChange={e => setPatientDni(e.target.value)}
                className="px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Concept and Service */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-neutral-500" />
              Concepto del Cobro
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <select
                  onChange={e => handleServiceSelect(e.target.value)}
                  className="w-1/2 px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-700"
                >
                  <option value="">Seleccionar arancel...</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (${s.price.toLocaleString()})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={concept}
                  onChange={e => setConcept(e.target.value)}
                  placeholder="Descripción o tratamiento"
                  className="w-1/2 px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Payment Method and Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-neutral-500" />
                Medio de Pago
              </label>
              <select
                value={method}
                onChange={e => setMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="cash">💵 Efectivo (Caja)</option>
                <option value="transfer">🏦 Transferencia Bancaria</option>
                <option value="mercado_pago">📱 Mercado Pago / QR</option>
                <option value="card_debit">💳 Tarjeta de Débito</option>
                <option value="card_credit">💳 Tarjeta de Crédito</option>
                <option value="insurance">🛡️ Obra Social / Prepaga</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-neutral-500" />
                Importe Total ($)
              </label>
              <input
                type="number"
                min="1"
                step="100"
                value={amount || ''}
                onChange={e => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 text-base font-bold text-neutral-900 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                required
              />
            </div>
          </div>

          {/* If insurance is selected */}
          {method === 'insurance' && (
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
              <span className="text-[11px] font-bold text-blue-900 block">Datos de Cobertura Médica</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Ej. OSDE 210, Swiss Medical..."
                  value={insuranceProvider}
                  onChange={e => setInsuranceProvider(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-blue-200 rounded-lg"
                  required
                />
                <input
                  type="number"
                  placeholder="Copago abonado por paciente ($)"
                  value={copayAmount || ''}
                  onChange={e => setCopayAmount(Number(e.target.value))}
                  className="px-3 py-1.5 text-xs bg-white border border-blue-200 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Notes / References */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
              Notas o N° de Operación (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. N° transf. 4910291, Cupón Posnet 294..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Emitir Recibo y Registrar Cobro
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
