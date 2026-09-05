import React, { useState } from 'react';
import { Clock, Check, Calendar, Coffee, Save } from 'lucide-react';
import { useAgendaStore } from '../lib/store';
import { DayAvailability } from '../types';

const DAYS_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado'
];

export const AvailabilityView: React.FC = () => {
  const { availability, updateAvailability } = useAgendaStore();

  const [schedule, setSchedule] = useState<DayAvailability[]>(availability);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleToggleDay = (dayOfWeek: number) => {
    setSchedule(prev =>
      prev.map(item =>
        item.day_of_week === dayOfWeek ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const handleChangeField = (
    dayOfWeek: number,
    field: keyof DayAvailability,
    value: any
  ) => {
    setSchedule(prev =>
      prev.map(item =>
        item.day_of_week === dayOfWeek ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSave = () => {
    updateAvailability(schedule);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Horarios de Atención</h2>
            <p className="text-xs text-neutral-500">
              Configura tus franjas laborales e intervalos de almuerzo para turnos online y del bot
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
        >
          <Save className="w-4 h-4" />
          {savedNotice ? '¡Guardado!' : 'Guardar Horarios'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden divide-y divide-neutral-100">
        {schedule.map(day => {
          return (
            <div
              key={day.day_of_week}
              className={`p-4 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${day.enabled ? 'bg-white' : 'bg-neutral-50/70 opacity-65'}`}
            >
              <div className="flex items-center gap-3 w-40">
                <input
                  type="checkbox"
                  checked={day.enabled}
                  onChange={() => handleToggleDay(day.day_of_week)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-neutral-900">
                  {DAYS_NAMES[day.day_of_week]}
                </span>
              </div>

              {day.enabled ? (
                <div className="flex flex-wrap items-center gap-3 text-xs flex-1">
                  {/* Working hours */}
                  <div className="flex items-center gap-1.5 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200">
                    <span className="text-neutral-500 font-medium">Atención:</span>
                    <input
                      type="time"
                      value={day.start_time}
                      onChange={e => handleChangeField(day.day_of_week, 'start_time', e.target.value)}
                      className="bg-transparent font-mono text-neutral-900 font-semibold focus:outline-none"
                    />
                    <span className="text-neutral-400">a</span>
                    <input
                      type="time"
                      value={day.end_time}
                      onChange={e => handleChangeField(day.day_of_week, 'end_time', e.target.value)}
                      className="bg-transparent font-mono text-neutral-900 font-semibold focus:outline-none"
                    />
                  </div>

                  {/* Lunch break */}
                  <div className="flex items-center gap-1.5 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200">
                    <Coffee className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-neutral-500 font-medium">Pausa:</span>
                    <input
                      type="time"
                      value={day.break_start || ''}
                      onChange={e => handleChangeField(day.day_of_week, 'break_start', e.target.value)}
                      className="bg-transparent font-mono text-neutral-900 font-semibold focus:outline-none"
                    />
                    <span className="text-neutral-400">a</span>
                    <input
                      type="time"
                      value={day.break_end || ''}
                      onChange={e => handleChangeField(day.day_of_week, 'break_end', e.target.value)}
                      className="bg-transparent font-mono text-neutral-900 font-semibold focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-neutral-400 italic flex-1">
                  Cerrado (Sin disponibilidad de turnos)
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
