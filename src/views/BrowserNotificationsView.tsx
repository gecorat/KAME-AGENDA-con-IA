import React from 'react';
import { Bell, ShieldCheck } from 'lucide-react';
import { NotificationSettings } from '../components/settings/NotificationSettings';

export const BrowserNotificationsView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 font-display">
              Notificaciones del Navegador
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Configura avisos audibles y alertas emergentes en tiempo real en tu computadora y celular.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Web Push & Audio</span>
        </div>
      </div>

      <NotificationSettings />
    </div>
  );
};
