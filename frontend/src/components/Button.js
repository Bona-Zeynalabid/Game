'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  icon,
  className = '',
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-yellow-bright text-dark-900 hover:bg-yellow-400 shadow-lg shadow-yellow-bright/20',
    secondary: 'bg-dark-700 text-white hover:bg-dark-600 border border-dark-600',
    outline: 'border-2 border-yellow-bright text-yellow-bright hover:bg-yellow-bright/10',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : icon}
      {children}
    </button>
  );
};

export default Button;