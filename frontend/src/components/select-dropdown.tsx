'use client';

import { useEffect, useRef, useState } from 'react';

interface Option {
  value: string;
  label: string;
}

interface SelectDropdownProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  label?: string;
  testId?: string;
}

export function SelectDropdown({ value, options, onChange, label, testId }: SelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="text-sm" data-testid={testId}>
      {label && <span className="mb-1 block text-slate-600">{label}</span>}
      <div ref={ref} className="relative">
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-800 shadow-sm transition-colors hover:border-teal-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        >
          <span>{current.label}</span>
          <svg
            className={`ml-2 h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Dropdown list */}
        {open && (
          <ul
            role="listbox"
            className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-float"
          >
            {options.map((option) => {
              const isActive = option.value === value;
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-teal-100 font-semibold text-teal-800'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{option.label}</span>
                  {isActive && (
                    <svg
                      className="h-4 w-4 text-teal-600"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
