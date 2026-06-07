export type MetaRedirectUriStatus = {
  currentRedirectUri: string;
  expectedRedirectUri: string;
  isValid: boolean;
};

function originFromUrl(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function buildMetaRedirectUri(origin: string, path = "/connect"): string {
  return new URL(path, origin).toString();
}

export function getMetaRedirectUriStatus(params: {
  currentOrigin: string;
  configuredAppUrl?: string | null;
  path?: string;
}): MetaRedirectUriStatus {
  const currentRedirectUri = buildMetaRedirectUri(params.currentOrigin, params.path);
  const expectedOrigin = params.configuredAppUrl ? originFromUrl(params.configuredAppUrl) : null;
  const expectedRedirectUri = expectedOrigin ? buildMetaRedirectUri(expectedOrigin, params.path) : currentRedirectUri;

  return {
    currentRedirectUri,
    expectedRedirectUri,
    isValid: currentRedirectUri === expectedRedirectUri,
  };
}

export function buildMetaRedirectUriMismatchMessage(status: MetaRedirectUriStatus): string {
  return [
    "رابط رجوع Meta غير مطابق لإعدادات الإنتاج.",
    `أضيفي هذا الرابط في Meta Developer Console: ${status.currentRedirectUri}`,
    `رابط الإنتاج المتوقع في Kallem: ${status.expectedRedirectUri}`,
  ].join(" ");
}
