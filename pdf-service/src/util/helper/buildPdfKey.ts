export function buildPdfKey(
  tenantId: string,
  kind: 'bill' | 'cashmemo',
  reference: string
): string {
  const safeTenant = tenantId.replace(/[^a-zA-Z0-9-_./]/g, '_');
  const safeRef = reference.replace(/[^a-zA-Z0-9-_./]/g, '_');
  return `${safeTenant}/${kind}/${safeRef}.pdf`;
}
