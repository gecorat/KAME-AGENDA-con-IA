import React from 'react';
import { Sparkles, Plus, Edit2, Trash2, Clock, DollarSign, Check, X } from 'lucide-react';
import { useAgendaStore } from '../lib/store';
import { Service } from '../types';

interface ServicesViewProps {
  onOpenNewService: () => void;
  onEditService: (service: Service) => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  onOpenNewService,
  onEditService
}) => {
  const { services, deleteService, updateService } = useAgendaStore();

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Aranceles & Servicios</h2>
            <p className="text-xs text-neutral-500">
              {services.length} tratamientos configurados para reserva y consulta de IA
            </p>
          </div>
        </div>

        <button
          onClick={onOpenNewService}
          className="px-3.5 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Nuevo Servicio
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map(srv => (
          <div
            key={srv.id}
            className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs hover:border-neutral-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: srv.color || '#0284c7' }}
                  />
                  <span className="text-[11px] font-semibold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                    {srv.category || 'General'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEditService(srv)}
                    className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
                    title="Editar"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar ${srv.name}?`)) {
                        deleteService(srv.id);
                      }
                    }}
                    className="p-1 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="text-sm font-bold text-neutral-900 mb-1">{srv.name}</h3>
              <p className="text-xs text-neutral-500 leading-relaxed mb-4 line-clamp-2">
                {srv.description || 'Sin descripción detallada.'}
              </p>
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
              <div>
                <span className="text-base font-bold text-neutral-900">
                  ${srv.price.toLocaleString()}
                </span>
                <span className="text-[11px] text-neutral-400 ml-1">ARS</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500 flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  {srv.duration_minutes} min
                </span>

                <button
                  onClick={() => updateService(srv.id, { active: !srv.active })}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border transition-colors ${srv.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-neutral-100 text-neutral-500 border-neutral-200'}`}
                >
                  {srv.active ? 'Activo' : 'Pausado'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
