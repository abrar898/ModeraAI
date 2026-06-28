# ModeraAI — AI Content Moderation Platform

A full-stack content moderation platform that screens user-submitted images against configurable AI-powered policy categories, supports a structured appeal workflow, and gives administrators complete oversight via analytics, policy configuration, and verdict overrides.

A live landing page introduces the product with a GSAP-animated scan visual and scroll-triggered sections; the in-app experience is a clean, light-by-default UI (with full dark-mode support) built on Tailwind CSS.

---

## Tech Stack

| Layer         | Technology |
|---------------|------------|
| Frontend      | React 18, Tailwind CSS, GSAP + ScrollTrigger, React Router 6, Recharts, react-dropzone |
| Backend       | Node.js, Express, Mongoose, Socket.io, Zod |
| Database      | MongoDB Atlas (cloud) |
| AI Moderation | Groq (primary) with Gemini (fallback) — both free vision-language model APIs |
| Auth          | JWT + bcrypt |
| Containers    | Docker, docker-compose, Nginx (frontend reverse proxy) |

---

## Design System

The UI automatically follows the visitor's OS/browser color-scheme preference — no manual toggle, no flash of the wrong theme. This is implemented with Tailwind's `darkMode: 'media'` strategy, which maps directly to the `prefers-color-scheme` media query.

**Direction: "Inspection desk."** The visual language is built around the act of closely examining something and recording a decision — closer to a film-inspection lightbox or a customs ledger than a typical SaaS dashboard. White paper background, a single warm amber signal color for attention/flagged states, and a deep forest-teal for cleared/approved states.

| Theme | Tokens | Feel |
|---|---|---|
| **Light** (default) | `#FAF8F3` paper · `#1B2521` ink · `#E8743B` signal (amber) · `#2F6F4F` cleared (forest-teal) · `#E4E1D6` mist | Warm white, high clarity, one confident accent color |
| **Dark** | `#10140F` dusk · `#181E17` dusk-raised · `#FAF8F3` paper-text · same `#E8743B` signal | Same accent color carries across themes so the brand reads consistently in both modes |

All tokens live in `frontend/tailwind.config.js` as named colors (`paper`, `ink`, `signal`, `cleared`, `mist`, `dusk`), so every page pulls from the same palette rather than hardcoded hex values.

**Typography:** `Fraunces` (a characterful serif with ink-trap detailing, used for headlines — it reads like a printed ledger/dossier rather than a tech sans) paired with `Inter` for body text and `JetBrains Mono` for data: confidence percentages, category codes, version numbers.

**Landing page signature element:** a video demonstration player (`frontend/src/components/home/VideoDemo.js`) showing the product workflow, embedding the system walkthrough so users can see moderation and appeals in action.

**Scroll choreography:** the homepage (`frontend/src/pages/Home.js`) uses GSAP's `ScrollTrigger` for: a two-layer parallax (foreground blobs drift faster than background ones) behind the hero, staggered reveal-on-scroll for each section, and a numbered "stamp" rotating into place next to each step in the How It Works list.

**Footer:** a full four-column footer (Product / Categories / For teams, plus the brand blurb) with a hairline divider above the copyright line — included on the landing page per the redesign brief.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Browser (React 18)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ Submit (D&D) │  │ Dashboard    │  │ Admin Panel  │  │ Live Feed   │  │
│  │ + error UI   │  │ + reputation │  │ + audit log  │  │ (Socket.io) │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘  │
│         └─────────────────┴─────────────────┴─────────────────┘         │
│                                    │ REST + WebSocket                   │
└────────────────────────────────────┼────────────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Express API + Socket.io (Node.js)                   │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ JWT Auth   │  │ Zod         │  │ Rate Limiter │  │ Audit Service │  │
│  │ + bcrypt   │  │ Validation  │  │ (submissions)│  │ (append-only) │  │
│  └────────────┘  └─────────────┘  └──────────────┘  └───────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ moderationService.js — Groq (primary) → Gemini (fallback)          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└───────────┬──────────────────────┬──────────────────────┬────────────────┘
            ▼                      ▼                      ▼
   ┌────────────────┐    ┌─────────────────┐    ┌──────────────────┐
   │ MongoDB Atlas  │    │ AWS S3 (opt.)   │    │ Resend (opt.)    │
   │ Users, Policy, │    │ Image storage   │    │ Appeal emails    │
   │ Submissions,   │    │ + pre-signed    │    │                  │
   │ Appeals,       │    │ URLs            │    │                  │
   │ AuditLog       │    │                 │    │                  │
   └────────────────┘    └─────────────────┘    └──────────────────┘
```

---

## Industrial Features (What Sets This Apart)

These features demonstrate production-minded engineering — the kind reviewers look for in internship candidates:

| Feature | What it shows |
|---------|---------------|
| **Audit log + CSV export** | Every submission, override, appeal, and admin action is logged immutably. Admins can export to CSV for compliance reporting. |
| **Real-time live feed** | Socket.io pushes new submissions and appeals to the admin dashboard instantly — no polling. |
| **Zod validation** | Request bodies are validated with typed schemas before hitting business logic — catches bad input early with clear error messages. |
| **User reputation score** | Tracks submission history (+2 approved, −5 flagged, −10 blocked). Visible on dashboard and admin user management. |
| **Processing time tracking** | Each submission records how long AI screening took (`processingTimeMs`) — useful for performance monitoring. |
| **Drag-and-drop + error states** | Upload rejects invalid files client-side with inline error messages; loading and API error states prevent blank-screen confusion. |

---

## Project Structure

```
content-moderation/
├── backend/
│   ├── src/
│   │   ├── config/db.js                   # MongoDB Atlas connection
│   │   ├── models/                        # User, Policy, Submission, Appeal, AuditLog
│   │   ├── middleware/auth.js              # JWT auth + admin guard
│   │   ├── middleware/validate.js          # Zod validation middleware
│   │   ├── validation/schemas.js           # Zod request schemas
│   │   ├── routes/                         # auth, submissions, appeals, policy, admin, audit-log
│   │   ├── services/moderationService.js   # AI screening logic
│   │   ├── services/auditService.js        # Audit log writes + CSV helpers
│   │   ├── services/reputationService.js   # User reputation scoring
│   │   ├── socket.js                       # Real-time event emitters
│   │   ├── seed.js                         # creates initial admin + default policy
│   │   └── index.js                        # app entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── tailwind.config.js                  # color tokens, gradients, keyframes
│   ├── postcss.config.js
│   ├── src/
│   │   ├── pages/Home.js                   # public landing page (GSAP)
│   │   ├── pages/                          # user-facing app pages
│   │   ├── pages/admin/                    # admin-only pages
│   │   ├── components/home/StampHero.js    # landing page signature animation
│   │   ├── components/shared/              # Sidebar, layout, reusable UI
│   │   ├── hooks/useSystemTheme.js         # tracks light/dark preference for charts
│   │   ├── context/                        # Auth + Toast context providers
│   │   └── utils/                          # axios instance, constants
│   ├── nginx.conf
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── .env.example
```

---

## Prerequisites

1. **Docker & Docker Compose** installed.
2. **A MongoDB Atlas cluster** (free tier is enough):
   - Create a cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
   - Create a database user (Database Access) and copy its username/password.
   - Under Network Access, allow your IP (or `0.0.0.0/0` for testing).
   - Under Database → Connect → Drivers, copy the connection string:
     ```
     mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
     ```
   - Append a database name before the `?`, e.g. `.../content-moderation?retryWrites=true...`
3. **Free API keys for image screening — no credit card required for either:**
   - **Groq** (primary): get one at [console.groq.com/keys](https://console.groq.com/keys). Free tier is roughly 1,000 requests/day.
   - **Gemini** (automatic fallback if Groq fails or hits its rate limit): get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Free tier is roughly 1,500 requests/day.
   
   You can run with just one of the two — the app degrades gracefully and flags submissions for manual review if neither is configured or both fail — but setting up both gives you real redundancy against free-tier rate limits.

---

## Setup & Run (Docker — recommended)

1. From the **project root** (not `frontend/` or `backend/`), copy the environment file and fill in your real values:

   ```bash
   cp .env.example .env
   ```

   Edit `.env`:
   ```
   MONGODB_URI=mongodb+srv://youruser:yourpass@yourcluster.mongodb.net/content-moderation?retryWrites=true&w=majority
   JWT_SECRET=some_long_random_string
   GROQ_API_KEY=gsk_...
   GEMINI_API_KEY=AIza...
   FRONTEND_URL=http://localhost:3000
   ```

2. Build and start everything with one command:

   ```bash
   docker-compose up --build
   ```

   This starts:
   - **backend** on `http://localhost:5000`
   - **frontend** (Nginx-served React build, proxying `/api` to backend) on `http://localhost:3000`

3. **Seed an admin account** (one-time, in a separate terminal while containers are running):

   ```bash
   docker-compose exec backend node src/seed.js
   ```

   This creates:
   - Admin login: `admin@moderaai.com` / `admin123456` (change after first login)
   - A default policy (v1) with all 6 categories enabled, 70% confidence threshold, "Flag for Review" enforcement.

   Override the seeded admin credentials with `SEED_ADMIN_EMAIL`, `SEED_ADMIN_USERNAME`, and `SEED_ADMIN_PASSWORD` env vars before running the seed command if you'd like.

4. Open `http://localhost:3000` — you'll land on the marketing homepage. Register a regular account to try the submission flow, or sign in as the seeded admin.

---

## Setup & Run (Manual / local development)

**Backend:**
```bash
cd backend
cp .env.example .env   # fill in MONGODB_URI, JWT_SECRET, GROQ_API_KEY, GEMINI_API_KEY
npm install
npm run dev             # nodemon, http://localhost:5000
node src/seed.js        # one-time: create admin + default policy
```

**Frontend:**
```bash
cd frontend
npm install
npm start                # http://localhost:3000, proxies /api to localhost:5000
```

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string (includes db name) |
| `JWT_SECRET` | Secret for signing auth tokens |
| `GROQ_API_KEY` | Free Groq API key, used as the primary image-screening provider |
| `GEMINI_API_KEY` | Free Gemini API key, used as an automatic fallback if Groq fails or rate-limits |
| `PORT` | Backend port (default 5000) |
| `FRONTEND_URL` | Allowed CORS origin |

### Root (`.env`, used by `docker-compose.yml`)
Same five variables (`MONGODB_URI`, `JWT_SECRET`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `FRONTEND_URL`) are passed into the backend container. **This is the file `cp .env.example .env` should target** when using Docker — run that command from the project root, not from inside `frontend/` or `backend/`.

---

## Authentication & Security

- **Passwords are hashed with bcrypt** (`bcryptjs`, cost factor 12) before ever touching the database — `backend/src/models/User.js` hashes on every save via a Mongoose `pre('save')` hook, and a plaintext password is never stored or logged.
- **Sessions are stateless JWTs.** On register/login, the backend signs a JWT (`backend/src/routes/auth.js`) containing the user's ID, valid for 7 days. The frontend stores it in `localStorage` and the `api.js` axios instance attaches it as a `Bearer` token on every request automatically.
- **Every protected route re-verifies the token server-side** via the `authenticate` middleware (`backend/src/middleware/auth.js`), which decodes the JWT, re-fetches the user from the database (so a deactivated account is rejected even with a still-valid token), and attaches it to `req.user`.
- **Admin routes are double-gated** — `authenticate` first, then a separate `requireAdmin` middleware checks `req.user.role === 'admin'` before the route handler ever runs.
- The API never returns a password hash: `User.toJSON()` strips the `password` field from every response automatically, so it can't leak even by accident in a populated/nested response.

---

## How the Platform Works

### Visiting for the first time
Anyone who opens the site lands on the public **homepage** (`/`) — a marketing page explaining what ModeraAI does, how screening works, the six policy categories, and what admins control. No login is required to view it. From there, a visitor either signs in or registers a new account.

### The User Workflow

1. **Register / log in.** A new account is created with the `user` role by default. After login, the user lands on their **Dashboard** — a snapshot of their recent submissions and outcome counts (approved / flagged / blocked).

2. **Submit images.** On the **Submit Images** page, the user drags in up to 10 images (JPG/PNG/GIF/WEBP, 3MB max each) and clicks **Screen images**. Each image is sent to the backend, which:
   - Loads the currently active policy (which categories are enabled, their confidence thresholds, and their enforcement behavior).
   - Sends the image to Groq's free vision-language model (Llama 4 Scout) along with the active category list. If Groq fails for any reason (rate limit, timeout, malformed response), the backend automatically retries the same request against Gemini before giving up.
   - Receives a confidence score + short reasoning string per category.
   - Compares each score against that category's threshold to decide if it's a "hit."
   - If any hit category is set to **Auto-Block**, the image is **Blocked**. If any hit category is set to **Flag for Review** (and none auto-block), the image is **Flagged**. Otherwise, it's **Approved**.

   The user is redirected straight to the submission's result page once processing finishes — there's no separate "pending" state, since screening happens synchronously on submit.

3. **Review the verdict.** The **Submission Details** page shows, per image: the overall outcome badge, a per-category confidence breakdown bar, and (for any category that triggered a hit) the AI's plain-language reasoning for that call.

4. **File an appeal.** If an image came back **Flagged** or **Blocked**, the user can click **File appeal** directly from that image's card, write a justification (minimum 20 characters) explaining why they believe the verdict is wrong, and submit it. Only one appeal can exist per image — the button disappears once one is filed.

5. **Track appeal status.** The **My Appeals** page lists every appeal the user has filed, its current status (**Pending**, **Accepted**, or **Rejected**), and any written response left by the admin who reviewed it. If an appeal is accepted, the user will see the affected image's outcome flip to **Approved** automatically on the submission page — no further action needed.

6. **Browse history.** The **My Submissions** page lists everything the user has ever submitted, filterable by outcome, with pagination.

### The Admin Workflow

Admins have every user capability above, plus four additional sections in the sidebar:

1. **Analytics dashboard.** A platform-wide view: total submissions over time, verdict distribution (approved/flagged/blocked/mixed), appeal volume and resolution rate, detections broken down by category, and a leaderboard of users ranked by submission count and violation count.

2. **All Submissions.** Every submission on the platform, filterable by outcome, each linking to a detail view. From a submission's detail page, an admin can **manually override** any individual image's verdict (e.g. force-approve something the AI over-flagged, or force-block something it missed) — this is logged with who made the override and when, and immediately recalculates that submission's overall outcome.

3. **Appeals Queue.** Every pending appeal across all users, with tabs for Pending / Accepted / Rejected / All. Opening an appeal shows the user's full justification. Reviewing it means choosing **Accept** (which overrides the image's verdict to Approved and records the admin who did it) or **Reject** (which leaves the original verdict standing), optionally with a written response the user will see on their end.

4. **Policy Configuration.** The control surface for how strict or lenient the system is, per category:
   - **Enable/disable** — a disabled category is skipped entirely during screening for all future submissions.
   - **Confidence threshold** (10–100%, slider) — how confident the AI needs to be before a detection counts as a "hit."
   - **Enforcement behavior** — `Flag for Review` (goes to the human queue) or `Auto-Block` (blocked immediately, no review needed).

   Saving creates a **new policy version**; it does not edit the old one in place. This matters because every verdict already issued keeps a reference to the exact policy version that was active when it was screened — so tightening or loosening a threshold today never silently changes the meaning of a verdict from last week. The active policy's version number is shown at the top of this page, and a banner warns if there are unsaved changes.

### Putting it together: one image's lifecycle

```
User uploads image
      │
      ▼
Backend loads ACTIVE policy ──► sends image + enabled categories to Claude
      │                                          │
      │                              returns per-category {detected, confidence, reasoning}
      │                                          │
      ▼                                          ▼
Compare each score to that category's threshold → mark hits
      │
      ├─ any hit category = Auto-Block?  ──► outcome: BLOCKED
      ├─ else any hit category = Flag?   ──► outcome: FLAGGED
      └─ else                            ──► outcome: APPROVED
      │
      ▼
Verdict saved with policyVersion + policyId (frozen forever)
      │
      ▼
User sees verdict ──► if Flagged/Blocked, may file ONE appeal
                              │
                              ▼
                     Admin reviews in Appeals Queue
                              │
                  ┌───────────┴───────────┐
                  ▼                       ▼
              Accept                  Reject
        (verdict → Approved,     (verdict stays,
         logged + timestamped)    response optional)
```

---

## Key Architecture Decisions

**Why Groq + Gemini, with automatic fallback, instead of one paid vision API?**
The brief calls for free resources. Both Groq and Gemini offer free, vision-capable models with no credit card required — but free tiers get rate-limited, sometimes get paused, and shouldn't be trusted as a single point of failure. `moderationService.js` tries **Groq first** (`meta-llama/llama-4-scout-17b-16e-instruct`); if that call throws for *any* reason — a 429 rate limit, a timeout, a malformed response — it automatically retries the exact same prompt and image against **Gemini** (`gemini-flash-latest`, via the current `@google/genai` SDK) before giving up and flagging the submission for manual review. Each verdict records which provider actually produced it (`verdict.aiProvider`, visible to admins on the submission review page), so you can see in practice how often the fallback is firing. See **About the Free AI Providers** below for the tradeoffs and how to swap in a different provider entirely.

**Why MongoDB Atlas instead of a local Mongo container?**
The brief calls for a single `docker-compose up`. Using Atlas means the database survives container teardown, requires no volume management, and mirrors a real production setup. The compose file only orchestrates `backend` and `frontend`; Atlas is reached over the network using `MONGODB_URI`.

**Images stored as Buffers in MongoDB, not on disk/S3.**
Keeps the whole system self-contained — no extra cloud storage dependency. Images are stored as `Buffer` fields on each `Submission.images[]` subdocument and streamed back through a dedicated `GET /api/submissions/:id/images/:index` endpoint, which never includes raw image bytes in any JSON response.

**Verdict computed and frozen at submission time.**
Each image's `verdict` embeds the `policyVersion` and `policyId` active when it was screened. Policy edits create a **new version** (`Policy` documents are append-only with `isActive` toggled), so historical verdicts are never silently changed by a later policy edit.

**Outcome resolution logic lives server-side, in one place.**
`moderationService.js` is the single source of truth for whether a category "hits" and what that means for the image. The same approved/flagged/blocked/mixed reducer logic is reused for overall submission outcome in three places (initial submission, appeal acceptance, admin override) to avoid drift.

**One-appeal-per-image, enforced at the database layer.**
`POST /api/appeals` checks for an existing appeal on `(submission, imageIndex)` before creating a new one.

**Role separation via middleware, not duplicated route files.**
A single `authenticate` middleware attaches `req.user`; a thin `requireAdmin` middleware gates admin-only routes. `submissions.js` stays shared between roles (e.g. `GET /api/submissions/:id` allows both the owner and any admin) while `admin.js` and parts of `policy.js`/`appeals.js` are fully gated.

**Frontend: Tailwind utility classes + a small `@layer components` set.**
Buttons, badges, cards, and form inputs are defined once in `index.css` under `@layer components` (`.btn-primary`, `.badge-approved`, `.card`, etc.) so every page composes the same primitives instead of re-deriving spacing and color per page. Theme switching is automatic via Tailwind's `media` dark-mode strategy — there's no toggle to maintain or persist.

**GSAP scoped with `gsap.context()` and cleaned up on unmount.**
All ScrollTrigger instances on the homepage are created inside a `gsap.context()` tied to the page's root ref and reverted in a `useEffect` cleanup, so navigating away from `/` doesn't leak scroll listeners or animate stale DOM nodes.

**Why an append-only audit log instead of just logging to console?**
Production moderation systems need accountability. Every submission, verdict override, appeal, and admin action writes to an `AuditLog` collection with actor, timestamp, and structured details. Admins can filter the log in-app or export it as CSV — this is what compliance teams actually ask for, and it shows you thought beyond the happy path.

**Why Socket.io for a real-time feed?**
Polling the submissions API every few seconds wastes bandwidth and adds latency. When a user submits images, the backend emits `submission:processed` to all connected admin clients via Socket.io. The admin Live Feed page shows events instantly — a strong demo feature that proves you understand event-driven architecture.

**Why Zod for validation?**
Manual `if (!field)` checks scattered across routes drift over time. Centralized Zod schemas in `validation/schemas.js` give typed, reusable validation with consistent error messages. Adding a new field means updating one schema, not hunting through five route files.

**Why user reputation scoring?**
Real platforms track user trust over time. Each submission updates a reputation score (+2 approved, −5 flagged, −10 blocked). Admins see this on the Users page; users see their score on the Dashboard. It's a simple signal that shows you understand how moderation systems prioritize repeat offenders.

---

## API Overview

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create account |
| POST | `/api/auth/login` | Public | Login, returns JWT |
| GET | `/api/auth/me` | Authenticated | Current user |
| POST | `/api/submissions` | User | Upload images for screening |
| GET | `/api/submissions` | User | Own submission history (filterable) |
| GET | `/api/submissions/:id` | Owner/Admin | Submission detail |
| GET | `/api/submissions/:id/images/:index` | Owner/Admin | Raw image bytes |
| POST | `/api/appeals` | User | File an appeal |
| GET | `/api/appeals/mine` | User | Own appeals |
| GET | `/api/appeals` | Admin | Appeals queue |
| PATCH | `/api/appeals/:id/review` | Admin | Accept/reject an appeal |
| GET | `/api/policy` | Authenticated | Active policy |
| PUT | `/api/policy` | Admin | Update policy (creates new version) |
| GET | `/api/policy/history` | Admin | Policy version history |
| GET | `/api/admin/analytics` | Admin | Platform analytics |
| GET | `/api/admin/audit-log` | Admin | Paginated audit trail |
| GET | `/api/admin/audit-log/export` | Admin | CSV export of audit log |
| GET | `/api/admin/submissions` | Admin | All submissions |
| PATCH | `/api/admin/submissions/:id/images/:index/override` | Admin | Manual verdict override |
| GET | `/api/admin/users` | Admin | User list (searchable) |
| GET | `/api/admin/users/export` | Admin | CSV export of users |

---

## Moderation Categories

Graphic Violence · Hate Symbols · Self-Harm · Extremist Propaganda · Weapons & Contraband · Harassment & Humiliation

Each is independently configurable by an admin: enable/disable, confidence threshold (0–100%), and enforcement behavior (Auto-Block or Flag for Review).

---

## About the Free AI Providers (Groq + Gemini fallback)

This project uses two free, vision-capable model APIs with automatic fallback, rather than depending on a single provider:

1. **Groq** (primary) — `meta-llama/llama-4-scout-17b-16e-instruct`, via the `groq-sdk` package. Free, no credit card, native JSON-mode output.
2. **Gemini** (fallback) — `gemini-flash-latest`, via Google's current `@google/genai` SDK (the older `@google/generative-ai` package is deprecated as of November 2025 — don't use it). Free, no credit card.

`moderateImage()` in `backend/src/services/moderationService.js` tries Groq first. If that call throws for *any* reason, it retries the identical prompt and image against Gemini. Only if **both** fail does it fall back to flagging the submission for manual review rather than guessing. The verdict that gets saved records which provider actually answered (`verdict.aiProvider`), and that's surfaced as a small badge next to the outcome on the admin submission review page.

**Know the limits before relying on this for anything beyond development/demo use:**
- Both free tiers are rate-limited (roughly 1,000 requests/day for Groq, ~1,500/day for Gemini at the time of writing — check each provider's console for current numbers, these change).
- Images are capped at **3MB per file** in this app (see `backend/src/routes/submissions.js`) specifically because Groq's base64-encoded image requests have a 4MB ceiling, and base64 inflates raw bytes by about a third.
- Free tiers can be paused, throttled, or have their terms changed without notice, and Gemini's free tier allows Google to use prompts/responses to improve their models unless billing is enabled. Don't point a paying customer's production traffic at either without understanding this.
- On any AI error (rate limit, timeout, malformed response) from **both** providers, `moderateImage()` fails safe — it returns a **Flagged** verdict for manual review rather than silently approving or crashing the submission.

**A note on API keys:** never paste a real API key into a chat, commit it to git, or put it anywhere other than your local `.env` file (which is already gitignored in this project). If a key is ever exposed — pasted somewhere, committed, shared in a screenshot — revoke it immediately from the provider's console ([console.groq.com/keys](https://console.groq.com/keys) or [aistudio.google.com/apikey](https://aistudio.google.com/apikey)) and generate a new one. A leaked key on a free tier mostly risks someone else burning your daily quota, but treat it as compromised either way.

**To swap or add another provider later** (a paid tier for higher limits, Anthropic Claude, or a self-hosted open-weight model), the entire integration lives in one file: `backend/src/services/moderationService.js`. Everything downstream — `processAIResults()`, the policy-threshold logic, the outcome reducer, the database schema — is provider-agnostic and expects only a `results` array (`category`, `detected`, `confidence`, `reasoning` per item) back from whichever `call*()` function you write. To add a third provider, write a `callXyz(prompt, base64Image, mimetype)` function with that same contract and push `{ name: 'Xyz', call: () => callXyz(...) }` onto the `providers` array — it'll be tried in order automatically. No other file needs to change.
