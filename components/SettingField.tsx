import React from 'react';

interface SettingFieldProps {
  label: string;
  id: string;
  children: React.ReactNode;
  required?: boolean;
  description?: React.ReactNode | null;
}

export const SettingField: React.FC<SettingFieldProps> = ({ label, id, children, required = false, description = null }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1.5">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {children}
    {description && <p className="mt-1.5 text-xs text-slate-400">{description}</p>}
  </div>
);