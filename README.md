# Medi — Telemedicine

Next.js (App Router) + Firebase + Razorpay. Hosts two independent doctors on a single deployment:

- `/manoj` — Dr. Manoj
- `/manoj2` — Dr. Manoj 2

Both share one Firebase backend; appointments are scoped by `doctorId`. Bookings (video or text) go through a single Firestore transaction so a slot can never be double-booked.

---

## First-time setup

1. **Read [SETUP.md](./SETUP.md)** — lists every credential to gather.
2. **Install dependencies:**
   ```
   npm install
   cd functions && npm install && cd ..
   ```
3. **Fill `.env.local`** from `.env.local.example`.
4. **Place service account JSON** at `secrets/firebase-admin.json` (or paste it inline into `FIREBASE_SERVICE_ACCOUNT_JSON`).
5. **Create the doctor admin users** in Firebase Console → Auth (Email/Password) using the emails you set in `DOCTOR_*_ADMIN_EMAIL`.
6. **Seed:**
   ```
   npm run seed
   ```
   This creates `doctors/manoj`, `doctors/manoj2`, default weekly templates, and sets `admin=true` + `doctorId=<slug>` custom claims on the admin users.
7. **Deploy rules + functions:**
   ```
   firebase deploy --only firestore:rules,firestore:indexes,storage:rules,functions
   ```
   (You'll need the Firebase CLI: `npm install -g firebase-tools && firebase login`.)
8. **Run locally:**
   ```
   npm run dev
   ```
   Open <http://localhost:3000/manoj> or <http://localhost:3000/manoj2>.

---

## Project structure

```
src/
  app/
    page.tsx                       Root — lists doctors
    [doctorSlug]/
      layout.tsx                   DoctorProvider + AuthProvider + BookingProvider
      page.tsx                     Patient landing
      login/page.tsx               OTP login (Firebase Phone Auth + reCAPTCHA)
      dashboard/page.tsx           Patient dashboard (upcoming + past)
      book/
        layout.tsx                 Auth guard + topbar
        type/page.tsx              Choose video or text
        slot/page.tsx              Pick a slot
        details/page.tsx           Patient info + chief complaint + uploads
        pay/page.tsx               Razorpay checkout
        done/page.tsx              Confirmation (shows Meet link if video)
      chat/[appointmentId]/page.tsx Time-locked text chat
      admin/
        layout.tsx                 Sidebar shell + admin claim check
        login/page.tsx             Doctor sign-in (email/password)
        page.tsx                   Today's schedule
        appointments/[id]/page.tsx Appointment detail + private notes
        prescriptions/page.tsx     List of issued prescriptions
        prescriptions/[id]/page.tsx Prescription editor
        availability/page.tsx      Weekly template editor
        patients/page.tsx          Patient aggregates
        inbox/page.tsx             Messages (Phase 4)
        account/page.tsx           Profile and integration status
        audit/page.tsx             Audit log viewer
    api/
      razorpay/order/route.ts      Create order
      razorpay/verify/route.ts     Verify signature + atomic appointment create
      razorpay/webhook/route.ts    Webhook fallback

  components/
    ui/                            Icon, Brand, Avatar, Stepper, Chip, Row
    patient/PatientTopbar.tsx
    admin/AdminSidebar.tsx
    AuthProvider.tsx               onAuthStateChanged listener
    BookingProvider.tsx            sessionStorage-backed booking draft
    DoctorProvider.tsx             Server → client doctor config bridge

  lib/
    doctors.ts                     server-only registry (reads env vars)
    doctorsClient.ts               Public DoctorConfig type
    types.ts                       Firestore document shapes
    format.ts                      fmtTime, fmtDate, slotIdFor
    firebase/client.ts             Lazy client SDK
    firebase/admin.ts              Lazy admin SDK
    firestore/appointments.ts      Patient + doctor appointment subscriptions
    firestore/availability.ts      Slot fetcher

functions/
  src/
    index.ts                       Function registrations
    availability.ts                Daily availability materializer (cron)
    chat.ts                        Chat session lifecycle (cron + triggers)
    prescriptions.ts               Auto-generate PDF on prescription write
    notifications.ts               WhatsApp confirmation on appointment create

firestore.rules                    Patient/doctor/admin isolation, chat time-lock
storage.rules                      Per-patient upload paths, signed prescriptions
firestore.indexes.json             Required composite indexes
firebase.json                      Project config (functions, emulators, rules)

scripts/seed.ts                    npm run seed — bootstraps Firestore + claims
SETUP.md                           What you need to provide
.env.local.example                 Variable template
```

---

## Adding a third doctor

1. Add a new entry to `DOCTORS` in `src/lib/doctors.ts` (e.g. `manoj3`).
2. Add the matching `DOCTOR_MANOJ3_*` env vars to `.env.local` and Vercel.
3. Re-run `npm run seed` to create the doctor record + admin claim.
4. The route `/manoj3` works automatically.

---

## Deploying

### Frontend → Vercel

1. Push to GitHub.
2. Import the repo on Vercel.
3. Add every variable from `.env.local` to Vercel → Project Settings → Environment Variables.
   - **For the service account:** paste the full JSON as a single line into `FIREBASE_SERVICE_ACCOUNT_JSON`. Leave `GOOGLE_APPLICATION_CREDENTIALS` unset on Vercel.
4. Deploy. Add your domain in Vercel and in Firebase Auth → Authorized domains.

### Backend → Firebase

```
firebase deploy --only firestore:rules,firestore:indexes,storage:rules,functions
```

Re-run any time you change `firestore.rules` or the `functions/` code.

---

## Local development with emulators

```
firebase emulators:start
```

In a second terminal:

```
NEXT_PUBLIC_FIREBASE_EMULATOR=1 npm run dev
```

(Note: the current Firebase client code uses production by default. If you want auto-emulator wiring, ask and I'll add it.)

---

## Known follow-ups (not blockers)

- Per-appointment Google Meet links via Calendar API (currently one static link per doctor).
- Patient document upload to Storage (UI accepts files; wiring upload is Phase 3 leftover).
- WhatsApp message templates (provider-specific shape; wired but inert until you provide creds).
- Razorpay reconciliation webhook (handler exists, doesn't yet retry-create appointments missed by `/verify`).
- Inbox view (placeholder UI; the Firestore model is ready).
