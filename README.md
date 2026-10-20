# Customizable Invoice Generator

A browser-based invoice tool for a small business. You can fill in an invoice with a live preview, add custom fields, print or save it as a PDF, save it to a database and email it to a client.

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, SQLite (better-sqlite3), Nodemailer, Zod.

## Run it

Requires Node.js 20.9+ and npm.

```bash
npm install
cp .env.example .env.local   # only needed for real email delivery
npm run dev                  # http://localhost:3000
```

Production: `npm run build && npm start`. Lint: `npm run lint`. Type check: `npm run typecheck`.

## Backend

The backend lives in the same Next.js app, as route handlers under `src/app/api/invoices`:

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/api/invoices` | List saved invoices |
| POST | `/api/invoices` | Create an invoice |
| GET | `/api/invoices/:id` | Get one invoice |
| PUT | `/api/invoices/:id` | Update an invoice |
| DELETE | `/api/invoices/:id` | Delete an invoice |
| POST | `/api/invoices/:id/email` | Email the saved invoice (`{ to, message? }`) |

Every request is validated on the server with the same Zod schema the editor uses, so the rules (no negative values, discount not above the subtotal, and so on) can't be bypassed through the API. Errors come back as `{ error, issues: [{ path, message }] }`, and the editor shows each issue next to its field.

## Storage

SQLite, so there's nothing to install. The database file is created on first run at `./data/invoices.db` (git-ignored). Set `DATABASE_PATH` to put it somewhere else.

The tables are created by a small migration in `src/server/invoice-repository.ts`. Each invoice is stored as a JSON document, with the columns the list page needs (number, client, dates, total) stored next to it. Invoice numbers are unique (case-insensitive), and sent emails are logged in a separate table.

## Email setup

Email is sent over SMTP with Nodemailer, so any email service that offers SMTP works. Put its details in `.env.local` (see `.env.example`):

```bash
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
EMAIL_FROM="Invoice Generator <invoices@your-verified-domain.com>"
EMAIL_ALLOWED_RECIPIENTS=you@example.com
```

- Without `SMTP_HOST`, in development, the app creates a throwaway test inbox and shows a link to view each sent email. No setup is needed to try it.
- `EMAIL_ALLOWED_RECIPIENTS` (optional) limits who can receive email, so test emails only reach addresses you control.
- Credentials are only read in server code (`src/server/email.ts`) and never reach the browser.

## Decisions

- **Money is stored in integer cents.** Inputs like "84.25" are parsed straight to cents, never through floating point. Totals follow the order in the brief: each line is rounded to cents, the lines are summed, the discount is applied, then tax is calculated and rounded. Check: 2 × $50 − $10 + 10% tax = $99.00.
- **One validation schema** (`src/lib/invoice/schema.ts`) is shared by the editor and the API.
- **SQLite** keeps setup to `npm install`. Storage is isolated in one file (`invoice-repository.ts`), so switching to Postgres later would be contained.
- **PDF = browser print.** Print styles hide everything except the invoice, including hidden custom fields. That avoids a PDF library and keeps the text selectable.
- **Email sends the saved version.** If there are unsaved changes, the invoice is saved first, so the email always matches what's stored.
- **Custom fields** are separate from the totals. Hidden ones stay saved but never appear in the preview, PDF or email.
- **Design:** editor on the left, live preview on the right; on mobile, an Edit/Preview switch and a bottom action bar. Labels on all fields, keyboard support, visible focus and colours checked for readable contrast.

Code layout:

```
src/app/            pages and API routes
src/components/     editor sections, invoice preview, UI parts
src/lib/invoice/    money, totals, validation, email template
src/server/         database, email sending, request helpers
```

## Unfinished work / limitations

- No login. Anyone who can reach the app can see every invoice (not required by the brief).
- SQLite needs a persistent disk. Serverless hosting would need a hosted database.
- The email contains the invoice as HTML; no PDF attachment.
- USD only. No payment status (paid/overdue) and no reordering of line items.
- No rate limiting on the email endpoint.
- If the same invoice is edited in two tabs, the last save wins.
- No automated tests in the repository.

## AI tools used

I used an AI coding assistant (an agent inside the code editor) for planning, writing code and testing.

## Time spent

A little over 3 hours.
