import "server-only";

export type PaymobMode = "live" | "test" | "missing";

export function detectPaymobMode(env: NodeJS.ProcessEnv = process.env): PaymobMode {
  const requiredValues = [
    env.PAYMOB_PUBLIC_KEY,
    env.PAYMOB_SECRET_KEY,
    env.PAYMOB_HMAC_SECRET,
    env.PAYMOB_CARD_INTEGRATION_ID,
  ];

  if (requiredValues.some((value) => !value?.trim())) {
    return "missing";
  }

  const combined = requiredValues.join(" ").toLowerCase();

  if (/\btest\b|pk_test|sk_test|csk_test|egy_pk_test|egy_sk_test|egy_csk_test/.test(combined)) {
    return "test";
  }

  return "live";
}
