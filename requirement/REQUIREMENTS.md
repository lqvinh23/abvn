# PRD & SYSTEM ARCHITECTURE: A BETTER VIETNAM WEBSITE

## 1. PROJECT OVERVIEW
* **Project Name:** A Better Vietnam (ABVN) Website
* **Target Audience:** 
  * Vietnamese students (aged 16-25) from disadvantaged backgrounds.
  * Retired foreign volunteer teachers (requiring a highly intuitive, high-contrast, minimalist UI).
  * System Administrators.
* **Core Mission:** Provide free English education through an automated, reliable, and highly accessible scheduling and feedback system.

---

## 2. SYSTEM ARCHITECTURE & TECH STACK
To build a professional, scalable, and secure platform, the following modern tech stack is recommended:

### Frontend
* **Framework:** **Next.js 14+ (App Router)** - Excellent for SEO (Landing Page) via SSR, and dynamic dashboard performance via CSR.
* **Styling:** **Tailwind CSS + shadcn/ui** - Minimalist, highly accessible design system with built-in dark/light contrast optimization.

### Backend & Database
* **Backend Framework:** **Next.js Route Handlers (Serverless)** or **Node.js (NestJS)** if complex real-time background jobs are required.
* **Database:** **PostgreSQL** (Managed via **Supabase** or **Neon**) - Highly reliable relational data for complex schedules, relationships, and user roles.
* **Authentication:** **NextAuth.js (Auth.js)** or **Supabase Auth** - Native integration for Google OAuth 2.0.

### Infrastructure & Services
* **Hosting/Server:** **Vercel** (Frontend & Serverless functions) or **AWS Amplify**.
* **Storage (Cloud):** **Supabase Storage** or **AWS S3** (for profile pictures, educational resources, and news media).
* **Notifications:** **Resend** or **SendGrid** (automated email alerts for class schedules and recruitment updates).

---

## 3. FULL PRODUCT REQUIREMENTS (PRD)

### 3.1. Landing Page (Public Access)
* **Design Philosophy:** Minimalist, generous whitespace, large readable typography (minimum 16px for body text to accommodate senior teachers).
* **Navigation Tabs:**
  1. **Home:** High-impact hero section, mission statement, clear Call-to-Actions (CTAs).
  2. **About Us:** History, impact statistics, core team information.
  3. **News:** Blog engine for project updates, events, and student stories.
  4. **Our Volunteer Teachers:** Public grid showcasing active foreign educators.
  5. **Become a Teacher:** Application form for international volunteers (Includes resume/certification upload, availability overview).
  6. **Become a Student:** Application form for Vietnamese youths (Includes background assessment, income status verification file upload, English proficiency level).
  7. **Login/Signup:** Seamless Google Account OAuth integration.

### 3.2. Role-Based Dashboards & Features

#### A. Volunteer Teacher Dashboard
* **Profile Management:** Edit biography, upload profile picture, specify teaching preferences.
* **Schedule Logging (Availability):** Time-zone aware calendar interface (crucial for international teachers). Teachers open slots in their local time zone; the system automatically converts it to Vietnam Time (ICT) for students.
* **Classroom Access:** Integration links for teaching platforms (Zoom, Google Meet, or Skype).
* **Post-Class Feedback:** Submit attendance and quick performance remarks for the student.
* **Received Feedbacks:** View encouraging messages or constructive notes sent by students.

#### B. Student Dashboard
* **Profile Management:** Basic information display, tracker for completed learning hours.
* **Class Booking:** Interactive list or calendar view of available slots opened by teachers. One-click booking with auto-cancellation rules (e.g., cannot cancel within 12 hours of the class).
* **Post-Class Feedback:** Rate the lesson and leave thank-you notes/feedback for the teacher.
* **Academic Review:** View historical progress notes and feedback received from all teachers.

#### C. Administrator Dashboard (Superuser)
* **User Management:** Standard CRUD operations for Students and Teachers. Verification queue to approve or suspend accounts.
* **Recruitment Pipeline:** Review pipeline for "Become a Teacher" and "Become a Student" applications. Accept/Reject actions with automated email templates.
* **Content Management (CMS):** Create, update, or delete blog entries under News, change impact metrics, update text content on the landing page.
* **Class Audit:** Monitor active schedules, booking rates, and resolve class disputes or absences.
* **Global Configurations:** Manage system parameters, update Terms of Service, Privacy Policies, and automated email rules.

---

## 4. DATABASE SCHEMA DESIGN (ENTITY RELATIONSHIP RELATION)
```
- Users (id, email, name, role [student, teacher, admin], avatar_url, created_at)
- TeacherProfiles (id, user_id FK, bio, country, time_zone, status [pending, approved, suspended])
- StudentProfiles (id, user_id FK, birth_date, background_info, proficiency_level, status)
- Slots (id, teacher_id FK, start_time [UTC], end_time [UTC], status [available, booked, completed, cancelled])
- Bookings (id, slot_id FK, student_id FK, meet_link, created_at)
- Feedbacks (id, booking_id FK, sender_role [teacher, student], rating, comment, created_at)
- News (id, title, slug, content, banner_url, author_id FK, created_at)
- Applications (id, full_name, email, application_type [teacher, student], raw_data [JSONB], status [pending, approved, rejected])
```

---

## 5. VS CODE COPILOT PROMPTS FOR STEP-BY-STEP DEVELOPMENT

### Prompt 1: Initializing Project Structure & Database Schema
```text
Act as a Senior Full-Stack Engineer. I am building a website for "A Better Vietnam" (ABVN), a non-profit project that provides free English lessons to disadvantaged Vietnamese youths using retired foreign volunteer teachers. We are using Next.js 14 (App Router), Tailwind CSS, shadcn/ui, and Prisma with PostgreSQL. 

Please generate:
1. A clean, modular file structure optimized for Next.js App Router.
2. A complete Prisma schema matching our requirement entities: User (roles: admin, teacher, student), TeacherProfile, StudentProfile, Slot (for calendar scheduling), Booking, Feedback, News, and Application. Ensure appropriate foreign keys and relations are declared cleanly.
```

### Prompt 2: Authentication & Protected Role-Based Routing
```text
Using NextAuth.js (Auth.js) with the Google Provider and Prisma Adapter, implement a complete authentication system. 

Requirements:
1. When a user logs in via Google for the first time, their account should default to a public status without a specific dashboard role.
2. If their User.role is 'teacher', protect and safely redirect them to `/dashboard/teacher`. If 'student', redirect to `/dashboard/student`. If 'admin', redirect to `/dashboard/admin`.
3. Provide the full code for a custom middleware handling this role-based edge redirection, alongside custom session callback extensions to include the `role` inside the session token.
```

### Prompt 3: Timezone-Aware Schedule Calendar for Senior Teachers
```text
I need to build the Slot Management component for the Volunteer Teacher dashboard using Tailwind CSS and shadcn/ui. 
The users are mostly retired individuals, so the UI must be exceptionally clean, intuitive, and high contrast. 

Please write a React component (Next.js client component) that:
1. Displays a Weekly Grid view where teachers can select slots they are available to teach.
2. Explicitly uses the teacher's native local time zone via `luxon` or `date-fns-tz`, but saves the timestamps cleanly into the backend database as UTC ISO strings.
3. Includes an elegant visual confirmation modal that states exactly what dates and times are being uploaded to reduce cognitive load.
```

### Prompt 4: Student Booking Component with Automated Conflict Validation
```text
Write a Next.js Server Action and a Frontend booking button component for the Student Dashboard.
When a student clicks "Book Class" on an open teacher slot:
1. Verify via database transaction that the Slot status is still 'available'.
2. Verify that the student does not have any conflicting bookings at that same time.
3. Update Slot status to 'booked', create a new row in the Booking table, and generate a dynamic Google Meet or placeholder video link.
4. Return clear error/success toasts using shadcn/ui components. Use high-quality concurrent safety mechanisms (Prisma transaction isolation).
```

### Prompt 5: Admin Application Verification Dashboard
```text
Create an analytical, elegant dashboard view for the Admin panel (`/dashboard/admin/applications`). 
1. Build a shadcn/ui Data Table that lists all pending applications (both student and teacher types).
2. The table must support server-side pagination, sorting, and filtration by type ('teacher' vs 'student').
3. When clicking a row, open a detailed sheet or side-drawer showing the application's JSON metadata (resume links, background descriptions).
4. Provide action hooks ("Approve" / "Reject") that hit a Next.js Server Action to update the status and trigger a mock automated email notification.
```
