import React from 'react';

export default function Badge({ children, variant = 'success', className = '' }) {
  const map = {
    success: 'inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800',
    blue: 'inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800',
    purple: 'inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800',
    neutral: 'inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700'
  };
  return <span className={`${map[variant] || map.success} ${className}`}>{children}</span>;
}
