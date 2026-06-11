# Medi — Accounts & Credentials Required (Client Onboarding)

This document lists **everything that must be created and handed over** to get the Medi
telemedicine platform running from scratch. It is written so you (the client) can set up
all accounts in **one sitting**, so we don't have to go back and forth.

> **The app runs for two doctors** on a single domain: `yoursite.com/manoj` and `yoursite.com/manoj2`.

---

## How to use this document

1. Work through each section below. Each one tells you:
   - **What account** to create
   - **Whether a credit card / billing is required**
   - **Exactly which values to copy** and send back to me
2. Where it says **🔑 SEND ME**, copy those values into the table at the very bottom of this doc (or just paste them in chat).
3. **Never paste downloaded JSON key files into chat or email.** For those I'll tell you to share the file securely (see §8).
4. Items marked **(REQUIRED)** must be done for the app to work at all. Items marked **(OPTIONAL)** can be skipped at launch and added later.

---

## Quick summary — what you'll be signing up for

| # | Service | What it's for | Credit card needed? | Required? |
|---|---------|---------------|---------------------|-----------|
| 1 | **Google account** | Owns everything below | No | ✅ REQUIRED |
| 2 | **Firebase / Google Cloud project** | Login, database, file storage, backend | ✅ Yes (Blaze plan) | ✅ REQUIRED |
| 3 | **reCAPTCHA v3** | Stops OTP/login abuse | No | ✅ REQUIRED |
| 4 | **Razorpay** | Collecting consultation payments | No (KYC needed to go live) | ✅ REQUIRED |
| 5 | **Google Calendar API + Meet** | Auto video-call links per booking | No (same Google project) | ⚠️ Recommended |
| 6 | **WhatsApp Business API** | Booking/reminder notifications | Yes (provider billing) | ⬜ OPTIONAL |
| 7 | **Domain name** | Your public web address | Yes (~₹800–1500/yr) | ⚠️ For production |
| 8 | **Hosting (Vercel)** | Runs the website | Free tier OK to start | ⚠️ For production |
| 9 | **Doctor details** | Names, fees, clinic info | No | ✅ REQUIRED |

---

## 1. Google Account (REQUIRED)

Everything is owned by one Google account. **Decide now whose account this is** — ideally a
business account you control (e.g. `admin@yourclinic.com`), not a personal one, because it
will own billing, the database, and patient data.

- 🔑 **SEND ME:** which email address will be the owner.
- ⚠️ Whoever owns this account is the **billing owner**. Keep the password safe.

---

## 2. Firebase / Google Cloud Project (REQUIRED) — *the big one*

Firebase is Google's backend platform. It handles patient login, the database, file uploads,
and the backend code (Cloud Functions). **This is the only part that needs a credit card.**

### 2.1 Create the project
1. Go to **https://console.firebase.google.com**
2. **Add project** → name it (e.g. `medi-telemed`) → you can **disable Google Analytics**.

### 2.2 Enable the Blaze (pay-as-you-go) plan — **needs a credit/debit card**
- In the project, click the **⚙️ → Usage and billing → Modify plan → Blaze**.
- Add a card. **This does not mean you pay immediately** — there's a generous free tier; you
  only pay if usage exceeds it. For two doctors with normal volume, the monthly cost is
  typically **near ₹0–a few hundred rupees**.
- Blaze is required because the app uses **Cloud Functions** (the backend that generates
  prescriptions, handles bookings, etc.), which don't run on the free plan.
- 💡 You can set a **budget alert** (e.g. ₹500/month) so you're warned before any real charge.

### 2.3 Turn on the four services
Inside the Firebase project:
- **Authentication → Get started** → enable **Phone** (patients log in via OTP) **and**
  **Email/Password** (doctors log in to admin).
  - Under Phone, optionally add a **test phone number** so we can demo without spending SMS quota.
- **Firestore Database → Create database** → **Production mode** → region **`asia-south1` (Mumbai)**.
- **Storage → Get started** → same region.
- (Cloud Functions get deployed by me later — no action needed from you beyond Blaze.)

### 2.4 Get the Web App config
- **⚙️ Project Settings → General → "Your apps" → click `</>` (Web)** → register app "Medi Web".
- It shows a `firebaseConfig = { ... }` block.
- 🔑 **SEND ME:** that entire `firebaseConfig` block. It contains:
  `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`.

### 2.5 Get the Service Account key (backend access)
- **⚙️ Project Settings → Service accounts → Generate new private key** → downloads a `.json` file.
- 🔑 **SEND ME (securely — see §8):** this JSON file. **Do NOT paste its contents in chat.**

---

## 3. reCAPTCHA v3 (REQUIRED) — *free, no card*

Protects the phone-OTP login from bots/abuse.

1. Go to **https://www.google.com/recaptcha/admin/create**
2. Label: `Medi` · Type: **reCAPTCHA v3**
3. Domains: add `localhost`, plus your future website domain (you can add the domain later).
4. 🔑 **SEND ME:** the **Site key** and the **Secret key**.

---

## 4. Razorpay — Payments (REQUIRED) — *free to start*

Collects consultation fees from patients.

1. Sign up at **https://razorpay.com** (use the clinic's business details).
2. **Dashboard → Account & Settings → API Keys → Generate Test Key** (works immediately, no KYC).
3. 🔑 **SEND ME:** the **Key ID** (`rzp_test_...`) and **Key Secret**.
4. **Webhook** (so payments confirm reliably): Dashboard → **Settings → Webhooks → Add Webhook**
   - URL: `https://<your-domain>/api/razorpay/webhook` (I'll give you the exact URL after hosting is set up — you can add this later).
   - Events: `payment.captured`, `payment.failed`, `order.paid`
   - 🔑 **SEND ME:** the **Webhook Secret** you set.

> **To accept real money:** Razorpay requires **business KYC** (PAN, bank account, business proof).
> Start that process early — approval can take a few days. Test keys work fine for building/demoing
> meanwhile; we swap to **Live keys** when KYC is approved.

---

## 5. Google Calendar API + Google Meet (RECOMMENDED) — *free, same Google project*

So every video booking automatically creates a calendar event with a unique Google Meet link.

1. In **Google Cloud Console** (same project as Firebase): **APIs & Services → Library** → enable
   **Google Calendar API**.
2. **APIs & Services → OAuth consent screen:** User type **External**; App name `Medi`; add the
   clinic's support email; add scopes for calendar events + email; add **both doctors' admin emails
   as Test users**.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → type **Web application**.
   - Redirect URIs: `http://localhost:3000/api/google/oauth/callback` and
     `https://<your-domain>/api/google/oauth/callback`
4. 🔑 **SEND ME:** the **Client ID** and **Client Secret**.
5. Later, each doctor clicks "Connect Google Calendar" once inside their admin panel to authorize
   their own calendar.

> **Simpler fallback (no setup):** instead of the above, each doctor can give one fixed Google Meet
> link (https://meet.google.com/landing → New meeting → "Create a meeting for later" → copy link).
> Same room reused for every patient; doctor admits one at a time. We can launch with this and add
> Calendar integration later.

---

## 6. WhatsApp Notifications (OPTIONAL — can add later)

For booking confirmations, reminders, and "prescription ready" messages over WhatsApp.

- Requires a **WhatsApp Business API** provider — either **360dialog** (https://www.360dialog.com)
  or **Wati** (https://www.wati.io). These are paid and require a business phone number + Facebook
  Business verification.
- 🔑 **SEND ME (when ready):** API base URL, API key, sender number.
- ⏭️ **Skip at launch** — bookings work fine without it; notifications just won't fire.

---

## 7. Domain Name (REQUIRED for production)

Your public address, e.g. `mediclinic.health`.

- Buy from any registrar, or directly through Vercel (§8) for simplest setup.
- One domain serves **both** doctors: `yourdomain.com/manoj` and `yourdomain.com/manoj2`.
- 🔑 **SEND ME:** the domain name once purchased (and registrar login if you want me to configure DNS).

---

## 8. Hosting — Vercel (REQUIRED for production) — *free tier to start*

This is where the website actually runs.

1. Create an account at **https://vercel.com** (sign in with the same Google account, or GitHub).
2. 🔑 **SEND ME:** invite `contact@authify.tech` as a member of the Vercel project/team, **or**
   confirm you'd like me to create and host it under my account and transfer to you later.

### Securely sharing the JSON key files (§2.5, etc.)
Don't email or chat-paste the Firebase service-account JSON. Instead use one of:
- A password-protected shared drive / Google Drive folder shared with `contact@authify.tech`, **or**
- A secrets tool like https://onetimesecret.com (paste the file contents, send me the one-time link), **or**
- Add me as an **IAM member** on the Google Cloud project (Owner/Editor) so I can generate keys myself — *cleanest option*. To do this: Google Cloud Console → **IAM & Admin → IAM → Grant access** → add `contact@authify.tech` as **Editor**.

> 💡 **Easiest path overall:** if you add me as an **Editor on the Google Cloud project (§8)** and a
> **member on Razorpay** and **Vercel**, I can pull most credentials myself and you only need to do
> the billing/card steps and KYC, which only you can do.

---

## 9. Doctor Details (REQUIRED) — *no account needed, just info*

Fill these in for **each** doctor and send back. Anything you leave blank uses a sensible default.

**Doctor 1 (`/manoj`):**
- Full name & title
- Qualifications / specialty (e.g. "MS Ortho, DNB · Orthopaedic Surgeon")
- Medical registration number
- Years of experience
- Languages spoken
- Video consult fee (₹) and Text consult fee (₹)
- Admin login email (the email they'll use to log into the doctor dashboard)
- Clinic name, address, phone

**Doctor 2 (`/manoj2`):** same fields as above.

---

## ✅ Final hand-over checklist (paste values here or in chat)

| Item | Value needed | Done? |
|------|--------------|-------|
| Owner Google email | | ☐ |
| Firebase Blaze plan enabled (card added) | (just confirm) | ☐ |
| Firebase `firebaseConfig` block | apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId | ☐ |
| Firebase service-account JSON | shared securely (not pasted) | ☐ |
| reCAPTCHA site key | | ☐ |
| reCAPTCHA secret key | | ☐ |
| Razorpay Key ID (test) | rzp_test_… | ☐ |
| Razorpay Key Secret | | ☐ |
| Razorpay Webhook Secret | | ☐ |
| Razorpay KYC started | (confirm) | ☐ |
| Google OAuth Client ID | | ☐ |
| Google OAuth Client Secret | | ☐ |
| Domain name | | ☐ |
| Vercel access granted | (confirm) | ☐ |
| Doctor 1 details | (section 9) | ☐ |
| Doctor 2 details | (section 9) | ☐ |
| WhatsApp (optional) | API URL, key, sender # | ☐ |

---

### Minimum to see the app running locally (if you want a quick demo first)
Just **§2 (Firebase)** + **§3 (reCAPTCHA)** is enough to launch the app and log in. Payments,
calendar, WhatsApp, and domain can all be added afterward without breaking anything.
