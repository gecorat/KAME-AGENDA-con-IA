import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Mail,
  Phone,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Download,
  Percent,
  Activity,
  Zap,
  Check
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import confetti from 'canvas-confetti';
import { useAgendaStore } from '../lib/store';
import { SaasTenantUser } from '../types';

export const SuperAdminAnalyticsView: React.FC = () => {
  const { saasTenants, updateSaasTenant, currentUser } = useAgendaStore();

  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial'>('all');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Compute key financial metrics from tenants
  const totalTenants = saasTenants.length;
  const activeTenants = saasTenants.filter(t => t.status === 'active');
  const trialTenants = saasTenants.filter(t => t.status === 'trial');
  const proTenants = saasTenants.filter(t => t.plan === 'pro');
  const basicTenants = saasTenants.filter(t => t.plan === 'basic');

  // MRR: Sum of monthly revenue for active paying tenants
  const mrr = activeTenants.reduce((acc, curr) => acc + (curr.amount_monthly_ars || 0), 0);
  // ARR: MRR * 12
  const arr = mrr * 12;

  // Real collected vs future projected based on timeframe
  const revenueStats = useMemo(() => {
    if (timeframe === 'day') {
      // Day view
      return {
        collected: 34000,
        projected: 34000,
        periodLabel: 'Hoy vs. Mañana',
        growth: '+12.5%'
      };
    } else if (timeframe === 'week') {
      // Week view
      return {
        collected: 87000,
        projected: 68000,
        periodLabel: 'Esta semana vs. Próxima semana',
        growth: '+15.2%'
      };
    } else {
      // Month view
      return {
        collected: 208000,
        projected: mrr,
        periodLabel: 'Este mes vs. Proyección mensual recurrente',
        growth: '+22.8%'
      };
    }
  }, [timeframe, mrr]);

  // Chart data for revenue evolution
  const revenueChartData = useMemo(() => {
    if (timeframe === 'day') {
      return [
        { name: 'Lun 01', cobrado: 19000, proyectado: 19000 },
        { name: 'Mar 02', cobrado: 0, proyectado: 0 },
        { name: 'Mié 03', cobrado: 34000, proyectado: 34000 },
        { name: 'Jue 04 (Hoy)', cobrado: 34000, proyectado: 34000 },
        { name: 'Vie 05', cobrado: 0, proyectado: 34000 },
        { name: 'Sáb 06', cobrado: 0, proyectado: 19000 },
        { name: 'Dom 07', cobrado: 0, proyectado: 0 }
      ];
    } else if (timeframe === 'week') {
      return [
        { name: 'Semana 1', cobrado: 53000, proyectado: 53000 },
        { name: 'Semana 2', cobrado: 87000, proyectado: 87000 },
        { name: 'Semana 3', cobrado: 68000, proyectado: 68000 },
        { name: 'Semana 4', cobrado: 0, proyectado: 53000 }
      ];
    } else {
      return [
        { name: 'Abr 2026', cobrado: 114000, proyectado: 114000 },
        { name: 'May 2026', cobrado: 148000, proyectado: 148000 },
        { name: 'Jun 2026', cobrado: 167000, proyectado: 167000 },
        { name: 'Jul 2026', cobrado: 186000, proyectado: 186000 },
        { name: 'Ago 2026', cobrado: 208000, proyectado: 208000 },
        { name: 'Sep 2026 (Actual)', cobrado: 208000, proyectado: 227000 },
        { name: 'Oct 2026 (Proy)', cobrado: 0, proyectado: 261000 },
        { name: 'Nov 2026 (Proy)', cobrado: 0, proyectado: 295000 }
      ];
    }
  }, [timeframe]);

  // Plan distribution for Pie Chart
  const planDistributionData = [
    { name: 'Plan Pro ($34.000/mes)', value: proTenants.length, color: '#0284c7' },
    { name: 'Plan Básico ($19.000/mes)', value: basicTenants.length, color: '#0d9488' },
    { name: 'Trial 14 Días (Prospectos)', value: trialTenants.length, color: '#f59e0b' }
  ];

  // Filtered tenants
  const filteredTenants = saasTenants.filter(t => {
    const matchesSearch =
      t.practice_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.doctor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && t.status === 'active') ||
      (statusFilter === 'trial' && t.status === 'trial');
    return matchesSearch && matchesStatus;
  });

  // Action: Simulate Renewal Payment
  const handleSimulatePayment = (tenant: SaasTenantUser) => {
    const nextDateObj = new Date(tenant.next_billing_date);
    nextDateObj.setMonth(nextDateObj.getMonth() + 1);
    const newNextBilling = nextDateObj.toISOString().split('T')[0];

    updateSaasTenant(tenant.id, {
      status: 'active',
      last_payment_date: new Date().toISOString().split('T')[0],
      last_payment_amount: tenant.amount_monthly_ars,
      total_paid_ars: tenant.total_paid_ars + tenant.amount_monthly_ars,
      next_billing_date: newNextBilling
    });

    confetti({ particleCount: 50, spread: 60 });
    setActionSuccessMsg(`¡Renovación de $${tenant.amount_monthly_ars.toLocaleString('es-AR')} registrada para ${tenant.doctor_name}!`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // Action: Convert Trial to Pro
  const handleUpgradeTrialToPro = (tenant: SaasTenantUser) => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    updateSaasTenant(tenant.id, {
      plan: 'pro',
      status: 'active',
      amount_monthly_ars: 34000,
      last_payment_date: new Date().toISOString().split('T')[0],
      last_payment_amount: 34000,
      total_paid_ars: 34000,
      next_billing_date: nextMonth.toISOString().split('T')[0]
    });

    confetti({ particleCount: 80, spread: 70 });
    setActionSuccessMsg(`¡${tenant.doctor_name} pasó de Trial a Plan Pro ($34.000/mes)!`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner & Title */}
      <div className="bg-neutral-900 text-white rounded-3xl p-6 sm:p-8 border border-neutral-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-neutral-950 font-bold text-[11px] tracking-wide uppercase">
                👑 Super Admin
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                {currentUser?.email || 'gonzalocorat@gmail.com'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Control Maestro SaaS & Estadísticas Financieras
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl leading-relaxed">
              Monitorea el crecimiento del negocio, ingresos recurrentes (MRR/ARR), fechas de cobros pasados y renovaciones futuras de cada consultorio médico.
            </p>
          </div>

          {/* Timeframe Selector */}
          <div className="flex bg-neutral-800 p-1.5 rounded-2xl border border-neutral-700 self-start md:self-auto">
            <button
              onClick={() => setTimeframe('day')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                timeframe === 'day' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-300 hover:text-white'
              }`}
            >
              Día
            </button>
            <button
              onClick={() => setTimeframe('week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                timeframe === 'week' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-300 hover:text-white'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setTimeframe('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                timeframe === 'month' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-300 hover:text-white'
              }`}
            >
              Mes
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between text-emerald-900 text-xs font-bold animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            Cerrar
          </button>
        </div>
      )}

      {/* 4 Core Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR Card */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
            <span>MRR (Ingreso Mensual Recurrente)</span>
            <span className="p-1.5 rounded-lg bg-sky-50 text-sky-700">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-neutral-900">
            ${mrr.toLocaleString('es-AR')} <span className="text-xs font-semibold text-neutral-500">ARS</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+18.4% vs. mes anterior</span>
          </div>
        </div>

        {/* ARR Proyectado */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
            <span>ARR Proyectado (Anualizado)</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-neutral-900">
            ${arr.toLocaleString('es-AR')} <span className="text-xs font-semibold text-neutral-500">ARS</span>
          </div>
          <div className="text-xs text-neutral-500">
            {activeTenants.length} consultorios activos de pago
          </div>
        </div>

        {/* Cobros Realizados en Período */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
            <span>Cobros Realizados ({timeframe === 'day' ? 'Hoy' : timeframe === 'week' ? 'Semana' : 'Mes'})</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-neutral-900">
            ${revenueStats.collected.toLocaleString('es-AR')} <span className="text-xs font-semibold text-neutral-500">ARS</span>
          </div>
          <div className="text-xs text-emerald-600 font-medium">
            100% de suscripciones al día
          </div>
        </div>

        {/* Cobros Futuros Proyectados */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
            <span>Cobros Futuros Proyectados</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-neutral-900">
            ${revenueStats.projected.toLocaleString('es-AR')} <span className="text-xs font-semibold text-neutral-500">ARS</span>
          </div>
          <div className="text-xs text-neutral-500">
            {revenueStats.periodLabel}
          </div>
        </div>
      </div>

      {/* Secondary Health Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] text-neutral-500">Conversión Trial a Pago</div>
            <div className="text-base font-bold text-neutral-900">78%</div>
          </div>
          <Percent className="w-4 h-4 text-emerald-600" />
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] text-neutral-500">Churn Rate Mensual</div>
            <div className="text-base font-bold text-emerald-600">2.1%</div>
          </div>
          <Activity className="w-4 h-4 text-emerald-600" />
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] text-neutral-500">Ticket Promedio</div>
            <div className="text-base font-bold text-neutral-900">$28.375 ARS</div>
          </div>
          <CreditCard className="w-4 h-4 text-sky-600" />
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] text-neutral-500">Adopción WhatsApp Bot</div>
            <div className="text-base font-bold text-neutral-900">8 de 10 (80%)</div>
          </div>
          <Zap className="w-4 h-4 text-amber-500" />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Revenue Evolution Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                Evolución de Ganancias: Cobrado vs. Cobros Futuros
              </h3>
              <p className="text-xs text-neutral-500">
                Valores en Pesos Argentinos (ARS) según periodicidad seleccionada ({timeframe === 'day' ? 'Diaria' : timeframe === 'week' ? 'Semanal' : 'Mensual'}).
              </p>
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-semibold border border-emerald-200">
              Proyección en crecimiento
            </span>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCobrado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorProyectado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any, name: string) => [
                    `$${Number(value).toLocaleString('es-AR')} ARS`,
                    name === 'cobrado' ? 'Cobrado Real' : 'Cobro Futuro Proyectado'
                  ]}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend
                  formatter={(value) => (value === 'cobrado' ? 'Cobrado Real' : 'Cobro Futuro Proyectado')}
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                />
                <Area
                  type="monotone"
                  dataKey="cobrado"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorCobrado)"
                />
                <Area
                  type="monotone"
                  dataKey="proyectado"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#colorProyectado)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plan Composition Donut Chart (4 cols) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Distribución de Planes</h3>
            <p className="text-xs text-neutral-500">Composición de usuarios según nivel de servicio.</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {planDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val, name) => [`${val} consultorios`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 border-t border-neutral-100 pt-3">
            {planDistributionData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-neutral-700 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-neutral-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Users / Tenants Table: Renovations, Plans, WhatsApp Status */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-neutral-700" />
              <span>Directorio de Consultorios, Fechas de Renovación & Planes</span>
            </h3>
            <p className="text-xs text-neutral-500">
              Control individual de fechas de vencimiento, cobros futuros e integración de WhatsApp de cada médico.
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar médico o consultorio..."
                className="pl-8 pr-3 py-1.5 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:outline-hidden w-56"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs border border-neutral-200 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-neutral-900 focus:outline-hidden bg-white text-neutral-700"
            >
              <option value="all">Todos los Estados</option>
              <option value="active">Activos (Pagos)</option>
              <option value="trial">En Prueba (Trial)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500 font-semibold border-y border-neutral-200">
              <tr>
                <th className="py-3 px-4">Consultorio / Profesional</th>
                <th className="py-3 px-3">Plan Activo</th>
                <th className="py-3 px-3">Próxima Renovación</th>
                <th className="py-3 px-3">Cobro Mensual</th>
                <th className="py-3 px-3">Total Abonado</th>
                <th className="py-3 px-3">WhatsApp Bot</th>
                <th className="py-3 px-4 text-right">Acción Rápida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredTenants.map((tenant) => {
                const isTrial = tenant.status === 'trial';
                const isPro = tenant.plan === 'pro';

                // Days until renewal
                const renewalDate = new Date(tenant.next_billing_date);
                const today = new Date();
                const diffTime = renewalDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                return (
                  <tr key={tenant.id} className="hover:bg-neutral-50/80 transition">
                    {/* Doctor & Practice */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-neutral-900">{tenant.doctor_name}</div>
                      <div className="text-[11px] text-neutral-500">{tenant.practice_name}</div>
                      <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{tenant.email}</div>
                    </td>

                    {/* Plan */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          isPro
                            ? 'bg-sky-100 text-sky-800 border border-sky-200'
                            : isTrial
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-neutral-100 text-neutral-800 border border-neutral-200'
                        }`}
                      >
                        {isPro ? 'PLAN PRO AI' : isTrial ? 'TRIAL 14 DÍAS' : 'PLAN BÁSICO'}
                      </span>
                      <div className="text-[10px] text-neutral-400 mt-0.5 capitalize">
                        {tenant.billing_cycle === 'annual' ? 'Facturación Anual' : 'Facturación Mensual'}
                      </div>
                    </td>

                    {/* Renewal Date */}
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-neutral-900 font-mono">
                        {tenant.next_billing_date}
                      </div>
                      <div className="text-[10px]">
                        {diffDays <= 0 ? (
                          <span className="text-amber-600 font-bold">¡Renueva Hoy!</span>
                        ) : diffDays <= 7 ? (
                          <span className="text-amber-600 font-medium">En {diffDays} días</span>
                        ) : (
                          <span className="text-neutral-500">En {diffDays} días</span>
                        )}
                      </div>
                    </td>

                    {/* Monthly Amount */}
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-neutral-900">
                        ${tenant.amount_monthly_ars.toLocaleString('es-AR')}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        {tenant.payment_method === 'mercadopago' ? 'Mercado Pago' : 'Transferencia'}
                      </div>
                    </td>

                    {/* Total Paid */}
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-neutral-700">
                        ${tenant.total_paid_ars.toLocaleString('es-AR')}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        {tenant.appointments_count} turnos gestionados
                      </div>
                    </td>

                    {/* WhatsApp Status */}
                    <td className="py-3.5 px-3">
                      {tenant.whatsapp_status === 'connected' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          Conectado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400">
                          <AlertCircle className="w-3.5 h-3.5 text-neutral-300" />
                          Desconectado
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {isTrial ? (
                        <button
                          type="button"
                          onClick={() => handleUpgradeTrialToPro(tenant)}
                          className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-[11px] font-bold transition shadow-2xs"
                        >
                          Convertir a Pro
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSimulatePayment(tenant)}
                          className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg text-[11px] font-semibold transition"
                          title="Simular acreditación de mensualidad"
                        >
                          Cobrar Renovación
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
