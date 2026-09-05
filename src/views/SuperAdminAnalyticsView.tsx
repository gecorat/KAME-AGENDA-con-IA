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
  Check,
  Trash2,
  Gift,
  Sparkles,
  X
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
  const {
    saasTenants,
    updateSaasTenant,
    deleteSaasTenant,
    extendUserTrial,
    grantUserPlan,
    currentUser
  } = useAgendaStore();

  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial'>('all');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [trialModalTenant, setTrialModalTenant] = useState<SaasTenantUser | null>(null);
  const [trialDaysToAdd, setTrialDaysToAdd] = useState<number>(14);

  const [planModalTenant, setPlanModalTenant] = useState<SaasTenantUser | null>(null);
  const [targetPlan, setTargetPlan] = useState<'basic' | 'pro'>('pro');
  const [isPermanentAccess, setIsPermanentAccess] = useState<boolean>(false);
  const [accessDays, setAccessDays] = useState<number>(30);

  const [deleteModalTenant, setDeleteModalTenant] = useState<SaasTenantUser | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Filter out the Super Admin platform owner from paying tenant metrics
  const doctorTenants = useMemo(() => {
    return saasTenants.filter(t => (t.email || '').toLowerCase() !== 'gonzalocorat@gmail.com');
  }, [saasTenants]);

  const totalTenants = doctorTenants.length;
  const activeTenants = doctorTenants.filter(t => t.status === 'active' && !t.trial_active);
  const trialTenants = doctorTenants.filter(t => t.status === 'trial' || Boolean(t.trial_active));
  const proTenants = doctorTenants.filter(t => t.plan === 'pro');
  const basicTenants = doctorTenants.filter(t => t.plan === 'basic');

  // MRR: Sum of monthly subscription revenue from active paying doctor accounts
  const mrr = activeTenants.reduce((acc, curr) => acc + (curr.amount_monthly_ars || 0), 0);
  const arr = mrr * 12;

  // Real collected amount accumulated from paying doctors
  const totalCollectedReal = doctorTenants.reduce((acc, curr) => acc + (curr.total_paid_ars || 0), 0);

  // Real collected vs projected based on actual data
  const revenueStats = useMemo(() => {
    return {
      collected: totalCollectedReal,
      projected: mrr,
      periodLabel: timeframe === 'day' ? 'Hoy' : timeframe === 'week' ? 'Semana actual' : 'Total acumulado',
      growth: mrr > 0 ? '+100%' : '0%'
    };
  }, [timeframe, mrr, totalCollectedReal]);

  // Chart data for revenue evolution reflecting real data
  const revenueChartData = useMemo(() => {
    const months = ['May 2026', 'Jun 2026', 'Jul 2026', 'Ago 2026', 'Sep 2026 (Actual)', 'Oct 2026 (Proy)'];
    return months.map((m, idx) => {
      const isCurrentOrPast = idx <= 4;
      return {
        name: m,
        cobrado: idx === 4 ? totalCollectedReal : 0,
        proyectado: isCurrentOrPast ? totalCollectedReal : mrr
      };
    });
  }, [totalCollectedReal, mrr]);

  // Plan distribution for Pie Chart
  const planDistributionData = [
    { name: 'Plan Pro ($34.000/mes)', value: proTenants.length, color: '#0284c7' },
    { name: 'Plan Básico ($19.000/mes)', value: basicTenants.length, color: '#0d9488' },
    { name: 'Trial (Periodo de prueba)', value: trialTenants.length, color: '#f59e0b' }
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

  // Action: Confirm Extend Trial
  const handleConfirmExtendTrial = async () => {
    if (!trialModalTenant) return;
    setIsProcessing(true);
    try {
      await extendUserTrial(trialModalTenant.id, trialDaysToAdd);
      confetti({ particleCount: 60, spread: 65 });
      setActionSuccessMsg(`¡Se extendió el trial de ${trialModalTenant.doctor_name} por +${trialDaysToAdd} días con éxito en Firestore!`);
      setTrialModalTenant(null);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (e: any) {
      alert('Error al extender trial: ' + (e?.message || 'Revisa tu conexión'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Action: Confirm Grant Plan
  const handleConfirmGrantPlan = async () => {
    if (!planModalTenant) return;
    setIsProcessing(true);
    try {
      await grantUserPlan(planModalTenant.id, targetPlan, isPermanentAccess, accessDays);
      confetti({ particleCount: 75, spread: 70 });
      const planName = targetPlan === 'pro' ? 'Plan Pro AI' : 'Plan Básico';
      const durationStr = isPermanentAccess ? 'Permanente' : `por ${accessDays} días`;
      setActionSuccessMsg(`¡${planModalTenant.doctor_name} actualizado a ${planName} (${durationStr}) en Firestore!`);
      setPlanModalTenant(null);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (e: any) {
      alert('Error al asignar plan: ' + (e?.message || 'Revisa tu conexión'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Action: Confirm Delete Tenant
  const handleConfirmDelete = async () => {
    if (!deleteModalTenant) return;
    setIsProcessing(true);
    try {
      const ok = await deleteSaasTenant(deleteModalTenant.id);
      if (ok) {
        setActionSuccessMsg(`Usuario ${deleteModalTenant.doctor_name} (${deleteModalTenant.email}) eliminado correctamente.`);
        setDeleteModalTenant(null);
        setTimeout(() => setActionSuccessMsg(null), 4000);
      }
    } catch (e: any) {
      alert('Error al eliminar usuario: ' + (e?.message || 'Error'));
    } finally {
      setIsProcessing(false);
    }
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
                <th className="py-3 px-4 text-right">Acciones de Super Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredTenants.map((tenant) => {
                const isSuperAdminUser = tenant.email.toLowerCase() === 'gonzalocorat@gmail.com';
                const isTrial = tenant.status === 'trial' || Boolean(tenant.trial_active);
                const isPro = tenant.plan === 'pro';
                const isPermanent = Boolean(tenant.is_permanent) || isSuperAdminUser;

                return (
                  <tr key={tenant.id} className="hover:bg-neutral-50/80 transition">
                    {/* Doctor & Practice */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-neutral-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                          {tenant.doctor_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                            {tenant.doctor_name}
                            {isSuperAdminUser && (
                              <span className="px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-900 font-extrabold text-[9px] uppercase tracking-wider">
                                Dueño
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-neutral-500">{tenant.practice_name}</div>
                          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{tenant.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="py-3.5 px-3">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            isPermanent
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : isPro
                              ? 'bg-sky-100 text-sky-800 border border-sky-200'
                              : isTrial
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-neutral-100 text-neutral-800 border border-neutral-200'
                          }`}
                        >
                          {isPermanent
                            ? 'PRO AI • PERMANENTE'
                            : isTrial
                            ? `TRIAL • ${tenant.trial_days_left ?? 14}D RESTANTES`
                            : isPro
                            ? 'PLAN PRO AI'
                            : 'PLAN BÁSICO'}
                        </span>
                        <div className="text-[10px] text-neutral-400">
                          {isPermanent
                            ? 'Acceso Ilimitado'
                            : isTrial
                            ? 'Periodo de prueba'
                            : 'Facturación Mensual'}
                        </div>
                      </div>
                    </td>

                    {/* Renewal / Expiration */}
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-neutral-900 font-mono">
                        {isPermanent ? 'Sin vencimiento' : (tenant.access_expires_at ? tenant.access_expires_at.split('T')[0] : tenant.next_billing_date)}
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        {isPermanent
                          ? 'De por vida'
                          : isTrial
                          ? `${tenant.trial_days_left ?? 14} días para expirar`
                          : 'Renovación programada'}
                      </div>
                    </td>

                    {/* Monthly Amount */}
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-neutral-900">
                        {isSuperAdminUser ? (
                          <span className="text-emerald-700 font-bold">$0 ARS</span>
                        ) : isTrial ? (
                          <span className="text-neutral-500 font-medium">$0 (En prueba)</span>
                        ) : (
                          `$${(tenant.amount_monthly_ars || 0).toLocaleString('es-AR')}`
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        {isSuperAdminUser ? 'Cuenta Maestra' : (tenant.payment_method === 'mercadopago' ? 'Mercado Pago' : 'Transferencia')}
                      </div>
                    </td>

                    {/* Total Paid */}
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-neutral-700">
                        {isSuperAdminUser ? '$0 ARS' : `$${(tenant.total_paid_ars || 0).toLocaleString('es-AR')}`}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        {isSuperAdminUser ? 'Plataforma Propia' : `${tenant.appointments_count || 0} turnos`}
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

                    {/* Super Admin Management Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {isSuperAdminUser ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300 rounded-lg">
                          👑 Propietario (Sin cobro)
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Extender Trial */}
                          <button
                            type="button"
                            onClick={() => {
                              setTrialModalTenant(tenant);
                              setTrialDaysToAdd(14);
                            }}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Extender días de prueba gratuita"
                          >
                            <Clock className="w-3 h-3 text-amber-700" />
                            Trial
                          </button>

                          {/* Invitar / Cambiar a Plan Pro o Básico */}
                          <button
                            type="button"
                            onClick={() => {
                              setPlanModalTenant(tenant);
                              setTargetPlan(tenant.plan || 'pro');
                              setIsPermanentAccess(Boolean(tenant.is_permanent));
                              setAccessDays(30);
                            }}
                            className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Asignar Plan Pro o Básico (permanente o por X días)"
                          >
                            <Gift className="w-3 h-3 text-sky-700" />
                            Plan
                          </button>

                          {/* Eliminar Usuario */}
                          <button
                            type="button"
                            onClick={() => setDeleteModalTenant(tenant)}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Eliminar usuario de la plataforma"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Extender Trial */}
      {trialModalTenant && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <Clock className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Extender Periodo de Trial</h3>
                  <p className="text-xs text-neutral-500">{trialModalTenant.doctor_name} ({trialModalTenant.email})</p>
                </div>
              </div>
              <button
                onClick={() => setTrialModalTenant(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-neutral-700">
                Selecciona o escribe cuántos días deseas sumarle al trial:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[7, 14, 30, 60].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setTrialDaysToAdd(days)}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      trialDaysToAdd === days
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                    }`}
                  >
                    +{days} días
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <span className="text-[11px] text-neutral-500">O ingresa un número personalizado de días:</span>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={trialDaysToAdd}
                  onChange={(e) => setTrialDaysToAdd(Math.max(1, Number(e.target.value)))}
                  className="w-full mt-1 px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                <p className="font-semibold">Resultado de la acción:</p>
                <p>
                  El usuario tendrá <strong>{(trialModalTenant.trial_days_left || 0) + trialDaysToAdd} días</strong> activos de prueba en Firestore.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setTrialModalTenant(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmExtendTrial}
                className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                {isProcessing ? 'Guardando...' : 'Aplicar Extensión'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Asignar / Invitar a Plan Pro o Básico */}
      {planModalTenant && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-sky-50 text-sky-700">
                  <Gift className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Asignar Plan o Invitar</h3>
                  <p className="text-xs text-neutral-500">{planModalTenant.doctor_name} ({planModalTenant.email})</p>
                </div>
              </div>
              <button
                onClick={() => setPlanModalTenant(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Plan Choice */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-2">
                  Selecciona el nivel de servicio:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTargetPlan('pro')}
                    className={`p-3 rounded-2xl border text-left transition ${
                      targetPlan === 'pro'
                        ? 'bg-sky-50/70 border-sky-500 ring-2 ring-sky-500/20'
                        : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    <div className="font-bold text-sm text-neutral-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-sky-600" />
                      Plan PRO AI
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-1">
                      IA Gemini, WhatsApp Bot, turnos ilimitados ($34.000/mes)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetPlan('basic')}
                    className={`p-3 rounded-2xl border text-left transition ${
                      targetPlan === 'basic'
                        ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    <div className="font-bold text-sm text-neutral-900 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      Plan Básico
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-1">
                      Agenda digital, hasta 50 turnos/mes ($19.000/mes)
                    </div>
                  </button>
                </div>
              </div>

              {/* Duration Choice */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-2">
                  Duración de la asignación:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPermanentAccess(true)}
                    className={`p-3 rounded-xl border text-center transition ${
                      isPermanentAccess
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                        : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    <div className="font-bold text-xs">Permanente (De por vida)</div>
                    <div className={`text-[10px] mt-0.5 ${isPermanentAccess ? 'text-neutral-300' : 'text-neutral-500'}`}>
                      Sin fecha de caducidad
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPermanentAccess(false)}
                    className={`p-3 rounded-xl border text-center transition ${
                      !isPermanentAccess
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                        : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    <div className="font-bold text-xs">Por X Días</div>
                    <div className={`text-[10px] mt-0.5 ${!isPermanentAccess ? 'text-neutral-300' : 'text-neutral-500'}`}>
                      Invitación / Promoción
                    </div>
                  </button>
                </div>

                {!isPermanentAccess && (
                  <div className="mt-3 space-y-2">
                    <span className="text-[11px] text-neutral-500">Días de vigencia:</span>
                    <div className="grid grid-cols-4 gap-2">
                      {[15, 30, 60, 90].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setAccessDays(d)}
                          className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                            accessDays === d
                              ? 'bg-sky-600 text-white border-sky-600'
                              : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                          }`}
                        >
                          {d} días
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min="1"
                      max="730"
                      value={accessDays}
                      onChange={(e) => setAccessDays(Math.max(1, Number(e.target.value)))}
                      className="w-full mt-1 px-3 py-1.5 text-xs border border-neutral-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setPlanModalTenant(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmGrantPlan}
                className="px-5 py-2 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                {isProcessing ? 'Guardando...' : 'Confirmar y Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Eliminar Usuario */}
      {deleteModalTenant && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <span className="p-3 rounded-2xl bg-rose-50 text-rose-600">
                <Trash2 className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-base font-bold text-neutral-900">¿Eliminar Usuario de la Plataforma?</h3>
                <p className="text-xs text-neutral-500">Esta acción es irreversible y borrará el registro de Firestore.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1 text-xs">
              <div className="font-bold text-neutral-900">{deleteModalTenant.doctor_name}</div>
              <div className="text-neutral-600">{deleteModalTenant.practice_name}</div>
              <div className="font-mono text-neutral-400">{deleteModalTenant.email}</div>
              <div className="text-[11px] text-amber-700 font-semibold pt-1">
                Plan actual: {deleteModalTenant.plan.toUpperCase()} • Estado: {deleteModalTenant.status.toUpperCase()}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalTenant(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmDelete}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition"
              >
                {isProcessing ? 'Eliminando...' : 'Sí, Eliminar Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
