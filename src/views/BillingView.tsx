import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Receipt,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Unlock,
  Printer,
  MessageSquare,
  Eye,
  CreditCard,
  Building2,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  Percent
} from 'lucide-react';
import { useAgendaStore } from '../lib/store';
import { PaymentRecord, PaymentMethod, Appointment } from '../types';
import { ReceiptModal } from '../components/ReceiptModal';
import { NewPaymentModal } from '../components/NewPaymentModal';
import { CashRegisterModal } from '../components/CashRegisterModal';

export const BillingView: React.FC = () => {
  const {
    payments,
    cashRegister,
    cashMovements,
    appointments,
    practiceSettings,
    voidPayment
  } = useAgendaStore();

  const [activeTab, setActiveTab] = useState<'payments' | 'cash_box' | 'pending' | 'insurance'>('payments');
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('month');

  // Modals state
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<PaymentRecord | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isNewPaymentModalOpen, setIsNewPaymentModalOpen] = useState(false);
  const [preselectedAppointment, setPreselectedAppointment] = useState<Appointment | null>(null);
  const [cashModalMode, setCashModalMode] = useState<'open_box' | 'close_box' | 'add_movement' | null>(null);

  // Financial calculations
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const startOfMonthStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Completed non-voided payments
  const validPayments = useMemo(() => payments.filter(p => p.status === 'completed'), [payments]);

  // Today's total collected
  const todayCollected = useMemo(() => {
    return validPayments
      .filter(p => p.date.startsWith(todayStr))
      .reduce((sum, p) => sum + p.amount, 0);
  }, [validPayments, todayStr]);

  // This month's total collected
  const monthCollected = useMemo(() => {
    return validPayments
      .filter(p => p.date >= startOfMonthStr)
      .reduce((sum, p) => sum + p.amount, 0);
  }, [validPayments, startOfMonthStr]);

  // Calculate cash currently in box
  const todayCashMovements = useMemo(() => {
    return cashMovements.filter(m => m.created_at.startsWith(todayStr) && m.method === 'cash');
  }, [cashMovements, todayStr]);

  const cashIn = todayCashMovements
    .filter(m => m.type === 'income')
    .reduce((sum, m) => sum + m.amount, 0);

  const cashOut = todayCashMovements
    .filter(m => m.type === 'expense')
    .reduce((sum, m) => sum + m.amount, 0);

  const currentCashInBox = cashIn - cashOut;

  // Unpaid appointments
  const pendingAppointments = useMemo(() => {
    return appointments.filter(a => a.payment_status === 'pending' && a.status !== 'cancelled');
  }, [appointments]);

  const totalPendingAmount = useMemo(() => {
    return pendingAppointments.reduce((sum, a) => sum + (a.service_price || 0), 0);
  }, [pendingAppointments]);

  // Filtered payments for table
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      // Search
      const search = searchTerm.toLowerCase();
      const matchSearch =
        p.patient_name.toLowerCase().includes(search) ||
        p.receipt_number.toLowerCase().includes(search) ||
        p.concept.toLowerCase().includes(search) ||
        (p.patient_dni && p.patient_dni.includes(search));

      if (!matchSearch) return false;

      // Method
      if (methodFilter !== 'all' && p.method !== methodFilter) return false;

      // Date
      if (dateFilter === 'today') {
        return p.date.startsWith(todayStr);
      }
      if (dateFilter === 'week') {
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        return p.date >= weekAgo;
      }
      if (dateFilter === 'month') {
        return p.date >= startOfMonthStr;
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, searchTerm, methodFilter, dateFilter, todayStr, startOfMonthStr]);

  // Breakdown by method for today
  const todayByMethod = useMemo(() => {
    const map: Record<PaymentMethod, number> = {
      cash: 0,
      transfer: 0,
      mercado_pago: 0,
      card_debit: 0,
      card_credit: 0,
      insurance: 0
    };
    validPayments
      .filter(p => p.date.startsWith(todayStr))
      .forEach(p => {
        map[p.method] = (map[p.method] || 0) + p.amount;
      });
    return map;
  }, [validPayments, todayStr]);

  const getMethodBadge = (m: PaymentMethod) => {
    switch (m) {
      case 'cash':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800">💵 Efectivo</span>;
      case 'transfer':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-100 text-sky-800">🏦 Transferencia</span>;
      case 'mercado_pago':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-100 text-blue-800">📱 Mercado Pago</span>;
      case 'card_debit':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-100 text-purple-800">💳 Débito</span>;
      case 'card_credit':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-100 text-indigo-800">💳 Crédito</span>;
      case 'insurance':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-100 text-teal-800">🛡️ Obra Social</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-neutral-100 text-neutral-800">{m}</span>;
    }
  };

  const handleOpenReceipt = (p: PaymentRecord) => {
    setSelectedPaymentForReceipt(p);
    setIsReceiptModalOpen(true);
  };

  const handleCollectAppointment = (apt: Appointment) => {
    setPreselectedAppointment(apt);
    setIsNewPaymentModalOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Gestión de Cobros & Caja</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Control de ingresos, arqueo de caja chica diaria, emisión de recibos y facturación
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {cashRegister.status === 'open' ? (
            <button
              onClick={() => setCashModalMode('close_box')}
              className="px-3.5 py-2 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              Arqueo & Cierre de Caja
            </button>
          ) : (
            <button
              onClick={() => setCashModalMode('open_box')}
              className="px-3.5 py-2 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Unlock className="w-3.5 h-3.5 text-emerald-700" />
              Abrir Caja Diaria
            </button>
          )}

          <button
            onClick={() => setCashModalMode('add_movement')}
            className="px-3.5 py-2 text-xs font-semibold bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-neutral-500" />
            Movimiento de Caja
          </button>

          <button
            onClick={() => {
              setPreselectedAppointment(null);
              setIsNewPaymentModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Registrar Cobro
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Mes */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Facturado Mes Actual</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              $
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-neutral-900">
              ${monthCollected.toLocaleString('es-AR')}
            </span>
            <span className="text-[11px] text-emerald-700 font-medium block mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Cobros totales confirmados
            </span>
          </div>
        </div>

        {/* Cobrado Hoy */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Ingresos de Hoy</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-neutral-900">
              ${todayCollected.toLocaleString('es-AR')}
            </span>
            <span className="text-[11px] text-neutral-500 block mt-1">
              {validPayments.filter(p => p.date.startsWith(todayStr)).length} transacciones registradas hoy
            </span>
          </div>
        </div>

        {/* Efectivo en Gaveta */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Caja Chica (Efectivo)</span>
            <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
              cashRegister.status === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cashRegister.status === 'open' ? 'bg-emerald-600 animate-pulse' : 'bg-red-600'}`} />
              {cashRegister.status === 'open' ? 'Abierta' : 'Cerrada'}
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-neutral-900">
              ${currentCashInBox.toLocaleString('es-AR')}
            </span>
            <span className="text-[11px] text-neutral-500 block mt-1">
              Fondo base: ${cashRegister.opening_cash.toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        {/* Pendiente de Cobro */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Por Cobrar en Espera</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-amber-900">
              ${totalPendingAmount.toLocaleString('es-AR')}
            </span>
            <span className="text-[11px] text-amber-700 font-medium block mt-1">
              {pendingAppointments.length} turnos con pago pendiente
            </span>
          </div>
        </div>

      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        
        {/* Tab Navigation */}
        <div className="flex items-center border-b border-neutral-200 px-4 bg-neutral-50/70 overflow-x-auto">
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-3.5 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'payments'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Comprobantes & Cobros ({payments.length})
          </button>

          <button
            onClick={() => setActiveTab('cash_box')}
            className={`py-3.5 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'cash_box'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Caja Diaria & Movimientos
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`py-3.5 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            Turnos Sin Cobrar ({pendingAppointments.length})
          </button>

          <button
            onClick={() => setActiveTab('insurance')}
            className={`py-3.5 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'insurance'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Obras Sociales & Prepagas
          </button>
        </div>

        {/* TAB 1: PAYMENTS LIST */}
        {activeTab === 'payments' && (
          <div className="p-4 md:p-6 space-y-4">
            
            {/* Filter controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por paciente, recibo o concepto..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Method filter */}
                <select
                  value={methodFilter}
                  onChange={e => setMethodFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-neutral-700"
                >
                  <option value="all">Todos los medios de pago</option>
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia</option>
                  <option value="mercado_pago">Mercado Pago</option>
                  <option value="card_debit">Débito</option>
                  <option value="card_credit">Crédito</option>
                  <option value="insurance">Obra Social</option>
                </select>

                {/* Date range filter */}
                <div className="inline-flex rounded-xl border border-neutral-200 bg-neutral-50 p-0.5 text-xs font-semibold">
                  <button
                    onClick={() => setDateFilter('today')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      dateFilter === 'today' ? 'bg-white shadow-2xs text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    Hoy
                  </button>
                  <button
                    onClick={() => setDateFilter('week')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      dateFilter === 'week' ? 'bg-white shadow-2xs text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    Semana
                  </button>
                  <button
                    onClick={() => setDateFilter('month')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      dateFilter === 'month' ? 'bg-white shadow-2xs text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    Mes
                  </button>
                  <button
                    onClick={() => setDateFilter('all')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      dateFilter === 'all' ? 'bg-white shadow-2xs text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    Histórico
                  </button>
                </div>
              </div>
            </div>

            {/* Payments Table */}
            <div className="border border-neutral-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-600 font-semibold uppercase text-[11px] border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">N° Recibo</th>
                    <th className="py-3 px-4">Fecha & Hora</th>
                    <th className="py-3 px-4">Paciente</th>
                    <th className="py-3 px-4">Concepto / Arancel</th>
                    <th className="py-3 px-4">Medio</th>
                    <th className="py-3 px-4 text-right">Importe ($)</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-neutral-400">
                        No se encontraron registros de cobro con los filtros actuales.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map(p => {
                      const isVoided = p.status === 'voided';
                      return (
                        <tr key={p.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                            {p.receipt_number}
                          </td>
                          <td className="py-3 px-4 text-neutral-600">
                            <div>
                              {new Date(p.date).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono">
                              {new Date(p.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-neutral-900 block">{p.patient_name}</span>
                            {p.patient_dni && <span className="text-[10px] text-neutral-500">DNI: {p.patient_dni}</span>}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-neutral-800 block truncate max-w-xs">{p.concept}</span>
                            {p.notes && <span className="text-[10px] text-neutral-400 italic block truncate max-w-xs">{p.notes}</span>}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {getMethodBadge(p.method)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-sm text-neutral-900">
                            ${p.amount.toLocaleString('es-AR')}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isVoided ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isVoided ? 'ANULADO' : 'COBRADO'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenReceipt(p)}
                                className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                                title="Ver comprobante e imprimir"
                              >
                                <Eye className="w-3.5 h-3.5" /> Ver Recibo
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* TAB 2: CASH BOX & MOVEMENTS */}
        {activeTab === 'cash_box' && (
          <div className="p-4 md:p-6 space-y-6">
            
            {/* Box Status & Methods Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              
              {/* Box status card */}
              <div className="bg-neutral-50 rounded-2xl p-5 border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Estado de la Caja</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    cashRegister.status === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {cashRegister.status === 'open' ? 'Caja Abierta' : 'Caja Cerrada'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-neutral-600 pt-2 border-t border-neutral-200">
                  <div className="flex justify-between">
                    <span>Fecha de caja:</span>
                    <span className="font-semibold text-neutral-900">{cashRegister.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hora de apertura:</span>
                    <span className="font-mono text-neutral-900">
                      {new Date(cashRegister.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fondo inicial:</span>
                    <span className="font-mono font-bold text-neutral-900">
                      ${cashRegister.opening_cash.toLocaleString('es-AR')}
                    </span>
                  </div>
                  {cashRegister.closing_cash !== undefined && (
                    <div className="flex justify-between text-amber-800 font-semibold">
                      <span>Cierre arqueado:</span>
                      <span className="font-mono">${cashRegister.closing_cash.toLocaleString('es-AR')}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-neutral-200">
                  <span className="text-[11px] text-neutral-400 block mb-1">Total en gaveta hoy:</span>
                  <span className="text-2xl font-bold font-mono text-emerald-800">
                    ${currentCashInBox.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

              {/* Methods breakdown card */}
              <div className="lg:col-span-2 bg-neutral-50 rounded-2xl p-5 border border-neutral-200 space-y-3">
                <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider block">
                  Desglose de Cobros de Hoy por Medio de Pago
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  <div className="bg-white p-3 rounded-xl border border-neutral-200">
                    <span className="text-[11px] text-neutral-500 block">💵 Efectivo</span>
                    <span className="text-base font-bold font-mono text-neutral-900">
                      ${todayByMethod.cash.toLocaleString('es-AR')}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-neutral-200">
                    <span className="text-[11px] text-neutral-500 block">🏦 Transferencias</span>
                    <span className="text-base font-bold font-mono text-sky-800">
                      ${todayByMethod.transfer.toLocaleString('es-AR')}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-neutral-200">
                    <span className="text-[11px] text-neutral-500 block">📱 Mercado Pago / QR</span>
                    <span className="text-base font-bold font-mono text-blue-800">
                      ${todayByMethod.mercado_pago.toLocaleString('es-AR')}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-neutral-200">
                    <span className="text-[11px] text-neutral-500 block">💳 Débito</span>
                    <span className="text-base font-bold font-mono text-purple-800">
                      ${todayByMethod.card_debit.toLocaleString('es-AR')}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-neutral-200">
                    <span className="text-[11px] text-neutral-500 block">💳 Crédito</span>
                    <span className="text-base font-bold font-mono text-indigo-800">
                      ${todayByMethod.card_credit.toLocaleString('es-AR')}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-neutral-200">
                    <span className="text-[11px] text-neutral-500 block">🛡️ Obra Social</span>
                    <span className="text-base font-bold font-mono text-teal-800">
                      ${todayByMethod.insurance.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Movements Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Movimientos de Caja Chica de Hoy
                </h3>
                <button
                  onClick={() => setCashModalMode('add_movement')}
                  className="px-3 py-1.5 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Registrar Gasto / Retiro
                </button>
              </div>

              <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 text-neutral-600 font-semibold uppercase text-[11px] border-b border-neutral-200">
                    <tr>
                      <th className="py-2.5 px-4">Hora</th>
                      <th className="py-2.5 px-4">Tipo</th>
                      <th className="py-2.5 px-4">Concepto / Descripción</th>
                      <th className="py-2.5 px-4">Registrado por</th>
                      <th className="py-2.5 px-4 text-right">Importe ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {todayCashMovements.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-neutral-400">
                          No hay movimientos registrados en la caja hoy.
                        </td>
                      </tr>
                    ) : (
                      todayCashMovements.map(m => (
                        <tr key={m.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="py-3 px-4 font-mono text-neutral-600">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              m.type === 'income' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {m.type === 'income' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                              {m.type === 'income' ? 'Ingreso' : 'Egreso'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-neutral-900 block">{m.concept}</span>
                            {m.notes && <span className="text-[10px] text-neutral-400 italic block">{m.notes}</span>}
                          </td>
                          <td className="py-3 px-4 text-neutral-600">
                            {m.registered_by || 'Caja'}
                          </td>
                          <td className={`py-3 px-4 text-right font-mono font-bold text-sm ${
                            m.type === 'income' ? 'text-emerald-700' : 'text-red-600'
                          }`}>
                            {m.type === 'income' ? '+' : '-'}${m.amount.toLocaleString('es-AR')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: UNPAID APPOINTMENTS */}
        {activeTab === 'pending' && (
          <div className="p-4 md:p-6 space-y-4">
            
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-amber-950">Turnos con Cobro Pendiente</h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  Pacientes atendidos o agendados con arancel aún no abonado en recepción.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-amber-900 block font-semibold">Total a Cobrar:</span>
                <span className="text-xl font-bold font-mono text-amber-950">${totalPendingAmount.toLocaleString('es-AR')}</span>
              </div>
            </div>

            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-600 font-semibold uppercase text-[11px] border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">Fecha & Hora</th>
                    <th className="py-3 px-4">Paciente</th>
                    <th className="py-3 px-4">Teléfono</th>
                    <th className="py-3 px-4">Servicio / Tratamiento</th>
                    <th className="py-3 px-4 text-right">Arancel ($)</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {pendingAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400">
                        ¡Excelente! No hay turnos pendientes de cobro en este momento.
                      </td>
                    </tr>
                  ) : (
                    pendingAppointments.map(apt => (
                      <tr key={apt.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="py-3 px-4 font-mono">
                          <span className="font-semibold text-neutral-900 block">
                            {new Date(apt.start_datetime).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}
                          </span>
                          <span className="text-[10px] text-neutral-500">
                            {new Date(apt.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-neutral-900">
                          {apt.patient_name}
                        </td>
                        <td className="py-3 px-4 text-neutral-600 font-mono">
                          {apt.patient_phone}
                        </td>
                        <td className="py-3 px-4 text-neutral-800">
                          {apt.service_name}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-sm text-neutral-900">
                          ${apt.service_price?.toLocaleString('es-AR')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleCollectAppointment(apt)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1 ml-auto"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            Cobrar Ahora
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* TAB 4: HEALTH INSURANCE LIQUIDATION */}
        {activeTab === 'insurance' && (
          <div className="p-4 md:p-6 space-y-6">
            
            <div className="p-4 bg-teal-50 rounded-2xl border border-teal-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-teal-950">Liquidación de Obras Sociales & Prepagas</h3>
                <p className="text-xs text-teal-800 mt-0.5">
                  Consolidado de prestaciones realizadas con cobertura para presentación y facturación mensual.
                </p>
              </div>
            </div>

            {/* Insurance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-neutral-900">OSDE</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-teal-100 text-teal-800 font-bold">210 / 310 / 410</span>
                </div>
                <p className="text-xl font-bold font-mono text-neutral-900">$142.000</p>
                <span className="text-[11px] text-neutral-500 block mt-1">6 prestaciones en el mes</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-neutral-900">Swiss Medical</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-teal-100 text-teal-800 font-bold">SMG20 / SMG50</span>
                </div>
                <p className="text-xl font-bold font-mono text-neutral-900">$89.500</p>
                <span className="text-[11px] text-neutral-500 block mt-1">4 prestaciones en el mes</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-neutral-900">Galeno</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-teal-100 text-teal-800 font-bold">Oro / Azul</span>
                </div>
                <p className="text-xl font-bold font-mono text-neutral-900">$64.000</p>
                <span className="text-[11px] text-neutral-500 block mt-1">3 prestaciones en el mes</span>
              </div>
            </div>

            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <div className="p-3 bg-neutral-50 border-b border-neutral-200 font-semibold text-xs text-neutral-700">
                Detalle de Bonos y Copagos de Pacientes
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-100 text-neutral-600 font-semibold uppercase text-[11px] border-b border-neutral-200">
                  <tr>
                    <th className="py-2.5 px-4">Fecha</th>
                    <th className="py-2.5 px-4">Paciente</th>
                    <th className="py-2.5 px-4">Obra Social</th>
                    <th className="py-2.5 px-4">Prestación / Código</th>
                    <th className="py-2.5 px-4 text-right">Copago Cobrado</th>
                    <th className="py-2.5 px-4 text-right">A Liquidar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  <tr className="hover:bg-neutral-50">
                    <td className="py-2.5 px-4 font-mono">04/09/2026</td>
                    <td className="py-2.5 px-4 font-semibold text-neutral-900">Valentina Rossi</td>
                    <td className="py-2.5 px-4">OSDE 310</td>
                    <td className="py-2.5 px-4">01.01 Consulta y Diagnóstico</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-700">$0</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">$18.000</td>
                  </tr>
                  <tr className="hover:bg-neutral-50">
                    <td className="py-2.5 px-4 font-mono">03/09/2026</td>
                    <td className="py-2.5 px-4 font-semibold text-neutral-900">Matías Albarracín</td>
                    <td className="py-2.5 px-4">Swiss Medical</td>
                    <td className="py-2.5 px-4">02.08 Restauración Resina</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-700">$5.000</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">$23.000</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        )}

      </div>

      {/* Modals */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        payment={selectedPaymentForReceipt}
        onVoid={voidPayment}
      />

      <NewPaymentModal
        isOpen={isNewPaymentModalOpen}
        onClose={() => {
          setIsNewPaymentModalOpen(false);
          setPreselectedAppointment(null);
        }}
        preselectedAppointment={preselectedAppointment}
        onPaymentSuccess={payment => {
          setSelectedPaymentForReceipt(payment);
          setIsReceiptModalOpen(true);
        }}
      />

      {cashModalMode && (
        <CashRegisterModal
          isOpen={!!cashModalMode}
          onClose={() => setCashModalMode(null)}
          mode={cashModalMode}
        />
      )}

    </div>
  );
};
