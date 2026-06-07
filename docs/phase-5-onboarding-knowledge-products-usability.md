# Phase 5 Onboarding, Knowledge, Products, And Usability

Date: 2026-06-06

Scope: make first-time setup clearer, reduce form confusion, and make product/knowledge data easier to test before real customers.

## Implemented

- Kept onboarding focused on three launch actions:
  - connect a channel
  - add business knowledge
  - test the assistant
- Preserved the business information limit at 1000 characters.
- Added clearer business context UI in Settings:
  - visible 1000-character counter
  - practical placeholder
  - warning not to paste secrets/API keys
- Improved Knowledge creation UX:
  - field-level Arabic validation for business info, FAQ question, FAQ answer, and assistant test input
  - user input stays on validation/API failure
  - API validation issues are mapped back to the exact field when available
  - add button can be clicked even when fields are empty, so the user sees the exact missing field
- Added product-aware assistant testing:
  - Knowledge page receives available products from the server
  - assistant test panel suggests product questions such as price/availability prompts
  - Products page links directly to `/knowledge#test` once products exist
- Improved Arabic validation messages in shared validators.

## Product Rules Covered

- Every page should have a clear primary action:
  - Dashboard: connect/open messages/customize assistant
  - Knowledge: save business info, add FAQ, test assistant
  - Products: add product, then test product-aware replies
  - Settings: save assistant configuration
- Normal users should not see raw technical validation copy.
- Knowledge failures should preserve input and explain the exact field that needs attention.
- Product catalog data should be visibly connected to AI testing.

## Remaining Phase 5 Opportunities

- Add a dedicated first-run setup page that adapts step order based on readiness.
- Add a product preview in assistant test results showing matched product sources more visually.
- Add inline save state to each Settings section instead of one full-page save.
- Add component-level browser tests for Knowledge field validation once the test harness covers authenticated UI state.

## Quality Gates

- `tests/unit/validators.test.ts` covers Arabic validation messages.
- `tests/api/knowledge.test.ts` covers safe knowledge creation/update ownership.
- `tests/api/assistant-test.test.ts` covers assistant test behavior without quota/message sending.
- Browser smoke should verify `/knowledge` redirects to login when unauthenticated and renders without console errors when authenticated.
