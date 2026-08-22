import * as yup from 'yup';

export const downloadCashMemoPdfSchema = yup.object({
  tenantId: yup.string().required(),
  memoId: yup.string().required(),
});
