import { z } from "zod";

// All money is stored as integer agorot (₪1 = 100 agorot). Never floats.
// Formatting to ₪ happens only at the display edge (the mobile app), so this
// module only validates/manipulates raw integer amounts.

export const agorotAmountSchema = z.number().int().positive();

export function assertPositiveAgorot(amount: number, label: string): void {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`${label} must be a positive integer amount of agorot, got ${amount}`);
  }
}

export function sumAgorot(amounts: number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}
