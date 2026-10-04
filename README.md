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

Set `GEMINI_API_KEY` through the deployment platform's secret/configuration
manager. Never place it in source control or expose it to client-side code.

The deployment needs a writable location for `migration.db`. Because this
project uses a local SQLite file, a serverless deployment with ephemeral
storage is not a supported production architecture. Use a persistent host or
replace the mock database with an appropriate managed datastore before any real
migration.

### Railway deployment

Railway is the recommended hosted demo platform for this repository because it
supports a persistent volume for SQLite.

1. Push the latest commit to GitHub.
2. In Railway, create a new project and choose **Deploy from GitHub repo**.
3. Select this repository. Railway will build using the included `Dockerfile`.
4. Add the variable `GEMINI_API_KEY` in the service's Variables settings.
5. Add a Railway Volume mounted at `/app/data`.
6. Add the variable `MIGRATION_DB_PATH=/app/data/migration.db`.
7. Generate a public domain from the service's Networking settings.
8. Open the generated HTTPS URL and verify:
   - the dashboard loads,
   - an AI plan can be generated,
   - approval is required before execution,
   - a dry run reports zero target inserts,
   - execution and rollback history are visible.

The public URL and any reviewer demo notes should be added to the repository
remarks or submission form. Do not put the Gemini key in the repository,
README, screenshots, or reviewer remarks.
