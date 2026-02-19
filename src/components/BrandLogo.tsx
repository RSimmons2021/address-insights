'use client';

import Image from 'next/image';
import Link from 'next/link';

type BrandLogoProps = {
  className?: string;
  size?: 'default' | 'compact';
};

export default function BrandLogo({ className = '', size = 'default' }: BrandLogoProps) {
  const imageWidth = size === 'compact' ? 110 : 132;
  const imageHeight = size === 'compact' ? 23 : 28;

  return (
    <Link
      href="/"
      aria-label="RentEngine home"
      className={`inline-flex items-center justify-center rounded-xl border px-3 py-2 backdrop-blur-sm transition-transform hover:-translate-y-0.5 ${className}`.trim()}
      style={{
        background: 'var(--bg-overlay)',
        borderColor: 'var(--divider)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <Image
        src="/rentengine-logo.svg"
        alt="RentEngine"
        width={imageWidth}
        height={imageHeight}
        priority
        className="h-auto block"
      />
    </Link>
  );
}
