# Medi — Walk-in Redesign Spec

Branch checkpoint before this work: tag `final-draft` (commit 491b5a4).
Live URL: https://medi-rust-six.vercel.app

## Goals (from client)
1. **Remove Razorpay** — no payments anywhere.
2. **Walk-in appointments only** — remove Video & Text consultation types entirely (patient + doctor side).
3. **Walk-in appointments are free** — no fee, no GST, no payment step.
4. **Premium UI** — minimalist but premium; refined tables, dropdowns, sliding panels; less "vibe-coded".
5. **Doctor just chooses when walk-in slots are available** (availability = Open / Closed per time block).
6. **Remove unnecessary text/clutter.**
7. **Keep prescriptions + everything else** (patients, reports/uploads, account, audit, medicine catalog).
8. Confirm against this file when done.

## Implementation checklist

### A. Payments / Razorpay removal
- [ ] Delete `/book/pay` page and `/book/type` page.
- [ ] Delete API routes: `api/razorpay/order`, `api/razorpay/verify`, `api/razorpay/webhook`.
- [ ] New API: `POST /api/appointments/create` — atomic slot lock + create appointment, FREE (no signature/payment). Reuses the verify route's transaction (slot lock, user upsert, appointment, audit, calendar event) minus payment.
- [ ] Remove Razorpay env usage; remove `razorpay` integration card from Account; remove fee display everywhere.

### B. Single "walk-in" type
- [ ] `ConsultationType` → keep type but value is `'walkin'` only (update `types.ts`). Appointment `type: 'walkin'`.
- [ ] Booking flow: `book/slot` (pick day+slot) → `book/details` (name/email/phone/complaint/uploads) → confirm (free) → `book/done`. No type step, no pay step.
- [ ] Availability editor: each cell is **Open / Closed** (walk-in available or not). Store blocks with `allowedTypes: ['walkin']`. Cycle: Closed → Open.
- [ ] Materialize route + booking: drop video/text logic; a slot is just bookable or not.
- [ ] Remove `hasVideo`, `fee` from booking decisions. `fee` may stay in config but unused (amountPaid = 0).

### C. Remove Video/Text/Meet/Chat from UI
- [ ] No Meet link generation for walk-in. Keep Google Calendar event (no conference) so patient still gets an email invite + it lands on doctor's calendar. (Calendar optional but keep.)
- [ ] Remove chat: consultation (doctor appointment detail) becomes **patient summary + Write prescription** (no chat, no join, no countdown/extend).
- [ ] Patient consult detail: appointment summary + prescription (PDF) + their reports. No chat/meet.
- [ ] Dashboard / Consultations / Patient file: remove video/text chips & Join/Chat buttons → show "Walk-in" + time; action = "View".
- [ ] Remove `/chat`, countdown, ConsultAlert, extend route usage from the walk-in flow (leave files unused or delete links).

### D. Premium UI (use frontend-design skill)
- [ ] Refine `globals.css` tokens: refined neutral palette, soft layered shadows, type scale + tracking, hairline borders, larger radii, micro-interactions (hover lift, transitions).
- [ ] Tables: more breathing room, subtle hover, no heavy lines.
- [ ] Add a reusable **slide-over panel** component; use it where it adds polish (e.g. prescription / quick views) — at least one place.
- [ ] Refined **dropdown** styling (profile menu + any action menus).
- [ ] Polished empty states, buttons, inputs, sticky topbar w/ subtle blur.
- [ ] Landing: immersive intro + elegant data points; use `/face.jpeg` for manoj.

### E. Trim copy
- [ ] Remove filler/marketing text; keep labels tight and clear.

## Keep (do NOT remove)
- Prescriptions (per-consultation builder + printable PDF) + medicine catalog.
- Patients list + patient file (history + per-session reports/uploads).
- Account (editable profile), Audit log, OTP login, file uploads.
- Google Calendar connect (used for the appointment event/email; just no Meet link).

## Verification (do at end)
- Run through each checklist item; build clean; deploy; confirm live routes 200.

---

## ✅ DONE — verified against checklist

**A. Payments removed** — `/book/pay`, `/book/type`, `api/razorpay/*` deleted (live 404). New `POST /api/appointments/create` (free, atomic slot lock, no payment) — live 401 without auth. Account fee card + Razorpay/Meet integration rows removed; dashboard amount column removed; Today "sync status" no longer shows Razorpay/Meet.

**B. Walk-in only** — `ConsultationType = 'walkin'`; appointments `type: 'walkin'`, `amountPaid: 0`. Booking is Time → Details → Confirm (free). Availability editor cells are Open/Closed (store `allowedTypes: ['walkin']`). Slot page shows any open future slot (no type filter).

**C. Video/Text/Meet/Chat removed** — calendar event created with NO Meet conference (still emails an invite for the in-clinic time). Chat pages/extend/countdown/ConsultAlert deleted. Doctor consultation page = patient summary + reports + Write prescription. Patient "View" = summary + prescription (PDF) + their reports. All "Video/Text" chips → "Walk-in"; Join/Chat buttons → Open/View.

**D. Premium UI** — refined tokens (soft layered shadows, larger radii, refined neutrals), sticky blurred topbar, depth on cards/buttons/inputs, roomier tables w/ subtle row hover, polished empty states. New **SlideOver** panel (right-side, ESC/backdrop close) used as a quick-view on Consultations. Profile dropdown (with logout) retained. Landing = immersive intro + `/face.jpeg` for Dr. Manoj.

**E. Copy trimmed** across booking, dashboard, consultations, account.

**Kept**: prescriptions (per-consultation builder + printable PDF) + medicine catalog, patients list/file, per-session reports/uploads, editable Account, audit log, OTP login, Google Calendar connect.

Build clean (tsc 0, next build ✓). Deployed to https://medi-rust-six.vercel.app — all routes verified.
