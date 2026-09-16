# Brine & Shell — backend API

Node/Express API for the site's three real red flags from the audit:
contact form, newsletter signup, and Razorpay checkout with the order
amount computed and verified **server-side** instead of trusted from
the browser.

## What's here

```
backend/
  server.js            Express app, mounts the three route groups
  routes/
    contact.js          POST /api/contact
    newsletter.js        POST /api/newsletter
    checkout.js           POST /api/checkout/create-order
                          POST /api/checkout/verify
  lib/
    catalog.js           reads ../data/products.json — the ONE
                          place prices live, shared with the frontend
    razorpay.js           order creation + HMAC signature verification
    resend.js              transactional email
    sheets.js               appends/updates rows in a Google Sheet
  .env.example           copy to .env and fill in (never commit .env)
```

`data/products.json` (one level up, at the site root) is the single
source of truth for product names/prices/descriptions. The frontend
(`js/products.js`) fetches it at runtime; the backend `require()`s it
directly. Change a price in exactly one place.

## 1. Set up the accounts you'll need

### Google Sheet (stores orders, contact messages, newsletter emails)

1. Create a new Google Sheet. Add three tabs named exactly `Orders`,
   `Contact`, `Newsletter` (case-sensitive). Give each a header row,
   e.g. `Orders`: `Order ID | Date | Status | Name | Email | Phone | Items | Total`.
2. Go to [console.cloud.google.com](https://console.cloud.google.com),
   create a project, enable the **Google Sheets API**.
3. Create a **Service Account** (IAM & Admin → Service Accounts →
   Create), then create a JSON key for it and download it.
4. Open the downloaded JSON: copy the `client_email` value into
   `GOOGLE_SERVICE_ACCOUNT_EMAIL`, and the `private_key` value into
   `GOOGLE_PRIVATE_KEY` (keep the `\n` sequences as literal text,
   wrapped in quotes).
5. Open your Google Sheet, click **Share**, and share it with that
   `client_email` address as **Editor**.
6. Copy the Sheet ID from its URL (`.../d/`**`THIS_PART`**`/edit`) into
   `GOOGLE_SHEET_ID`.

### Resend (sends contact/order emails)

1. Sign up at [resend.com](https://resend.com).
2. Add and verify the `brineandshell.com` domain (it'll give you DNS
   records to add — do that in Hostinger's DNS settings for the
   domain).
3. Create an API key, put it in `RESEND_API_KEY`.
4. Set `CONTACT_FROM_EMAIL` to an address on your verified domain
   (e.g. `orders@brineandshell.com`) and `CONTACT_TO_EMAIL` to where
   you want contact-form messages delivered (e.g. `support@brineandshell.com`).

### Razorpay

1. From [dashboard.razorpay.com](https://dashboard.razorpay.com) →
   Settings → API Keys, generate keys. Use the **test mode** keys
   (`rzp_test_...`) first.
2. Put `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `.env`.
3. Switch to live keys only once you've tested a full order end to
   end and the legal pages (Privacy/Terms/Refund Policy) are live —
   Razorpay generally requires those before enabling live payments.

### Google Sign-In (Client ID for the "Continue with Google" button)

This is separate from the service account above — that one is a robot
account for Sheets access; this one lets real customers sign in.

1. In the same (or a new) project at
   [console.cloud.google.com](https://console.cloud.google.com), go to
   **APIs & Services → OAuth consent screen**. Choose **External**,
   fill in the app name ("Brine & Shell"), your support email, and
   save. You don't need Google's verification for this — a handful of
   scopes (name/email) don't require review.
2. Go to **APIs & Services → Credentials → Create Credentials → OAuth
   client ID**. Application type: **Web application**.
3. Under **Authorized JavaScript origins**, add every URL the site
   will actually be opened from, e.g.:
   - `https://www.brineandshell.com`
   - `https://brineandshell.com` (if you support the bare domain too)
   - `http://localhost:5500` or similar, only while testing locally
4. You do **not** need an Authorized redirect URI for this flow (the
   Google Identity Services button posts a token directly, no
   redirect).
5. Copy the generated **Client ID** (ends in
   `.apps.googleusercontent.com`):
   - Put it in `GOOGLE_CLIENT_ID` in `backend/.env`.
   - Also put it in `js/config.js` as `window.GOOGLE_CLIENT_ID` — this
     one is *meant* to be public, it's not a secret, just an
     identifier telling Google which app is asking.
6. Reload the site — the nav should now show a real "Sign in with
   Google" button instead of "Sign-in not configured yet".

### Update the Orders sheet's header row

Pass 2 added a **Fulfillment Status** column. Your `Orders` tab's
header row (row 1) should read left to right:

```
Order ID | Date | Payment Status | Name | Email | Phone | Items | Total | Fulfillment Status
```

Also add a new tab named **Returns** with header row:

```
Timestamp | Order ID | Customer Email | Items | Reason | Status
```

### Admin password

Pick a strong, unique password and put it in `ADMIN_PASSWORD` in
`.env` — it's the only thing protecting `/admin.html`, where you
update order statuses. Don't reuse a password from anywhere else.

### Session secret

Generate one random value for `SESSION_SECRET` (used to sign both
customer and admin session cookies):

```
openssl rand -hex 32
```

## 2. Configure

```
cp .env.example .env
# then edit .env with the values from step 1
```

Set `ALLOWED_ORIGIN` to your real site URL, e.g.
`https://www.brineandshell.com`.

## 3. Deploy on Hostinger (Node.js App Manager)

Your plan runs Node through hPanel's Node.js App Manager (Passenger),
not a bare VPS — so there's no PM2 or Nginx config to write by hand:

1. Get the code onto the server: either connect the repo via
   hPanel's Git integration (hPanel → your website → Git), or upload
   the `backend/` folder with the File Manager / FTP.
2. In hPanel, go to your website → **Advanced → Node.js**.
3. Click **Create Application**:
   - **Node.js version:** 18 or newer.
   - **Application root:** the folder you uploaded `backend/` into.
   - **Application startup file:** `server.js`.
   - **Application URL:** decide whether the API lives at
     `www.brineandshell.com` (same domain, e.g. under `/api`) or a
     subdomain like `api.brineandshell.com`. Same domain is simplest
     — no CORS configuration needed. If you use a subdomain, set
     `js/config.js`'s `API_BASE` on the frontend to that subdomain's
     URL, and set `ALLOWED_ORIGIN` in `.env` to your main domain.
4. In the same Node.js app screen, add each variable from your `.env`
   file under **Environment variables** (hPanel stores these itself —
   you don't need to upload the `.env` file).
5. Click **Run NPM Install** in the panel (this reads `package.json`
   and installs everything — you don't need SSH for this).
6. Click **Restart** to start the app. hPanel assigns the port via
   `process.env.PORT` automatically — that's why `server.js` reads
   `process.env.PORT` instead of hardcoding one.
7. Test it: visit `https://www.brineandshell.com/api/health` (or your
   chosen URL) — you should see `{"ok":true,"time":"..."}`.

If your plan does give you SSH/terminal access in hPanel, the
equivalent manual steps are `npm install --production` then let
hPanel's Node.js manager start/restart `server.js` — you still don't
need PM2 since Passenger keeps the app alive and restarts it for you.

## 4. Test each endpoint once it's live

```bash
curl https://www.brineandshell.com/api/health

curl -X POST https://www.brineandshell.com/api/contact \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Test","lastName":"User","email":"you@example.com","subject":"Order Inquiry","message":"Testing the form"}'

curl -X POST https://www.brineandshell.com/api/checkout/create-order \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"id":"cubes","qty":1}],"customer":{"name":"Test","email":"you@example.com","phone":"9876543210"}}'
```

The contact/newsletter calls should land a row in your Google Sheet
and an email in your inbox within a few seconds. The checkout call
should return a real Razorpay `orderId` once test keys are in `.env`.

## 5. Try the new customer/admin features

- Visit `/admin.html` on your domain, sign in with `ADMIN_PASSWORD`,
  and you'll see every paid order with a status dropdown. Changing it
  emails the customer automatically.
- Visit any page — once `GOOGLE_CLIENT_ID` is set in both `.env` and
  `js/config.js`, the nav shows a real "Sign in with Google" button.
  After signing in, it shows the customer's name/email instead, with
  a dropdown for **My Orders** and **Sign Out**.
- `/account.html` lists the signed-in customer's paid orders (matched
  by the email they used at checkout — no separate signup needed).
  Clicking one shows the Order Placed → Dispatched → Shipped →
  Delivered stepper and a **Request a Return** button, which logs to
  the `Returns` tab and emails you.

## 6. Local development (optional)

```bash
cd backend
npm install
cp .env.example .env   # fill in test-mode values
npm run dev
```

The frontend pages call the API at whatever `js/config.js`'s
`API_BASE` says — leave it as `''` for same-origin, or point it at
`http://localhost:3000` while testing locally (and set `ALLOWED_ORIGIN`
in `.env` to match wherever you're opening the HTML from).
