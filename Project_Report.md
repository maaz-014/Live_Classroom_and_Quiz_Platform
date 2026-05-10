# Project Report
## Live Classroom and Quiz Platform — ClassHub

---

| Field            | Details                                                        |
|------------------|----------------------------------------------------------------|
| **Course**       | Database Systems                        |
| **Submitted To** | Sir Talha Shahid                                              |
| **Date**         | May 10, 2026                                                   |
| **Repository**   | Live_Classroom_and_Quiz_Platform                               |

### Group Members

| Name             | Student ID | Role                        | Deployed Application |
|------------------|------------|-----------------------------|----------------------|
| Muhammad Maaz    | 24K-0968   | Student Web Application     | https://live-classroom-and-quiz-platform-student-web.vercel.app/ |
| Sharjeel Ahmed   | 24K-0724   | Teacher Web Application     | https://live-classroom-and-quiz-platform-teacher-web.vercel.app/ |

---

## 1. Executive Summary

The **Live Classroom and Quiz Platform** (branded as **ClassHub**) is a fully deployed, production-grade dual web application that enables real-time, interactive quiz sessions between teachers and students. The platform consists of two independent Next.js 16 applications — one for teachers and one for students — sharing a common Supabase backend, Firebase Cloud Messaging push notification service, and Gmail-powered email notification system.

Teachers can create courses, build multi-type quizzes, and launch live sessions. Students can enroll in courses, receive instant push and email notifications when a quiz goes live, participate in timed quiz sessions in real-time, and track their performance via a live leaderboard. Both applications are successfully deployed and running on Vercel.

---

## 2. Introduction

Modern education demands interactive, real-time tools that go beyond static assessments. The goal of this project was to build a platform that brings the excitement of live, competitive quizzes to the online classroom — similar to Kahoot, but built entirely from scratch using industry-standard frameworks and services.

The project was divided between two team members, each responsible for one complete application. Communication and shared backend resources (Supabase schema, Firebase project) were managed collaboratively.

---

## 3. System Architecture

### 3.1 High-Level Architecture

The system follows a **multi-application architecture** with a shared backend:

```
Teacher Web App (Vercel) ──┐
                            ├──► Supabase (PostgreSQL + Auth + Realtime)
Student Web App (Vercel) ──┘         │
                                     ▼
                           Firebase Cloud Messaging
                           Gmail SMTP (Nodemailer)
```

### 3.2 Application Structure

**Teacher Web App** (`/teacher-web-app`):
```
app/
├── auth/           — Supabase auth callback handler
├── login/          — Teacher login / sign-up page
├── dashboard/      — Course listing dashboard
├── courses/
│   ├── new/        — Create new course form
│   └── [courseId]/
│       ├── page.tsx         — Course detail + quiz list
│       └── quiz/
│           ├── new/         — Create new quiz + questions
│           └── [quizId]/
│               ├── page.tsx            — Quiz detail view
│               └── sessions/
│                   ├── page.tsx        — Session launcher + history
│                   └── [sessionId]/    — LIVE teacher control panel
└── api/
    └── notify-quiz/  — API Route: send FCM push + email to students

components/
└── TeacherNav.tsx    — Shared navigation component

lib/
├── supabase/         — Server and client Supabase helpers
└── firebase/         — Firebase Admin SDK (server-side FCM)
```

**Student Web App** (`/student-web-app`):
```
src/app/
├── auth/           — Supabase auth callback handler
├── login/          — Student login / sign-up page
├── profile/setup/  — Profile & avatar setup page
├── dashboard/      — Enrolled courses dashboard
├── courses/
│   ├── enroll/     — Enroll in a course by ID
│   └── [courseId]/ — Course detail page
├── session/
│   └── [sessionId]/ — LIVE student quiz session page
└── progress/        — Personal quiz performance history

src/components/
├── PushNotificationManager.tsx  — FCM token registration + foreground notifications
└── ClientAvatar.tsx             — Reusable avatar component

src/lib/
├── supabase/    — Server and client Supabase helpers
└── firebase/    — Firebase client SDK (push notifications)
```

### 3.3 Technology Stack

| Layer              | Technology                          | Version        |
|--------------------|-------------------------------------|----------------|
| Frontend Framework | Next.js (App Router)                | 16.2.4         |
| UI Library         | React                               | 19.2.4         |
| Language           | TypeScript                          | ^5             |
| Styling            | Tailwind CSS + Vanilla CSS          | ^4             |
| Database           | Supabase (PostgreSQL)               | Latest         |
| Authentication     | Supabase Auth (`@supabase/ssr`)     | ^0.10.2        |
| Realtime           | Supabase Realtime                   | Built-in       |
| Push Notifications | Firebase Cloud Messaging            | firebase ^12   |
| Server FCM         | Firebase Admin SDK                  | ^13.8.0        |
| Email              | Nodemailer + Gmail SMTP             | ^8.0.7         |
| Deployment         | Vercel (Serverless)                 | —              |

---

## 4. Database Design

The entire platform shares one Supabase (PostgreSQL) database. Row-Level Security (RLS) policies are applied to all tables to enforce data access rules at the database level.

### 4.1 Entity Relationship Overview

```
users ──< enrollments >── courses ──< quizzes ──< questions
                              │
                          sessions ──< answers >── users
```

### 4.2 Table Definitions

#### `users`
| Column       | Type    | Description                                     |
|--------------|---------|-------------------------------------------------|
| `id`         | UUID (PK, FK → auth.users) | Links to Supabase auth user       |
| `role`       | text    | `'teacher'` or `'student'`                      |
| `full_name`  | text    | Student's display name                          |
| `avatar_url` | text    | URL of profile picture                          |
| `fcm_token`  | text    | Firebase Cloud Messaging device token           |

#### `courses`
| Column        | Type      | Description                          |
|---------------|-----------|--------------------------------------|
| `id`          | UUID (PK) | Unique course identifier             |
| `teacher_id`  | UUID (FK) | References `users.id`                |
| `title`       | text      | Course name                          |
| `description` | text      | Course description                   |
| `created_at`  | timestamp | Auto-generated creation timestamp   |

#### `enrollments`
| Column       | Type      | Description                            |
|--------------|-----------|----------------------------------------|
| `id`         | UUID (PK) | Enrollment record                      |
| `course_id`  | UUID (FK) | References `courses.id`                |
| `student_id` | UUID (FK) | References `users.id`                  |

#### `quizzes`
| Column               | Type      | Description                          |
|----------------------|-----------|--------------------------------------|
| `id`                 | UUID (PK) | Unique quiz identifier               |
| `course_id`          | UUID (FK) | References `courses.id`              |
| `title`              | text      | Quiz title                           |
| `time_limit_seconds` | integer   | Seconds per question (countdown)     |

#### `questions`
| Column           | Type      | Description                                |
|------------------|-----------|--------------------------------------------|
| `id`             | UUID (PK) | Unique question identifier                 |
| `quiz_id`        | UUID (FK) | References `quizzes.id`                    |
| `question_text`  | text      | The question body                          |
| `type`           | text      | `mcq`, `true_false`, `short_answer`        |
| `options`        | text[]    | Array of answer choices (MCQ)              |
| `correct_answer` | text      | The correct answer string                  |
| `points`         | integer   | Points awarded for correct answer          |
| `order_index`    | integer   | Display order within the quiz              |

#### `sessions`
| Column                  | Type      | Description                               |
|-------------------------|-----------|-------------------------------------------|
| `id`                    | UUID (PK) | Unique session identifier                 |
| `quiz_id`               | UUID (FK) | References `quizzes.id`                   |
| `teacher_id`            | UUID (FK) | References `users.id`                     |
| `status`                | text      | `waiting`, `active`, `ended`              |
| `current_question_index`| integer   | Which question is currently live          |
| `started_at`            | timestamp | When the session started                  |

#### `answers`
| Column        | Type      | Description                                    |
|---------------|-----------|------------------------------------------------|
| `id`          | UUID (PK) | Unique answer record                           |
| `session_id`  | UUID (FK) | References `sessions.id`                       |
| `question_id` | UUID (FK) | References `questions.id`                      |
| `student_id`  | UUID (FK) | References `users.id`                          |
| `answer_text` | text      | The student's submitted answer                 |
| `is_correct`  | boolean   | Whether the answer matched `correct_answer`    |

---

## 5. Feature Implementation Details

### 5.1 Authentication & Role-Based Access Control

Both apps use **Supabase Auth** with `@supabase/ssr` for server-side session management. The auth flow:

1. User signs up / signs in via email + password.
2. Supabase issues a JWT session cookie managed via middleware.
3. On each protected page, the server-side component calls `supabase.auth.getUser()` to validate the session.
4. A user's `role` column in the `users` table is checked to gate access — teachers attempting to use the student app are shown an "Access Denied" screen, and vice versa.
5. New teachers are automatically registered in the `users` table with `role: 'teacher'` on first login.
6. New students are redirected to a profile setup page before accessing the dashboard.

**Multi-domain Auth**: Since both apps are on different Vercel domains, Supabase is configured with both deployment URLs as allowed redirect URIs to properly handle the auth callback on both applications.

---

### 5.2 Teacher Web Application (Sharjeel Ahmed — 24K-0724)

#### 5.2.1 Dashboard
The teacher dashboard fetches all courses owned by the authenticated teacher from Supabase and renders them as cards in a responsive grid. Each card displays the course title, description, creation date, and a "Manage →" link. A stats bar shows total course count.

#### 5.2.2 Course Management
Teachers can create courses with a title and description. The new course is inserted into the `courses` table with the teacher's ID. All courses are displayed on the dashboard with colour-coded accent gradients.

#### 5.2.3 Quiz Builder
From a course detail page, teachers can create quizzes by:
1. Entering a quiz title and time limit (seconds per question).
2. Adding questions with a type selector: **Multiple Choice (MCQ)**, **True/False**, or **Short Answer**.
3. For MCQ, up to 4 answer options can be entered, with one marked as the correct answer.
4. Each question has a configurable point value.
5. Questions are saved to the `questions` table in order.

#### 5.2.4 Live Session Control
From the Sessions page, the teacher can:
1. **Launch** a new session — creates a `sessions` row with `status: 'waiting'`.
2. Students see the lobby while `status = 'waiting'`.
3. The teacher advances questions one by one (updates `current_question_index`).
4. When ready, the teacher sets `status: 'active'` to start the quiz.
5. After the last question, the teacher sets `status: 'ended'`.
6. All state changes are made via Supabase updates, which are pushed to students via **Supabase Realtime Postgres Changes**.

#### 5.2.5 Notification System (API Route)
When the teacher launches a session, the `/api/notify-quiz` Next.js API Route is triggered. It:

1. Fetches all enrolled student IDs for the course.
2. **Push Notifications**: Retrieves each student's `fcm_token` from the `users` table and calls Firebase Admin SDK's `messaging.sendEachForMulticast()` to send a browser push notification: *"Live Quiz Started! Your teacher just launched: [quiz title], join now!"*
3. **Email Notifications**: Uses the Supabase Service Role Key to fetch each student's email from `auth.users`, then sends a styled HTML email via **Nodemailer** (Gmail SMTP) with a "Join Quiz Now" button linking to the student app dashboard.
4. Emails are sent via **BCC** so students cannot see each other's email addresses.

---

### 5.3 Student Web Application (Muhammad Maaz — 24K-0968)

#### 5.3.1 Dashboard
The student dashboard fetches all courses the student is enrolled in via the `enrollments` table (joined with `courses`). Courses are rendered as animated cards. A hero section greets the student by name with their total course count.

#### 5.3.2 Profile Setup
Students must complete a profile before accessing the dashboard. They enter their full name and can upload a profile avatar image. The data is stored in the `users` table.

#### 5.3.3 Course Enrollment
Students enroll in a course by entering a **Course ID** (a UUID provided by the teacher). The system checks that the course exists, that the student is not already enrolled, and then inserts an `enrollments` record.

#### 5.3.4 Push Notification Registration
The `PushNotificationManager` component:
1. Checks if the browser supports push notifications.
2. Prompts the user to allow notifications via a styled bottom banner.
3. Uses the Firebase Client SDK to request a push permission and obtain an FCM token.
4. Saves the token to `users.fcm_token` via Supabase so the teacher's app can reach this device.
5. Listens for foreground push messages and displays them as in-app toast notifications.

#### 5.3.5 Live Quiz Session
The session page is the most complex feature of the student app:

**Realtime Architecture**: A single Supabase Realtime channel (`room-{sessionId}`) is subscribed to, combining:
- **Presence** — tracks which students are online in the lobby (shows "Who's Here" list with avatars).
- **Postgres Changes (sessions table)** — listens for `UPDATE` events on the current session row to detect when the teacher advances a question or ends the quiz.
- **Postgres Changes (answers table)** — listens for `INSERT` events to update the leaderboard in real-time as other students answer.

**Quiz Flow**:
1. **Lobby** (`status: waiting`): Student sees a pulsing green dot, a waiting message, and a live list of all students who have joined via presence tracking.
2. **Active** (`status: active`): The current question is displayed with:
   - Question number indicator (`Question X of Y`)
   - A live countdown timer that resets each time the question index changes.
   - Answer options styled as large buttons (MCQ/True-False) or a text input form (Short Answer).
   - If the timer reaches zero without an answer, the system auto-submits `"TIMEOUT_NO_ANSWER"` with `is_correct: false`.
   - Once answered, the student sees a "Answer Locked In! 🔒" screen and the live leaderboard.
3. **Ended** (`status: ended`): The student sees their final score, correct/total answers ratio, and the class leaderboard.

**Leaderboard Calculation**: Computed client-side using `useMemo` — iterates all `answers` for the session, finds the correct ones, looks up each question's point value, and sums scores per student, sorted descending.

#### 5.3.6 Progress Tracking
The `/progress` page fetches all sessions the student has participated in, along with their answers and scores, presenting a historical record of quiz performance.

---

## 6. Real-time Communication Deep Dive

Supabase Realtime is the core of the live session experience. The implementation uses a **single channel** per session room to avoid multiple WebSocket connections:

```typescript
const channel = supabase.channel(`room-${sessionId}`, {
  config: { presence: { key: userProfile.id } }
})

channel
  // Presence for lobby tracking
  .on('presence', { event: 'sync' }, () => { ... })
  .on('presence', { event: 'join' }, ({ newPresences }) => { ... })
  .on('presence', { event: 'leave' }, ({ leftPresences }) => { ... })
  // Session state changes (teacher advancing questions)
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions' }, (payload) => { ... })
  // New answers for leaderboard
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'answers' }, (payload) => { ... })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ id, full_name, avatar_url })
    }
  })
```

This pattern ensures:
- No race conditions between multiple channels.
- Clean cleanup via `supabase.removeChannel(channel)` on component unmount.
- Presence state is always consistent via the `sync` event.

---

## 7. UI/UX Design

Both applications share a consistent **dark glassmorphism** design language:

- **Colour Palette**: Deep navy background (`#07070e` / `#08080f`), indigo-purple gradients (`#6366f1` → `#8b5cf6`), accent colours (emerald, cyan, amber) per course.
- **Typography**: Inter font family with weight 800–900 headings and letter-spacing for a premium feel.
- **Glassmorphism**: Cards use `background: rgba(255,255,255,0.025)` with `backdrop-filter: blur()` and subtle `border: 1px solid rgba(255,255,255,0.06)`.
- **Ambient Glow**: Fixed radial-gradient "blob" elements create atmospheric depth behind content.
- **Animations**: Hover transforms (`translateY(-5px)`), gradient text headings, `fadeUp` entry animations on course cards, and a pulsing dot for the live lobby indicator.
- **Sticky Navigation**: Both apps feature a glassmorphic sticky navbar with `backdrop-filter: blur(20px)`.

---

## 8. Deployment

Both applications are deployed on **Vercel** as separate projects:

| Application     | URL                                                                              |
|-----------------|----------------------------------------------------------------------------------|
| Teacher Web App | https://live-classroom-and-quiz-platform-teacher-web.vercel.app/                 |
| Student Web App | https://live-classroom-and-quiz-platform-student-web.vercel.app/                 |

### Environment Variables

**Teacher App** (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
GMAIL_USER
GMAIL_APP_PASSWORD
NEXT_PUBLIC_STUDENT_APP_URL
```

**Student App** (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_VAPID_KEY
```

---

## 9. Challenges and Solutions

| Challenge | Solution |
|-----------|----------|
| **Multi-domain Supabase Auth**: Both apps on different Vercel domains caused auth session issues | Configured both deployment URLs as allowed redirect URIs in Supabase; used `@supabase/ssr` middleware for server-side cookie management |
| **Hardcoded localhost in email links**: Notification emails linked to localhost in production | Added `NEXT_PUBLIC_STUDENT_APP_URL` environment variable to dynamically resolve the correct student app URL |
| **Realtime race conditions**: Multiple Supabase channels caused presence and state sync issues | Consolidated all realtime subscriptions (presence + postgres changes) into a single channel per session room |
| **FCM token persistence**: Students' push tokens weren't being saved reliably | Added explicit `fcm_token` update on successful permission grant in `PushNotificationManager` |
| **RLS policy conflicts**: Row-Level Security blocked cross-role data reads | Designed RLS policies carefully — students can read courses they're enrolled in; teachers can only read their own courses; service role key used for admin email operations |
| **Timer synchronisation**: Per-question countdown timer needed to reset when teacher advances | Used `useEffect` with `session.current_question_index` and `session.status` as dependencies to reactively reset timer state |
| **Auto-submit on timeout**: Preventing duplicate submissions if student was fast | Added `alreadyAnswered` check in `handleTimeout` before submitting |

---

## 10. Testing

### 10.1 Manual Testing Scenarios

| Test Case | Result |
|-----------|--------|
| Teacher signs up and is assigned `role: teacher` | ✅ Pass |
| Student attempting to log in to teacher app is denied | ✅ Pass |
| Teacher creates a course and it appears on dashboard | ✅ Pass |
| Quiz builder saves MCQ, True/False, and Short Answer questions | ✅ Pass |
| Teacher launches a session and session appears as `waiting` | ✅ Pass |
| Student joins session URL and appears in lobby presence list | ✅ Pass |
| Teacher advances to question — students see it in real-time | ✅ Pass |
| Student answers MCQ — answer is saved and locked | ✅ Pass |
| Timer counts down and auto-submits on zero | ✅ Pass |
| Leaderboard updates in real-time as students answer | ✅ Pass |
| Teacher ends session — students see final results | ✅ Pass |
| Push notification delivered when quiz launches | ✅ Pass |
| Email notification received with correct student app URL | ✅ Pass |
| Student enrolls in a course using course ID | ✅ Pass |
| Profile avatar renders in lobby and nav | ✅ Pass |

---

## 11. Division of Work Summary

### Muhammad Maaz (24K-0968) — Student Web App

- Designed and built all pages of the **student-web-app**:
  - Login / Sign-up page
  - Profile setup with avatar upload
  - Enrolled courses dashboard with animated cards
  - Course enrollment by ID page
  - Live quiz session page (the most complex component)
  - Progress / history tracking page
- Implemented **Supabase Realtime** combining Presence + Postgres Changes in a single channel.
- Built the **live leaderboard** with real-time score computation.
- Implemented the **countdown timer** with auto-submit on timeout.
- Integrated **Firebase Client SDK** for push notification registration (`PushNotificationManager`).
- Designed the shared dark glassmorphism UI design language.
- Configured and deployed the student app to **Vercel**.
- Fixed multi-domain Supabase authentication issues.

### Sharjeel Ahmed (24K-0724) — Teacher Web App

- Designed and built all pages of the **teacher-web-app**:
  - Login / Sign-up page
  - Courses dashboard with stats bar
  - New course creation form
  - Course detail page (quiz list)
  - Quiz builder with multi-type question support
  - Sessions list + launch interface
  - Live teacher session control panel (advance questions, end session)
- Implemented the `/api/notify-quiz` **server-side API Route** for dual-channel notifications:
  - **Firebase Cloud Messaging** (Admin SDK) for push notifications
  - **Nodemailer + Gmail SMTP** for email notifications (BCC)
- Configured **Firebase Admin SDK** (`firebase-admin`) for server-side use.
- Designed and enforced **Supabase RLS policies** for the shared database.
- Configured and deployed the teacher app to **Vercel**.
- Fixed environment variable for production student app URL in email links.

---

## 12. Conclusion

The **Live Classroom and Quiz Platform** was successfully built and deployed as a full-stack, real-time web application. All proposed features were implemented and are working in production:

- ✅ Dual-application architecture (teacher + student) with shared Supabase backend
- ✅ Role-based authentication and access control
- ✅ Course management and multi-type quiz builder
- ✅ Real-time live quiz sessions with question control
- ✅ Live leaderboard with per-question scoring
- ✅ Countdown timers with automatic submission
- ✅ Presence tracking in the lobby
- ✅ Firebase Cloud Messaging push notifications
- ✅ Email notifications via Gmail/Nodemailer
- ✅ Student performance progress tracking
- ✅ Premium dark glassmorphism UI deployed on Vercel

This project demonstrates practical application of modern full-stack web development, real-time communication, multi-service integration, and cloud deployment — delivering a platform that is both technically sophisticated and genuinely useful for education.

---

## 13. References

1. [Next.js Documentation](https://nextjs.org/docs) — App Router, Server Components, API Routes
2. [Supabase Documentation](https://supabase.com/docs) — Auth, Realtime, PostgreSQL RLS
3. [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging) — Push Notifications
4. [Nodemailer Documentation](https://nodemailer.com/about/) — Email Transport
5. [Vercel Documentation](https://vercel.com/docs) — Deployment, Environment Variables
6. [@supabase/ssr](https://supabase.com/docs/guides/auth/server-side/nextjs) — Server-Side Auth with Next.js

---

*Submitted by Muhammad Maaz (24K-0968) and Sharjeel Ahmed (24K-0724)*  
*Live Classroom and Quiz Platform — ClassHub*  
*May 10, 2026*
