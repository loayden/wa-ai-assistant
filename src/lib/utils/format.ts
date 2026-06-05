export function formatStableNumber(value: number, options: { maximumFractionDigits?: number } = {}) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  const maximumFractionDigits = options.maximumFractionDigits ?? 0;
  const rounded = maximumFractionDigits > 0 ? value.toFixed(maximumFractionDigits).replace(/\.?0+$/, "") : Math.round(value).toString();
  const [integerPart, fractionPart] = rounded.split(".");
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return fractionPart ? `${grouped}.${fractionPart}` : grouped;
}

export function formatStableMoney(value: number) {
  return formatStableNumber(value, { maximumFractionDigits: 0 });
}
