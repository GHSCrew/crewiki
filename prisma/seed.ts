import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hash } from "bcryptjs";
import path from "node:path";

const adapter = new PrismaBetterSqlite3({ url: path.join(process.cwd(), "prisma/dev.db") });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.editSuggestion.deleteMany(),
    prisma.lineComment.deleteMany(),
    prisma.pageVersion.deleteMany(),
    prisma.teamMember.deleteMany(),
    prisma.wikiPage.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const defaultPassword = await hash("password123", 12);

  const [coach, captain, athlete1, athlete2, admin] = await Promise.all([
    prisma.user.create({ data: { id: "u1", name: "Coach Rivera", email: "coach@crew.edu", passwordHash: defaultPassword, role: "coach", joinedAt: "2024-09-01" } }),
    prisma.user.create({ data: { id: "u2", name: "Alex Chen", email: "alex@crew.edu", passwordHash: defaultPassword, role: "captain", joinedAt: "2024-09-01" } }),
    prisma.user.create({ data: { id: "u3", name: "Sam Park", email: "sam@crew.edu", passwordHash: defaultPassword, role: "athlete", joinedAt: "2024-09-05" } }),
    prisma.user.create({ data: { id: "u4", name: "Jordan Lee", email: "jordan@crew.edu", passwordHash: defaultPassword, role: "athlete", joinedAt: "2024-09-05" } }),
    prisma.user.create({ data: { id: "u5", name: "Admin User", email: "admin@crew.edu", passwordHash: defaultPassword, role: "admin", joinedAt: "2024-08-01" } }),
  ]);

  const pages = await Promise.all([
    prisma.wikiPage.create({ data: {
      id: "p1", slug: "catch-drive-finish-recovery", title: "Catch, Drive, Finish & Recovery",
      folder: "Techniques", authorId: coach.id, authorName: coach.name,
      createdAt: "2025-01-10", updatedAt: "2025-03-15", version: 4,
      youtubeLinks: JSON.stringify(["https://www.youtube.com/watch?v=dQw4w9WgXcQ"]),
      content: `# Catch, Drive, Finish & Recovery

The rowing stroke is divided into four phases. Mastering each phase is the foundation of efficient, powerful rowing.

## The Catch

The catch is the moment the blade enters the water. It should be quick, clean, and at full compression.

**Key points:**
- Shins vertical or slightly past vertical
- Arms extended, body leaned forward at the hips (11 o'clock position)
- Blade square and ready before contact
- Do not "row it in" — the blade should enter by dropping, not scooping

**Common mistakes:** Rushing the slide, not reaching fully, blades entering at an angle.

## The Drive

The drive converts leg power into boat speed. Initiate with the legs, not the arms.

**Sequence:**
1. Press through the footboard with both feet
2. Maintain arm extension and body angle until legs are 3/4 pressed
3. Open the body (swing from 11 to 1 o'clock)
4. Draw the handle to the lower ribs with arms last

**Key concept:** The legs, back, and arms fire in sequence — not simultaneously.

## The Finish

The finish is the extraction of the blade from the water.

**Key points:**
- Handle drawn to lower chest/abdomen
- Elbows past the body, shoulders relaxed
- Tap down to extract the blade cleanly before feathering
- Avoid "washing out" (blade coming out too early)

## The Recovery

The recovery is the sequence back to the catch position.

**Sequence:**
1. Hands away first (arms extend)
2. Body rocks forward to 11 o'clock
3. Slide moves forward only after hands pass the knees

**Critical rule:** Hands → Body → Slide. Reversing this order collapses the recovery and rushes the slide.`,
    }}),
    prisma.wikiPage.create({ data: {
      id: "p2", slug: "oarloading-and-strapping", title: "Oarloading & Strapping",
      folder: "Techniques", authorId: coach.id, authorName: coach.name,
      createdAt: "2025-01-15", updatedAt: "2025-02-20", version: 2,
      youtubeLinks: JSON.stringify([]),
      content: `# Oarloading & Strapping

## What Is Oarloading?

Oarloading refers to how much force the rower applies against the oar during the drive. A well-loaded oar bends visibly under pressure — this is normal and expected with modern composite oars.

**Strict oarloading** means maintaining consistent, heavy pressure throughout the entire drive phase — from the catch all the way to the finish. Many rowers drop load in the middle of the drive as they transition from legs to back; strict oarloading eliminates this.

## The Strapping Concept

Strapping (also called "hanging") is the technique of using body weight against the pin through the footboard and oar. Instead of muscling the handle, you suspend your weight between the footboard and the handle.

**How to strap in:**
1. At the catch, feel your hamstrings loaded against the footboard
2. Think of pushing the foot stretcher away from the pin, not pulling the handle toward you
3. Maintain connection through the handle — do not let the load escape at the finish

## Drills for Oarloading

- **Pause drill at the catch**: Hold for 2 counts before driving. Encourages deliberate, loaded entry.
- **Eyes closed rowing**: Forces rowers to feel the load rather than see it.
- **Ratio work**: Slow the recovery to feel the contrast between a patient recovery and a loaded drive.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Shooting the slide | Arms and back engage before legs | Arms straight, body still at catch |
| Mid-drive drop | Body opens too early | Maintain body angle until legs are 3/4 pressed |
| Washing out | Loss of pressure at finish | Think "hang" through the finish |`,
    }}),
    prisma.wikiPage.create({ data: {
      id: "p3", slug: "erg-technique-guide", title: "Erg Technique Guide",
      folder: "Training", authorId: captain.id, authorName: captain.name,
      createdAt: "2025-01-20", updatedAt: "2025-04-01", version: 3,
      youtubeLinks: JSON.stringify(["https://www.youtube.com/watch?v=example1"]),
      content: `# Erg Technique Guide

## Setting Up the Erg

Before rowing, set the damper and footboard correctly.

**Damper setting:** Most rowers use 3–5. A higher damper is heavier but does not translate directly to boat speed. Set it to what allows you to maintain good technique at race pace.

**Footboard height:** Heels should be able to drop slightly below the toes at the catch. Adjust until shins are vertical at full compression.

## Stroke Rate and Split

- **Light work / technique:** Rate 18–22
- **Steady state:** Rate 20–24
- **Race pieces:** Rate 26–32+

Your split (time per 500m) is the primary metric on the erg. Focus on consistency — avoid going out too hard and fading.

## Technique Points

On the erg, the drive sequence is identical to on-water rowing: legs → body → arms.

**Common erg errors:**
- Hunching over on the recovery
- Over-compressing (shins past vertical at the catch)
- Jerking the chain at the catch instead of smooth acceleration
- Not finishing through — handle should reach the abdomen

## Monitoring Your Data

The PM5 monitor tracks split, stroke rate, watts, and 500m pace. Review your stroke rate vs. split relationship to find your optimal ratio.`,
    }}),
    prisma.wikiPage.create({ data: {
      id: "p4", slug: "guide-to-rigging", title: "Guide to Rigging",
      folder: "Equipment", authorId: coach.id, authorName: coach.name,
      createdAt: "2025-01-08", updatedAt: "2025-01-08", version: 1,
      youtubeLinks: JSON.stringify([]),
      content: `# Guide to Rigging

## Pre-Row Rigging Checklist

Always complete this checklist before launching.

- [ ] Riggers tight on hull — no movement when wiggled
- [ ] Oarlock pin secure, collar tight
- [ ] Oarlock gate closed and locking nut on
- [ ] Foot stretcher bolts tight
- [ ] Seat wheels roll freely on track
- [ ] Shoe lacing tight and quick-release functional
- [ ] Hull visually inspected for damage

## Key Measurements

**Span / Spread:** Distance from centerline to pin. Sweep: 86cm typical. Sculling: 160cm (center-to-center).

**Outboard / Inboard:** Oar inboard measured from collar to handle end. Affects leverage ratio.

**Height:** Pin height above seat top at finish position. Affects layback range and catch angle.

**Pitch:** Angle of the pin from vertical. Typically 4–6° toward stern. Affects blade depth.

## Adjusting the Foot Stretcher

Move stretcher toward the bow to shorten effective slide and reduce layback. Move toward stern for more reach. As a starting point, shins should be vertical (or just past) at full compression.

## Torque Specs

- Rigger bolts: 20–25 Nm (snug + 1/4 turn with wrench)
- Oarlock pin nut: hand-tight + lock nut snugged
- Never overtighten carbon hulls`,
    }}),
    prisma.wikiPage.create({ data: {
      id: "p5", slug: "coxswain-fundamentals", title: "Coxswain Fundamentals",
      folder: "Coxswain", authorId: coach.id, authorName: coach.name,
      createdAt: "2025-02-01", updatedAt: "2025-04-10", version: 5,
      youtubeLinks: JSON.stringify(["https://www.youtube.com/watch?v=cox_example"]),
      content: `# Coxswain Fundamentals

## Role Overview

The coxswain (cox) is the on-water coach, navigator, and motivator. They are the only person in the boat facing the direction of travel and the only one with an unobstructed view of the crew.

## Core Responsibilities

1. **Steering** — Keep the boat on course with minimal rudder input
2. **Rate calling** — Monitor and call the stroke rate
3. **Technical feedback** — Identify and correct errors in real time
4. **Race strategy** — Execute the race plan as drilled
5. **Safety** — Final authority on safety calls on the water

## The Call Structure

Good calls follow a pattern: **observation → instruction → timing**.

> "Bow four — you're rushing the last foot of the slide — lengthen into the next five strokes."

## Steering Principles

- Look at a fixed landmark 500m+ ahead, not at the immediate water
- Make small corrections early rather than large corrections after drifting
- Use power differential calls before the rudder (saves drag)
- Fish-tailing is slower — every correction creates drag

## Common Mistakes

See [[Common Coxswain Mistakes]] for a full breakdown.`,
    }}),
  ]);

  await Promise.all([
    prisma.pageVersion.create({ data: { id: "v1", pageId: "p1", content: "# Catch, Drive, Finish & Recovery\n\nInitial draft.", authorId: coach.id, authorName: coach.name, authorRole: "coach", message: "Initial draft", createdAt: "2025-01-10", version: 1 } }),
    prisma.pageVersion.create({ data: { id: "v2", pageId: "p1", content: "# Catch, Drive, Finish & Recovery\n\nAdded catch section.", authorId: coach.id, authorName: coach.name, authorRole: "coach", message: "Added catch and drive sections", createdAt: "2025-02-01", version: 2 } }),
    prisma.pageVersion.create({ data: { id: "v3", pageId: "p1", content: "# Catch, Drive, Finish & Recovery\n\nExpanded finish section.", authorId: captain.id, authorName: captain.name, authorRole: "captain", message: "Expanded finish and recovery from practice notes", createdAt: "2025-02-28", version: 3 } }),
  ]);

  await Promise.all([
    prisma.editSuggestion.create({ data: {
      id: "s1", pageId: "p1", pageTitle: "Catch, Drive, Finish & Recovery", pageSlug: "catch-drive-finish-recovery",
      authorId: athlete1.id, authorName: athlete1.name, authorRole: "athlete",
      originalContent: "Shins vertical or slightly past vertical",
      suggestedContent: "Shins vertical or slightly past vertical — aim for the shin to be perpendicular to the water surface at maximum compression",
      message: "Coach mentioned this in practice on Tuesday — wanted to add the perpendicular cue since it clicked for a lot of us.",
      status: "open", lineStart: 11, lineEnd: 11, createdAt: "2025-05-10",
    }}),
    prisma.editSuggestion.create({ data: {
      id: "s2", pageId: "p2", pageTitle: "Oarloading & Strapping", pageSlug: "oarloading-and-strapping",
      authorId: athlete2.id, authorName: athlete2.name, authorRole: "athlete",
      originalContent: "**How to strap in:**\n1. At the catch, feel your hamstrings loaded against the footboard",
      suggestedContent: "**How to strap in:**\n1. At the catch, feel your hamstrings loaded against the footboard\n2. Think of pushing the footboard *away* — not pulling the handle toward you",
      message: "Added a cue that helped me personally during steady state last week.",
      status: "approved", lineStart: 18, lineEnd: 20, createdAt: "2025-05-05",
      reviewedBy: "Coach Rivera", reviewedAt: "2025-05-06", reviewNote: "Good cue — approved and merged.",
    }}),
  ]);

  await Promise.all([
    prisma.lineComment.create({ data: { id: "c1", pageId: "p1", lineNumber: 11, lineContent: "Shins vertical or slightly past vertical", authorId: athlete1.id, authorName: athlete1.name, authorRole: "athlete", body: "Should we add the cue about knee angle here? Coach mentioned 90° is a floor.", createdAt: "2025-05-09", resolved: false } }),
    prisma.lineComment.create({ data: { id: "c2", pageId: "p1", lineNumber: 28, lineContent: "The legs, back, and arms fire in sequence — not simultaneously.", authorId: captain.id, authorName: captain.name, authorRole: "captain", body: "Classic teaching point — maybe link to the drill page for sequencing?", createdAt: "2025-05-11", resolved: true } }),
  ]);

  await Promise.all([
    prisma.notification.create({ data: { id: "n1", userId: coach.id, type: "suggestion_opened", title: "New suggestion on Catch, Drive, Finish & Recovery", body: "Sam Park suggested an edit on line 11.", relatedId: "s1", relatedType: "suggestion", read: false, createdAt: "2025-05-10" } }),
    prisma.notification.create({ data: { id: "n2", userId: athlete1.id, type: "suggestion_approved", title: "Your suggestion was approved!", body: "Coach Rivera approved your suggestion on Oarloading & Strapping.", relatedId: "s2", relatedType: "suggestion", read: true, createdAt: "2025-05-06" } }),
  ]);

  await Promise.all([
    prisma.teamMember.create({ data: { id: "tm1", userId: captain.id, name: captain.name, role: "captain", boatClass: "8+", seat: "Stroke", side: "starboard", email: captain.email, registeredAt: "2024-09-01" } }),
    prisma.teamMember.create({ data: { id: "tm2", userId: athlete1.id, name: athlete1.name, role: "athlete", boatClass: "8+", seat: "7", side: "port", email: athlete1.email, registeredAt: "2024-09-05" } }),
    prisma.teamMember.create({ data: { id: "tm3", userId: athlete2.id, name: athlete2.name, role: "athlete", boatClass: "8+", seat: "6", side: "starboard", email: athlete2.email, registeredAt: "2024-09-05" } }),
    prisma.teamMember.create({ data: { id: "tm4", name: "Casey Morgan", role: "athlete", boatClass: "4+", seat: "Cox", side: "cox", registeredAt: "2024-09-10" } }),
  ]);

  console.log("Seeded database successfully.");
  console.log("Default password for all accounts: password123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
