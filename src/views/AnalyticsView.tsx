import React from 'react';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  Users,
  Activity
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
  CartesianGrid
} from 'recharts';
import { useAgendaStore } from '../lib/store';

const COLORS = ['#0284c7', '#0d9488', '#8b5cf6', '#f59e0b', '#ec4899'];

export const AnalyticsView: React.FC = () => {
  const { appointments, services, patients } = useAgendaStore();

  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter(a => a.status === 'completed').length;
  const cancelledAppointments = appointments.filter(a => a.status === 'cancelled').length;
  const confirmedAppointments = appointments.filter(a => a.status === 'confirmed').length;

  const totalRevenue = appointments
    .filter(a => a.status !== 'cancelled')
    .reduce((sum, a) => sum + (a.service_price || 0), 0);

  const completionRate = totalAppointments > 0
    ? Math.round(((completedAppointments + confirmedAppointments) / totalAppointments) * 100)
    : 100;

  // Appointments grouped by service for Pie chart
  const serviceStatsMap: Record<string, { name: string; count: number; value: number }> = {};

  appointments.forEach(a => {
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

  appointments.forEach(a => {
    const d = new Date(a.start_datetime);
    dayCounts[d.getDay()] += 1;
  });

  const weeklyData = [
    { day: 'Lun', turnos: dayCounts[1] },
    { day: 'Mar', turnos: dayCounts[2] },
    { day: 'Mié', turnos: dayCounts[3] },
    { day: 'Jue', turnos: dayCounts[4] },
    { day: 'Vie', turnos: dayCounts[5] },
    { day: 'Sáb', turnos: dayCounts[6] }
  ];

  const statusPieData = [
    { name: 'Confirmados', value: confirmedAppointments, color: '#10b981' },
    { name: 'Atendidos', value: completedAppointments, color: '#0284c7' },
    { name: 'Cancelados', value: cancelledAppointments, color: '#f43f5e' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Métricas & Rendimiento</h2>
            <p className="text-xs text-neutral-500">
              Estadísticas en tiempo real de asistencia, ingresos y demanda por tratamiento
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium">Facturación Estimada</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">${totalRevenue.toLocaleString()}</div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">Total turnos activos</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium">Tasa de Concreción</span>
            <Activity className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">{completionRate}%</div>
          <p className="text-[11px] text-neutral-500 mt-1">Asistencia vs cancelaciones</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium">Total de Citas</span>
            <Calendar className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">{totalAppointments}</div>
          <p className="text-[11px] text-neutral-500 mt-1">{confirmedAppointments} confirmados activos</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium">Pacientes Totales</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">{patients.length}</div>
          <p className="text-[11px] text-teal-600 font-medium mt-1">Con historia clínica</p>
        </div>
      </div>

      {/* Charts Grid */}
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

        {/* Pie chart: Service revenue */}
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
                      `${val} turnos ($${props.payload.value?.toLocaleString()} ARS)`,
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
