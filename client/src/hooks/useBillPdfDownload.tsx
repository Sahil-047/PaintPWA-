import { useState } from 'react';
import { toast } from 'sonner';
import { billingApi } from '@/api';
import {
  BillPdfFormatDialog,
  type BillPdfFormat,
} from '@/components/BillPdfFormatDialog';

export function useBillPdfDownload() {
  const [target, setTarget] = useState<{ id: string; billNo?: string } | null>(null);
  const [loadingFormat, setLoadingFormat] = useState<BillPdfFormat | null>(null);

  function requestPdf(id: string, billNo?: string) {
    setTarget({ id, billNo });
  }

  async function handleSelect(format: BillPdfFormat) {
    if (!target) return;
    setLoadingFormat(format);
    try {
      await billingApi.openPdf(target.id, target.billNo, format);
      setTarget(null);
    } catch {
      toast.error('Could not open invoice PDF');
    } finally {
      setLoadingFormat(null);
    }
  }

  const dialog = (
    <BillPdfFormatDialog
      open={target != null}
      onOpenChange={(open) => {
        if (!open && loadingFormat == null) setTarget(null);
      }}
      billNo={target?.billNo}
      loadingFormat={loadingFormat}
      onSelect={handleSelect}
    />
  );

  return { requestPdf, dialog };
}
