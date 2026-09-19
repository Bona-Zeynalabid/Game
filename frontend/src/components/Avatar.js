import React from 'react';
import { User } from 'lucide-react';

const Avatar = ({ src, alt = 'User', size = 'md', isOnline = false }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  return (
    <div className="relative inline-block">
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`${sizes[size]} rounded-full object-cover border-2 border-yellow-bright`}
        />
      ) : (
        <div className={`${sizes[size]} rounded-full bg-dark-700 flex items-center justify-center border-2 border-yellow-bright`}>
          <User className="w-1/2 h-1/2 text-gray-400" />
        </div>
      )}
      {isOnline && (
        <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 border-2 border-dark-900" />
      )}
    </div>
  );
};

export default Avatar;