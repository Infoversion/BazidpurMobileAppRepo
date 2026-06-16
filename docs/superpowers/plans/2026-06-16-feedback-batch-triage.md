# Bazidpur Feedback Batch — Triage & Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address 9 user-reported issues spanning mobile, web, and admin tooling.

**Architecture:** Items are independent and span two repos (`BazidpurMobileApp`, `BazidpurWeb`) plus the shared Supabase schema. Treat each numbered item as its own sub-project; this doc triages them and provides full implementation steps for **Item #2** (web album photo edit parity), the starting item.

**Tech Stack:** Expo SDK 54 / React Native 0.81.5 / Expo Router 6 (mobile); Next.js App Router with Supabase + R2 (web); Supabase Postgres + RLS.

---

## Triage Summary

| # | Item | Surface | Effort | Risk | Order |
|---|---|---|---|---|---|
| 2 | Web can't delete / hide / caption album photos created on mobile | Web only | XS — single API file | Low | **1st (active)** |
| 3 | PDF viewer top-bar text & back chevron sizing | Mobile | XS | Low | 2nd |
| 1 | Media → Videos requires 2 taps to play | Mobile | XS | Low | 3rd |
| 4 | Forum mp3 won't play on web | Web | S | Low | 4th |
| 5 | Forum "reply to a reply" (WhatsApp-style quote) | Mobile + Web + DB | M | Medium (schema change) | 5th |
| 6 | Profile shows flags/findings (admin-only view) | Mobile + Web + DB | M | Medium (new resolution columns) | 6th |
| 7 | Admin: link member to family-tree node + profile→tree deep link | Web admin + Mobile profile + DB | M-L | Medium | 7th |
| 8 | Albums inside Timeless Moments (admin CRUD on web, view on mobile, bulk move) | Web + Mobile + DB | **L** | Higher (large schema + dual-surface UI) | 8th |
| 9 | Update mobile help screens + web FAQ for the above | Mobile + Web | S | Low | last |

**Why this order:** Bug fixes first (#2, #3, #1, #4) — they each touch one surface and unblock current users. Then features in dependency order: #5 stands alone, #6 lays groundwork for surfacing admin flags that #5/forum & every UGC area benefits from, #7 connects identity ↔ tree which #8 doesn't depend on, #8 is the largest build, #9 documents everything we just shipped (so it's last to avoid re-writes).

**Cross-cutting prerequisite (start of every sub-plan):** Pull latest, create a feature branch in the relevant repo, verify dev server boots clean.

---

## Item-Level Scoping Notes

### #1 — Media → Videos: single-tap play
- **Files (mobile):** `app/(public)/media.tsx`, `app/(tabs)/media.tsx`, `app/(tabs)/community/video-album/[id].tsx`
- **Hypothesis:** all three use `react-native-youtube-iframe`. The component renders a YouTube embed that itself shows a big play button — first tap reveals the player, second tap is YouTube's own play. Pass `play={true}` to YoutubePlayer once `playing` flips, so the embed autoplays.
- **Gotcha:** YouTube autoplay needs the embed to be in a "user-initiated" frame on iOS — the parent `Pressable` already provides that; the prop just chains the intent. Verify with a real device, not just simulator (autoplay is sometimes blocked in simulator).

### #2 — Web album photo edit parity *(detailed plan below)*

### #3 — PDF viewer top bar sizing
- **File (mobile):** `app/(tabs)/community/reading-room.tsx` (or the PDF route under it — confirm during impl)
- **Cause:** likely a `Text` for the title with `fontSize: 16` while the back chevron is sized via icon px and a `Pressable` line-height mismatch.
- **Fix:** unify `fontSize`, `lineHeight`, and `fontWeight` between back arrow and title. Match the `PurpleHeader` defaults (`fontSize: 18, fontWeight: '600'`).

### #4 — Forum mp3 won't play on web
- **Files (web):** wherever forum thread detail renders attachments — `src/app/baat-cheet/**` or under `forum/`. Confirm during impl.
- **Hypothesis:** the renderer uses `<audio src={url}>` but R2 serves the file with `Content-Type: application/octet-stream` (because the upload didn't set `audio/mpeg`), so Safari/Chrome refuse to play. Two possible fixes:
  - Set explicit `Content-Type` in the presign step on web AND mobile uploads (`audio/mpeg` for `.mp3`, `audio/m4a` etc.).
  - Or: re-upload existing audio with corrected metadata (script similar to `convert-heic-photos.mjs`).
- **Test:** open the failing thread, hit the audio element in the browser DevTools → Network tab → confirm `content-type` header.

### #5 — Forum "reply to a reply" (WhatsApp-style)
- **Schema:** add `parent_reply_id UUID REFERENCES thread_replies(id) NULL` to `thread_replies`.
- **Web:** in thread detail, render a quoted snippet above the reply box when replying, and a clickable quoted block above replies that have `parent_reply_id`. Tapping the quote scrolls to the parent.
- **Mobile:** same UX in `app/(tabs)/community/forum/[id].tsx`.
- **Edge cases:** what happens if parent reply is soft-deleted? Show "[reply removed]" placeholder. Don't allow >1 level of quote nesting (still flat replies, just with a quote chip).

### #6 — Flags/findings on user profile (admin-only)
- **Schema:** add `resolution TEXT NULL`, `resolved_at TIMESTAMPTZ NULL`, `resolved_by UUID NULL`, `findings TEXT NULL`, `verdict TEXT NULL CHECK (verdict IN ('upheld','dismissed','warned'))` to `reports`. Add `reported_user_id UUID NULL` so we can index by the *subject* of the report, not just the content.
- **Web:** profile page gets an "Admin notes" section visible only when viewer's role is admin/superadmin. Two sub-sections: "Reports filed by this user" and "Reports against this user (with verdict)".
- **Mobile:** same admin-only section in `more.tsx` / public profile view.
- **Backfill:** populate `reported_user_id` for existing rows from `content_type + content_id` lookup.

### #7 — Web admin: link member to family-tree node
- **New web page:** `/admin/family-tree-links` — card on admin dashboard. Lists members without a linked node, search box, and a "Link to node" picker that queries `family_tree_nodes` (table name to confirm).
- **Schema:** add `linked_user_id UUID NULL UNIQUE REFERENCES users(id)` to the family-tree nodes table.
- **Profile deep link:**
  - Web profile shows "View in family tree →" link.
  - Mobile profile (`more.tsx` + public profile screen) shows same link → opens `/(tabs)/tree` with a `highlight=<nodeId>` query param.
  - Family-tree screen reads the param, scrolls to the node, applies a temporary highlight ring.

### #8 — Albums for Timeless Moments
- **Schema:** new tables `tm_albums` (id, title, description, cover_photo_id, is_hidden, display_order, created_at), plus `album_id` column on existing `timeless_moments` and `timeless_moment_videos`. Keep `album_id` NULLABLE to allow "root" (album-less) photos for backward compatibility — root is its own bucket the admin can drain by bulk-moving.
- **Web admin:** new `/admin/timeless-moments-albums` page — Add / Edit / Delete / Hide albums, drag-and-drop reorder. Within album: Add / Update / Delete / Hide photos. **Bulk move** UI: multi-select photos → "Move to album" dropdown. Also "Move from root → album" and "Move between albums".
- **Mobile:** read-only album list and viewer. Likes / comments / flags must still work on photos inside albums (Apple UGC compliance — ReportButton must remain).
- **Permission model:** admin only on web (consistent with current Timeless Moments behavior). Mobile members can view all albums (respecting `is_hidden`).
- **Migration:** existing photos remain with `album_id = NULL` (root). No destructive change.

### #9 — Help docs update
- **Mobile:** `app/(public)/help.tsx` — extend the role-based accordion to cover the new reply-to UX, profile flag visibility (admin-only line), family-tree deep-link from profile, Timeless Moments albums.
- **Web:** `/faq` (path to confirm) — mirror updates.
- **Hold this item until #1–#8 land** so the docs match shipped behavior.

---

## Active Plan: Item #2 — Web Album Photo Edit Parity

### Root cause (verified)

`BazidpurWeb/src/app/api/albums/[id]/photos/route.ts`:

- Line 2: `import { createAdminClient, getRequestUser } from '@/lib/supabase-server'`
- Line 137 (PATCH): `const supabase = await createServerSupabaseClient()` — **undefined identifier**
- Line 193 (DELETE): same `createServerSupabaseClient()` — **undefined identifier**

`createServerSupabaseClient` *is* exported from `@/lib/supabase-server` (verified) but never imported into this route. PATCH and DELETE throw `ReferenceError` at runtime, the catch block swallows it and returns `{ error: 'Failed' }` with status 500. The web UI in `AlbumClient.tsx` then surfaces "Failed" or a silent no-op.

Mobile uses *direct Supabase client* calls (`supabase.from('album_photos').update(…)` / `.delete()`) from `app/(tabs)/community/album/[id].tsx`, which bypass the broken route entirely and rely on RLS. That is why mobile works.

### Fix strategy

Add the missing import. The existing logic in PATCH and DELETE is correct (uses authenticated session + role checks). No behavioral change beyond making the route actually execute.

Two small adjacent improvements while we're in there:
1. Log the caught error in PATCH and DELETE the same way POST does (currently they silently 500 with no context). This is the only reason it took investigation to find the missing import.
2. Replace `console.error` swallowing with the structured shape POST uses.

### Files

- Modify: `BazidpurWeb/src/app/api/albums/[id]/photos/route.ts:2` (add import)
- Modify: `BazidpurWeb/src/app/api/albums/[id]/photos/route.ts:183-186` (richer PATCH catch)
- Modify: `BazidpurWeb/src/app/api/albums/[id]/photos/route.ts:231-233` (richer DELETE catch)
- Verify only: `BazidpurMobileApp/app/(tabs)/community/album/[id].tsx` (no change — confirms parity)
- Test: manual browser flow on a dev deploy or `npm run dev` against the same Supabase project, using an account that owns a mobile-created album.

### Tasks

#### Task 1: Reproduce the failure on dev

- [ ] **Step 1: Boot web dev server**

```bash
cd /Users/nasirali/Documents/Projects/BazidpurWeb
npm run dev
```

Expected: server listens on `http://localhost:3000`.

- [ ] **Step 2: Sign in as a user who owns an album that was created via mobile**

In a browser, go to `http://localhost:3000/login`, sign in with the test account (`na8609@gmail.com` or a member account that has mobile-created photos).

- [ ] **Step 3: Trigger the failing actions and capture the 500**

Open DevTools → Network tab. Navigate to `/albums/<id>` for a mobile-created album. Attempt:
1. Click the pencil to edit a caption → save (`✓`).
2. Click the hide toggle on a photo.
3. Click the delete (trash) button on a photo.

Expected for each: a `PATCH /api/albums/<id>/photos` or `DELETE /api/albums/<id>/photos` returning **500** with body `{ "error": "Failed" }`.

- [ ] **Step 4: Confirm in the server console**

In the terminal where `npm run dev` runs, expected: an uncaught `ReferenceError: createServerSupabaseClient is not defined` near the request log line. (If the catch fully swallows it, the structured fix in Task 4 surfaces it.)

#### Task 2: Add the missing import

- [ ] **Step 1: Edit the import line**

File: `BazidpurWeb/src/app/api/albums/[id]/photos/route.ts`

Replace line 2:

```ts
import { createAdminClient, getRequestUser } from '@/lib/supabase-server'
```

With:

```ts
import { createAdminClient, createServerSupabaseClient, getRequestUser } from '@/lib/supabase-server'
```

- [ ] **Step 2: TypeCheck**

```bash
cd /Users/nasirali/Documents/Projects/BazidpurWeb
npx tsc --noEmit
```

Expected: no errors. (If errors appear, they are pre-existing — read the messages and confirm none mention `route.ts:137` or `route.ts:193`.)

#### Task 3: Re-run the three failing actions and confirm 200

- [ ] **Step 1: Restart dev server if needed**

The Next.js dev server hot-reloads route handlers, so usually no restart needed. If the request still 500s with the same error after edit, kill and re-run `npm run dev`.

- [ ] **Step 2: Re-run caption edit**

Browser → `/albums/<id>` → edit caption → save. Expected: 200, caption updates in UI, no console error.

- [ ] **Step 3: Re-run hide toggle**

Click hide. Expected: 200, photo gets dimmed/hidden styling per `AlbumClient.tsx` rendering logic, no console error.

- [ ] **Step 4: Re-run delete**

Click trash → confirm. Expected: 200, photo disappears from grid, no console error.

#### Task 4: Surface PATCH / DELETE errors the same way POST does

This isn't part of the user-visible fix, but the silent catch is what made this bug invisible for so long. A small structured log prevents a repeat.

- [ ] **Step 1: Replace PATCH catch block**

In `route.ts`, find lines 183-186:

```ts
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

Replace with:

```ts
  } catch (error: any) {
    console.error('[album-photos PATCH] caught error', error?.message ?? error)
    return NextResponse.json({ error: error?.message ?? 'Failed' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Replace DELETE catch block**

Find lines 231-233:

```ts
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

Replace with:

```ts
  } catch (error: any) {
    console.error('[album-photos DELETE] caught error', error?.message ?? error)
    return NextResponse.json({ error: error?.message ?? 'Failed' }, { status: 500 })
  }
}
```

- [ ] **Step 3: TypeCheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

#### Task 5: Cross-surface sanity check

- [ ] **Step 1: Verify mobile is unaffected**

Open the same album on iOS simulator (`npx expo start` in `BazidpurMobileApp`). Edit a caption, hide a photo, delete a photo. Expected: all three work exactly as before. Mobile uses direct Supabase calls — no API change can break it. This step exists to confirm we didn't accidentally tighten RLS or break a row.

- [ ] **Step 2: Cross-surface flow**

In one browser tab: edit a photo's caption on web. On mobile, pull-to-refresh the album. Expected: caption appears. Then on mobile, edit it back. Refresh on web. Expected: web shows mobile's edit.

#### Task 6: Commit

- [ ] **Step 1: Stage and commit**

```bash
cd /Users/nasirali/Documents/Projects/BazidpurWeb
git add src/app/api/albums/[id]/photos/route.ts
git commit -m "fix(albums): import createServerSupabaseClient in photos route

PATCH and DELETE referenced createServerSupabaseClient but only
createAdminClient/getRequestUser were imported, so both methods
threw ReferenceError and returned 500. Web users couldn't edit
caption, hide, or delete photos in albums originally created on
mobile (which uses direct Supabase calls and so was unaffected).

Also added error logging in the PATCH/DELETE catch blocks to
match POST's structured format, so the next silent failure isn't
invisible."
```

- [ ] **Step 2: Push and verify on Vercel preview**

```bash
git push
```

Wait for Vercel preview deploy. Re-run Task 3 against the preview URL with the same test account. Expected: all three actions succeed on preview.

### Definition of done for #2

- All three actions (edit caption, hide, delete) work on web for albums created on mobile.
- All three still work on mobile (no regression).
- A change made on one surface appears on the other after refresh.
- PATCH/DELETE failures log structured errors going forward.
- Commit landed and pushed.

---

## Open Questions Before #5–#8

These can wait until we get there, but flagging now so they're not bottlenecks later:

1. **#5 reply-to** — should soft-deleted parent show "[removed]" or hide the whole quote? Pick one to keep UX simple.
2. **#6 profile flags** — do we want "reports against this user" to count *anonymous* reports too, or only verified ones? Default to all but tag which are pending review.
3. **#7 tree linking** — what's the existing family-tree node table name? (Will discover during impl, but if you already know — confirm `family_tree_nodes` vs `tree_nodes`.)
4. **#8 Timeless Moments albums** — should existing root photos auto-group into an "Uncategorized" album, or stay literally at root forever? Recommend keeping root as-is to avoid migration risk.
