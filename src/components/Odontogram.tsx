import React, { useState, useRef } from 'react';
import { Sparkles, RotateCcw, HelpCircle, Check, Info, ChevronLeft, ChevronRight } from 'lucide-react';

export type ToothCondition = 
  | 'healthy' 
  | 'caries' 
  | 'restoration' 
  | 'endodontics' 
  | 'crown' 
  | 'extracted' 
  | 'implant' 
  | 'in_treatment';

export interface ToothSurfaceState {
  vestibular?: ToothCondition;
  lingual?: ToothCondition;
  mesial?: ToothCondition;
  distal?: ToothCondition;
  occlusal?: ToothCondition;
}

export interface ToothData {
  number: number;
  condition: ToothCondition;
  surfaces: ToothSurfaceState;
  notes?: string;
}

export interface OdontogramProps {
  selectedTooth?: string;
  onSelectTooth?: (toothNumber: string, summaryDescription?: string) => void;
  initialData?: Record<number, ToothData>;
  onChange?: (data: Record<number, ToothData>) => void;
  readOnly?: boolean;
}

const CONDITION_COLORS: Record<ToothCondition, { label: string; bg: string; border: string; text: string; dot: string }> = {
  healthy: { label: 'Sano', bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  caries: { label: 'Caries activa', bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-700', dot: 'bg-red-500' },
  restoration: { label: 'Obturación / Empaste', bg: 'bg-sky-50', border: 'border-sky-400', text: 'text-sky-700', dot: 'bg-sky-500' },
  endodontics: { label: 'Endodoncia / Conducto', bg: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-700', dot: 'bg-purple-500' },
  crown: { label: 'Corona / Prótesis', bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700', dot: 'bg-amber-500' },
  extracted: { label: 'Pieza Ausente / Extraída', bg: 'bg-neutral-100', border: 'border-neutral-400', text: 'text-neutral-600', dot: 'bg-neutral-600' },
  implant: { label: 'Implante Dental', bg: 'bg-indigo-50', border: 'border-indigo-400', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  in_treatment: { label: 'En Tratamiento Activo', bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-700', dot: 'bg-orange-500' }
};

// Adult FDI Teeth
const QUADRANT_1 = [18, 17, 16, 15, 14, 13, 12, 11]; // Superior Derecho
const QUADRANT_2 = [21, 22, 23, 24, 25, 26, 27, 28]; // Superior Izquierdo
const QUADRANT_4 = [48, 47, 46, 45, 44, 43, 42, 41]; // Inferior Derecho
const QUADRANT_3 = [31, 32, 33, 34, 35, 36, 37, 38]; // Inferior Izquierdo

// Pediatric Deciduous Teeth
const QUAD_DEC_5 = [55, 54, 53, 52, 51];
const QUAD_DEC_6 = [61, 62, 63, 64, 65];
const QUAD_DEC_8 = [85, 84, 83, 82, 81];
const QUAD_DEC_7 = [71, 72, 73, 74, 75];

export const Odontogram: React.FC<OdontogramProps> = ({
  selectedTooth,
  onSelectTooth,
  initialData = {},
  onChange,
  readOnly = false
}) => {
  const [teethMap, setTeethMap] = useState<Record<number, ToothData>>(initialData);
  const [activeTool, setActiveTool] = useState<ToothCondition>('caries');
  const [showPediatric, setShowPediatric] = useState<boolean>(false);
  const [activeToothModal, setActiveToothModal] = useState<number | null>(null);
  const [archView, setArchView] = useState<'all' | 'upper' | 'lower' | 'right' | 'left'>('all');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right' | 'start' | 'end') => {
    if (scrollContainerRef.current) {
      if (direction === 'start') {
        scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      } else if (direction === 'end') {
        scrollContainerRef.current.scrollTo({ left: scrollContainerRef.current.scrollWidth, behavior: 'smooth' });
      } else {
        const amount = direction === 'left' ? -220 : 220;
        scrollContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
      }
    }
  };

  const getToothData = (num: number): ToothData => {
    return teethMap[num] || { number: num, condition: 'healthy', surfaces: {} };
  };

  const updateTooth = (num: number, updates: Partial<ToothData>) => {
    if (readOnly) return;
    const current = getToothData(num);
    const updated = { ...current, ...updates };
    const nextMap = { ...teethMap, [num]: updated };
    setTeethMap(nextMap);
    if (onChange) onChange(nextMap);

    // Notify parent
    if (onSelectTooth) {
      const conditionInfo = CONDITION_COLORS[updated.condition];
      const desc = `Pieza ${num}: ${conditionInfo.label}${updated.notes ? ` (${updated.notes})` : ''}`;
      onSelectTooth(String(num), desc);
    }
  };

  const handleToothClick = (num: number) => {
    if (readOnly) {
      if (onSelectTooth) onSelectTooth(String(num));
      return;
    }

    const current = getToothData(num);
    // If clicking with active tool, apply condition
    if (current.condition === activeTool) {
      // Toggle back to healthy
      updateTooth(num, { condition: 'healthy' });
    } else {
      updateTooth(num, { condition: activeTool });
    }
  };

  const renderToothSVG = (num: number) => {
    const data = getToothData(num);
    const isSelected = selectedTooth === String(num);
    const condition = data.condition;
    const isExtracted = condition === 'extracted';
    const isCrown = condition === 'crown';
    const isImplant = condition === 'implant';

    // SVG colors
    let centerColor = '#ffffff';
    let strokeColor = '#94a3b8';
    let fillColor = '#ffffff';

    if (condition === 'caries') fillColor = '#ef4444';
    else if (condition === 'restoration') fillColor = '#0284c7';
    else if (condition === 'endodontics') fillColor = '#a855f7';
    else if (condition === 'crown') fillColor = '#f59e0b';
    else if (condition === 'implant') fillColor = '#6366f1';
    else if (condition === 'in_treatment') fillColor = '#f97316';

    return (
      <div
        key={num}
        onClick={() => handleToothClick(num)}
        onDoubleClick={() => setActiveToothModal(num)}
        className={`relative flex flex-col items-center p-1 sm:p-1.5 rounded-xl transition-all cursor-pointer select-none group min-w-[34px] sm:min-w-[38px] shrink-0 ${
          isSelected
            ? 'ring-2 ring-sky-500 bg-sky-50/80 shadow-xs'
            : 'hover:bg-neutral-100/80 hover:shadow-2xs'
        }`}
        title={`Pieza ${num}: ${CONDITION_COLORS[condition].label}. Doble clic para detalle de caras.`}
      >
        <span className={`text-[11px] font-bold font-mono transition-colors ${
          isSelected ? 'text-sky-700' : 'text-neutral-700 group-hover:text-neutral-900'
        }`}>
          {num}
        </span>

        {/* Anatomical 5-Surface Tooth SVG representation */}
        <div className="relative w-8 h-8 my-1 flex items-center justify-center">
          {isExtracted ? (
            <div className="w-7 h-7 flex items-center justify-center text-neutral-400 font-bold text-base">
              ✕
            </div>
          ) : isImplant ? (
            <div className="w-7 h-7 rounded-md bg-indigo-50 border-2 border-indigo-500 flex items-center justify-center text-indigo-700 font-mono text-[9px] font-bold">
              IMP
            </div>
          ) : (
            <svg viewBox="0 0 36 36" className="w-7 h-7 drop-shadow-2xs">
              {/* Outer border */}
              <rect x="2" y="2" width="32" height="32" rx="4" fill="#ffffff" stroke={strokeColor} strokeWidth="1.5" />

              {/* Top Surface (Vestibular / Lingual depending on arch) */}
              <polygon
                points="2,2 34,2 26,10 10,10"
                fill={condition !== 'healthy' ? fillColor : '#ffffff'}
                fillOpacity={condition !== 'healthy' ? 0.8 : 1}
                stroke={strokeColor}
                strokeWidth="1"
              />

              {/* Bottom Surface */}
              <polygon
                points="2,34 34,34 26,26 10,26"
                fill={condition !== 'healthy' ? fillColor : '#ffffff'}
                fillOpacity={condition !== 'healthy' ? 0.8 : 1}
                stroke={strokeColor}
                strokeWidth="1"
              />

              {/* Left Surface (Mesial) */}
              <polygon
                points="2,2 10,10 10,26 2,34"
                fill={condition !== 'healthy' ? fillColor : '#ffffff'}
                fillOpacity={condition !== 'healthy' ? 0.8 : 1}
                stroke={strokeColor}
                strokeWidth="1"
              />

              {/* Right Surface (Distal) */}
              <polygon
                points="34,2 26,10 26,26 34,34"
                fill={condition !== 'healthy' ? fillColor : '#ffffff'}
                fillOpacity={condition !== 'healthy' ? 0.8 : 1}
                stroke={strokeColor}
                strokeWidth="1"
              />

              {/* Center Surface (Occlusal / Incisal) */}
              <rect
                x="10"
                y="10"
                width="16"
                height="16"
                fill={condition !== 'healthy' ? fillColor : '#f8fafc'}
                stroke={strokeColor}
                strokeWidth="1"
              />

              {isCrown && (
                <circle cx="18" cy="18" r="6" fill="#f59e0b" fillOpacity="0.9" />
              )}
            </svg>
          )}
        </div>

        {/* Condition mini dot */}
        <div className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${CONDITION_COLORS[condition].dot}`} />
          <span className="text-[9px] text-neutral-500 font-medium truncate max-w-[42px]">
            {CONDITION_COLORS[condition].label.split(' ')[0]}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-neutral-50/50 rounded-xl p-2.5 sm:p-3 space-y-2.5">
      {/* Header controls & tools */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-200">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
            Piezas Dentales FDI
          </span>
          <span className="text-[10px] px-2 py-0.2 rounded-full bg-sky-100 text-sky-800 font-semibold">
            {showPediatric ? 'Mixta / Infantil' : 'Adulto'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowPediatric(!showPediatric)}
            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 transition-colors"
          >
            {showPediatric ? 'Solo Adultos' : 'Dientes de Leche'}
          </button>
          <button
            type="button"
            onClick={() => {
              setTeethMap({});
              if (onChange) onChange({});
            }}
            className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-white rounded border border-transparent hover:border-neutral-200 transition-colors"
            title="Limpiar odontograma"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Diagnosis tool palette */}
      {!readOnly && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
            Herramienta activa de marcado:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(CONDITION_COLORS) as ToothCondition[]).map(condKey => {
              const item = CONDITION_COLORS[condKey];
              const isActive = activeTool === condKey;
              return (
                <button
                  key={condKey}
                  type="button"
                  onClick={() => setActiveTool(condKey)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                    isActive
                      ? `${item.bg} ${item.border} ${item.text} shadow-xs ring-2 ring-offset-1 ring-sky-400 font-bold`
                      : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Arch Dental Grid Container */}
      <div className="relative bg-white rounded-xl border border-neutral-200 shadow-xs">
        {/* Top helper bar with view selectors and scroll navigation */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-neutral-100/90 border-b border-neutral-200 text-[11px] text-neutral-600 rounded-t-xl">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-neutral-800 shrink-0">Vista / Sector:</span>
            <div className="inline-flex rounded-lg bg-neutral-200/80 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setArchView('all')}
                className={`px-2 py-0.5 rounded-md font-medium transition ${
                  archView === 'all'
                    ? 'bg-white text-sky-700 shadow-xs font-bold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Completo
              </button>
              <button
                type="button"
                onClick={() => setArchView('right')}
                className={`px-2 py-0.5 rounded-md font-medium transition ${
                  archView === 'right'
                    ? 'bg-white text-sky-700 shadow-xs font-bold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
                title="Sector derecho: Piezas 18 a 11 y 48 a 41"
              >
                Der (18/48)
              </button>
              <button
                type="button"
                onClick={() => setArchView('left')}
                className={`px-2 py-0.5 rounded-md font-medium transition ${
                  archView === 'left'
                    ? 'bg-white text-sky-700 shadow-xs font-bold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
                title="Sector izquierdo: Piezas 21 a 28 y 31 a 38"
              >
                Izq (28/38)
              </button>
              <button
                type="button"
                onClick={() => setArchView('upper')}
                className={`px-2 py-0.5 rounded-md font-medium transition ${
                  archView === 'upper'
                    ? 'bg-white text-sky-700 shadow-xs font-bold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
                title="Maxilar Superior: Piezas 18 a 28"
              >
                Superior
              </button>
              <button
                type="button"
                onClick={() => setArchView('lower')}
                className={`px-2 py-0.5 rounded-md font-medium transition ${
                  archView === 'lower'
                    ? 'bg-white text-sky-700 shadow-xs font-bold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
                title="Mandíbula Inferior: Piezas 48 a 38"
              >
                Inferior
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => handleScroll('start')}
              className="px-1.5 py-0.5 text-[10px] rounded bg-white hover:bg-neutral-200 border border-neutral-300 text-neutral-700 transition"
              title="Ir al inicio (Piezas 18 y 48)"
            >
              |◀ 18/48
            </button>
            <button
              type="button"
              onClick={() => handleScroll('left')}
              className="p-1 rounded bg-white hover:bg-neutral-200 border border-neutral-300 text-neutral-700 transition"
              title="Desplazar a la izquierda"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              className="p-1 rounded bg-white hover:bg-neutral-200 border border-neutral-300 text-neutral-700 transition"
              title="Desplazar a la derecha"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('end')}
              className="px-1.5 py-0.5 text-[10px] rounded bg-white hover:bg-neutral-200 border border-neutral-300 text-neutral-700 transition"
              title="Ir al final (Piezas 28 y 38)"
            >
              28/38 ▶|
            </button>
          </div>
        </div>

        {/* Scrollable area without flex centering data-loss */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto p-2 sm:p-4 overscroll-x-contain touch-pan-x w-full"
        >
          <div className="w-max min-w-max mx-auto px-4 sm:px-6 py-2 space-y-4 text-left">
            
            {/* MAXILAR SUPERIOR (Shown if 'all', 'upper', 'right' or 'left') */}
            {(archView === 'all' || archView === 'upper' || archView === 'right' || archView === 'left') && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-neutral-600 uppercase px-2 whitespace-nowrap">
                  {(archView !== 'left') && <span className="text-sky-800 font-bold">Maxilar Superior Derecho (Q1: 18-11)</span>}
                  {(archView === 'all' || archView === 'upper') && <span className="text-neutral-400 font-normal px-4">| Línea Media |</span>}
                  {(archView !== 'right') && <span className="text-sky-800 font-bold">Maxilar Superior Izquierdo (Q2: 21-28)</span>}
                </div>

                <div className="inline-flex items-center justify-start gap-1 sm:gap-2 pb-2.5 border-b border-neutral-200 min-w-max">
                  {/* Q1: Piezas 18 a 11 */}
                  {(archView !== 'left') && (
                    <div className="flex gap-1 sm:gap-1.5 justify-end shrink-0">
                      {QUADRANT_1.map(renderToothSVG)}
                    </div>
                  )}

                  {/* Midline divider */}
                  {(archView === 'all' || archView === 'upper') && (
                    <div className="w-0.5 h-16 bg-neutral-300 mx-2 shrink-0 self-center" />
                  )}

                  {/* Q2: Piezas 21 a 28 */}
                  {(archView !== 'right') && (
                    <div className="flex gap-1 sm:gap-1.5 justify-start shrink-0">
                      {QUADRANT_2.map(renderToothSVG)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DECIDUOUS (TEMPORAL) TEETH IF ENABLED */}
            {showPediatric && (
              <div className="space-y-2 my-2 p-2.5 bg-amber-50/50 rounded-xl border border-amber-200/60 inline-block min-w-max">
                <div className="text-center text-[11px] font-bold text-amber-800 uppercase whitespace-nowrap">
                  Dentición Temporal / Infantil
                </div>
                {/* Upper deciduous */}
                <div className="flex items-center justify-start gap-1 sm:gap-1.5 pb-1">
                  {(archView !== 'left') && <div className="flex gap-1 sm:gap-1.5 justify-end">{QUAD_DEC_5.map(renderToothSVG)}</div>}
                  {(archView === 'all' || archView === 'upper') && <div className="w-0.5 h-12 bg-amber-300 mx-2 shrink-0 self-center" />}
                  {(archView !== 'right') && <div className="flex gap-1 sm:gap-1.5 justify-start">{QUAD_DEC_6.map(renderToothSVG)}</div>}
                </div>
                {/* Lower deciduous */}
                <div className="flex items-center justify-start gap-1 sm:gap-1.5 pt-1">
                  {(archView !== 'left') && <div className="flex gap-1 sm:gap-1.5 justify-end">{QUAD_DEC_8.map(renderToothSVG)}</div>}
                  {(archView === 'all' || archView === 'lower') && <div className="w-0.5 h-12 bg-amber-300 mx-2 shrink-0 self-center" />}
                  {(archView !== 'right') && <div className="flex gap-1 sm:gap-1.5 justify-start">{QUAD_DEC_7.map(renderToothSVG)}</div>}
                </div>
              </div>
            )}

            {/* MANDÍBULA INFERIOR (Shown if 'all', 'lower', 'right' or 'left') */}
            {(archView === 'all' || archView === 'lower' || archView === 'right' || archView === 'left') && (
              <div className="space-y-1.5">
                <div className="inline-flex items-center justify-start gap-1 sm:gap-2 pt-2.5 border-t border-neutral-200 min-w-max">
                  {/* Q4: Piezas 48 a 41 */}
                  {(archView !== 'left') && (
                    <div className="flex gap-1 sm:gap-1.5 justify-end shrink-0">
                      {QUADRANT_4.map(renderToothSVG)}
                    </div>
                  )}

                  {/* Midline divider */}
                  {(archView === 'all' || archView === 'lower') && (
                    <div className="w-0.5 h-16 bg-neutral-300 mx-2 shrink-0 self-center" />
                  )}

                  {/* Q3: Piezas 31 a 38 */}
                  {(archView !== 'right') && (
                    <div className="flex gap-1 sm:gap-1.5 justify-start shrink-0">
                      {QUADRANT_3.map(renderToothSVG)}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] font-bold text-neutral-600 uppercase px-2 whitespace-nowrap">
                  {(archView !== 'left') && <span className="text-sky-800 font-bold">Mandíbula Inferior Derecha (Q4: 48-41)</span>}
                  {(archView === 'all' || archView === 'lower') && <span className="text-neutral-400 font-normal px-4">| Línea Media |</span>}
                  {(archView !== 'right') && <span className="text-sky-800 font-bold">Mandíbula Inferior Izquierda (Q3: 31-38)</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary of affected teeth */}
      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-600 shrink-0" />
          <span className="text-neutral-700">
            <strong>Piezas registradas con hallazgos:</strong>{' '}
            {(Object.values(teethMap) as ToothData[]).filter(t => t.condition !== 'healthy').length === 0
              ? 'Ninguna anomalía marcada (Todas las piezas sanas)'
              : (Object.values(teethMap) as ToothData[])
                  .filter(t => t.condition !== 'healthy')
                  .map(t => `#${t.number} (${CONDITION_COLORS[t.condition].label})`)
                  .join(', ')}
          </span>
        </div>

        {selectedTooth && (
          <span className="font-semibold text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-lg">
            Pieza activa actual: #{selectedTooth}
          </span>
        )}
      </div>
    </div>
  );
};
