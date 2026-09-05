import React, { useState } from 'react';
import { X, DollarSign, ArrowUpRight, ArrowDownLeft, Lock, Unlock, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { useAgendaStore } from '../lib/store';
import { CashMovement } from '../types';

interface CashRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'open_box' | 'close_box' | 'add_movement';
}

export const CashRegisterModal: React.FC<CashRegisterModalProps> = ({
  isOpen,
  onClose,
  mode
}) => {
  const { cashRegister, cashMovements, openCashRegister, closeCashRegister, addCashMovement } = useAgendaStore();

  // For opening box
  const [openingAmount, setOpeningAmount] = useState<number>(25000);
  const [openingNotes, setOpeningNotes] = useState<string>('Fondo inicial de cambio');

  // For closing box
  const [countedCash, setCountedCash] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState<string>('');

  // For new movement
  const [movementType, setMovementType] = useState<'income' | 'expense'>('expense');
  const [movementCategory, setMovementCategory] = useState<CashMovement['category']>('supplies');
  const [movementAmount, setMovementAmount] = useState<number>(0);
  const [movementConcept, setMovementConcept] = useState<string>('');
  const [movementNotes, setMovementNotes] = useState<string>('');

  if (!isOpen) return null;

  // Calculate expected cash in drawer
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayMovements = cashMovements.filter(m => m.created_at.startsWith(todayDateStr) && m.method === 'cash');
  
  const totalCashIn = todayMovements
    .filter(m => m.type === 'income')
    .reduce((sum, m) => sum + m.amount, 0);

  const totalCashOut = todayMovements
    .filter(m => m.type === 'expense')
    .reduce((sum, m) => sum + m.amount, 0);

  const expectedCash = totalCashIn - totalCashOut;
  const difference = countedCash - expectedCash;

  const handleOpenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    openCashRegister(Number(openingAmount), openingNotes.trim());
    onClose();
  };

  const handleCloseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalNotes = closingNotes.trim() + 
      (difference !== 0 ? ` [Diferencia arqueo: ${difference > 0 ? '+' : ''}$${difference.toLocaleString('es-AR')}]` : ' [Arqueo exacto]');
    
    closeCashRegister(Number(countedCash), finalNotes.trim());
    onClose();
  };

  const handleMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (movementAmount <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }
    if (!movementConcept.trim()) {
      alert('Por favor detalle el concepto del movimiento');
      return;
    }

    addCashMovement({
      type: movementType,
      category: movementCategory,
      amount: Number(movementAmount),
      concept: movementConcept.trim(),
      method: 'cash',
      registered_by: 'Caja',
      notes: movementNotes.trim() || undefined
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              mode === 'close_box' 
                ? 'bg-amber-100 text-amber-800' 
                : mode === 'open_box' 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {mode === 'close_box' ? <Lock className="w-4 h-4" /> : mode === 'open_box' ? <Unlock className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900">
                {mode === 'open_box' && 'Apertura de Caja Diaria'}
                {mode === 'close_box' && 'Arqueo y Cierre de Caja'}
                {mode === 'add_movement' && 'Nuevo Movimiento de Caja Chica'}
              </h2>
              <p className="text-xs text-neutral-500">
                {mode === 'open_box' && 'Establecer fondo inicial para cambio'}
                {mode === 'close_box' && 'Validación de efectivo físico vs. sistema'}
                {mode === 'add_movement' && 'Registrar entrada o salida en efectivo'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content based on mode */}

        {/* 1. OPEN BOX */}
        {mode === 'open_box' && (
          <form onSubmit={handleOpenSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                Fondo Inicial en Billetes / Monedas ($)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={openingAmount}
                onChange={e => setOpeningAmount(Number(e.target.value))}
                className="w-full px-3 py-2 text-lg font-bold font-mono text-neutral-900 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                required
              />
              <span className="text-[11px] text-neutral-500 mt-1 block">
                Este dinero ingresa como saldo inicial disponible para cambio en recepción.
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                Observaciones (opcional)
              </label>
              <input
                type="text"
                value={openingNotes}
                onChange={e => setOpeningNotes(e.target.value)}
                placeholder="Ej. Billetes de 1000 y 2000"
                className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl"
              />
            </div>

            <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Unlock className="w-3.5 h-3.5" />
                Abrir Caja del Día
              </button>
            </div>
          </form>
        )}

        {/* 2. CLOSE BOX & ARQUEO */}
        {mode === 'close_box' && (
          <form onSubmit={handleCloseSubmit} className="p-6 space-y-4">
            
            {/* Arqueo Summary Card */}
            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Fondo inicial del día:</span>
                <span className="font-mono font-medium">${cashRegister.opening_cash.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>(+) Cobros en efectivo registrados:</span>
                <span className="font-mono font-medium">+${(totalCashIn - cashRegister.opening_cash).toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>(-) Gastos y retiros de caja:</span>
                <span className="font-mono font-medium">-${totalCashOut.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between font-bold text-neutral-900 border-t border-neutral-200 pt-2 text-sm">
                <span>Saldo Esperado en Gaveta:</span>
                <span className="font-mono text-base text-neutral-900">${expectedCash.toLocaleString('es-AR')}</span>
              </div>
            </div>

            {/* Input Counted Cash */}
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                Efectivo Real Contado en Mano ($)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={countedCash || ''}
                onChange={e => setCountedCash(Number(e.target.value))}
                placeholder="Ingrese cuánto dinero contó"
                className="w-full px-3 py-2 text-lg font-bold font-mono text-neutral-900 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            {/* Difference Indicator */}
            {countedCash > 0 && (
              <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                difference === 0 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : difference > 0 
                  ? 'bg-blue-50 border-blue-200 text-blue-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="flex items-center gap-1.5">
                  {difference === 0 ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>
                    {difference === 0 && 'Arqueo perfecto: No hay sobrante ni faltante'}
                    {difference > 0 && `Sobrante de caja: +$${difference.toLocaleString('es-AR')}`}
                    {difference < 0 && `Faltante de caja: -$${Math.abs(difference).toLocaleString('es-AR')}`}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                Observaciones de Cierre
              </label>
              <input
                type="text"
                value={closingNotes}
                onChange={e => setClosingNotes(e.target.value)}
                placeholder="Ej. Se retiraron billetes para depósito bancario"
                className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl"
              />
            </div>

            <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-black rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                Cerrar Caja Definitivamente
              </button>
            </div>
          </form>
        )}

        {/* 3. ADD CASH MOVEMENT */}
        {mode === 'add_movement' && (
          <form onSubmit={handleMovementSubmit} className="p-6 space-y-4">
            
            {/* Type selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMovementType('expense')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  movementType === 'expense'
                    ? 'bg-red-50 border-red-300 text-red-700 shadow-2xs'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                Egreso / Gasto
              </button>
              <button
                type="button"
                onClick={() => setMovementType('income')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  movementType === 'income'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                Ingreso Extra
              </button>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                Rubro / Clasificación
              </label>
              <select
                value={movementCategory}
                onChange={e => setMovementCategory(e.target.value as CashMovement['category'])}
                className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl font-medium"
              >
                {movementType === 'expense' ? (
                  <>
                    <option value="supplies">Insumos y Materiales de Consultorio</option>
                    <option value="withdrawal">Retiro de Ganancias / Profesional</option>
                    <option value="other">Servicios, Limpieza o Mantenimiento</option>
                  </>
                ) : (
                  <>
                    <option value="opening">Aporte extra a caja chica</option>
                    <option value="payment">Cobro de tratamiento previo</option>
                    <option value="other">Otros ingresos varios</option>
                  </>
                )}
              </select>
            </div>

            {/* Concept */}
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                Concepto o Motivo
              </label>
              <input
                type="text"
                placeholder={movementType === 'expense' ? 'Ej. Compra de gasas estériles y anestesia' : 'Ej. Devolución de seña de laboratorio'}
                value={movementConcept}
                onChange={e => setMovementConcept(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl"
                required
              />
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                Importe en Efectivo ($)
              </label>
              <input
                type="number"
                min="1"
                step="50"
                value={movementAmount || ''}
                onChange={e => setMovementAmount(Number(e.target.value))}
                placeholder="Monto"
                className="w-full px-3 py-2 text-base font-bold font-mono text-neutral-900 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                N° de Factura / Proveedor (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. Factura B 0001-00293 Droguería Dental"
                value={movementNotes}
                onChange={e => setMovementNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl"
              />
            </div>

            <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-xs flex items-center gap-1.5 ${
                  movementType === 'expense' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Registrar Movimiento
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
