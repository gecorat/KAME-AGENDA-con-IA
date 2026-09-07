import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, FileText, Calendar, Tag, Briefcase, Scale, BookOpen, Heart, Sparkles, Building2, Hash } from 'lucide-react';
import { Patient } from '../types';
import { useAgendaStore } from '../lib/store';
import { getClientTerm, getProfessionInfo } from '../lib/terminology';

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientToEdit?: Patient | null;
}

export const PatientModal: React.FC<PatientModalProps> = ({
  isOpen,
  onClose,
  patientToEdit
}) => {
  const { addPatient, updatePatient, practiceSettings } = useAgendaStore();
  const termSingular = getClientTerm(practiceSettings, { plural: false, capitalize: true });
  const professionInfo = getProfessionInfo(practiceSettings);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dni, setDni] = useState('');
  const [cuit, setCuit] = useState('');
  const [clientType, setClientType] = useState<'individual' | 'company'>('individual');
  const [companyName, setCompanyName] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [subjectOrMatter, setSubjectOrMatter] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [petSpecies, setPetSpecies] = useState('');
  const [studentLevel, setStudentLevel] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (patientToEdit) {
      setFirstName(patientToEdit.first_name);
      setLastName(patientToEdit.last_name);
      setPhone(patientToEdit.phone);
      setEmail(patientToEdit.email || '');
      setDni(patientToEdit.dni || '');
      setCuit(patientToEdit.cuit || '');
      setClientType(patientToEdit.client_type || 'individual');
      setCompanyName(patientToEdit.company_name || '');
      setCaseNumber(patientToEdit.case_number || '');
      setSubjectOrMatter(patientToEdit.subject_or_matter || '');
      setJurisdiction(patientToEdit.jurisdiction || '');
      setPetSpecies(patientToEdit.pet_species || '');
      setStudentLevel(patientToEdit.student_level || '');
      setBirthDate(patientToEdit.birth_date || '');
      setNotes(patientToEdit.notes || '');
      setTagsInput(patientToEdit.tags ? patientToEdit.tags.join(', ') : '');
    } else {
      setFirstName('');
      setLastName('');
      setPhone('+54 9 11 ');
      setEmail('');
      setDni('');
      setCuit('');
      setClientType('individual');
      setCompanyName('');
      setCaseNumber('');
      setSubjectOrMatter('');
      setJurisdiction('');
      setPetSpecies('');
      setStudentLevel('');
      setBirthDate('');
      setNotes('');
      setTagsInput('');
    }
  }, [patientToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !phone.trim()) {
      alert('Nombre y teléfono son obligatorios.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const payload: Partial<Patient> = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      dni: dni.trim() || undefined,
      cuit: cuit.trim() || undefined,
      client_type: clientType,
      company_name: companyName.trim() || undefined,
      case_number: caseNumber.trim() || undefined,
      subject_or_matter: subjectOrMatter.trim() || undefined,
      jurisdiction: jurisdiction.trim() || undefined,
      pet_species: petSpecies.trim() || undefined,
      student_level: studentLevel.trim() || undefined,
      birth_date: birthDate || undefined,
      notes: notes.trim() || undefined,
      tags
    };

    if (patientToEdit) {
      updatePatient(patientToEdit.id, payload);
    } else {
      addPatient(payload as any);
    }

    onClose();
  };

  const getIcon = () => {
    switch (professionInfo.id) {
      case 'legal_contable': return Scale;
      case 'educacion_clases': return BookOpen;
      case 'veterinaria': return Heart;
      case 'estetica_belleza': return Sparkles;
      default: return User;
    }
  };

  const HeaderIcon = getIcon();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-neutral-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
              <HeaderIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                {patientToEdit ? `Editar Ficha de ${termSingular}` : `Nuevo ${termSingular}`}
              </h2>
              <span className="text-[11px] text-neutral-500 font-medium">
                {professionInfo.name}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Si es Estudio Jurídico / Contable, opción de tipo de persona */}
          {professionInfo.id === 'legal_contable' && (
            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/80 space-y-2.5">
              <span className="text-xs font-semibold text-neutral-700 block">Tipo de Cliente / Representación</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setClientType('individual')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition ${
                    clientType === 'individual'
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  Persona Física
                </button>
                <button
                  type="button"
                  onClick={() => setClientType('company')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition ${
                    clientType === 'company'
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  Empresa / Sociedad
                </button>
              </div>

              {clientType === 'company' && (
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">Razón Social / Nombre Fantasía</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Ej. Logística Sur S.A."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                {clientType === 'company' ? 'Nombre de Contacto *' : 'Nombre *'}
              </label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Ej. Sofía"
                className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                {clientType === 'company' ? 'Cargo / Apellido' : 'Apellido'}
              </label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Ej. Gómez"
                className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-neutral-500" />
                WhatsApp / Teléfono *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+54 9 11 1234-5678"
                className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-neutral-500" />
                {professionInfo.id === 'legal_contable' ? 'CUIT / CUIL / DNI' : 'DNI / Identificación'}
              </label>
              <input
                type="text"
                value={professionInfo.id === 'legal_contable' && cuit ? cuit : dni}
                onChange={e => {
                  setDni(e.target.value);
                  if (professionInfo.id === 'legal_contable') setCuit(e.target.value);
                }}
                placeholder={professionInfo.id === 'legal_contable' ? 'Ej. 20-35123456-8' : 'Ej. 38.120.450'}
                className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          {/* Campos específicos según la profesión */}
          {professionInfo.id === 'legal_contable' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-neutral-500" />
                  Materia / Fuero Principal
                </label>
                <input
                  type="text"
                  value={subjectOrMatter}
                  onChange={e => setSubjectOrMatter(e.target.value)}
                  placeholder="Ej. Laboral, Civil, AFIP..."
                  className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-neutral-500" />
                  N° Causa / Expediente (Ref.)
                </label>
                <input
                  type="text"
                  value={caseNumber}
                  onChange={e => setCaseNumber(e.target.value)}
                  placeholder="Ej. CNT 12450/2024"
                  className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>
          )}

          {professionInfo.id === 'educacion_clases' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1.5">Materia / Asignatura / Instrumento</label>
                <input
                  type="text"
                  value={subjectOrMatter}
                  onChange={e => setSubjectOrMatter(e.target.value)}
                  placeholder="Ej. Piano, Matemáticas..."
                  className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1.5">Nivel Educativo</label>
                <input
                  type="text"
                  value={studentLevel}
                  onChange={e => setStudentLevel(e.target.value)}
                  placeholder="Ej. Secundario / CBC / Avanzado"
                  className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>
          )}

          {professionInfo.id === 'veterinaria' && (
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">Mascota (Especie / Raza / Nombre)</label>
              <input
                type="text"
                value={petSpecies}
                onChange={e => setPetSpecies(e.target.value)}
                placeholder="Ej. Canino - Golden Retriever - 'Milo'"
                className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-neutral-500" />
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                Fecha de Nacimiento
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-neutral-500" />
              Etiquetas (separadas por comas)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder={
                professionInfo.id === 'legal_contable'
                  ? 'Ej. Laboral, Demanda Activa, Urgente'
                  : professionInfo.id === 'educacion_clases'
                  ? 'Ej. Examen Diciembre, Clases Virtuales'
                  : 'Ej. Particular, Frecuente, Control'
              }
              className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-neutral-500" />
              {professionInfo.id === 'legal_contable'
                ? 'Antecedentes de la Causa / Asunto / Notas'
                : professionInfo.id === 'educacion_clases'
                ? 'Objetivos pedagógicos / Observaciones'
                : 'Historia clínica / Antecedentes / Observaciones'}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={
                professionInfo.id === 'legal_contable'
                  ? 'Detalles del caso, fuero o antecedentes del trámite o contraparte...'
                  : professionInfo.id === 'educacion_clases'
                  ? 'Nivel de partida, temas a reforzar, metas del alumno...'
                  : 'Antecedentes médicos, alergias, preferencias de horario...'
              }
              className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-xs transition-colors"
            >
              {patientToEdit ? 'Actualizar Ficha' : `Crear ${termSingular}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
