# Mass Survey Link Wrapper Tool - Amplify Gen 2 Implementation Plan

## ✅ Final Copilot Prompt (Amplify Gen 2 Setup)

```
Build a “Mass Survey Link Wrapper Tool” using AWS Amplify Gen 2.

## 📂️ Hosting Architecture
- Public App: https://protegeresearchsurvey.com
  - For survey participants and tracking
- Admin App: https://admin.protegeresearchsurvey.com
  - For managing projects, links, and data

## 🛠️ Tech Requirements
- AWS Amplify Gen 2 (DynamoDB, Cognito, Functions, Hosting)
- No Prisma or paid CAPTCHA services (use a custom CAPTCHA)
- Use iframe domain change to detect survey completion
- Store metadata (IP, device, timing, cursor, etc.)
- Use only Amplify Auth (Cognito) for admin access

## 🔐 Auth
- Admin app protected with Cognito login
- Public app has no auth (just CAPTCHA for bot blocking)

## 🤀 Survey Completion Logic
- Embed third-party surveys via iframe
- Detect redirect to:
  - `https://protegeresearchsurvey.com/thankyou`
  - `https://protegeresearchsurvey.com/quota`
  - `https://protegeresearchsurvey.com/not-eligible`
- These pages display a brief message and auto-redirect to https://protegeresearch.com/ after 20 seconds
- Use domain monitoring in JS to capture this and trigger metadata saving + status update

## 📆 Data Models (Amplify Data)
Project, WrappedLink, ResponseMetadata, AdminUser

## 🔍 Bot Detection
- Custom CAPTCHA
- Cursor timing
- Copy/paste detection
- Trap questions
- IP + VPN detection
- Batch pasting patterns

## 🚀 Amplify Deployment
- Use two Amplify apps (one for each domain)
- Setup DNS and custom domains via Amplify Console
```

---

## 🧭 Detailed Implementation Plan

### 🔧 1. Project Initialization

* Create two Amplify Gen 2 apps:

  * **Public App** (connect to `protegeresearchsurvey.com`)
  * **Admin App** (connect to `admin.protegeresearchsurvey.com`)
* Set up backend shared across both apps using Amplify Data

---

### 📆 2. Amplify Data Models

```graphql
type Project @model {
  id: ID!
  name: String!
  surveyLink: String!
  createdAt: AWSDateTime!
  wrappedLinks: [WrappedLink] @hasMany
  trapQuestions: [TrapQuestion] @hasMany
}

type WrappedLink @model {
  id: ID!
  uid: String!
  projectID: ID! @index(name: "byProject")
  status: WrappedStatus!
  createdAt: AWSDateTime!
  completedAt: AWSDateTime
  metadata: ResponseMetadata @hasOne
}

type TrapQuestion @model {
  id: ID!
  projectID: ID! @index(name: "byProject")
  question: String!
  answer: String!
}

enum WrappedStatus {
  ACTIVE
  COMPLETED
  FLAGGED
  QUOTA_FULL
  NOT_ELIGIBLE
}

type ResponseMetadata @model {
  id: ID!
  uid: String!
  projectID: ID!
  ip: String
  device: String
  browser: String
  startTime: AWSDateTime
  endTime: AWSDateTime
  durationSeconds: Int
  copyPasteDetected: Boolean
  batchPasteDetected: Boolean
  cursorPattern: String
  trapQuestionsPassed: Boolean
  vpnDetected: Boolean
}
```

---

### 🖥️ 3. Admin Interface ([https://admin.protegeresearchsurvey.com](https://admin.protegeresearchsurvey.com))

#### Pages

* `/admin` – Project overview, create new project
* `/admin/projects/[id]`

  * Generate wrapped links with UIDs
  * View/download/export responses
  * Manually flag or update statuses
  * View response metadata
  * Add/edit/delete trap questions

#### Components

* Auth (Cognito)
* Project creation form
* UID generator
* Status visualizer (e.g., completed, quota full)
* Trap question management interface

---

### 🌐 4. Public Interface ([https://protegeresearchsurvey.com](https://protegeresearchsurvey.com))

#### `/s/[projectId]/[uid]`

* Loads **custom CAPTCHA** (free solution)
* If passed:

  * Asks user-defined trap questions (saved during project creation)
  * Starts iframe with external survey URL
  * Cursor tracking + timing begins

#### `/completion/[projectId]/[uid]`

* Loaded inside iframe upon redirect
* Detects domain match:

  * `thankyou`, `quota`, or `not-eligible`
* These pages display a brief message and redirect to [https://protegeresearch.com/](https://protegeresearch.com/) after 20 seconds
* Triggers:

  * Metadata saving
  * Update link status
  * During survey, randomly re-asks one of the initial trap questions to check attention
  * Flags response if mismatch found

#### `/survey/[projectId]/[uid]`

* Optional page for embedded surveys with custom layout

---

### 🧮 5. Functions (Amplify Functions)

* `POST /api/links/generate` – batch UID generation
* `POST /api/links/complete` – called when iframe detects completion
* `POST /api/links/flag` – flag as suspicious
* `PATCH /api/links/update-status` – manually update status
* `GET /api/projects/[id]/questions` – serve trap questions

---

### 🧠 6. Detection Logic

#### CAPTCHA:

* JS-only solution (click-and-hold, puzzle, or simple math)
* Only on `/s/` pages before loading iframe

#### Iframe Redirect Detection:

```js
const iframe = document.getElementById('surveyFrame');
iframe.onload = () => {
  const currentDomain = new URL(iframe.contentWindow.location.href).hostname;
  if (currentDomain.includes('protegeresearchsurvey.com')) {
    // parse path and update status accordingly
    // call /api/links/complete
  }
};
```

---

### 🛡️ 7. Security & Privacy

* Use HTTPS everywhere
* Log informed consent
* Obfuscate UID links
* Store metadata securely
* GDPR/CCPA compliant fields only

---

### 🚀 8. Deployment Plan

#### DNS

* Route `protegeresearchsurvey.com` and `admin.protegeresearchsurvey.com` to Amplify via Route53 or external DNS provider

#### Amplify Hosting

* Enable custom domain mapping in Amplify Console
* Configure redirects and rewrites for dynamic routes

#### Build

```bash
# Backend + hosting
npx ampx pipeline-deploy --yes

# Frontend
npm run build && npm run deploy
```

---

### 🔄 Updated Link Generation Features

#### Capabilities:

1. **Single Dynamic Link Wrapping**

   * Generate N UID-wrapped links from a single base URL.

2. **CSV Import**

   * Upload CSVs with multiple URLs for batch wrapping.
   * Associate each imported URL with a project or vendor.

3. **Vendor Management**

   * Maintain a vendor list:

     * Each vendor has a unique ID.
     * Add/delete vendors from the admin panel.
   * Link stats and data are tracked per vendor.

4. **Multi-Vendor Link Generation**

   * Select one or more vendors.
   * Specify number of links per vendor.
   * Generated links are tagged with both project and vendor.

5. **Link Types**

   * Choose between `test` and `live` link type.
   * Test links are marked differently in the system for non-production usage, they dont have geolocation restrictions.

6. **Geo-Targeting**

   * Select one or more countries to geolock a link batch.
   * Access to the link is restricted unless the IP matches allowed countries.

7. **Tracking and Exporting**

   * Track:

     * Total links per vendor/project.
     * Completed responses.
     * Flags and statuses.
   * Export:

     * Per-vendor data (CSV or JSON).
     * Overall project data.

8. **Trap Question Injection**

   * Projects can define their own questions.
   * Users must answer them after solving CAPTCHA.
   * One of these questions is randomly re-injected mid-survey via popup.
   * Cross-check answers to flag inattentive or bot-like behavior.
