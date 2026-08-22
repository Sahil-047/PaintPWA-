import * as yup from 'yup';

export const downloadBillPdfSchema = yup.object({
  tenantId: yup.string().required(),
  billId: yup.string().required(),
});

export const downloadCashMemoPdfSchema = yup.object({
  tenantId: yup.string().required(),
  memoId: yup.string().required(),
});
