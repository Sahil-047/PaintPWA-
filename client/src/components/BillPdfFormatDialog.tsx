import { FileText, Loader2, Printer } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type BillPdfFormat = 'standard' | 'dl';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billNo?: string;
  loadingFormat?: BillPdfFormat | null;
  onSelect: (format: BillPdfFormat) => void;
};

const OPTIONS: Array<{
  id: BillPdfFormat;
  title: string;
  subtitle: string;
  icon: typeof FileText;
}> = [
  {
    id: 'standard',
    title: 'Standard',
    subtitle: 'Current bill size · grows with items',
    icon: FileText,
  },
  {
    id: 'dl',
    title: 'DL strip',
    subtitle: '3.9″ × 8.3″ · envelope / thermal strip',
    icon: Printer,
  },
];

export function BillPdfFormatDialog({
  open,
  onOpenChange,
  billNo,
  loadingFormat = null,
  onSelect,
}: Props) {
  const busy = loadingFormat != null;

  return (
    <Dialog open={open} onOpenChange={(v) => (!busy ? onOpenChange(v) : undefined)}>
      <DialogContent className="sm:max-w-md rounded-2xl border-[#e2e8f0] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-[#f1f5f9]">
          <DialogTitle className="text-[17px] text-[#0f172a]">Download invoice</DialogTitle>
          <DialogDescription className="text-[13px] text-[#64748b]">
            Choose paper size{billNo ? ` for ${billNo}` : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-2.5">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const loading = loadingFormat === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={busy}
                onClick={() => onSelect(opt.id)}
                className={cn(
                  'w-full flex items-start gap-3 rounded-xl border border-[#e2e8f0] bg-white px-4 py-3.5 text-left transition-colors',
                  'hover:border-[var(--brand-secondary)] hover:bg-[var(--brand-tertiary)]',
                  'disabled:opacity-60 disabled:pointer-events-none'
                )}
              >
                <span className="mt-0.5 w-9 h-9 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] inline-flex items-center justify-center text-[#64748b] shrink-0">
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" strokeWidth={2} />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-[#0f172a]">{opt.title}</span>
                  <span className="block text-[12.5px] text-[#64748b] mt-0.5">{opt.subtitle}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="px-4 pb-4">
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            className="w-full rounded-xl text-[#64748b]"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
