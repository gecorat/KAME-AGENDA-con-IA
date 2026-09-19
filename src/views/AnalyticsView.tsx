import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  Users,
  Activity,
  CreditCard,
  Building,
  Smartphone,
  ShieldCheck,
  Banknote,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend
} from 'recharts';
import { useAgendaStore } from '../lib/store';
import { PaymentMethod } from '../types';
import { getCurrentMonthArgentinaStr, isPaymentInMonth } from '../lib/timezone';

const COLORS = ['#10b981', '#0ea5e9', '#6366f1', '#a855f7', '#f59e0b', '#14b8a6'];

export const AnalyticsView: React.FC = () => {
  const { appointments, services, patients, payments, isExampleItem } = useAgendaStore();
  const [timeframe, setTimeframe] = useState<'month' | 'all'>('month');

  const currentMonthStr = getCurrentMonthArgentinaStr();

  const realAppointments = useMemo(() => {
    return appointments.filter(a => !isExampleItem(a));
  }, [appointments, isExampleItem]);

  const realPayments = useMemo(() => {
    return payments.filter(p => !isExampleItem(p) && p.status === 'completed');
  }, [payments, isExampleItem]);

  const filteredPayments = useMemo(() => {
    if (timeframe === 'month') {
      return realPayments.filter(p => isPaymentInMonth(p, currentMonthStr));
    }
    return realPayments;
  }, [realPayments, timeframe, currentMonthStr]);

  const totalAppointments = realAppointments.length;
  const completedAppointments = realAppointments.filter(a => a.status === 'completed').length;
  const cancelledAppointments = realAppointments.filter(a => a.status === 'cancelled').length;
  const confirmedAppointments = realAppointments.filter(a => a.status === 'confirmed').length;

  const totalCollectedRevenue = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [filteredPayments]);

  const completionRate = totalAppointments > 0
    ? Math.round(((completedAppointments + confirmedAppointments) / totalAppointments) * 100)
    : 100;

  // Breakdown by payment method
  const paymentMethodStats = useMemo(() => {
    const map: Record<string, { key: string; name: string; icon: string; count: number; value: number; color: string }> = {
      cash: { key: 'cash', name: 'Efectivo', icon: '💵', count: 0, value: 0, color: '#10b981' },
      transfer: { key: 'transfer', name: 'Transferencia Bancaria', icon: '🏦', count: 0, value: 0, color: '#6366f1' },
      mercado_pago: { key: 'mercado_pago', name: 'Mercado Pago', icon: '📱', count: 0, value: 0, color: '#0ea5e9' },
      card_debit: { key: 'card_debit', name: 'Tarjeta Débito', icon: '💳', count: 0, value: 0, color: '#a855f7' },
      card_credit: { key: 'card_credit', name: 'Tarjeta Crédito', icon: '💳', count: 0, value: 0, color: '#f59e0b' },
      insurance: { key: 'insurance', name: 'Obra Social / Copago', icon: '🏥', count: 0, value: 0, color: '#14b8a6' },
    };

    filteredPayments.forEach(p => {
      const normalizedKey = (p.method === 'mercadopago' ? 'mercado_pago' : p.method) as string;
      if (!map[normalizedKey]) {
        map[normalizedKey] = {
          key: normalizedKey,
          name: normalizedKey,
          icon: '💳',
          count: 0,
          value: 0,
          color: '#64748b'
        };
      }
      map[normalizedKey].count += 1;
      map[normalizedKey].value += p.amount;
    });

    return Object.values(map);
  }, [filteredPayments]);

  const activeMethodStats = useMemo(() => {
    return paymentMethodStats.filter(m => m.count > 0 || m.value > 0);
  }, [paymentMethodStats]);

  // Appointments grouped by service for Pie chart
  const serviceStatsMap: Record<string, { name: string; count: number; value: number }> = {};

  realAppointments.forEach(a => {
    if (!serviceStatsMap[a.service_name]) {
      serviceStatsMap[a.service_name] = {
        name: a.service_name,
        count: 0,
        value: 0
      };
    }
    serviceStatsMap[a.service_name].count += 1;
    if (a.status !== 'cancelled') {
      serviceStatsMap[a.service_name].value += a.service_price || 0;
    }
  });

  const serviceData = Object.values(serviceStatsMap);

  // Day distribution (Mon to Sat)
  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];

  realAppointments.forEach(a => {
    try {
      const d = new Date(a.start_datetime);
      dayCounts[d.getDay()] += 1;
    } catch {}
  });

  const weeklyData = [
    { day: 'Lun', turnos: dayCounts[1] },
    { day: 'Mar', turnos: dayCounts[2] },
    { day: 'Mié', turnos: dayCounts[3] },
    { day: 'Jue', turnos: dayCounts[4] },
    { day: 'Vie', turnos: dayCounts[5] },
    { day: 'Sáb', turnos: dayCounts[6] }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900">Métricas & Estadísticas del Consultorio</h2>
            <p className="text-xs text-neutral-500">
              Control de facturación, efectividad de turnos y diferenciación por medio de pago
            </p>
          </div>
        </div>

        {/* Timeframe Filter */}
        <div className="inline-flex rounded-xl border border-neutral-200 bg-neutral-50 p-0.5 text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setTimeframe('month')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              timeframe === 'month' ? 'bg-white shadow-2xs text-neutral-900 font-bold' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Mes Actual
          </button>
          <button
            onClick={() => setTimeframe('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              timeframe === 'all' ? 'bg-white shadow-2xs text-neutral-900 font-bold' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Histórico Total
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Recaudación Cobrada</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900">
            ${totalCollectedRevenue.toLocaleString('es-AR')}
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            {filteredPayments.length} transacciones confirmadas
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tasa de Concreción</span>
            <Activity className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">{completionRate}%</div>
          <p className="text-[11px] text-neutral-500 mt-1">
            {completedAppointments} completados • {cancelledAppointments} cancelados
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total de Turnos</span>
            <Calendar className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">{totalAppointments}</div>
          <p className="text-[11px] text-neutral-500 mt-1">{confirmedAppointments} programados / activos</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pacientes Registrados</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">
            {patients.filter(p => !isExampleItem(p)).length}
          </div>
          <p className="text-[11px] text-teal-700 font-medium mt-1">Con legajo y ficha médica</p>
        </div>
      </div>

      {/* NEW: Payment Methods Differentiation Section */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <h3 className="text-sm font-bold text-neutral-900 tracking-wide uppercase">
                Diferenciación de Estadísticas por Medio de Pago
              </h3>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Análisis pormenorizado del volumen ingresado por efectivo, transferencias, Mercado Pago, tarjetas y obras sociales
            </p>
          </div>
          <div className="text-xs text-neutral-500">
            Filtro actual: <strong className="text-neutral-800">{timeframe === 'month' ? 'Mes Actual' : 'Todo el Histórico'}</strong>
          </div>
        </div>

        {activeMethodStats.length === 0 ? (
          <div className="py-12 text-center text-neutral-400">
            <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-medium">Aún no se han registrado cobros con los filtros seleccionados.</p>
            <p className="text-[11px] text-neutral-400 mt-1">
              Al finalizar los turnos y asentar el cobro se actualizarán automáticamente estos gráficos.
            </p>
          </div>
        ) : (
          <>
            {/* Cards Grid by Method */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {paymentMethodStats.map(m => {
                const pct = totalCollectedRevenue > 0 ? ((m.value / totalCollectedRevenue) * 100).toFixed(1) : '0';
                return (
                  <div
                    key={m.key}
                    className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-base">{m.icon}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-neutral-700 border border-neutral-200/80">
                        {pct}%
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-neutral-700 truncate">{m.name}</div>
                    <div className="text-base font-bold font-mono text-neutral-900 mt-0.5">
                      ${m.value.toLocaleString('es-AR')}
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-1">
                      {m.count} {m.count === 1 ? 'operación' : 'operaciones'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Visual Charts: Donut Share & Comparative Bar Chart */}
            <div className="grid lg:grid-cols-2 gap-6 pt-2">
              {/* Pie / Donut Chart */}
              <div className="p-4 rounded-xl border border-neutral-100 bg-neutral-50/30 flex flex-col justify-between">
                <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <PieChartIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Participación Porcentual de Cobros</span>
                </h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={activeMethodStats}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        label={({ name, percent }: any) => `${name?.slice(0, 12)} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {activeMethodStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any, name: any, props: any) => [
                          `$${Number(val).toLocaleString('es-AR')} (${props.payload.count} cobros)`,
                          name
                        ]}
                        contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart: Absolute Amounts */}
              <div className="p-4 rounded-xl border border-neutral-100 bg-neutral-50/30 flex flex-col justify-between">
                <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-sky-600" />
                  <span>Monto Total por Canal de Cobro ($ ARS)</span>
                </h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activeMethodStats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        stroke="#94a3b8"
                        tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}k` : v}`}
                      />
                      <Tooltip
                        formatter={(val: any) => [`$${Number(val).toLocaleString('es-AR')}`, 'Recaudado']}
                        contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                      />
                      <Bar dataKey="value" fill="#0d9488" radius={[6, 6, 0, 0]}>
                        {activeMethodStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="border border-neutral-200 rounded-xl overflow-x-auto scroll-touch-x subtle-scrollbar w-full max-w-full min-w-0">
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead className="bg-neutral-50 text-neutral-600 font-semibold uppercase text-[11px] border-b border-neutral-200">
                  <tr>
                    <th className="py-2.5 px-4">Medio de Pago</th>
                    <th className="py-2.5 px-4 text-center">N° de Cobros</th>
                    <th className="py-2.5 px-4 text-right">Ticket Promedio</th>
                    <th className="py-2.5 px-4 text-right">Total Recaudado</th>
                    <th className="py-2.5 px-4 text-right">% Participación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {paymentMethodStats.map(m => {
                    const pct = totalCollectedRevenue > 0 ? ((m.value / totalCollectedRevenue) * 100).toFixed(1) : '0';
                    const avg = m.count > 0 ? Math.round(m.value / m.count) : 0;
                    return (
                      <tr key={m.key} className="hover:bg-neutral-50/70 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-neutral-800 flex items-center gap-2">
                          <span>{m.icon}</span>
                          <span>{m.name}</span>
                        </td>
                        <td className="py-2.5 px-4 text-center text-neutral-600 font-medium">
                          {m.count}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-neutral-700">
                          ${avg.toLocaleString('es-AR')}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-neutral-900">
                          ${m.value.toLocaleString('es-AR')}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-emerald-700">
                          {pct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Charts Grid: Demand & Treatments */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bar chart: Appointments per day */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
          <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-4">
            Demanda por Día de la Semana
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  formatter={(val: any) => [`${val} turnos`, 'Volumen']}
                  contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="turnos" fill="#0284c7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie chart: Service distribution */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
          <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-4">
            Distribución por Tratamientos
          </h3>
          <div className="h-64 w-full flex items-center justify-center">
            {serviceData.length === 0 ? (
              <p className="text-xs text-neutral-400">Sin datos suficientes</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serviceData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }: any) => `${name?.slice(0, 10)}... (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {serviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any, props: any) => [
                      `${val} turnos ($${props.payload.value?.toLocaleString('es-AR')} ARS)`,
                      name
                    ]}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

