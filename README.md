# Agentic Data Migration Planner

An agent-assisted reconciliation workbench for planning, validating, and executing
one bounded migration from HR employee records to SaaS user records.

## Setup

### Prerequisites

- Node.js 20 or newer
- npm
- A Google Gemini API key with access to the configured Generative Language API

### Install and configure

```powershell
npm install
Copy-Item .env.example .env.local
```

Set `GEMINI_API_KEY` in `.env.local`. Do not commit `.env.local` or any real
credential.

Start the development server:

```powershell
npm run dev
```

Open <http://localhost:3000>.

Useful commands:

```powershell
npm run build
npm run lint
```

The application creates and seeds `migration.db` on first startup. The database
is local runtime data and is intentionally excluded from Git.

## Architecture

This is a Next.js App Router application using TypeScript, React, SQLite, and
the `@google/genai` SDK.

```text
src/
  app/
    page.tsx                         Client workbench UI
    api/data/route.ts                Source/target totals
    api/migration/plan/route.ts      Generate, read, and approve plans
    api/migration/dry-run/route.ts  Deterministic validation run
    api/migration/execute/route.ts  Approved migration execution
    api/migration/rollback/route.ts Execution rollback
    api/migration/history/route.ts  Run history
  lib/
    ai.ts                            Gemini mapping proposal
    schemas.ts                       Source, target, and transformation rules
    engine.ts                        Mapping, validation, quarantine, inserts
    db.ts                            SQLite schema and bounded seed data
```

The flow is:

1. The UI requests three source sample records for AI planning.
2. Gemini proposes mappings, transformations, risks, and clarification questions.
3. The proposal is saved as a versioned draft.
4. A user approves the draft.
5. A dry run transforms and validates every source record without inserting data.
6. An approved execution inserts valid records and logs rejected records.
7. A completed execution can be rolled back using its migration run ID.

Supported transformations are deliberately fixed in `src/lib/schemas.ts`:
name splitting, ISO date formatting, status mapping, role mapping, username
generation, and direct copying. The application does not execute arbitrary AI
generated code.

## Completed scope

- AI-assisted field mapping proposal.
- Missing/incompatible field analysis, risks, and clarification questions.
- Versioned draft and approved migration plans.
- Approval gate before execution.
- Deterministic dry-run processing.
- Source, transformed, accepted, and rejected counts.
- Quarantine logs with field-level error evidence and transformed attempts.
- Approved execution into a mock SQLite target.
- Duplicate prevention using the source record ID.
- Source and target record totals.
- Execution, dry-run, approval, retry, and rollback history.
- Validated rollback for completed execution runs only.
- Local development and production build support.

## Explicitly excluded scope

This assignment intentionally does not include:

- Production database access.
- Arbitrary transformation code generation or execution.
- Distributed or high-volume migration infrastructure.
- Live cloud database or SaaS connectors.
- Multiple source systems or multiple target systems.
- Authentication, authorization, multi-tenant isolation, or production secrets management.
- A general-purpose workflow scheduler.

The source, target, and AI sample are intentionally bounded. The AI prompt uses
at most three representative source records.

## Testing and verification

The main verification command is:

```powershell
npm run build
```

The application has also been verified through the UI with this flow:

1. Generate an AI plan.
2. Approve the plan.
3. Run a dry run and confirm zero target inserts.
4. Execute the approved plan.
5. Confirm five valid seeded records are inserted and two invalid records are
   quarantined.
6. Confirm execution history is recorded.
7. Roll back the execution and confirm inserted target records are removed.

The seeded dataset contains seven records, including intentionally invalid
records for an invalid date and a missing email.

`npm run lint` currently reports existing project-wide explicit-`any` and hook
warnings. These do not prevent the TypeScript production build, which passes.

## Limitations

- The SQLite database is a local mock store and is not suitable for concurrent
  production deployments.
- The migration engine uses a fixed schema and fixed transformations.
- Username collision handling is limited by target uniqueness constraints and
  should be made an explicit business rule for real migrations.
- Names with unusual formats, missing values, or suffixes may need stakeholder
  clarification.
- Invalid records are logged for review but are not editable or reprocessed from
  the UI.
- `date_of_birth` is intentionally identified as unmapped because the target
  schema has no corresponding field.
- There is no authentication or authorization layer.

## Deployment

For a local or single-instance deployment:

```powershell
npm ci
npm run build
npm start
```

The production build intentionally uses `next build --webpack` rather than the
default Turbopack build. This avoids native `better-sqlite3` crashes in hosted
build workers while preserving the same application behavior.

Set `GEMINI_API_KEY` through the deployment platform's secret/configuration
manager. Never place it in source control or expose it to client-side code.

The deployment needs a writable location for `migration.db`. Because this
project uses a local SQLite file, a serverless deployment with ephemeral
storage is not a supported production architecture. Use a persistent host or
replace the mock database with an appropriate managed datastore before any real
migration.

### Render Free deployment

Render Free is the recommended no-cost hosted demo platform for this
repository. The included `render.yaml` defines the build, start command, health
check, and secret variable.

1. Push the latest commit to GitHub.
2. In Render, choose **New > Blueprint**.
3. Connect the GitHub repository and select this repository.
4. Confirm the service uses the included `render.yaml`.
5. In the service's Environment settings, add `GEMINI_API_KEY` with the real
   key. Keep it as a secret and do not commit it.
6. Deploy the service and copy its generated HTTPS URL.
7. Open the generated URL and verify:
   - the dashboard loads,
   - an AI plan can be generated,
   - approval is required before execution,
   - a dry run reports zero target inserts,
   - execution and rollback history are visible.

The free Render filesystem is ephemeral. The app will work for a hosted demo,
but `migration.db` can reset when the service restarts or redeploys. This is
documented and acceptable only for evaluation/demo data. Persistent migration
history requires a paid persistent disk or a managed database.

The public URL and any reviewer demo notes should be added to the repository
remarks or submission form. Do not put the Gemini key in the repository,
README, screenshots, or reviewer remarks.

### Vercel note

Vercel is not the recommended host for this repository. Its serverless
execution model and ephemeral filesystem are incompatible with the app's
`better-sqlite3` mock persistence and rollback history. Use Render for the free
hosted evaluation deployment.
