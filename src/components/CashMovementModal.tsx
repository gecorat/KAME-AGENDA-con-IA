import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownLeft, Check, AlertTriangle } from 'lucide-react';
import { CashMovement, PaymentMethod } from '../types';
import { useAgendaStore } from '../lib/store';

interface CashMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  movementToEdit?: CashMovement | null;
}

export const CashMovementModal: React.FC<CashMovementModalProps> = ({
  isOpen,
  onClose,
  movementToEdit
}) => {
  const { addCashMovement, updateCashMovement } = useAgendaStore();

  const [type, setType] = useState<'income' | 'expense'>('income');
  const [category, setCategory] = useState<'payment' | 'withdrawal' | 'supplies' | 'opening' | 'other' | 'expense' | 'adjustment'>('payment');
  const [amount, setAmount] = useState<number>(0);
  const [concept, setConcept] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState<string>('');
  const [registeredBy, setRegisteredBy] = useState<string>('Caja');

  useEffect(() => {
    if (movementToEdit) {
      setType(movementToEdit.type);
      setCategory(movementToEdit.category === 'opening' ? 'other' : (movementToEdit.category || 'other'));
      setAmount(movementToEdit.amount || 0);
      setConcept(movementToEdit.concept || '');
      setMethod(movementToEdit.method || 'cash');
      setNotes(movementToEdit.notes || '');
      setRegisteredBy(movementToEdit.registered_by || 'Caja');
    } else {
      setType('income');
      setCategory('payment');
      setAmount(0);
      setConcept('');
      setMethod('cash');
      setNotes('');
      setRegisteredBy('Caja');
    }
  }, [movementToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (amount <= 0) {
      alert('El monto del movimiento debe ser mayor a 0.');
      return;
    }
    if (!concept.trim()) {
      alert('Ingrese el concepto del movimiento.');
      return;
    }

    if (movementToEdit) {
      updateCashMovement(movementToEdit.id, {
        type,
        category,
        amount: Number(amount),
        concept: concept.trim(),
        method,
        notes: notes.trim() || undefined,
        registered_by: registeredBy.trim() || 'Caja'
      });
    } else {
      addCashMovement({
        type,
        category,
        amount: Number(amount),
        concept: concept.trim(),
        method,
        notes: notes.trim() || undefined,
        registered_by: registeredBy.trim() || 'Caja'
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
              type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              {type === 'income' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900">
                {movementToEdit ? 'Editar Movimiento de Caja' : 'Nuevo Movimiento de Caja'}
              </h2>
              <p className="text-xs text-neutral-500">Registrar entrada o salida manual de dinero</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setType('income');
                setCategory('payment');
              }}
              className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              Ingreso (+)
            </button>
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setCategory('expense');
              }}
              className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                type === 'expense'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Egreso / Gasto (-)
            </button>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">Categoría</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {type === 'income' ? (
                <>
                  <option value="payment">Cobro de Servicio / Honorario</option>
                  <option value="other">Aporte de Fondo / Otro Ingreso</option>
                  <option value="adjustment">Ajuste de Arqueo</option>
                </>
              ) : (
                <>
                  <option value="expense">Gasto Operativo / Insumos</option>
                  <option value="withdrawal">Retiro de Ganancias / Socios</option>
                  <option value="other">Servicios / Impuestos</option>
                  <option value="adjustment">Ajuste de Arqueo</option>
                </>
              )}
            </select>
          </div>

          {/* Concept */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">Concepto / Descripción</label>
            <input
              type="text"
              value={concept}
              onChange={e => setConcept(e.target.value)}
              placeholder={type === 'income' ? 'Ej: Cobro particular paciente Juan Pérez' : 'Ej: Compra de guantes y descartables'}
              className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">Monto ($)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-neutral-400 font-bold text-sm">$</span>
              <input
                type="number"
                value={amount === 0 ? '' : amount}
                onChange={e => setAmount(Number(e.target.value))}
                placeholder="0"
                className="w-full pl-7 pr-3 py-2 text-base font-bold font-mono text-neutral-900 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          {/* Method */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">Medio</label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="cash">Efectivo en Caja</option>
              <option value="transfer">Transferencia Bancaria</option>
              <option value="mercado_pago">Mercado Pago</option>
              <option value="card_debit">Tarjeta Débito</option>
              <option value="card_credit">Tarjeta Crédito</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">Notas / Observaciones</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Detalles adicionales..."
              className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-colors flex items-center gap-1.5 ${
                type === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              <Check className="w-4 h-4" />
              {movementToEdit ? 'Guardar Cambios' : 'Registrar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
