# Push Notifications — Setup Checklist

The code is in place. To turn the system on end-to-end, do the following
once, in this order.

## 1. Run the SQL (Supabase Dashboard → SQL Editor)

Open `docs/notifications_setup.sql` (in this same folder) and run it. It
creates three tables — `push_tokens`, `notification_preferences`,
`notifications` — with RLS policies so members can only see / change
their own rows and admins can read all of them for support.

## 2. Add the internal secret to Vercel

The web → web internal endpoint `/api/notifications/send` is guarded by
a shared secret so it can't be hit from the client.

  - Vercel Dashboard → Bazidpur project → Settings → Environment Variables
  - **Key:** `NOTIFICATIONS_INTERNAL_SECRET`
  - **Value:** any long random string (e.g. `openssl rand -hex 32`)
  - **Environments:** Production, Preview, Development
  - Click **Save** then redeploy the latest commit so the env var takes
    effect.

## 3. Provision iOS APNs via EAS (first time only)

Push on iOS needs an Apple Push Notification Service key, registered
with Expo / EAS.

```
eas credentials
```

  - Choose **iOS**
  - Choose the **production** profile (or whichever profile you're
    building with)
  - Choose **Push Notifications** → **Add new Push Key**
  - EAS will walk you through generating the key on your Apple Developer
    account and uploading it to Expo. It's a 2-minute click-through.

(Android FCM is handled automatically by Expo — no extra step.)

## 4. Build and install

```
eas build --platform ios --profile production
```

Submit through TestFlight (or run a local dev build with
`npx expo run:ios`). The first time the app opens after sign-in, iOS
will prompt the member for push permission. Granted → the device's
Expo push token is upserted into `push_tokens` and the bootstrap also
seeds a default row in `notification_preferences`.

## 5. Smoke test

  - Sign in as Member A on a real device (simulator can't receive
    pushes).
  - From a different account, comment on one of Member A's photos, or
    reply to one of Member A's forum threads.
  - Within a few seconds, A's device should buzz and the inbox under
    **Profile → Notifications** should show the new entry.

## 6. Triggers wired so far

| Event | Type | Notes |
|---|---|---|
| Membership approved | `membership_approved` | Fires from `/api/member-approved` after the welcome email |
| Reply to a thread you started | `forum_reply` | Mobile reply flow posts to `/api/notifications/dispatch-forum-reply` |
| Comment on your photo / album / video album | `photo_comment` | Wired in `/api/comments` POST |
| Admin acted on a report you filed | `report_resolution` | Bolted onto the existing `/api/report-resolution-notification` email path |

You can add more triggers later by calling
`sendNotification({ userId, type, title, body, data })` from
`@/lib/send-notification` in any server-side route.

## 7. Preferences

Every member has fine-grained category toggles at **Profile →
Notification Settings**:

  - Master switch (one off-switch for everything)
  - Per-category: forum replies, photo comments, membership status,
    report outcomes, moderation actions, community announcements

The send endpoint reads these on every send and skips both the push and
the inbox entry when the relevant toggle is off, so an opted-out member
sees no trace of the notification.

## 8. Privacy Policy

Both the web and mobile Privacy Policy now include:
  - Expo listed as a named data processor (§5.1)
  - A new section §14 "Push Notifications" describing what data is
    stored, the opt-in nature, and how to disable.

No further action needed for App Store privacy nutrition labels — the
data we store is small (push token + preferences + log) and clearly
covered.
