# Protege Research Survey Platform – Full Project Map

## Overview
A secure, full-featured survey distribution and management platform for research studies, built with Next.js, AWS Amplify Gen 2 (Data & Auth), and TypeScript. The app provides:
- Admin dashboard for project, vendor, question, and survey link management
- Public-facing survey and completion pages
- Authentication and authorization via AWS Amplify Gen 2 (Cognito User Pools)
- All CRUD operations performed client-side using the Amplify Data client
- Security features including geolocking and test/live link separation

---

## Features

### Authentication
- User sign up, login, verification, password reset (Cognito User Pools)
- Protected admin routes, client-side auth state management
- Auth redirect logic to prevent access to admin pages when not authenticated

### Admin Dashboard
- View, create, update, delete research projects
- Manage vendors and assign them to projects
- Manage question banks for surveys
- Generate and manage unique survey links for each project/vendor
- **Generate test and live survey links separately**
- **Geolock live links to restrict access by country/region**
- View analytics and diagnostics

### Survey Distribution
- Public survey link pages for participants
- Completion, quota full, and disqualified pages
- Secure, fraud-resistant link handling (VPN detection, geo-targeting, etc.)

### System Diagnostics
- Diagnostics page to check Amplify config, backend connectivity, and auth state

### Debug Tools
- Auth debug page for testing authentication state and redirect logic

### Security
- Middleware for security headers and basic route protection
- All sensitive admin routes require authentication
- Geolocking for live survey links

---

## File/Folder Map

```
/amplify_outputs.json
/public/amplify_outputs.json
/src/
  lib/
    amplify-config.ts         # Loads Amplify Gen 2 config
    amplify-data-service.ts   # Amplify Data client, CRUD for all models
    auth-service.ts           # Auth logic (sign in, sign up, session, etc.)
    auth-provider.tsx         # React context for auth state
    auth-redirect-check.tsx   # Redirects authenticated users away from login
    protected-route.tsx       # Protects admin pages, redirects if not authenticated
    auth-debug.ts             # Helper for logging auth state
    diagnostics-utils.ts      # System diagnostics helpers
    cookie-manager.ts         # Cookie fixes for auth/session
    ... (other helpers)
  pages/
    _app.tsx                  # App initialization, Amplify config, AuthProvider
    index.tsx                 # Public landing page
    diagnostics.tsx           # System diagnostics page
    auth-debug.tsx            # Auth debug UI
    admin/
      index.tsx               # Admin dashboard (protected)
      login.tsx               # Login page (with AuthRedirectCheck)
      signup.tsx              # Signup page
      verify.tsx              # Email verification page
      projects/               # Project CRUD pages
      vendors/                # Vendor CRUD pages
      questions/              # Question bank CRUD pages
      links/                  # Survey link management (test/live, geolock)
    api/                      # (API routes, mostly legacy or for debugging)
    s/[projectId]/            # Public survey link landing
    survey/[projectId]/       # Survey page for participants
    completion/[projectId]/   # Completion page
    sorry-quota-full.tsx      # Quota full page
    sorry-disqualified.tsx    # Disqualified page
    thank-you-completed.tsx   # Thank you page
  middleware.ts               # Security headers, basic route protection
  components/                 # UI components (CSVUploader, SurveyFlow, etc.)
  styles/                     # Tailwind CSS
/amplify/                     # Amplify Gen 2 backend resources (auth, data, etc.)
/API.ts, /mutations.ts, /queries.ts, /subscriptions.ts  # Generated GraphQL client code
```

---

## Data Models (Amplify Data)
- **Project:**  id, name, description, status, createdAt, updatedAt, etc.
- **Vendor:**  id, name, contact info, assigned projects, etc.
- **Question:**  id, text, type, options, etc.
- **SurveyLink:**
  - id, projectId, vendorId, unique link, status, type (test/live), geolock settings, etc.

---

## Key Flows

### Authentication
- User signs up or logs in via `/admin/login` or `/admin/signup`
- Auth state is managed client-side with React context (`AuthProvider`)
- Protected admin pages use `ProtectedRoute` to enforce authentication
- Middleware only applies security headers, does not block access (Amplify Gen 2 handles auth client-side)

### Admin CRUD
- All CRUD operations for projects, vendors, questions, and links use Amplify Data client (`amplify-data-service.ts`)
- No server-side API routes; all data access is client-side with proper auth

### Survey Link Generation
- Admin can generate both test and live survey links for each project/vendor
- **Test links**: unrestricted, for QA and preview
- **Live links**: can be geolocked (restricted by country/region)
- Geolocking is enforced on the survey landing page and in the link logic

### Survey Participation
- Public users access survey links via `/s/[projectId]` or `/survey/[projectId]`
- Survey flow is managed by React components, with fraud prevention and analytics

### Diagnostics & Debug
- `/diagnostics` page checks Amplify config, backend, and auth state
- `/auth-debug` page allows manual testing of auth state and redirects

---

## Security
- **Middleware:** Adds security headers to all responses
- **Client-side Auth:** All admin pages require valid auth session (checked via Amplify Gen 2)
- **Geolocking:** Live survey links can be restricted by country/region; enforced on link access

---

## Deployment
- **Amplify Hosting:** Uses `/amplify_outputs.json` for config at build and runtime
- All routes and static assets are compatible with Amplify Hosting

---

## How to Rebuild This App
1. Set up a Next.js project with TypeScript and Tailwind CSS
2. Integrate AWS Amplify Gen 2 (Auth + Data)
3. Implement the described file/folder structure
4. Implement all CRUD and authentication flows as described
5. Generate GraphQL client code from Amplify Data models
6. Add middleware for security headers
7. Deploy to Amplify Hosting with proper config

---

## Special Notes
- **Test vs Live Links:** The app supports generating both test and live survey links. Test links are for internal QA and are not geolocked. Live links can be geolocked to restrict access by country/region, ensuring only valid participants can access the survey.
- **Geolocking:** Geolock settings are stored with each live link and enforced on access. The app uses IP-based geolocation and VPN detection to prevent circumvention.

---

This document provides a complete blueprint for the app, including all features, flows, and structure, and can be used as a prompt for a developer or AI agent to recreate the entire application.
