# Presento Session Manager

Build a modern web application called **Presento**.

Presento is a Student Presentation Management System developed specifically for educational institutions to manage daily classroom presentations.

This application should **not** look like a generic AI-generated dashboard or SaaS template. It should feel like a real software application built for colleges and used by teachers every day.

Keep the design clean, minimal, practical and focused. Only implement the features mentioned below. Do not add unnecessary dashboards, analytics, widgets, charts, notifications or extra pages.

---

# Technology Stack

Frontend

- Next.js (App Router)

- React

- TypeScript

- Tailwind CSS

- shadcn/ui

- Framer Motion

- Lucide React Icons

Backend

- Next.js API Routes

- Prisma ORM

- PostgreSQL

Deploy on Vercel.

---

# APPLICATION STRUCTURE

The project should contain only **two separate applications**.

## 1. Main Application

Used daily in classrooms.

## 2. Admin Panel

Used only by administrators.

The Admin Panel must be completely separate from the Main Application.

There should be no button or link inside the Main Application that opens the Admin Panel.

The Admin Panel should have its own route and login page.

Use an environment variable for the admin password.
---

# DESIGN STYLE

The application should look like custom-built software for a college, not an AI-generated dashboard.

Avoid

- Fancy SaaS dashboards

- Large sidebars with many menu items

- Glassmorphism everywhere

- Huge gradients

- Flashy animations

- Lots of statistic cards

- Unnecessary charts

- Generic widgets

Use a clean light theme.

Background

#F7F8FA

Cards

White

Primary Accent

#2563EB

Secondary Accent

#14B8A6

Borders

#E5E7EB

Primary Text

#111827

Secondary Text

#6B7280

Use

- Clean spacing

- Soft shadows

- Rounded corners

- Professional typography

- Simple transitions

Less is more.

---

# MAIN APPLICATION

The Main Application is used only to conduct classroom presentation sessions.

Keep it extremely simple.

The homepage should NOT immediately show the wheel.

Instead, it should display today's presentation session.

Automatically determine the current session using the uploaded timetable and the current system date and time.

Display

- Current Date

- Current Day

- Current Time

- Current Period

- Subject

- Teacher

- Department

- Semester

- Section

If there is no active class,

display

"No active presentation session."

or

"Next class starts at..."

The homepage should contain one primary action:

**Start Presentation Session**

No unnecessary dashboard cards or analytics should be shown.

---

# PRESENTATION SESSION

Clicking **Start Presentation Session** opens the Presentation Session page.

At the top of the page display

- Current Date

- Current Day

- Current Period

- Subject

- Teacher

- Department

- Semester

- Section

The teacher should first enter the absent roll numbers.

Example

4, 8, 17, 29

After confirming,

those students become unavailable for that session.

Then enable the Presentation Wheel.

The Presentation Session page should contain

- Session Information

- Absent Roll Number Input

- Open Presentation Wheel

- Remaining Students Count

- Current Presentation Cycle

---

# PRESENTATION WHEEL

The wheel should display only Roll Numbers **1–55**.

Do not display student names on the wheel.

The wheel should have four states.

Available

- Normal

Selected

- Highlighted

Presented

- Grey

- Crossed Out

- Disabled

Absent

- Red

- Crossed Out

- Disabled

After a roll number is selected,

retrieve the student's information from the uploaded Excel file and display

- Student Name

- Roll Number

- Presentation Topic

- Student Photo (if available)

After the presentation,

that roll number should immediately become unavailable.

Continue until every available student has presented.

The wheel should remember selected students across multiple days.

Only after every eligible student has presented should a new presentation cycle automatically begin.

---

# PRESENTATION SCREEN

After the wheel lands,

show a clean fullscreen presentation screen.

Display

- Large Student Name

- Large Roll Number

- Presentation Topic

- Student Photo

- Subject

- Teacher

- Current Period

- Current Date

- Large Two-Minute Countdown Timer

This screen should be easy to read from the back of a classroom.

---

# REVIEW

When the timer finishes,

display a simple review form.

Fields

- Teacher Review

- Overall Rating

- Require Re-Presentation (Yes / No)

If Re-Presentation is selected,

the student should be added to the Re-Presentation Queue.

Do not overwrite the original presentation history.

---

# RE-PRESENTATION

Students marked for re-presentation should not immediately return to the wheel.

After every student has completed their first presentation,

the wheel should begin selecting students from the Re-Presentation Queue.

Keep both the original presentation and the re-presentation records.

---

# ADMIN PANEL

The Admin Panel is completely separate and password protected.

Administrators can

- Upload an Excel file containing Student Name, Roll Number, Presentation Topic and Student Photo (optional)

- Manage students

- Manage teachers

- Manage departments

- Manage subjects

- Manage timetable

- Manage presentation cycles

- Manage the Re-Presentation Queue

- Reset presentation cycles

- Force the next roll number

- Update or replace the Excel file

- Configure period timings

The administrator can force the next student.

Even when a student is forced, the wheel should still spin normally so the result appears random.

---

# TIMETABLE

The administrator uploads or configures the timetable.

Each timetable entry contains

- Day

- Period

- Start Time

- End Time

- Subject

- Teacher

- Department

- Semester

- Section

The Main Application should automatically determine the current class based on the timetable and system time.

Teachers should never manually select the current period.

---

# COMPONENTS

Create reusable components.

Examples

- Presentation Wheel

- Presentation Card

- Countdown Timer

- Review Form

- Excel Upload

- Timetable Management

- Student Table

- Dialogs

- Forms

- Buttons

Keep the component architecture clean and modular.

---

# RESPONSIVENESS

The application should work well on

- Desktop

- Laptop

- Tablet

The Presentation Screen should also be suitable for classroom projectors.

---

# ANIMATIONS

Keep animations subtle.

Use

- Fade transitions

- Smooth scaling

- Wheel spin animation

- Timer animation

Avoid flashy effects.

---

# BACKEND

After the frontend is complete,

implement the backend using

- Next.js API Routes

- Prisma ORM

- PostgreSQL

Support

- Excel upload

- Student data storage

- Timetable management

- Presentation cycle tracking

- Wheel logic

- Re-presentation queue

- Teacher reviews

- Presentation history

---

# CODING STYLE

- Write clean, modular and reusable code.

- Use TypeScript best practices.

- Keep the folder structure organised.

- Avoid unnecessary dependencies.

- Focus on maintainability.

---

# IMPORTANT

Build a simple, focused application that solves one problem well.

Do not add extra features beyond the requirements.

The application should feel like real internal software developed specifically for a college, not a generic AI-generated project.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/27d8d13d-f637-4946-9cee-117d144173bc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
