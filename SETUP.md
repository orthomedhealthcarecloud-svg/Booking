# Medi — Setup Checklist

Everything you need to gather and create before the app will run end-to-end. Items marked **(required for local dev)** unblock `npm run dev`; the rest are needed for production behaviors.

---

## 1. Firebase (one project, both doctors)

Create a single Firebase project at <https://console.firebase.google.com>. Name it whatever you like (e.g. `medi-telemed`).

Inside the project, enable:

- **Authentication** → Sign-in method:
  - **Phone** (for patients). Add a test phone number under "Phone numbers for testing" so you can demo without spending SMS quota.
  - **Email/Password** (for the doctor admin login).
- **Firestore Database** → Create database, start in *production mode*, pick a region (`asia-south1` for India).
- **Storage** → Get started, same region.
- **Functions** → Upgrade the project to **Blaze plan** (pay-as-you-go). Free tier is enough for low volume, but Functions require Blaze.

### Web app credentials (Firebase Console → Project Settings → General → "Your apps" → Web)

Register a web app called "Medi Web". Copy the config values into `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=medi-telemed.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=medi-telemed
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=medi-telemed.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```
**(required for local dev)**

### Service account (server-side / Cloud Functions admin)

Project Settings → Service accounts → "Generate new private key". Save the JSON file as `secrets/firebase-admin.json` (already in `.gitignore`). Used by Cloud Functions and any server-side Firebase Admin code.

---

## 2. reCAPTCHA (for phone OTP abuse protection)

Go to <https://www.google.com/recaptcha/admin/create>:
- Label: Medi
- Type: **reCAPTCHA v3**
- Domains: `localhost`, your Vercel domain, your custom domain (if any)

Copy:
```
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=...
RECAPTCHA_SECRET_KEY=...
```

Also add the same domains to Firebase Auth → Settings → Authorized domains.

---

## 3. Per-doctor configuration

For **each** doctor (Dr. Manoj and Dr. Manoj 2), fill out the values below. Paste them into `.env.local` using the variable names shown.

### Doctor 1 — `/manoj`

```
DOCTOR_MANOJ_NAME="Dr. Manoj Iyer"
DOCTOR_MANOJ_QUALIFICATIONS="MS Ortho, DNB · Orthopaedic Surgeon"
DOCTOR_MANOJ_REGISTRATION="KMC/12483/2007"
DOCTOR_MANOJ_EXPERIENCE_YEARS=18
DOCTOR_MANOJ_LANGUAGES="English, Hindi, Marathi"
DOCTOR_MANOJ_TIMEZONE="Asia/Kolkata"
DOCTOR_MANOJ_VIDEO_FEE=800
DOCTOR_MANOJ_TEXT_FEE=500
DOCTOR_MANOJ_GOOGLE_MEET_URL="https://meet.google.com/xxx-xxxx-xxx"
DOCTOR_MANOJ_ADMIN_EMAIL="dr.manoj@medi.in"
DOCTOR_MANOJ_CLINIC_NAME="Iyer Orthopaedic Clinic"
DOCTOR_MANOJ_CLINIC_ADDRESS="2nd Floor, Sai Arcade, Bandra West, Mumbai 400050"
DOCTOR_MANOJ_CLINIC_PHONE="+91 98765 11122"
```

### Doctor 2 — `/manoj2`

Same shape with `DOCTOR_MANOJ2_*` prefix. Bring me the values when you have them.

### How to get the Google Meet link

The app supports two modes; they coexist. Whatever you connect, the booking flow uses it automatically.

1. **Google Calendar integration (recommended).** Every booking creates a calendar event on the doctor's calendar with a unique Meet link. See §4a below for the one-time OAuth setup. Once the doctor clicks "Connect Google Calendar" in `/{doctor}/admin/account`, this becomes the default and the static link below is ignored.

2. **Static fallback link.** If Calendar isn't connected for a given doctor, video bookings reuse the URL pasted into `DOCTOR_*_GOOGLE_MEET_URL`. To get one: <https://meet.google.com/landing> → "New meeting" → "Create a meeting for later" → copy the link. Same room for every patient; doctor admits one at a time.

---

## 4a. Google Calendar API (one-time per Firebase project)

You're enabling the API and getting OAuth client credentials. Doctors authorize their own calendars later from inside the admin UI.

1. Open Google Cloud Console for the same project (`medi-697f2`).
2. **APIs & Services → Library** → enable **Google Calendar API**.
3. **APIs & Services → OAuth consent screen:**
   - User type: External.
   - App name: Medi. Add support email + developer contact.
   - Scopes: add `https://www.googleapis.com/auth/calendar.events` and `https://www.googleapis.com/auth/userinfo.email`.
   - Test users: add both doctor admin emails (so they can connect while the app is unverified).
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID:**
   - Application type: Web application.
   - Authorized redirect URIs (add both, one per line):
     ```
     http://localhost:3000/api/google/oauth/callback
     https://YOUR-VERCEL-DOMAIN/api/google/oauth/callback
     ```
   - Copy the client ID and client secret into `.env.local`:
     ```
     GOOGLE_OAUTH_CLIENT_ID=...
     GOOGLE_OAUTH_CLIENT_SECRET=...
     NEXT_PUBLIC_APP_URL=http://localhost:3000   # change in production
     ```
5. After deploying, in `/manoj/admin/account` click **Connect Google Calendar**. Repeat for `/manoj2/admin/account`. Each doctor approves their own Google account; the refresh token lands on their `doctors/{id}` document.

You won't need to publish the consent screen for production unless you want anyone outside `Test users` to connect. For two doctors, leaving it as Testing is fine.

---

## 4. Razorpay (payments)

Sign up at <https://razorpay.com>. Go to Dashboard → Account → API Keys → Generate test key.

```
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
```

Webhook (for payment verification fallback): Dashboard → Webhooks → Add webhook:
- URL: `https://<your-vercel-domain>/api/razorpay/webhook`
- Active events: `payment.captured`, `payment.failed`, `order.paid`
- Webhook secret → save to:
```
RAZORPAY_WEBHOOK_SECRET=...
```

When you go live, replace test keys with live keys.

---

## 5. WhatsApp notifications (optional for MVP, required for Phase 4)

Pick one provider:

- **360dialog** (<https://www.360dialog.com>) — direct WhatsApp Business API access.
- **Wati** (<https://www.wati.io>) — simpler, but slightly more expensive.

Both give you:
```
WHATSAPP_API_BASE_URL=...
WHATSAPP_API_KEY=...
WHATSAPP_SENDER_NUMBER=+91...
```

You'll need pre-approved message templates for: booking confirmation, 15-min reminder, prescription ready, post-consult message. Submit those once you have an account; I'll wire the code to call them.

If you skip this for now, leave the vars empty and notifications fall back to no-op (booking still works).

---

## 6. Domain (for production)

- Buy/point a domain (e.g. `medi.health`) at Vercel.
- Subdomain plan: a single domain hosts both doctors via path — `medi.health/manoj` and `medi.health/manoj2`. No subdomain juggling needed.
- Add the domain to Firebase Auth → Authorized domains and to reCAPTCHA allowed domains.

---

## What to do once you have the values

1. Copy `.env.local.example` to `.env.local`.
2. Fill in every value above. Anything left blank disables that feature gracefully.
3. Run:
   ```
   npm install
   npm run dev
   ```
4. Open `http://localhost:3000/manoj` or `http://localhost:3000/manoj2`.

That's it. Hand me the filled `.env.local` (or paste values into chat) and I'll verify everything wires up.
