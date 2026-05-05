// FILE: tests/setup/server-only.ts
/*
 * [ROLE: QA ENGINEER]
 * Decision: Vitest runs outside Next's server compiler, so this no-op module
 * preserves server-only import boundaries without changing production code.
 */
export {};
