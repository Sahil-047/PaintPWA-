let counter = 0;

export function generateBillNo(): string {
  counter += 1;
  return `BILL-${Date.now()}-${counter}`;
}

export function generateMemoNo(): string {
  counter += 1;
  return `CM-${Date.now()}-${counter}`;
}
