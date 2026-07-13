import invoiceHero from '@/assets/1837464b0b972d781d16b16c25765abeb8f7d458.png';

export default function BillingHeroIllustration() {
  return (
    <img
      src={invoiceHero}
      alt="Billing and payments"
      draggable={false}
      className="w-full max-w-[340px] h-auto object-contain select-none pointer-events-none"
    />
  );
}
