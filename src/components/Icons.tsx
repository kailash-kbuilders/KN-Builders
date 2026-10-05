/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

// Official, razor-sharp WhatsApp Vector Logo
export function WhatsAppLogo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <circle cx="16" cy="16" r="16" fill="#25D366" />
      <path
        fill="#FFFFFF"
        d="M23.5 8.5C21.5 6.5 18.9 5.4 16.1 5.4C10.3 5.4 5.6 10.1 5.6 15.9C5.6 17.8 6.1 19.6 7 21.1L5.5 26.5L11.1 25C12.6 25.8 14.3 26.3 16.1 26.3C21.9 26.3 26.6 21.6 26.6 15.8C26.6 13 25.5 10.4 23.5 8.5ZM16.1 24.5C14.5 24.5 13 24.1 11.6 23.3L11.3 23.1L8 24L8.9 20.8L8.7 20.4C7.8 19 7.3 17.5 7.3 15.9C7.3 11 11.2 7.1 16.1 7.1C18.5 7.1 20.7 8 22.4 9.7C24.1 11.4 25 13.6 25 16C25 20.7 21 24.5 16.1 24.5ZM20.9 18.3C20.6 18.1 19.3 17.5 19 17.4C18.8 17.3 18.6 17.3 18.4 17.6C18.2 17.9 17.7 18.5 17.6 18.7C17.4 18.9 17.3 18.9 17 18.8C16.7 18.6 15.8 18.3 14.8 17.4C14 16.7 13.5 15.8 13.3 15.5C13.2 15.2 13.3 15.1 13.4 15C13.5 14.9 13.7 14.7 13.8 14.5C13.9 14.3 14 14.2 14.1 14C14.2 13.8 14.1 13.7 14.1 13.5C14 13.4 13.5 12.1 13.3 11.6C13.1 11.1 12.9 11.2 12.8 11.2C12.6 11.2 12.4 11.2 12.3 11.2C12.1 11.2 11.8 11.3 11.6 11.5C11.3 11.8 10.7 12.4 10.7 13.6C10.7 14.8 11.6 16 11.7 16.2C11.8 16.4 13.5 19 16.1 20.1C16.7 20.4 17.2 20.5 17.6 20.7C18.2 20.9 18.8 20.8 19.3 20.8C19.8 20.7 20.8 20.2 21 19.6C21.2 19 21.2 18.5 21.1 18.4C21.1 18.3 21 18.3 20.9 18.3Z"
      />
    </svg>
  );
}

// 📧 Stylized Envelope / Email Icon (requested: "email ka logo hta de aur 📧 esa icon aaye ya tu bna de koi aur")
export function EmailEnvelopeIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <defs>
        <linearGradient id="emailGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      {/* Background card with border */}
      <rect x="2" y="4" width="20" height="16" rx="4" fill="#141422" stroke="url(#emailGrad)" strokeWidth="1.8" />
      {/* Top flap */}
      <path
        d="M3 6.5L11.1 12.5C11.65 12.9 12.35 12.9 12.9 12.5L21 6.5"
        stroke="#60a5fa"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Subtle interior letter shine */}
      <circle cx="12" cy="14" r="1.5" fill="#38bdf8" opacity="0.8" />
    </svg>
  );
}

export function AndroidLogo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#3DDC84">
      <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-4.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 2.23 12.95 2 12 2c-.96 0-1.86.23-2.66.63L7.85.87c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.73 3.91 5.53 5.48 5.22 7.37h13.56c-.31-1.89-1.51-3.46-3.25-4.21zM9 5.5c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75zm6 0c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75z" />
    </svg>
  );
}

export function CodeLogo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

export function FirebaseLogo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path fill="#FFA000" d="M3.89 15.67L6.87 2.15c.08-.36.56-.44.75-.12l2.94 5.08-6.67 8.56z" />
      <path fill="#F57C00" d="M12.92 7.77l-2.36-4.63c-.15-.3-.59-.3-.74 0L3.89 15.67l9.03-7.9z" />
      <path fill="#FFCA28" d="M14.65 11.39l-1.73-3.62-9.03 7.9 7.6 4.29c.32.18.7.18 1.02 0l7.6-4.29-5.46-4.28z" />
    </svg>
  );
}

export function FigmaLogo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path fill="#F24E1E" d="M8 2h4v4H8z" />
      <path fill="#A259FF" d="M8 6h4v4H8z" />
      <path fill="#0ACF83" d="M8 10h4v4H8z" />
      <path fill="#1ABCFE" d="M12 6h4v4h-4z" />
      <path fill="#FF7262" d="M12 2h4v4h-4z" />
      <circle cx="8" cy="14" r="2" fill="#0ACF83" />
      <circle cx="8" cy="10" r="2" fill="#A259FF" />
      <circle cx="8" cy="6" r="2" fill="#F24E1E" />
      <circle cx="16" cy="6" r="2" fill="#FF7262" />
      <circle cx="16" cy="10" r="2" fill="#1ABCFE" />
    </svg>
  );
}

export function PaletteLogo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="#EC4899" />
      <circle cx="17.5" cy="10.5" r=".5" fill="#EC4899" />
      <circle cx="8.5" cy="7.5" r=".5" fill="#EC4899" />
      <circle cx="6.5" cy="12.5" r=".5" fill="#EC4899" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z" />
    </svg>
  );
}

export function getSkillIcon(iconType: string, className = 'w-5 h-5') {
  switch (iconType?.toLowerCase()) {
    case 'android':
      return <AndroidLogo className={className} />;
    case 'firebase':
      return <FirebaseLogo className={className} />;
    case 'figma':
    case 'ui/ux':
      return <FigmaLogo className={className} />;
    case 'palette':
    case 'art':
      return <PaletteLogo className={className} />;
    case 'code':
    case 'html':
    case 'web':
    default:
      return <CodeLogo className={className} />;
  }
}
