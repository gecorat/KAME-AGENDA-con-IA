import React, { useState, useEffect, useId } from 'react';
import { CheckCircle2, AlertCircle, Phone } from 'lucide-react';

export interface CountryOption {
  id: string;
  name: string;
  flag: string;
  dialCode: string;
  expectedDigits: number;
  placeholder: string;
  example: string;
  hint: string;
}

export const COUNTRIES: CountryOption[] = [
  {
    id: 'AR',
    name: 'Argentina',
    flag: '🇦🇷',
    dialCode: '+54 9',
    expectedDigits: 10,
    placeholder: 'Ej. 3425123123',
    example: '3425123123',
    hint: 'Característica + número (10 dígitos, sin 0 ni 15)'
  },
  {
    id: 'UY',
    name: 'Uruguay',
    flag: '🇺🇾',
    dialCode: '+598',
    expectedDigits: 8,
    placeholder: 'Ej. 99123456',
    example: '99123456',
    hint: '8 dígitos sin el 0'
  },
  {
    id: 'CL',
    name: 'Chile',
    flag: '🇨🇱',
    dialCode: '+56 9',
    expectedDigits: 9,
    placeholder: 'Ej. 912345678',
    example: '912345678',
    hint: '9 dígitos móviles'
  },
  {
    id: 'PY',
    name: 'Paraguay',
    flag: '🇵🇾',
    dialCode: '+595',
    expectedDigits: 9,
    placeholder: 'Ej. 981123456',
    example: '981123456',
    hint: '9 dígitos móviles'
  },
  {
    id: 'BO',
    name: 'Bolivia',
    flag: '🇧🇴',
    dialCode: '+591',
    expectedDigits: 8,
    placeholder: 'Ej. 71234567',
    example: '71234567',
    hint: '8 dígitos móviles'
  },
  {
    id: 'BR',
    name: 'Brasil',
    flag: '🇧🇷',
    dialCode: '+55',
    expectedDigits: 11,
    placeholder: 'Ej. 11912345678',
    example: '11912345678',
    hint: 'DDD + 9 dígitos (11 en total)'
  },
  {
    id: 'MX',
    name: 'México',
    flag: '🇲🇽',
    dialCode: '+52',
    expectedDigits: 10,
    placeholder: 'Ej. 5512345678',
    example: '5512345678',
    hint: 'Lada + número (10 dígitos)'
  },
  {
    id: 'CO',
    name: 'Colombia',
    flag: '🇨🇴',
    dialCode: '+57',
    expectedDigits: 10,
    placeholder: 'Ej. 3001234567',
    example: '3001234567',
    hint: '10 dígitos móviles'
  },
  {
    id: 'PE',
    name: 'Perú',
    flag: '🇵🇪',
    dialCode: '+51',
    expectedDigits: 9,
    placeholder: 'Ej. 912345678',
    example: '912345678',
    hint: '9 dígitos móviles'
  },
  {
    id: 'ES',
    name: 'España',
    flag: '🇪🇸',
    dialCode: '+34',
    expectedDigits: 9,
    placeholder: 'Ej. 612345678',
    example: '612345678',
    hint: '9 dígitos'
  },
  {
    id: 'US',
    name: 'EE.UU. / Canadá',
    flag: '🇺🇸',
    dialCode: '+1',
    expectedDigits: 10,
    placeholder: 'Ej. 3051234567',
    example: '3051234567',
    hint: 'Código de área + 7 dígitos'
  },
  {
    id: 'OTHER',
    name: 'Otro País',
    flag: '🌎',
    dialCode: '+',
    expectedDigits: 0,
    placeholder: 'Número completo con código',
    example: '',
    hint: 'Ingresa código de país y número'
  }
];

export interface PhoneInputWithCountryProps {
  id?: string;
  value: string;
  onChange: (fullPhoneNumber: string, isValid: boolean) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  label?: string;
  showStatusMessage?: boolean;
  autoFocus?: boolean;
}

/**
 * Parses an incoming value string (e.g. "+54 9 342 5123123", "+5493425123123" or "3425123123")
 * and extracts country option + local digits.
 */
function parseInitialPhone(val: string): { country: CountryOption; localNumber: string } {
  if (!val) {
    return { country: COUNTRIES[0], localNumber: '' };
  }

  const cleaned = val.trim();
  
  // Find matching country by dialCode
  for (const c of COUNTRIES) {
    if (c.id === 'OTHER') continue;
    const normalizedDial = c.dialCode.replace(/\s+/g, '');
    if (cleaned.startsWith(c.dialCode) || cleaned.startsWith(normalizedDial)) {
      const remainder = cleaned.startsWith(c.dialCode)
        ? cleaned.slice(c.dialCode.length)
        : cleaned.slice(normalizedDial.length);
      return {
        country: c,
        localNumber: remainder.replace(/\D/g, '')
      };
    }
  }

  // If no prefix but has digits, default to Argentina
  const pureDigits = cleaned.replace(/\D/g, '');
  if (pureDigits.startsWith('549') && pureDigits.length > 3) {
    return { country: COUNTRIES[0], localNumber: pureDigits.slice(3) };
  }
  if (pureDigits.startsWith('54') && pureDigits.length > 2) {
    return { country: COUNTRIES[0], localNumber: pureDigits.slice(2) };
  }

  return { country: COUNTRIES[0], localNumber: pureDigits };
}

export const PhoneInputWithCountry: React.FC<PhoneInputWithCountryProps> = ({
  id,
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
  inputClassName = '',
  label,
  showStatusMessage = true,
  autoFocus = false
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  const parsed = parseInitialPhone(value);
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(parsed.country);
  const [localNumber, setLocalNumber] = useState<string>(parsed.localNumber);

  // Sync state when external value changes drastically
  useEffect(() => {
    const currentFull = selectedCountry.dialCode + (localNumber ? ` ${localNumber}` : '');
    const currentFullCompact = (selectedCountry.dialCode + localNumber).replace(/\s+/g, '');
    const incomingCompact = value.replace(/\s+/g, '');

    if (incomingCompact !== currentFullCompact && incomingCompact !== localNumber) {
      const p = parseInitialPhone(value);
      setSelectedCountry(p.country);
      setLocalNumber(p.localNumber);
    }
  }, [value]);

  // Clean and sanitize local number
  const handleLocalNumberChange = (raw: string) => {
    let digits = raw.replace(/\D/g, '');

    // For Argentina, if user enters leading 0 (e.g. 0342...), remove 0
    if (selectedCountry.id === 'AR') {
      if (digits.startsWith('0')) {
        digits = digits.replace(/^0+/, '');
      }
      // If user pasted something like 342 15 5123123 (12 digits, with 15 in middle), auto-clean 15
      if (digits.length === 12 && digits.slice(2, 4) === '15') {
        digits = digits.slice(0, 2) + digits.slice(4);
      } else if (digits.length === 12 && digits.slice(3, 5) === '15') {
        digits = digits.slice(0, 3) + digits.slice(5);
      } else if (digits.length === 12 && digits.slice(4, 6) === '15') {
        digits = digits.slice(0, 4) + digits.slice(6);
      }
    }

    setLocalNumber(digits);
    emitChange(selectedCountry, digits);
  };

  const handleCountryChange = (countryId: string) => {
    const found = COUNTRIES.find(c => c.id === countryId) || COUNTRIES[0];
    setSelectedCountry(found);
    emitChange(found, localNumber);
  };

  const emitChange = (country: CountryOption, digits: string) => {
    const fullPhone = digits ? `${country.dialCode} ${digits}` : '';
    const isValid = validateDigits(country, digits);
    onChange(fullPhone, isValid);
  };

  const validateDigits = (country: CountryOption, digits: string): boolean => {
    if (!digits) return !required;
    if (country.expectedDigits > 0) {
      return digits.length === country.expectedDigits;
    }
    return digits.length >= 7; // for OTHER country
  };

  // Validation feedback state
  const digitCount = localNumber.length;
  const expected = selectedCountry.expectedDigits;

  let validationState: 'empty' | 'missing' | 'excess' | 'valid' = 'empty';
  let message = '';

  if (digitCount === 0) {
    validationState = 'empty';
    message = selectedCountry.hint;
  } else if (expected > 0 && digitCount < expected) {
    validationState = 'missing';
    message = `Faltan números: tenés ${digitCount} de ${expected} dígitos requeridos (ej. ${selectedCountry.example})`;
  } else if (expected > 0 && digitCount > expected) {
    validationState = 'excess';
    message = `Sobran números: ingresaste ${digitCount} dígitos (deben ser exactamente ${expected}${selectedCountry.id === 'AR' ? ', sin el 0 inicial ni el 15' : ''})`;
  } else {
    validationState = 'valid';
    // Format Argentina phone nicely: e.g. +54 9 342 512-3123
    let formattedNumber = localNumber;
    if (selectedCountry.id === 'AR' && localNumber.length === 10) {
      if (localNumber.startsWith('11')) {
        formattedNumber = `${localNumber.slice(0, 2)} ${localNumber.slice(2, 6)}-${localNumber.slice(6)}`;
      } else {
        formattedNumber = `${localNumber.slice(0, 3)} ${localNumber.slice(3, 6)}-${localNumber.slice(6)}`;
      }
    }
    message = `✓ Teléfono correcto (${selectedCountry.dialCode} ${formattedNumber})`;
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-neutral-700 block">
          {label} {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
      )}

      <div className="flex items-center rounded-xl border border-neutral-200 bg-white focus-within:ring-2 focus-within:ring-sky-500 focus-within:border-sky-500 shadow-2xs overflow-hidden transition-all">
        {/* Country Selector Dropdown */}
        <div className="relative border-r border-neutral-200 bg-neutral-50 shrink-0">
          <select
            id={`${inputId}-country`}
            value={selectedCountry.id}
            onChange={(e) => handleCountryChange(e.target.value)}
            disabled={disabled}
            className="h-10 pl-2.5 pr-6 text-xs font-semibold bg-transparent text-neutral-800 cursor-pointer appearance-none focus:outline-hidden disabled:opacity-60"
            title="Seleccionar país / prefijo telefónico"
          >
            {COUNTRIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.flag} {c.dialCode} ({c.name})
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-neutral-400 text-[10px]">
            ▼
          </div>
        </div>

        {/* Local Number Input */}
        <div className="relative flex-1 flex items-center">
          <input
            id={inputId}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            autoFocus={autoFocus}
            disabled={disabled}
            required={required}
            value={localNumber}
            onChange={(e) => handleLocalNumberChange(e.target.value)}
            placeholder={selectedCountry.placeholder}
            className={`w-full h-10 px-3 text-xs bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden font-mono ${inputClassName}`}
          />

          {/* Validation Icon */}
          <div className="pr-3 flex items-center shrink-0">
            {validationState === 'valid' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-in zoom-in-75 duration-150" />
            )}
            {(validationState === 'missing' || validationState === 'excess') && (
              <AlertCircle className="w-4 h-4 text-rose-500 animate-in zoom-in-75 duration-150" />
            )}
          </div>
        </div>
      </div>

      {/* Real-time Status / Hint Message */}
      {showStatusMessage && (
        <div className="flex items-center gap-1.5 text-[11px] px-0.5 min-h-[18px]">
          {validationState === 'valid' && (
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              {message}
            </span>
          )}
          {validationState === 'missing' && (
            <span className="text-amber-700 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {message}
            </span>
          )}
          {validationState === 'excess' && (
            <span className="text-rose-700 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {message}
            </span>
          )}
          {validationState === 'empty' && (
            <span className="text-neutral-400">
              {message}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
