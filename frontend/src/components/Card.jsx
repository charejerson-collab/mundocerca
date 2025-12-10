import React from 'react';

export default function Card({ children, className = '', ...props }) {
  return (
    <div className={`mc-card hover:shadow-lg transition-shadow duration-300 ${className}`} {...props}>
      {children}
    </div>
  );
}
