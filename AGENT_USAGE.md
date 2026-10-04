# Agent Usage

This file records how the implementation was inspected, changed, and verified.
It does not contain credentials or private API data.

## Tools used

- Workspace file search and content search to locate the Next.js routes, database
  layer, migration engine, Gemini integration, and UI.
- Targeted file reads to understand existing behavior before editing.
- Patch-based edits for source, documentation, and configuration changes.
- PowerShell for local build, lint, and runtime verification.
- TypeScript/Next.js diagnostics on changed files.
- Direct Gemini REST and SDK checks using the locally configured credential
  without printing the credential.
- Session artifact registration for the primary changed files.

## Representative prompts and requests

The work was driven by requests to:

- Diagnose the Gemini `API_KEY_INVALID` response.
- Validate the frontend dry-run and execution workflow.
- Compare the project against `instructions.md`.
- Add rollback safeguards and clearer frontend errors.
- Create GitHub-ready ignore rules and project documentation.

Representative investigation questions included:

- Which environment value is the running Next.js process using?
- Is the Gemini key accepted by the Generative Language API?
- Which configured model is available to this account?
- Does the dry run insert any target records?
- Does execution require an approved plan and prevent duplicate inserts?

## Delegated work

No implementation work was delegated to a background agent. The repository was
small enough for a single continuous inspection and verification pass.

## Important mistakes and rejected suggestions

### Incorrect initial model change

An initial attempted fix changed the model from `gemini-3.5-flash-lite` to
`gemini-2.5-flash-lite` based on an incorrect assumption about model stability.
Direct API testing showed that the supplied key could list models, but this
account rejected the 2.5 generation request for new users. The change was
reverted to `gemini-3.5-flash-lite`, which was verified successfully through
both REST and the `@google/genai` SDK.

### Environment precedence

The initial diagnosis focused on the key value itself. Metadata-only comparison
of the shell environment and `.env.local` showed that PowerShell already had an
older `GEMINI_API_KEY` exported. Next.js was therefore using the process
environment value instead of the `.env.local` value. The key was never printed
or copied into repository files.

### Unrelated build issue

The first production build exposed escaped template literals in
`src/lib/engine.ts` that caused an unterminated-template syntax error. This was
fixed because it prevented the application from building. The fix was unrelated
to the Gemini request and was kept narrowly scoped.

### Rejected fallback behavior

No offline or success-shaped AI fallback was added. Invalid credentials or
provider failures remain explicit API errors so the user cannot approve or
execute a plan that appears AI-generated when it was not.

## Verification performed

- Confirmed the Gemini key metadata without exposing the secret.
- Called the Generative Language model-list endpoint and received HTTP 200.
- Called `gemini-3.5-flash-lite` directly and received `OK`.
- Called the `@google/genai` SDK independently and received `SDK_OK OK`.
- Generated and approved a plan through the frontend.
- Executed a dry run: seven source records, five accepted, two rejected, zero
  target inserts.
- Executed the approved migration: five target records inserted.
- Confirmed invalid date and missing email evidence in quarantine logs.
- Confirmed execution history and rollback behavior.
- Added rollback validation for nonexistent, dry-run, incomplete, and already
  rolled-back runs.
- Ran `npm run build` successfully.
- Checked TypeScript diagnostics for changed files.
- Verified `.env.local`, `migration.db`, `.next`, `node_modules`, logs, and
  generated TypeScript files are ignored by Git.
