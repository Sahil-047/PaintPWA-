import { cn } from '@/lib/utils';
import brandLogo from '@/assets/newlogo.png';

type BrandLogoProps = {
  className?: string;
  /** Image height; width scales with aspect ratio. */
  height?: number;
  alt?: string;
};

/**
 * Official paintsaas wordmark + icon (newlogo.png).
 * Full logo includes text — do not pair with a duplicate product-name label.
 */
export default function BrandLogo({
  className,
  height = 48,
  alt = 'paintsaas — Premium Paint Shop ERP',
}: BrandLogoProps) {
  return (
    <img
      src={brandLogo}
      alt={alt}
      height={height}
      className={cn('w-auto object-contain object-left select-none', className)}
      style={{ height }}
      draggable={false}
    />
  );
}

export { brandLogo };
