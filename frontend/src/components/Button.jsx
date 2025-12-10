import React from 'react';

export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = 'mc-btn';
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    ghost: 'bg-transparent border border-gray-300 text-slate-800 hover:bg-slate-100',
    success: 'bg-green-600 text-white hover:bg-green-700',
  };
  return (
    <button className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}
