import { useBranding } from "@/lib/fund";
import { cn } from "@/lib/utils";

export function FundEmblem({ className }: { className?: string | undefined }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="32" r="30" fill="var(--primary)" />
      <circle cx="32" cy="32" r="26" fill="none" stroke="var(--gold)" strokeWidth="1.5" />
      <path d="M16 40 L32 22 L48 40 Z" fill="var(--gold)" />
      <rect x="22" y="38" width="20" height="10" rx="1.5" fill="var(--primary-foreground)" />
      <rect x="29" y="41" width="6" height="7" fill="var(--primary)" />
      <path d="M32 14 c3 3 3 6 0 8 c-3 -2 -3 -5 0 -8z" fill="var(--gold)" />
    </svg>
  );
}

export function FundLogo({ className }: { className?: string | undefined }) {
  const { data } = useBranding();
  if (data?.logo_url)
    return <img src={data.logo_url} alt="شعار صندوق بنان الخير للبنيان" className={cn("object-contain", className)} />;
  return <FundEmblem className={className} />;
}
