import { useState } from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  iconClassName?: string;
}

export default function ProductImage({
  src,
  alt = '',
  className = 'w-12 h-12 rounded-xl',
  iconClassName = 'w-5 h-5',
}: ProductImageProps) {
  const [broken, setBroken] = useState(false);
  const url = src?.trim();

  if (url && !broken) {
    return (
      <img
        src={url}
        alt={alt}
        className={cn('object-cover border border-[#e2e8f0] bg-white shrink-0', className)}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center bg-[#f8fafc] border border-[#e2e8f0] shrink-0',
        className
      )}
    >
      <Package className={cn('text-[#94a3b8]', iconClassName)} strokeWidth={2} />
    </div>
  );
}
