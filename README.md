# CrewWiki — Team Knowledge Base

A Next.js interactive wiki for rowing teams. Combines features of GitHub (PRs, blame, history) with Obsidian (linked knowledge base).

## Quick Start

```bash
npm install
npm run dev
```

Then open http://localhost:3000

## Demo Accounts

| Name | Email | Role | Access |
|------|-------|------|--------|
| Coach Rivera | coach@crew.edu | Coach | Edit pages, approve suggestions |
| Alex Chen | alex@crew.edu | Captain | Edit pages, approve suggestions |
| Sam Park | sam@crew.edu | Athlete | Read + suggest edits |
| Jordan Lee | jordan@crew.edu | Athlete | Read + suggest edits |
| Admin User | admin@crew.edu | Admin | Full access |

Any password works in demo mode.

## Features

### 🔐 Auth & Roles
- Login page with demo account selector
- Role-based access: Admin > Coach/Captain > Athlete
- Coaches/Captains get full edit access; Athletes submit suggestions for review

### 📖 Wiki Pages
- Line-numbered view — click any line number to comment inline
- Git blame tab — see who wrote which lines
- Version history — full commit log
- Edit tab (coaches) — markdown editor with commit message
- Suggest tab (athletes) — proposes changes for review

### ✏️ Suggestions System (like GitHub PRs)
- Athletes submit full-page edit suggestions with a message
- Coaches see a diff (original vs. suggested) side by side
- Actions: Approve, Merge, Reject with a review note
- Notifications sent automatically

### 🔔 Notifications
- Triggered by: new suggestions, approvals, rejections, assignments
- Unread badge on sidebar
- Mark individual or all as read

### 📋 Assignments
- Coaches post erg workouts, videos, readings
- Links to Google Classroom and YouTube
- Filtered by role (athletes only see their assignments)

### ⛵ Team Roster
- Grouped by boat class
- Register new members with boat, seat, and side
- Role badges

### ⚙️ Admin Panel
- User role management (change roles via dropdown)
- Page inventory with version info
- Google Docs permission overview (Editor/Viewer by role)

## Deployment (Vercel)

1. Push to GitHub
2. Import to Vercel
3. Set environment variables (see .env.example)
4. Deploy

## Tech Stack
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Zustand (state management)
- DM Serif Display + DM Sans + DM Mono (fonts)
