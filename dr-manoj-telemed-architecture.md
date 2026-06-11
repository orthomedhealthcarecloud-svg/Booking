# Dr. Manoj Telemedicine Platform – Production-Grade Architecture (Firebase + Calendly + Google Meet)

> This document is a production-grade architecture and implementation blueprint for a telemedicine platform for Dr. Manoj, adapted from the original technical build doc you shared but redesigned around Firebase (Firestore/Auth/Cloud Functions/Cloud Storage) plus Calendly and Google Meet instead of the originally suggested stacks. It is written so another AI or developer (e.g., Claude) can directly use it as a build specification.

---

## 1. Goals and Non‑Negotiables

- Use **Firebase** as the primary backend:
  - Firestore for structured data (users, bookings, availability, chat, audit logs).
  - Firebase Auth (phone/OTP, optional email/password for admin).
  - Cloud Functions for secure backend logic (transactions, race-condition free bookings, webhooks, notifications).
  - Cloud Storage for files (reports, prescriptions, chat exports, recordings metadata if not using external provider).
- Integrate **Calendly** for scheduling UX and **Google Calendar + Google Meet** for video conferencing.
- Ensure **mutual exclusivity of text and video slots**:
  - If a patient books 3:30–4:00 as text, the same 3:30–4:00 slot must be blocked for video and vice‑versa.
  - Availability should be consistent between:
    - Internal booking UI (website).
    - Calendly event types.
- Produce a **secure, scalable, production‑ready** architecture:
  - No local DB; all data in managed cloud services.
  - Avoid double‑booking (atomic operations, transactions).
  - Auditable, with clear separation of concerns.

---

## 2. High‑Level System Overview

### 2.1 Core Components

- **Frontend Web App (Patient + Doctor Admin)**
  - Framework: Next.js or Remix (React‑based; SSR for SEO and speed).
  - Deployed on: Vercel / Cloud Run.
  - Integrations:
    - Firebase JS SDK (Auth, Firestore, Functions, Storage).
    - Calendly embeddable widgets and/or deep links.
    - Google reCAPTCHA for abuse protection on OTP login and forms.

- **Backend (Serverless)**
  - Firebase Cloud Functions (Node.js) as the primary backend.
  - Optional lightweight Node/Express service if needed for more complex Calendly / Google API handling; can also be Functions‑hosted.

- **Data Layer**
  - Firestore (production multi‑region) for structured data.
  - Firebase Storage for file uploads (X‑rays, labs, prescriptions PDFs, chat transcripts).

- **External Services**
  - Calendly for scheduling and availability display.
  - Google Calendar + Google Meet (via Calendly integration) for video call links.
  - WhatsApp provider (e.g., 360dialog, Wati) for notifications.
  - Payment gateway (Razorpay in India) for payments.

### 2.2 Logical Architecture Diagram (Textual)

- Client (web browser)
  → Firebase Auth (phone OTP)
  → Firestore (read patient profile, bookings, availability)
  → Cloud Functions (createBooking, cancelBooking, syncCalendlyEvent, generatePrescription)
  → Calendly REST Webhooks (booking_created, booking_canceled)
  → Google Calendar + Google Meet (through Calendly integration)
  → WhatsApp API (notifications) via Cloud Function.

---

## 3. Domain Model and Data Design (Firestore)

Notes:
- Use **subcollections** sparingly; prefer top‑level collections with clear composite indexes.
- All timestamps stored in **UTC** and rendered to local timezone on the client.
- Keep **chat and video slot ownership unified** in an `availability_slots` representation.

### 3.1 Collections Overview

- `users`
- `doctors` (for now, just Dr. Manoj; later multi‑doctor)
- `appointments`
- `availability_templates`
- `availability_instances`
- `chat_sessions`
- `documents`
- `prescriptions`
- `calendly_events`
- `slot_locks`
- `audit_logs`

### 3.2 Collection Schemas

#### 3.2.1 `users`

- `id` (auto doc ID)
- `auth_uid` (Firebase Auth UID; unique)
- `phone` (string, E.164 format)
- `name` (string)
- `age` (number)
- `gender` (string)
- `city` (string)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `role` (`"patient" | "admin" | "assistant"`)

#### 3.2.2 `doctors`

- `id` (doc ID)
- `name`
- `speciality`
- `calendly_user_uri` (string; e.g. `/users/XYZ123` from Calendly)
- `google_calendar_id` (optional; if directly needed)
- `time_zone` (IANA tz string)
- `default_slot_duration_minutes` (e.g. 30)

#### 3.2.3 `appointments`

- `id`
- `patient_id` (ref to `users`)
- `doctor_id` (ref to `doctors`)
- `type` (`"video" | "text"`)
- `status` (`"pending" | "confirmed" | "completed" | "cancelled" | "no_show"`)
- `start_time` (timestamp, UTC)
- `end_time` (timestamp, UTC)
- `calendly_event_uri` (string; e.g. `/scheduled_events/ABC123` – for video appointments if created via Calendly)
- `gmeet_link` (string; from Calendly/Google Calendar)
- `payment_status` (`"unpaid" | "paid" | "refunded"`)
- `payment_reference` (string; Razorpay order/payment ID)
- `chief_complaint` (string)
- `notes_for_doctor` (string)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### 3.2.4 `availability_templates`

- **Purpose**: recurring weekly schedule (e.g. Mon‑Fri 3:00–6:00 pm, text vs video mixes).

Fields:
- `id`
- `doctor_id`
- `day_of_week` (`0`–`6`)
- `time_blocks`: array of objects:
  - `start_minute` (minutes from midnight, e.g., 15:30 → `930`)
  - `end_minute`
  - `allowed_types` (array: `{"video", "text"}` or both)
- `slot_duration_minutes` (e.g. 30)
- `is_active` (boolean)

#### 3.2.5 `availability_instances`

- **Purpose**: concrete daily instances derived from templates + Calendly sync + manual overrides.

Fields:
- `id` (e.g. `doctorId_YYYYMMDD_HHMM`)
- `doctor_id`
- `date` (YYYY‑MM‑DD string for easy querying)
- `start_time` (timestamp)
- `end_time` (timestamp)
- `allowed_types` (array; same meaning as above)
- `is_booked` (boolean)
- `appointment_id` (nullable; linked appointment)
- `source` (`"template" | "manual" | "calendly"`)

This single collection is what you query to show slot availability in the app. **Crucially, it does not distinguish text vs video in the base slot**; instead, it has `allowed_types` and is booked atomically regardless of which type was chosen. That is how mutual exclusivity is enforced at the slot level.

#### 3.2.6 `chat_sessions`

- `id`
- `appointment_id`
- `patient_id`
- `doctor_id`
- `start_time` (timestamp)
- `end_time` (timestamp)
- `status` (`"scheduled" | "active" | "closed"`)
- `messages` (subcollection `messages` OR external chat store):
  - `sender_id`
  - `sender_role` (`"patient" | "doctor"`)
  - `text`
  - `attachments` (array of storage URLs)
  - `created_at`
- `transcript_url` (Storage path of exported transcript PDF/HTML)

#### 3.2.7 `documents`

- `id`
- `patient_id`
- `appointment_id`
- `file_type` (`"mri" | "xray" | "ecg" | "lab" | "prescription" | "other"`)
- `file_url` (Storage URL)
- `uploaded_at`

#### 3.2.8 `prescriptions`

- `id`
- `appointment_id`
- `patient_id`
- `doctor_id`
- `pdf_url`
- `issued_at`
- `notes`

#### 3.2.9 `calendly_events`

- `id` (use Calendly `event_uuid` or `uri`)
- `doctor_id`
- `appointment_id` (if mapped)
- `event_type` (`"video" | "text" | "other"` – mapped from Calendly event type)
- `start_time`
- `end_time`
- `invitee_email` / `invitee_phone`
- `raw_payload` (for debugging)

#### 3.2.10 `slot_locks`

- `id` (e.g. `doctorId_startTimestamp_endTimestamp`) – unique per slot window.
- `doctor_id`
- `start_time`
- `end_time`
- `created_at`
- TTL: optionally implement cleanup via scheduled function (delete old locks).

Used only in transactions to ensure only one appointment can be created per slot.

#### 3.2.11 `audit_logs`

- `id`
- `actor_id` (user/admin)
- `actor_role`
- `action` (`"CREATE_APPOINTMENT" | "CANCEL_APPOINTMENT" | "ISSUE_PRESCRIPTION" | etc.`)
- `target_type` (`"appointment" | "user" | etc.`)
- `target_id`
- `meta` (JSON object with context)
- `created_at`

---

## 4. Booking and Slot Exclusivity Logic

### 4.1 Single Source of Truth for Slots

- `availability_instances` is the **single source of truth** for booked vs free slots.
- Every booking flow (internal UI, Calendly webhooks) **must** acquire a lock and mark the corresponding instance as booked.

### 4.2 Creating an Appointment (Internal UI – Text or Video)

1. Patient selects date + time range on the frontend.
2. Client fetches matching `availability_instances` documents for that time range and doctor.
3. If `is_booked` is `false` and `allowed_types` contains the requested type, enable the booking button.
4. When patient confirms booking after payment, call a Cloud Function `createAppointment` via HTTPS callable.

#### Cloud Function: `createAppointment` (pseudocode)

```ts
exports.createAppointment = functions.https.onCall(async (data, context) => {
  const { doctorId, startTime, endTime, type, paymentRef, chiefComplaint } = data;
  const patientUid = context.auth?.uid;
  if (!patientUid) throw new functions.https.HttpsError("unauthenticated", "Login required");

  return await firestore.runTransaction(async (tx) => {
    const slotId = `${doctorId}_${startTime}_${endTime}`; // normalized
    const slotRef = firestore.collection("availability_instances").doc(slotId);
    const lockRef = firestore.collection("slot_locks").doc(slotId);

    const [slotSnap, lockSnap] = await Promise.all([tx.get(slotRef), tx.get(lockRef)]);

    if (!slotSnap.exists) throw new HttpsError("failed-precondition", "Slot not found");
    const slot = slotSnap.data();

    if (slot.is_booked) throw new HttpsError("already-exists", "Slot already booked");
    if (!slot.allowed_types.includes(type)) throw new HttpsError("failed-precondition", "Type not allowed for this slot");

    if (lockSnap.exists) throw new HttpsError("already-exists", "Slot lock exists (race condition)");

    // acquire lock
    tx.set(lockRef, {
      doctor_id: doctorId,
      start_time: startTime,
      end_time: endTime,
      created_at: FieldValue.serverTimestamp(),
    });

    // create appointment
    const apptRef = firestore.collection("appointments").doc();
    tx.set(apptRef, {
      patient_id: patientUid,
      doctor_id: doctorId,
      type,
      status: "confirmed",
      start_time: startTime,
      end_time: endTime,
      payment_status: "paid",
      payment_reference: paymentRef,
      chief_complaint: chiefComplaint,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    // mark slot as booked
    tx.update(slotRef, {
      is_booked: true,
      appointment_id: apptRef.id,
    });

    return { appointmentId: apptRef.id };
  });
});
```

- Because the `slot_locks` doc is created inside the transaction, only one client can succeed in acquiring it.
- This pattern is robust against race conditions and is production‑grade for Firestore.

### 4.3 Calendly + Google Meet Flow (Video)

#### 4.3.1 Calendly Setup

- Configure Calendly:
  - Connect Dr. Manoj’s **Google Calendar** and **Google Meet** integration.
  - Create event types for **Video Consultation**.
  - For event types, choose the same **time increments** and **durations** as `availability_instances` (e.g. 30 minutes).
  - Configure Calendly webhooks to hit your Cloud Function endpoint on:
    - `invitee.created` (new booking).
    - `invitee.canceled` (cancellation).

#### 4.3.2 Webhook Handling (invitee.created)

Cloud Function `onCalendlyInviteeCreated` (HTTP triggered):

1. Verify Calendly webhook signature.
2. Parse payload (doctor Calendly `user`/`event_type` + invitee details + `start_time`, `end_time`, `location` with Google Meet link).
3. Map Calendly `event_type` to `"video"` appointment type.
4. Compute corresponding `slotId` from `start_time`/`end_time` and `doctorId`.
5. Run a Firestore transaction similar to `createAppointment`:
   - Ensure `availability_instances` slot exists and is free.
   - Create `appointments` entry with `type = "video"`, `calendly_event_uri`, `gmeet_link`.
   - Mark `is_booked = true`.
   - Record `calendly_events` entry.

If the slot is already booked internally, you can:
- Option A: Reject the Calendly booking (return a 409 and optionally use Calendly’s API to cancel that event and email user).
- Option B: Accept Calendly as the highest priority and internally cancel older booking – but for healthcare this is usually a bad idea. Default is A.

#### 4.3.3 Webhook Handling (invitee.canceled)

1. Lookup `calendly_events` by `event_uuid`.
2. Fetch linked `appointments` document.
3. Run transaction:
   - Set `appointments.status = "cancelled"`.
   - Set `availability_instances.is_booked = false`, `appointment_id = null`.
   - Delete or mark `slot_locks` if you want to keep them short‑lived only until booking creation (you can optionally not depend on them after that).

### 4.4 Ensuring Text‑Video Mutual Exclusivity

Because:
- Each slot in `availability_instances` reprezents a **time window** (e.g. 2025‑05‑01 15:30–16:00) per doctor, and
- That slot is marked `is_booked = true` for **any appointment type**, and
- Calendly video bookings and internal text bookings both go through the **same transaction + `availability_instances` + `slot_locks` mechanism**,

…you automatically get the property that **one slot time window can never be both text and video**. There is only one appointment per slot window.

On the frontend side, to show “closed” status:
- For a given date and doctor, query `availability_instances`.
- If `is_booked = true`, mark the time as not available for both text and video.

---

## 5. Chat System Design

### 5.1 Requirements

- Time‑locked chat window: patient and doctor can exchange messages only during their booked slot.
- Post‑slot, chat becomes read‑only or fully inaccessible.
- Messages stored in Firestore (or if volume high, consider a dedicated chat service such as Stream, but Firestore is sufficient for 50–100 consultations per day scale).

### 5.2 Chat Lifecycle

1. When an appointment is created with `type = "text"`, a Cloud Function `onAppointmentCreated` can:
   - Create a `chat_sessions` document with `status = "scheduled"`.
2. At the start of the slot (`start_time`), a scheduled Cloud Function (cron + Firestore query) or client‑side logic + security rules transitions `status` to `"active"`.
3. During `"active"`, security rules allow:
   - Patient and doctor to read/write messages for that `appointment_id`.
4. After `end_time`, `status` becomes `"closed"`, and security rules block writes.
5. A background function exports the chat to PDF/HTML and stores it in Storage, updating `chat_sessions.transcript_url` and creating a `documents` entry if needed.

### 5.3 Firestore Rules Skeleton for Chat

```js
match /chat_sessions/{sessionId} {
  allow read: if isParticipant(sessionId);
  allow write: if isParticipant(sessionId) && isChatActive(sessionId);

  match /messages/{messageId} {
    allow read: if isParticipant(sessionId);
    allow create: if isParticipant(sessionId) && isChatActive(sessionId);
  }
}
```

- `isParticipant` and `isChatActive` are custom security rule functions that check:
  - The caller is the patient or doctor for that appointment.
  - `now` is between `start_time` and `end_time` with some grace period.

---

## 6. Patient Web Flow (Text + Video)

### 6.1 Entry from Social Media

- Instagram DM → ManyChat (or similar) → link to telemedicine site’s `/book` route.

### 6.2 OTP Login (Firebase Auth)

- Phone number + OTP (Firebase Phone Auth) with reCAPTCHA.
- After login:
  - Check for existing `users` record tied to `auth_uid`.
  - If none, create user profile document.

### 6.3 Booking Flow (Unified)

1. Patient chooses **consultation type** (`Video` or `Text`).
   - For Video, you can either:
     - A: Show internal availability (from `availability_instances` where `allowed_types` includes "video"), and once chosen redirect to Calendly event booking (slightly complex mapping), or
     - B: Directly send them to Calendly page and let Calendly own the video schedule.
   - Recommended in this architecture: **B for video** and **internal bookings for text**, while keeping `availability_instances` as ground truth via webhook sync.

2. For **text** type, show the calendar with time slots from `availability_instances` where:
   - `allowed_types` contains `"text"`.
   - `is_booked = false`.

3. Collect consultation form inputs:
   - Personal details (prefilled from profile when available).
   - Chief complaint.
   - Uploads (files → Storage → `documents` entries linked later to appointment).

4. Payment (Razorpay checkout).
   - Call Cloud Function `createRazorpayOrder` to generate order.
   - On success, front‑end collects Razorpay payment signature.

5. Confirm appointment.
   - Call `createAppointment` function with payment reference.
   - On success, show booking confirmation, instructions, and if video, also Google Meet link from appointment doc.

### 6.4 Consultation Delivery

- **Video**
  - Join via Google Meet link from appointment or Calendly email.
  - Doctor uses his Google Calendar/Meet.

- **Text**
  - At appointment time, patient visits `"/chat/:appointmentId"` route.
  - App checks `chat_sessions` and security rules authorize if slot is active.

---

## 7. Doctor Admin Panel

### 7.1 Features

- Login as admin (Firebase Auth with email/password + custom claim `role = "admin"`).
- Dashboard:
  - Today’s schedule (both Calendly video bookings and internal text bookings) from `appointments`.
  - Filters by status (pending, confirmed, completed).
- Availability management:
  - Manage recurring templates (`availability_templates`).
  - Manually open/close slots (create/update `availability_instances`).
- Patient records:
  - List of past appointments per patient, with links to documents, chat transcripts, and video recording references.
- Prescription editor:
  - Simple form to enter medication, dosage, notes.
  - Cloud Function generates PDF and stores in Storage, updates `prescriptions` + `documents`.

### 7.2 Sync View with Calendly

- Provide a view of matched `calendly_events` and local `appointments`.
- Highlight any mismatched scenarios (Calendly event without appointment or vice versa) to debug.

---

## 8. Security, Privacy, and Compliance Considerations

- **PHI / Sensitive Data**
  - If HIPAA‑class compliance is required, Firebase must be used under a BAA and all 3rd‑party services must be compliant.
  - Store only what is strictly necessary (no raw video in Firestore; just references if stored separately).

- **Transport Security**
  - Enforce HTTPS everywhere.
  - Use Firebase Hosting (HTTPS by default) or proxy via Cloudflare.

- **Access Control**
  - Use Firebase Auth & custom claims for role separation.
  - Fine‑grained Firestore security rules for:
    - patients only seeing their own appointments, documents, chat sessions.
    - admin being able to see all records.

- **Audit Logging**
  - Log all critical actions to `audit_logs` via Cloud Functions.

- **Backups / DR**
  - Enable automated backups for Firestore and Storage (via managed backup or scheduled export to Cloud Storage).

---

## 9. Calendly + Google Meet Integration Details

### 9.1 Calendly Account Structure

- Use a single Calendly account for Dr. Manoj.
- Event types:
  - `Video Consultation – 30 min`: integrated with Google Calendar + Google Meet.

### 9.2 Webhook Targets

- Deploy two HTTP functions:
  - `calendlyInviteeCreated`
  - `calendlyInviteeCanceled`
- Secure them via:
  - Calendly HMAC signatures.
  - Secret path token, e.g. `/calendly/webhook/{secret}`.

### 9.3 Handling Timezones

- Calendly sends ISO timestamps; convert to UTC and derive `slotId` by doctor and normalized start/end.
- Internally, **all stored times are UTC**.

---

## 10. Implementation Phases

### Phase 1 – Core MVP

- Firebase Auth (phone OTP) + basic user profile.
- Firestore collections: `users`, `appointments`, `availability_templates`, `availability_instances`, `slot_locks`.
- Internal booking UI for text consultations using Firestore transactions.
- Simple admin console (even raw Firestore + minimal UI) for doctor to open slots.

### Phase 2 – Calendly + Google Meet + Video

- Set up Calendly with Google Calendar and Google Meet.
- Implement webhook handling to mirror Calendly bookings to Firestore appointments and `availability_instances`.
- Add admin view for combined schedule.

### Phase 3 – Chat, Documents, Prescriptions

- Implement `chat_sessions` + UI + security rules.
- Document uploads to Storage and metadata in `documents`.
- Prescription PDF generator.

### Phase 4 – Notifications and Polish

- WhatsApp notifications via Cloud Function.
- Reminder schedules, post‑consultation messages.
- Better analytics dashboard.

---

## 11. How This Differs from the Original Build Doc

- **Backend stack**: shifted from generic Node/Postgres/Redis to **Firebase (Firestore/Auth/Functions)** to meet your requirement of no local DB and serverless, high‑managed infra.
- **Scheduling**: replaced custom or third‑party video SDK scheduling with **Calendly + Google Calendar + Google Meet**, but **kept an internal `availability_instances` layer** as the single source of truth so:
  - text and video slots cannot conflict,
  - Calendly bookings are reconciled via webhooks.
- **Concurrency/reservations**: explicitly designed **slot locking with Firestore transactions** to prevent double booking.
- **Chat vs video exclusivity**: unified slot model means a text booking blocks the slot for video and vice versa.
- **Production considerations**: added structured collections for audit logging, robust security rules pattern, and clear migration path (multi‑doctor, higher scale).

---

## 12. How to Use This Document with an AI Assistant

- You can paste this `.md` into your AI assistant (e.g., Claude) and ask it to:
  - Generate concrete Firestore rules from the described patterns.
  - Scaffold Next.js pages and components for booking, chat, and admin dashboards.
  - Write Cloud Functions code for `createAppointment`, `calendlyInviteeCreated`, and `calendlyInviteeCanceled` using TypeScript.
  - Create infrastructure IaC (e.g., Firebase config) based on the architecture.

This file is designed to be **structured and explicit** so another AI or developer can directly take it as input and start implementing without guessing system behavior.

