import React, { useState, useEffect } from 'react';
import { X, DollarSign, Clock, Sparkles } from 'lucide-react';
import { Service } from '../types';
import { useAgendaStore } from '../lib/store';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceToEdit?: Service | null;
}

const PRESET_COLORS = [
  '#0284c7', // Sky blue
  '#0d9488', // Teal
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#6366f1', // Indigo
];

export const ServiceModal: React.FC<ServiceModalProps> = ({
  isOpen,
  onClose,
  serviceToEdit
}) => {
  const { addService, updateService } = useAgendaStore();

  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(15000);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [category, setCategory] = useState('General');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#0284c7');
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (serviceToEdit) {
      setName(serviceToEdit.name);
      setPrice(serviceToEdit.price);
      setDurationMinutes(serviceToEdit.duration_minutes);
      setCategory(serviceToEdit.category || 'General');
      setDescription(serviceToEdit.description || '');
      setColor(serviceToEdit.color || '#0284c7');
      setActive(serviceToEdit.active);
    } else {
      setName('');
      setPrice(20000);
      setDurationMinutes(30);
      setCategory('General');
      setDescription('');
      setColor('#0284c7');
      setActive(true);
    }
  }, [serviceToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (serviceToEdit) {
      updateService(serviceToEdit.id, {
        name: name.trim(),
        price: Number(price),
        duration_minutes: Number(durationMinutes),
        category: category.trim(),
        description: description.trim(),
        color,
        active
      });
    } else {
      addService({
        name: name.trim(),
        price: Number(price),
        duration_minutes: Number(durationMinutes),
        category: category.trim(),
        description: description.trim(),
        color,
        active
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-neutral-900">
              {serviceToEdit ? 'Editar Servicio' : 'Nuevo Servicio'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1.5">Nombre del Servicio *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej. Limpieza con Ultrasonido"
              className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-neutral-500" />
                Arancel / Precio (ARS)
              </label>
              <input
                type="number"
                value={price}
                onChange={e => setPrice(Number(e.target.value))}
                step="500"
                className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-neutral-500" />
                Duración (minutos)
              </label>
              <select
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value={15}>15 min</option>
                <option value={20}>20 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min (1 h)</option>
                <option value={90}>90 min (1.5 h)</option>
                <option value={120}>120 min (2 h)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1.5">Categoría</label>
            <input
              type="text"
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="Ej. Prevención, Estética, Cirugía..."
              className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1.5">Descripción para el paciente</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Breve explicación de lo que incluye el procedimiento..."
              className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1.5">Color en Agenda</label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-neutral-900 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200">
            <div>
              <p className="text-xs font-medium text-neutral-900">Visible para reservas online</p>
              <p className="text-[11px] text-neutral-500">Los pacientes podrán seleccionarlo desde el link público</p>
            </div>
            <input
              type="checkbox"
              checked={active}
              onChange={e => setActive(e.target.checked)}
              className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
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
              className="px-5 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors"
            >
              {serviceToEdit ? 'Guardar Cambios' : 'Crear Servicio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
