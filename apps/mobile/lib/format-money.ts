// Money is always integer agorot (₪1 = 100 agorot) until this, the display
// edge (BUILD_SPEC section 5 / section 7).
export function formatMoney(agorot: number, options?: { decimals?: boolean }): string {
  const shekels = agorot / 100;
  const decimals = options?.decimals ?? false;
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  });
  return `₪${formatter.format(shekels)}`;
}
