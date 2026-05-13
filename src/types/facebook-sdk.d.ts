// FILE: src/types/facebook-sdk.d.ts
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The Facebook SDK is loaded at runtime from Meta, so a narrow global
 * type keeps the embedded signup launcher typed without pulling a third-party SDK package.
 */
export {};

declare global {
  interface Window {
    FB?: {
      init: (params: {
        appId: string;
        autoLogAppEvents?: boolean;
        cookie?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: {
          status?: string;
          authResponse?: {
            code?: string;
          };
        }) => void,
        options: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}
