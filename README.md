# CrewWiki

A private knowledge base for rowing teams. Coaches and captains edit pages directly; athletes read and propose changes that go through a review process. Everything lives in a SQLite database — no external services required.

## Quick start

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 and log in as `coach` / `coach`.

## Default account

After a fresh install (or factory reset), one account exists:

| Username | Password | Role |
|----------|----------|------|
| `coach`  | `coach`  | Coach |

The coach can register more members from the Team Roster page or approve self-signups from the pending queue.

## Roles

| Role | What they can do |
|------|-----------------|
| **Coach** | Everything — edit pages, manage roles, approve/reject suggestions and file requests, access admin panel and factory reset |
| **Captain** | Edit pages, approve/reject suggestions and file requests, access admin panel (not factory reset) |
| **Athlete** | Read pages, propose edit suggestions, submit file requests |

## Features

### Auth
- Username + password login (bcrypt, no email required)
- Self-signup flow: new accounts start as **pending** and must be activated by a coach or captain from the Team Roster page
- Change display name, username, and password from Settings

### Wiki pages
- Markdown editor with live preview (coaches and captains)
- **Read** — line-numbered view; click any line number to leave an inline comment
- **Edit** — full markdown editor with a commit message; saves a new version
- **Suggest** — athletes submit a full-page edit proposal; coaches/captains see a side-by-side diff and can approve, merge, or reject it with a review note
- **Blame** — each line attributed to the version that introduced it, computed from full diff history
- **History** — complete version log with author and message
- **Manage** — rename the article, move it to another folder, or delete it

### Folders
- Pages are organised into folders; folder pages list all articles inside
- Rename a folder inline (renames all pages inside it recursively, including subfolders)

### Suggestions & file requests
- Edit suggestions show original vs. proposed content side by side
- File requests cover page creation, deletion, and folder moves submitted by athletes
- Both support an optional review note when approving or rejecting
- Notifications are triggered automatically for the relevant parties

### Notifications
- Bell icon in the sidebar with an unread count badge
- Mark individual notifications or all at once as read

### Team roster
- Members grouped by role (Coach / Captain / Athlete)
- Coaches/captains can register members directly (creates a matching user account with the username as the default password)
- Pending self-signups appear in a queue at the top — activate or reject with a confirmation dialog
- Removing a member from the roster also removes them from the admin Users & Roles panel

### Admin panel (Coach and Captain)
- **Users & Roles** — change any member's role via dropdown
- **Pages** — full inventory of wiki pages with version, author, and last-updated date

### Factory reset (Coach only)
- **Content Reset** — deletes all wiki pages, suggestions, file requests, comments, and page history; user accounts and the roster are preserved
- **Factory Reset** — wipes everything and recreates the single `coach / coach` account; logs you out immediately

## Tech stack

| Layer | Library |
|-------|---------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | SQLite via Prisma 7 + better-sqlite3 |
| Auth | bcryptjs (username + password, stored in DB) |
| State | Zustand 5 |
| Editor | @uiw/react-md-editor |
| Diff | diff + react-diff-viewer-continued |
| Styling | Tailwind CSS 4 + inline styles |
| Fonts | DM Serif Display, DM Sans, DM Mono |

## Scripts

```bash
pnpm dev          # start dev server
pnpm build        # production build
pnpm db:migrate   # run pending Prisma migrations
pnpm db:seed      # reset DB to a single coach/coach account
```

## Project structure

```
app/
  api/            # Route handlers (auth, pages, suggestions, team, users, admin)
  wiki/           # UI pages (home, content, folder, team, suggestions, notifications, settings, admin)
  login/          # Login / signup page
components/
  layout/         # Sidebar, WikiTopbar, ManageBar
  ConfirmDialog   # Shared confirmation modal
lib/
  auth-context    # React context + localStorage session
  store           # Zustand store (pages, suggestions, comments, notifications)
  prisma          # Prisma client singleton
prisma/
  schema.prisma   # Data model
  seed.ts         # Reset + seed script
types/            # Shared TypeScript interfaces
```
