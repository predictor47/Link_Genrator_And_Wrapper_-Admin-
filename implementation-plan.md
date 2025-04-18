
# 🛠️ Survey Link Wrapper System — Implementation Plan

## 📌 Project Goal

Build a system that wraps third-party survey links in a validation layer that:
- Ensures human responses via CAPTCHA
- Verifies user consistency via mid-survey validation
- Collects metadata for bot detection
- Flags suspicious behavior
- Allows admins to manage everything via a control panel

---

## 🧱 System Modules

### 1. Admin Panel

#### Features
- Create and manage projects
- Upload or generate survey links
- Assign unique identifiers
- Manage pre-survey question bank
- View submissions and flags
- Export data (CSV/Excel)

#### Tech Stack
- Backend: Node.js (Express) / Django / Laravel
- Frontend: React / Next.js / Vue
- DB: PostgreSQL / MongoDB
- Admin UI: Tailwind UI / Shadcn UI / AdminLTE

---

### 2. Survey Link Generator

#### Functionality
- Input: One third-party survey link + number of links to generate
- Output: N unique wrapper URLs with UIDs
- Store in DB:
  - project_id
  - original_link
  - uid
  - status (pending/completed/flagged)
  - timestamps

#### Output Format
```
https://yourdomain.com/s/:project_id/:uid
```

#### DB Table: `survey_links`

| Field           | Type        | Description                        |
|----------------|-------------|------------------------------------|
| id             | UUID        | Primary key                        |
| uid            | String      | Unique identifier for each link   |
| project_id     | FK          | Reference to projects              |
| original_url   | String      | Third-party survey link            |
| status         | Enum        | pending / completed / flagged      |
| created_at     | Timestamp   | Time of generation                 |

---

### 3. Landing Page

#### Steps
1. Load on wrapper domain
2. Show CAPTCHA (Google reCAPTCHA / hCaptcha)
3. Collect metadata:
   - IP, device, browser, user-agent, timezone
4. Display pre-survey question(s) from project
5. Save answers temporarily

---

### 4. Survey Wrapper Page

#### Features
- Load actual survey inside an iframe
- Start a timer for random validation interrupt
- Show one of the initial questions again
  - Compare with stored answer
  - On mismatch: flag, log violation, optionally block
  - On match: allow to continue

---

### 5. Flagging & Logging System

#### Triggers
- CAPTCHA failure
- Metadata anomaly (VPN, incognito)
- Wrong mid-check answer
- Duplicate attempts from same IP/device

#### Logged Data
- Project ID, UID
- Flag reason
- Metadata (IP, device, etc.)
- Timestamp

---

### 6. Data Export

#### Features
- Admin can filter/export by:
  - Project
  - Flag status
  - Date range
- Output: CSV / Excel

---

## 🔗 Free Domains & Hosting (For Testing)

| Platform           | Use                      | Notes                           |
|--------------------|--------------------------|----------------------------------|
| **Freenom**        | Free `.tk`, `.ml`, etc.  | Use for testing your domain     |
| **Vercel**         | Frontend hosting         | Great for Next.js / React       |
| **Render**         | Fullstack + DB           | Free PostgreSQL instance        |
| **Railway**        | Backend + DB             | Free plan, fast to deploy       |
| **Replit / Glitch**| Rapid prototyping        | Ideal for MVPs and demos        |
| **Cloudflare Pages** | Static frontend       | Free subdomain, fast deploy     |

---

## ✅ Next Steps

1. Define DB schema (`projects`, `survey_links`, `responses`, `flags`)
2. Build admin panel (CSV upload, project creation, question management)
3. Build frontend wrapper flow (CAPTCHA + metadata + questions)
4. Add iframe loader + interrupt validation
5. Set up flagging, logging, and response storage
6. Deploy via Freenom + Vercel/Render + test links
