import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import Svg, { Polyline } from 'react-native-svg'
import { PurpleHeader } from '@/components/PurpleHeader'
import { useAuth } from '@/lib/auth-context'
import type { UserRole } from '@/lib/types'

interface HelpItem {
  heading?: string
  body: string
}

interface HelpSection {
  id: string
  icon: string
  title: string
  onlyFor?: UserRole[]
  items: HelpItem[]
}

const ALL_SECTIONS: HelpSection[] = [
  // ── Navigation (all) ──────────────────────────────────────────
  {
    id: 'navigation',
    icon: '🗺️',
    title: 'Getting Around the App',
    items: [
      {
        heading: 'Tab Bar',
        body: 'The floating pill-shaped tab bar at the bottom of the screen is your main navigation tool. It gives instant access to:\n\n• 🏡 Home — the welcome screen\n• About — village history and information\n• Zahoor Ali — dedicated tribute page (portrait icon)\n• 📷 Media — public photos and videos\n• 👥 Community — member-only hub (appears after signing in)\n\nThe active tab is highlighted in deep purple; inactive tabs appear grey.',
      },
      {
        heading: 'Collapsing the Tab Bar',
        body: 'For an unobstructed view of any screen, you can collapse the tab bar out of sight:\n\n1. Look for the small grey grip bar sitting just above the tab bar\n2. Tap it — the tab bar smoothly springs downward and disappears\n3. A small deep-purple pill appears in the bottom-left corner, showing the current tab\'s icon and an upward chevron ( ‹ rotated up )\n4. The pill gently pulses to make it clear it can be tapped\n5. Tap the pill at any time to spring the tab bar back into view\n\nThe tab bar starts expanded by default every time you open the app.',
      },
      {
        heading: 'Back Button ( ‹ )',
        body: 'When you navigate into a sub-screen — such as the Gallery, a Forum thread, a Memoir, or a poem — a bold white chevron ( ‹ ) appears on the left side of the purple header bar. Tap it to return to the previous screen. You can tap it repeatedly to trace back through your navigation history.',
      },
      {
        heading: 'Help Button ( ⓘ circle icon )',
        body: 'A circular question-mark icon appears in the top-right area of the purple header bar on every screen. Tap it at any time to open this Help screen. It does not matter which screen you are on — help is always one tap away. The icon is a white circle with a ? inside it, matching the style of the other header buttons.',
      },
      {
        heading: 'Contact Button ( envelope icon )',
        body: 'A white envelope outline icon sits in the top bar next to the help button. Tap it to open the Contact Us form. You can send a message to the Bazidpur admin team from anywhere in the app. The contact form asks for your name, email address, subject, and message.',
      },
      {
        heading: 'Your Avatar (signed-in members)',
        body: 'If you are signed in, your circular avatar appears in the top-right corner of every screen. It shows your profile photo if you have uploaded one, or your initials otherwise. A small role badge (colour-coded) may appear in the corner of the avatar.\n\nTap your avatar at any time to open your Profile page, where you can edit your personal details, update your photo, and sign out.',
      },
      {
        heading: 'Sign Out Button (signed-in members)',
        body: 'The door-with-arrow icon to the right of your avatar is the Sign Out button. Tap it to sign out immediately from any screen. You will be returned to the Home screen as a visitor. Your data is saved — simply sign back in whenever you are ready.',
      },
      {
        heading: 'Sign In and Join Buttons (visitors)',
        body: 'If you are browsing as a guest, the top-right area of the header shows two buttons:\n\n• Sign In — takes you to the login screen if you already have an approved account\n• Join › — takes you to the membership application form\n\nThese buttons are replaced by your avatar once you are signed in.',
      },
    ],
  },

  // ── Home (all) ────────────────────────────────────────────────
  {
    id: 'home',
    icon: '🏡',
    title: 'Home Screen',
    items: [
      {
        heading: 'Overview',
        body: 'The Home screen is the first thing you see when the app opens. It introduces Bazidpur.com (Bazidpur App) — the official community and family heritage platform for those with roots in Bazidpur, Bihar, India, established around 1500 AD.',
      },
      {
        heading: 'Photo Collage',
        body: 'Near the bottom of the Home screen, a row of overlapping circular photos shows curated images from Bazidpur. These are selected by the admin team and represent the village, its people, and its heritage. The caption "Bazidpur, Bihar, India" appears below the collage.',
      },
      {
        heading: 'Join and Sign In Buttons (visitors)',
        body: 'Two buttons appear in the centre of the Home screen for guests:\n\n• Join the Community — opens the Sign Up form to apply for membership\n• Sign In — opens the login screen\n\nBoth are also accessible via the top bar at any time.',
      },
      {
        heading: 'Welcome Card (members)',
        body: 'Once signed in, the Join/Sign In buttons are replaced by a purple welcome card with the message "You\'re in — welcome home!". The card reminds you to tap the Community tab in the bottom bar to explore all member features: gallery, poetry, photo albums, Timeless Moments, family tree, memoirs, the forum, and more.',
      },
      {
        heading: 'Privacy Policy Link',
        body: 'Scroll to the very bottom of the Home screen to find the Privacy Policy link. Tap it to read how we collect, use, and protect your personal information.',
      },
    ],
  },

  // ── About (all) ───────────────────────────────────────────────
  {
    id: 'about',
    icon: '🕌',
    title: 'About Bazidpur',
    items: [
      {
        heading: 'What This Screen Shows',
        body: 'The About screen gives a rich, detailed overview of Bazidpur — a village in Bihar, India with a heritage stretching back over five centuries. It covers the village\'s history, its cultural and religious significance, notable figures, and the global community it has produced.',
      },
      {
        heading: 'How to Access',
        body: 'Tap the About tab in the bottom tab bar (the custom icon). Available to all users — no sign-in required.',
      },
    ],
  },

  // ── Zahoor Ali (all) ──────────────────────────────────────────
  {
    id: 'zahoor-ali',
    icon: '🌸',
    title: 'Zahoor Ali (Fazihat Shah Warsi)',
    items: [
      {
        heading: 'What This Screen Shows',
        body: 'This dedicated screen is a tribute to Zahoor Ali — a poet and celebrated figure from Bazidpur. The name Fazihat Shah Warsi was bestowed upon him by Hazrat Waris Ali Shah of Barabanki, a revered spiritual figure. It is an honourific title, not a pen name. The screen covers his life, his literary works, and the enduring legacy he has left on the community and on Urdu literature.',
      },
      {
        heading: 'How to Access',
        body: 'Tap the Zahoor Ali tab in the bottom bar — it is represented by a small circular portrait icon. Available to all users without signing in.',
      },
    ],
  },

  // ── Media (all) ───────────────────────────────────────────────
  {
    id: 'media',
    icon: '📷',
    title: 'Media',
    items: [
      {
        heading: 'What This Screen Shows',
        body: 'The Media tab displays publicly available photos and videos related to Bazidpur. This is a curated selection managed by the admin team and is accessible to all visitors without signing in.',
      },
      {
        heading: 'Browsing',
        body: 'Scroll through the Media screen to see photos and videos. Tap any item to view it in full. This section is separate from the member-only Gallery, which contains community-uploaded photos and albums.',
      },
      {
        heading: 'How to Access',
        body: 'Tap the 📷 Media tab in the bottom bar. No sign-in required.',
      },
    ],
  },

  // ── Community Hub (members) ───────────────────────────────────
  {
    id: 'community',
    icon: '👥',
    title: 'Community Hub',
    onlyFor: ['member', 'admin', 'superadmin'],
    items: [
      {
        heading: 'Overview',
        body: 'The Community tab is the central hub for all member features. It displays a 3-column grid of colourful 3D tiles — each representing a different community section. The tiles have a raised, extruded appearance with a depth shadow in a darker shade of their colour.',
      },
      {
        heading: 'How to Navigate',
        body: 'Simply tap any tile to enter that section:\n\n• ✨ Timeless Moments — curated video moments from the community\n• 🖼️ The Gallery — community photos and personal albums\n• ✍️ Rhymes & Roots — Urdu and Persian poetry and ghazals\n• 📖 Memoirs — personal stories from community members\n• 📚 Reading Room — books, journals, and curated articles\n• 💬 The Forum — community discussion threads\n• 🌍 Scattered Roots — interactive map showing where members live\n• 👨‍👩‍👧‍👦 Family Tree — full interactive family tree\n• 📜 Lineage — the direct ancestral line across ten generations\n• ⚙️ Admin — admin tools (only visible to admin and superadmin)',
      },
      {
        heading: 'Welcome Message',
        body: 'Just below the purple header, a greeting strip reads "Welcome, [your first name] — Members area". This confirms you are signed in as a member.',
      },
      {
        heading: 'How to Access',
        body: 'Tap the 👥 Community tab in the bottom bar. This tab only appears in the tab bar after you have signed in with an approved member account.',
      },
    ],
  },

  // ── Gallery (members) ─────────────────────────────────────────
  {
    id: 'gallery',
    icon: '🖼️',
    title: 'The Gallery',
    onlyFor: ['member', 'admin', 'superadmin'],
    items: [
      {
        heading: 'Browsing the Photo Grid',
        body: 'The Gallery opens with a grid of community photos. Photos load in batches as you scroll — keep scrolling down to load more. Each image shows as a square thumbnail. The grid is two or three columns wide depending on your device.',
      },
      {
        heading: 'Full-Screen Lightbox',
        body: 'Tap any photo thumbnail to open it in the full-screen lightbox viewer:\n\n• The photo fills your screen at full resolution\n• Swipe left to view the next photo in the gallery\n• Swipe right to go back to the previous photo\n• Tap the × button in the top-right corner to close the lightbox\n• You can also swipe down to dismiss and return to the grid',
      },
      {
        heading: 'Member Albums',
        body: 'Below the main photo grid, personal photo albums uploaded by community members are listed. Each album card shows the album title, the member\'s name, and a cover photo.\n\nTap an album to open it and browse its photos. Album photos also support the full-screen lightbox — tap any photo and swipe through the album.',
      },
      {
        heading: 'Creating a Photo Album',
        body: 'To create your own album:\n\n1. Open The Gallery and scroll down to the Members Albums section\n2. Tap the + New Album button\n3. Enter a title and optional description\n4. Tap Create\n5. Your new empty album opens — tap the + button inside it to add photos\n\nYou can add multiple photos at once. Each photo is resized and converted automatically before upload.',
      },
      {
        heading: 'Video Albums',
        body: 'Below photo albums, there is a separate Video Albums section. These are collections of YouTube videos organised by theme or event. Tap any video album to open it, then tap a video to play it full-screen.\n\nMembers can create video albums in the same way as photo albums — scroll to the Video Albums section and tap + New Video Album.',
      },
      {
        heading: 'Comments on Albums and Photos',
        body: 'At the bottom of any photo album or individual album photo, a comments section allows members to leave a message. Tap in the comment box, type your message, and tap Send.\n\nYour comment appears immediately. Other members who view the same album will see it. The album owner receives a notification when someone comments.',
      },
      {
        heading: 'Uploading a Photo',
        body: 'To add a photo to the community gallery:\n\n1. Open The Gallery\n2. Tap the purple floating + button in the bottom-right corner of the screen (above the tab bar)\n3. Your device will ask permission to access your photo library — tap Allow\n4. Select a photo from your library\n5. The photo is uploaded and will appear in the gallery shortly\n\nPlease only upload photos that are decent, respectful, and related to Bazidpur and its community. The admin team reserves the right to remove any photo without notice.',
      },
      {
        heading: 'How to Access',
        body: 'From the Community hub, tap the 🖼️ The Gallery tile. Tap ‹ to return to the Community hub.',
      },
    ],
  },

  // ── Timeless Moments (members) ────────────────────────────────
  {
    id: 'moments',
    icon: '✨',
    title: 'Timeless Moments',
    onlyFor: ['member', 'admin', 'superadmin'],
    items: [
      {
        heading: 'What This Section Shows',
        body: 'Timeless Moments is a curated collection of photos and videos selected by the admin team — significant events, heritage footage, religious occasions, and community gatherings. Content is organised into albums and also browsable as individual photos and videos.',
      },
      {
        heading: 'Albums',
        body: 'The default view is the Albums tab. Each album card shows a cover image, the album title, and a photo/video count. Tap an album to open it and browse all the photos and videos inside. Inside an album, switch between the Photos and Videos tabs using the control at the top.',
      },
      {
        heading: 'All Photos and Videos',
        body: 'Switch to the Photos or Videos tab on the main Timeless Moments screen to browse all unorganised items — content not yet placed in an album. Tap any photo to open the full-screen lightbox and swipe through the collection.',
      },
      {
        heading: 'Watching a Video',
        body: 'Tap the play button on any video card to begin watching. Videos stream from YouTube — a good internet connection is recommended. Tap the full-screen icon in the video player to expand it.',
      },
      {
        heading: 'How to Access',
        body: 'From the Community hub, tap the ✨ Timeless Moments tile. Tap ‹ to return.',
      },
    ],
  },

  // ── Poetry (members) ──────────────────────────────────────────
  {
    id: 'poetry',
    icon: '✍️',
    title: 'Rhymes & Roots — Poetry & Ghazals',
    onlyFor: ['member', 'admin', 'superadmin'],
    items: [
      {
        heading: 'Overview',
        body: 'Rhymes & Roots is the literary heritage section of the community. It hosts a growing collection of poetry and ghazals connected to Bazidpur\'s rich Urdu and Persian literary tradition — including the works of Fazihat Shah Warsi and others with ties to the village.',
      },
      {
        heading: 'Browsing the Collection',
        body: 'Poems and ghazals are displayed in a scrollable list. Rows alternate between white and light purple backgrounds — this makes it easy to tell entries apart at a glance and gives the list a pleasant, readable rhythm.',
      },
      {
        heading: 'Understanding Each Row',
        body: 'Each row shows:\n\n• The title of the poem or ghazal (in English, Urdu, or Persian)\n• The author\'s name\n• The language of the original text\n• Whether it is a poem or a ghazal\n\nTap any row to open the full text.',
      },
      {
        heading: 'Reading a Poem or Ghazal',
        body: 'The detail view opens the full poem. It shows:\n\n• The title (in all available languages)\n• The full original text in Urdu or Persian, displayed verse by verse\n• An English translation where available\n• The author\'s name and the type (poetry or ghazal)\n\nScroll down to read through longer works.',
      },
      {
        heading: 'Likes and Comments',
        body: 'At the bottom of each poem or ghazal, a likes and comments bar lets you engage with the content:\n\n• Tap the heart (♥) to like — tap again to unlike\n• Tap the comment bubble to open the comments panel, read what others have written, and add your own thoughts\n\nYour likes and comments are visible to all members.',
      },
      {
        heading: 'Poetry vs Ghazals',
        body: 'The collection contains two forms:\n\n• Poetry — general verse composition in Urdu or Persian\n• Ghazal — a structured lyric form with rhyming couplets and a repeated refrain. Ghazals often explore themes of love, longing, divine connection, and spirituality. They are among the most celebrated forms in Urdu and Persian literature.',
      },
      {
        heading: 'How to Access',
        body: 'From the Community hub, tap the ✍️ Rhymes & Roots tile. Tap ‹ to return.',
      },
    ],
  },

  // ── Memoirs (members) ─────────────────────────────────────────
  {
    id: 'memoirs',
    icon: '📖',
    title: 'Memoirs',
    onlyFor: ['member', 'admin', 'superadmin'],
    items: [
      {
        heading: 'What This Section Shows',
        body: 'Memoirs is a collection of personal stories and recollections written by community members. These are first-hand accounts of life in and around Bazidpur — family histories, childhood memories, migration stories, and reflections. Together they form a living record of the community\'s human experience.',
      },
      {
        heading: 'Browsing Memoirs',
        body: 'The Memoirs screen lists available memoirs as cards. Each card shows the title, the author\'s name and photo (if available), and a short summary. Scroll down to see all available memoirs.',
      },
      {
        heading: 'Reading a Memoir',
        body: 'Tap a memoir card to open it. Memoirs may be structured in chapters, each covering a different period or theme. Use the chapter navigation arrows at the top of the screen to jump between chapters, or scroll through to read the full story. Some memoirs include photos embedded within the text.',
      },
      {
        heading: 'Likes and Comments',
        body: 'At the bottom of each memoir, a likes and comments bar lets you engage with the story:\n\n• Tap the heart (♥) to like — tap again to unlike\n• Tap the comment bubble to read comments from other members and add your own\n\nThe memoir author receives a notification when someone comments.',
      },
      {
        heading: 'How to Access',
        body: 'From the Community hub, tap the 📖 Memoirs tile. Tap ‹ to return.',
      },
    ],
  },

  // ── Reading Room (members) ────────────────────────────────────
  {
    id: 'reading-room',
    icon: '📚',
    title: 'Reading Room',
    onlyFor: ['member', 'admin', 'superadmin'],
    items: [
      {
        heading: 'What This Section Shows',
        body: 'The Reading Room is a curated library of books, journals, and articles relevant to Bazidpur, its history, its people, and its cultural and religious heritage. Content is selected and managed by the admin team.',
      },
      {
        heading: 'Browsing the Library',
        body: 'Scroll through the Reading Room to see available titles. Each entry shows a title, a brief description, and an author or source. The content is organised by the admin team.',
      },
      {
        heading: 'Reading an Entry',
        body: 'Tap any entry to open and read it. Some entries are full text within the app; others may open a link to an external resource. Scroll through to read at your own pace.',
      },
      {
        heading: 'How to Access',
        body: 'From the Community hub, tap the 📚 Reading Room tile. Tap ‹ to return.',
      },
    ],
  },

  // ── Forum (members) ───────────────────────────────────────────
  {
    id: 'forum',
    icon: '💬',
    title: 'The Forum',
    onlyFor: ['member', 'admin', 'superadmin'],
    items: [
      {
        heading: 'Overview',
        body: 'The Forum is the community\'s open discussion board. Members from around the world use it to share news, ask questions, reminisce, arrange events, and stay connected. Every approved member can read, post, and reply.',
      },
      {
        heading: 'Browsing Threads',
        body: 'The forum index shows a list of discussion threads in reverse chronological order (most recent first). Each thread shows:\n\n• The thread title\n• The author\'s name and profile photo\n• The number of replies\n• How long ago it was posted\n\nPinned threads appear at the top regardless of date — these contain important announcements from the admin team. Scroll down to see older threads.',
      },
      {
        heading: 'Reading a Thread',
        body: 'Tap any thread title to open it. The full original post appears at the top, followed by all replies in chronological order (oldest first, newest at the bottom). Each post shows:\n\n• The author\'s name and profile photo\n• Their member role badge\n• The post content\n• The time and date of the post\n\nScroll down to read through all replies.',
      },
      {
        heading: 'Creating a New Thread',
        body: 'To start a new discussion:\n\n1. Open The Forum\n2. Tap the new thread / compose button\n3. Enter a clear, descriptive title for your thread\n4. Write your message in the body field — be as detailed as you like\n5. Tap Post to publish\n\nYour thread will appear at the top of the forum list immediately. Please keep discussions respectful and relevant to the community.',
      },
      {
        heading: 'Replying to a Thread',
        body: 'Open any thread and scroll to the bottom. You will see a reply input field. Tap it, type your response, and tap Send (or the send icon). Your reply appears at the bottom of the thread instantly.',
      },
      {
        heading: 'Quoting a Reply',
        body: 'Tap the Reply button on any existing reply to quote it. A small preview strip appears above the compose field showing who you are replying to and the start of their message. Your reply will be linked to theirs — readers can tap the quote strip inside your reply to jump back to the original message.\n\nTo cancel the quote and reply to the thread in general, tap × on the preview strip.',
      },
      {
        heading: 'Attaching Media to a Reply',
        body: 'When composing a reply, tap the paperclip / attachment icon in the compose bar to attach media:\n\n• 📷 Photo — choose a photo from your library. It is resized and uploaded automatically\n• 🎵 Record Audio — tap to start recording, tap again to stop. The recording is attached and plays inline for other members\n• 🎵 Upload Audio — pick an audio file from your device\n• 📄 PDF — attach a document from your device\n• ▶️ YouTube — paste a YouTube link and the video embeds directly in the reply\n\nOnly one attachment per reply is supported. Attachments appear inline beneath the reply text for all members to see.',
      },
      {
        heading: 'Emoji Reactions',
        body: 'Every thread and every reply has an emoji reaction bar. To react:\n\n• Tap any emoji pill that already has reactions to add your own\n• Tap the + button at the end of the bar to open the full emoji picker and choose any emoji\n• Tap an emoji you have already reacted with to remove your reaction\n\nThe count next to each emoji shows how many members have reacted. Long-press any emoji pill to see a list of the members who reacted with that emoji.',
      },
      {
        heading: 'Blocking a Member',
        body: 'If you do not want to see content from a specific member, you can block them:\n\n• In the Forum, long-press on any post or reply from that member to see the option to block\n• Blocking hides their posts, photos, videos, poems, and memoirs from your view\n• The blocked member is not notified\n• To unblock, go to your Profile → Blocked Members and tap Unblock',
      },
      {
        heading: 'Reporting a Post',
        body: 'To flag a post or reply that violates community guidelines:\n\n• Tap the flag icon (⚑) on the thread or reply\n• Select a reason from the list\n• Tap Submit\n\nReports are reviewed by the admin team. You will receive a notification when the report is resolved. Your identity as the reporter is kept confidential.',
      },
      {
        heading: 'Community Standards',
        body: 'The Forum is a family community space. Please:\n\n• Be respectful and considerate to all members\n• Keep discussions relevant to Bazidpur and the community\n• Do not share personal contact details publicly\n• Use the report flag (⚑) for any content that violates these standards\n\nThe admin team may remove threads or replies that violate community standards, and may revoke membership for serious or repeated violations.',
      },
      {
        heading: 'How to Access',
        body: 'From the Community hub, tap the 💬 The Forum tile. Tap ‹ to return to the hub.',
      },
    ],
  },

  // ── Family Tree (members) ─────────────────────────────────────
  {
    id: 'family-tree',
    icon: '🌳',
    title: 'Family Tree',
    onlyFor: ['member', 'admin', 'superadmin'],
    items: [
      {
        heading: 'Overview',
        body: 'The Family Tree is a full interactive map of the Bazidpur extended family. It covers all known branches and relationships, allowing you to explore how different members of the community are related to one another across generations.',
      },
      {
        heading: 'Navigating the Tree',
        body: 'The tree is displayed as a hierarchical, collapsible list:\n\n• The root ancestor appears at the top\n• Each person\'s children appear indented beneath them\n• Tap a person\'s card to expand or collapse their branch\n• A + or – indicator shows whether a node has children and whether it is expanded\n• Scroll down to explore deeper branches\n\nThe indentation level visually represents the generation — the further right a node is, the more recent the generation.',
      },
      {
        heading: 'Reading a Node',
        body: 'Each node displays:\n\n• The person\'s full name\n• Their approximate birth year (and death year if applicable)\n• A gender indicator (♂ / ♀)\n• Their number of children, if any, shown when the node is collapsed',
      },
      {
        heading: 'Relationship Lines',
        body: 'Vertical and horizontal connector lines link parents to their children, making the hierarchy easy to follow visually even in large, complex branches of the family.',
      },
      {
        heading: 'How to Access',
        body: 'From the Community hub, tap the 🌳 Family Tree tile. Tap ‹ to return.',
      },
    ],
  },

  // ── Lineage (members) ─────────────────────────────────────────
  {
    id: 'lineage',
    icon: '📜',
    title: 'Lineage',
    onlyFor: ['member', 'admin', 'superadmin'],
    items: [
      {
        heading: 'Overview',
        body: 'The Lineage screen is different from the Family Tree. Rather than the full extended family, Lineage traces only the direct ancestral bloodline of the Bazidpur family — from the earliest recorded ancestor down through ten generations. Think of it as the main trunk of the family tree.',
      },
      {
        heading: 'Reading the Timeline',
        body: 'Ancestors are listed in chronological order from oldest (top) to most recent (bottom). Each card shows:\n\n• The ancestor\'s full name and honorific title (where applicable)\n• Their approximate birth year\n• Their generation number in the lineage\n\nA date range is shown at the top of the screen indicating the total span of recorded history covered (e.g. c. 1500 – 1950).',
      },
      {
        heading: 'Description Strip',
        body: 'Just below the purple header, a description strip reads: "Tracing the direct ancestral line of the Bazidpur family across ten generations." This distinguishes Lineage from the broader Family Tree.',
      },
      {
        heading: 'Lineage vs Family Tree',
        body: 'Lineage = direct line only (father to son, generation by generation).\nFamily Tree = all branches, cousins, and extended relatives.\n\nUse Lineage to understand the main ancestral sequence. Use the Family Tree to explore the full network of relationships.',
      },
      {
        heading: 'How to Access',
        body: 'From the Community hub, tap the 📜 Lineage tile. Tap ‹ to return.',
      },
    ],
  },

  // ── Scattered Roots (members) ────────────────────────────────
  {
    id: 'scattered-roots',
    icon: '🌍',
    title: 'Scattered Roots',
    onlyFor: ['member', 'admin', 'superadmin'],
    items: [
      {
        heading: 'Overview',
        body: 'Scattered Roots is an interactive world map showing where Bazidpur family members are living today. It is a visual reminder of how far the community has spread — from Bihar to the UK, the Gulf, North America, and beyond.',
      },
      {
        heading: 'Reading the Map',
        body: 'Each pin on the map represents one or more members who have set their location in their profile. Tap any pin to see the city and country for that location. Zoom in and out using the standard pinch gesture to explore different regions.',
      },
      {
        heading: 'Country List',
        body: 'Below the map, an alphabetical list shows every country where at least one member lives. This gives a quick text summary of the community\'s global spread.',
      },
      {
        heading: 'Your Pin',
        body: 'Your location appears on the map if you have entered a country, state, and city in your Profile. If you do not appear, go to Profile → edit your location fields and save. The map updates the next time it loads.',
      },
      {
        heading: 'How to Access',
        body: 'From the Community hub, tap the 🌍 Scattered Roots tile. Tap ‹ to return.',
      },
    ],
  },

  // ── Notifications (members) ───────────────────────────────────
  {
    id: 'notifications',
    icon: '🔔',
    title: 'Notifications',
    onlyFor: ['member', 'admin', 'superadmin'],
    items: [
      {
        heading: 'Overview',
        body: 'The Notifications screen collects all activity alerts in one place. You receive a notification when:\n\n• 💬 Someone replies to a forum thread you posted or participated in\n• 🖼️ Someone comments on your photo album or a photo you uploaded\n• ✅ Your membership application is approved\n• ⚑ A report you submitted has been reviewed and resolved\n• 🚫 A moderation action has been taken on your account\n• 📣 The admin team sends a community-wide announcement',
      },
      {
        heading: 'Reading Notifications',
        body: 'Unread notifications appear with a coloured left border. Tap any notification to mark it as read. The notification card shows a title, a short preview of the message, and how long ago it arrived.\n\nTap Mark all as read at the top of the screen to clear all unread indicators at once.',
      },
      {
        heading: 'How to Access',
        body: 'Tap your avatar in the top-right corner to open your Profile, then tap the Notifications button. Alternatively, notifications may be accessible from the Profile screen directly.',
      },
    ],
  },

  // ── Profile (members) ─────────────────────────────────────────
  {
    id: 'profile',
    icon: '👤',
    title: 'Your Profile',
    onlyFor: ['member', 'admin', 'superadmin'],
    items: [
      {
        heading: 'Opening Your Profile',
        body: 'Tap your circular avatar in the top-right corner of the purple header bar on any screen. This opens your full profile page. Alternatively, your profile is also accessible from the Sign Out icon (door icon) area.',
      },
      {
        heading: 'Your Avatar and Name',
        body: 'At the top of the profile page, your avatar is displayed large. Below it, your full name and email address are shown. A small badge indicating your member role (member / admin / superadmin) appears in the corner of the avatar.',
      },
      {
        heading: 'Changing Your Profile Photo',
        body: 'To update your profile picture:\n\n1. Tap the large avatar circle at the top of the profile screen\n2. Your device will ask permission to access your photo library — tap Allow\n3. Select a photo from your library. Square photos work best\n4. The photo uploads automatically. A loading spinner appears during upload\n5. Once complete, your new photo appears in the profile header and in the top bar across the whole app\n\nNote: your photo is publicly visible to other members.',
      },
      {
        heading: 'Editing Personal Details',
        body: 'The Personal Details card contains all editable fields:\n\n• First Name — your given name (required)\n• Last Name — your family surname (required)\n• Gender — tap Male, Female, or Other on the segmented selector\n• Date of Birth — tap the date field to open the native date picker. On iPhone, a bottom sheet with a scroll wheel appears. On Android, a calendar dialog opens. Select your date and tap Confirm / Done\n• Email — shown for reference but cannot be changed here\n• City — your current city or town\n• State / Province — your current state or region\n• Country — your current country\n• Link to Bazidpur — describe your connection, e.g. "Granddaughter of Abdul Rehman"\n• About / Comments — any additional information you would like other members to know',
      },
      {
        heading: 'Saving Your Changes',
        body: 'After making any changes, scroll to the bottom of the Personal Details card and tap the Save Changes button. A confirmation message will appear once saved. If required fields (first name, last name) are left empty, you will be prompted to fill them in before saving.',
      },
      {
        heading: 'View in Family Tree',
        body: 'If the admin team has linked your profile to a node in the Bazidpur family tree, a purple "View in Family Tree 🌳" button will appear near the top of your profile page. Tap it to go directly to the Family Tree screen and find your place in the family.',
      },
      {
        heading: 'Privacy Policy',
        body: 'Tap the Privacy Policy button (purple text, between the Details card and the Sign Out button) to read the full privacy policy.',
      },
      {
        heading: 'Blocked Members',
        body: 'If you have blocked any members, a Blocked Members button appears on your profile screen. Tap it to see the full list of people you have blocked. To unblock someone, tap their name and confirm — their content will become visible to you again immediately.',
      },
      {
        heading: 'Signing Out',
        body: 'Tap the red Sign Out button at the bottom of the profile screen to sign out. You can also sign out from any screen using the door icon in the top-right of the purple header bar. After signing out, you are returned to the Home screen as a visitor.',
      },
      {
        heading: 'Deleting Your Account',
        body: 'You have the right to permanently delete your account and personal data at any time.\n\nTo delete your account:\n\n1. Open your Profile screen (tap your avatar in the top-right corner)\n2. Scroll to the very bottom, below the Sign Out button\n3. Tap "Delete Account" (small grey text)\n4. Read the confirmation message carefully — this action is permanent\n5. Tap "Yes, Delete My Account" to confirm\n6. Your account is deleted immediately\n\nWhat happens when you delete:\n\n• Your personal profile data is permanently removed from our servers\n• Your name is removed from all community content you posted\n• Your login credentials are erased — you cannot recover the account\n• Posts, photos, and contributions you made to the community may remain in anonymised form to preserve community history\n\nThis action cannot be undone. If you simply wish to take a break, consider signing out instead. If you have questions before deleting, contact us via the ✉️ envelope icon in the top bar.',
      },
    ],
  },

  // ── Joining (visitors / pending) ──────────────────────────────
  {
    id: 'joining',
    icon: '✋',
    title: 'Joining Bazidpur',
    onlyFor: ['visitor', 'pending'],
    items: [
      {
        heading: 'Who Can Join',
        body: 'Bazidpur.com (Bazidpur App) is a private community platform for people with a genuine connection to Bazidpur, Bihar, India. This includes direct descendants of Bazidpur families, relatives, and those with verifiable family or historical ties to the village. Each application is reviewed individually by the admin team.',
      },
      {
        heading: 'How to Apply — Step by Step',
        body: '1. Tap the Join › button in the top bar, or the Join the Community button on the Home screen\n2. The Sign Up form opens\n3. Enter your First Name and Last Name (required)\n4. Select your Gender using the Male / Female / Other selector\n5. Tap the Date of Birth field to pick your date using the native date picker (optional)\n6. Enter your Email Address — this will be your login username\n7. Choose a Password — must be at least 8 characters long\n8. Re-enter your password in the Confirm Password field\n9. Select your Country, State / Province, and City from the location fields\n10. In the Link to Bazidpur field, explain your connection — e.g. "My grandfather, Mehdi Hasan, was from Bazidpur"\n11. Tick the Privacy Policy checkbox — tap the Privacy Policy link to read it first if you wish\n12. Tap Create Account to submit your application',
      },
      {
        heading: 'After You Apply',
        body: 'Your account enters a pending state immediately after submission. You will not be able to sign in yet. The admin team will review your application, check your stated connection to Bazidpur, and make a decision.\n\nYou will receive an email at the address you provided once a decision has been made. If approved, the email will confirm your membership. If not approved, you will be informed.',
      },
      {
        heading: 'Once Approved',
        body: 'When your account is approved:\n\n1. Open the Bazidpur App\n2. Tap Sign In in the top bar (or on the Home screen)\n3. Enter your email address and password\n4. Tap Sign In\n5. You will be taken to the Home screen as a member\n6. The 👥 Community tab will now appear in the bottom bar\n7. Tap it to access the full member hub — gallery, poetry, family tree, memoirs, forum, and more',
      },
      {
        heading: 'Forgot Your Password',
        body: 'If you cannot remember your password:\n\n1. Tap Sign In\n2. Below the password field, tap Forgot password?\n3. Enter your registered email address\n4. Tap Send reset link\n5. Check your email inbox (and spam folder) for the reset email\n6. Tap the link in the email to set a new password\n7. Return to the app and sign in with your new password',
      },
      {
        heading: 'What You Can Browse as a Visitor',
        body: 'While waiting for approval — or if you are browsing without an account — the following sections are open to you:\n\n• 🏡 Home screen\n• About Bazidpur\n• Zahoor Ali tribute page\n• 📷 Media tab\n• Contact Us form (✉️ in the top bar)\n• Privacy Policy\n• This Help screen\n\nAll Community features — The Gallery, Rhymes & Roots, Memoirs, Reading Room, The Forum, Family Tree, and Lineage — require a signed-in, approved member account.',
      },
    ],
  },

  // ── Admin (admin / superadmin) ────────────────────────────────
  {
    id: 'admin',
    icon: '⚙️',
    title: 'Admin Panel',
    onlyFor: ['admin', 'superadmin'],
    items: [
      {
        heading: 'Accessing the Admin Panel',
        body: 'The Admin panel is available to users with the admin or superadmin role. From the Community hub, tap the ⚙️ Admin tile. The panel is a dedicated area for managing all platform content and members.',
      },
      {
        heading: 'Members — Reviewing Applications',
        body: 'The Members section shows all registered users grouped by status:\n\n• Pending — new applications awaiting your review\n• Active Members — approved members with full access\n• Admins — users with admin privileges\n\nTo review a pending application, tap the member\'s name to view their submitted details — name, email, location, link to Bazidpur, and any comments. Read their connection statement carefully before deciding.',
      },
      {
        heading: 'Members — Approving or Rejecting',
        body: 'Once you have reviewed an application:\n\n• Tap Approve to grant member access. The applicant receives an email notification and can immediately sign in\n• Tap Reject to decline. The applicant is notified by email\n\nYou can also suspend or revoke an existing member\'s access if they violate community standards.',
      },
      {
        heading: 'Family Tree — Adding a Person',
        body: 'To add a new person to the family tree:\n\n1. Open Admin → Family Tree\n2. Tap the + Add button\n3. Fill in: Full Name (required), Gender, Date of Birth (use the date picker), Date of Death (if applicable), a short Description, and the Parent (select from existing nodes to set the position in the tree)\n4. Tap Save to add them to the tree\n\nThe new node will appear under their selected parent immediately.',
      },
      {
        heading: 'Family Tree — Editing a Person',
        body: 'To update an existing family tree node:\n\n1. Find the person in the tree list\n2. Tap their node to open the detail/edit panel\n3. Tap any field to update it — name, gender, dates, description, or parent\n4. Date of Birth and Date of Death use the native date picker (scroll wheel on iPhone, calendar on Android). Both default to 1 January 1950 if no date is currently set\n5. Tap Save to apply your changes',
      },
      {
        heading: 'Family Tree — Deleting a Person',
        body: 'To remove a person from the tree:\n\n1. Open their node in the edit panel\n2. Tap Delete\n3. Confirm the action\n\nWarning: deletion cannot be undone. Deleting a parent node will not automatically delete their children, but those children will lose their parent reference and may appear detached in the tree. Consider reassigning children before deleting a parent node.',
      },
      {
        heading: 'App Statistics',
        body: 'The App Stats screen gives a real-time dashboard of platform activity:\n\n• Total registered users (all roles)\n• Total approved members\n• Pending applications count\n• Admin user count\n• Family tree node count\n• Total community photos and videos\n• Photo album count and album photo count\n• Timeless Moments video count\n• Forum thread and reply totals\n• Reading Room / Library book count\n• Contact submissions (total and unread)\n\nUse this to monitor platform growth and spot any urgent items (e.g. a spike in pending applications or unread contact messages).',
      },
      {
        heading: 'Media Management',
        body: 'The Admin Media section allows you to upload, remove, and reorder the photos and videos that appear in the public-facing Media tab. Use this to keep the public media section current and representative of Bazidpur.',
      },
      {
        heading: 'Library / Reading Room',
        body: 'Admin can add new books, journals, and articles to the Reading Room via the Library admin section. Each entry requires a title, description, and either text content or an external link. You can also remove or update existing entries.',
      },
      {
        heading: 'Timeless Moments',
        body: 'To add a video to the Timeless Moments section:\n\n1. Open Admin → Moments\n2. Tap Add Moment\n3. Enter the title, a description, and the YouTube video URL\n4. Set a display order\n5. Tap Save\n\nThe moment will appear in the Timeless Moments screen for all members. To remove or edit a moment, tap it in the admin list and update or delete it.',
      },
      {
        heading: 'Flagged Content',
        body: 'The Flagged Content screen collects all reports submitted by members. Reports are grouped into two tabs:\n\n• Pending — reports waiting for admin review\n• Resolved — reports you have already acted on (saved as an audit trail)\n\nFor each report you can see: the content type (thread, reply, comment, photo, etc.), the reason the member gave, who reported it, and when.\n\nTap View Content to jump directly to the flagged item. Then choose one of three actions:\n\n• ✅ No action needed — the content is fine; the reporter is emailed\n• ⚠️ Warning sent — the content breached guidelines but does not warrant suspension\n• 🚫 Suspend the member — the member is suspended immediately and signed out\n\nOptionally add private notes, then tap Save Action. The report moves to the Resolved tab.',
      },
      {
        heading: 'Contact Submissions',
        body: 'The Contacts admin section shows all messages submitted via the Contact Us form (✉️). Each submission shows the sender\'s name, email, subject, and full message, along with the submission date and time.\n\nUnread submissions are highlighted. Tap a submission to mark it as read. Use this section to respond to member queries or follow up with potential new members.',
      },
      {
        heading: 'WhatsApp',
        body: 'The WhatsApp admin section provides tools for managing and broadcasting messages to the Bazidpur community WhatsApp group. Use this for community announcements and updates.',
      },
      {
        heading: 'Invitations',
        body: 'The Invite section allows admins to send direct membership invitations to individuals by email. An invited person receives a link that bypasses the standard application form and takes them directly to an expedited sign-up flow. Use this for known community members you want to bring on board directly.',
      },
      {
        heading: 'Member Flag History',
        body: 'When viewing a member\'s profile card in the Members section of the web dashboard, a "Flag History" section appears at the bottom. It shows:\n\n• Reports filed by that member against other content\n• Reports filed against that member\'s content, with the resolution verdict\n\nThis gives admins a quick picture of a member\'s reporting behaviour and whether they have been subject to moderation actions in the past.',
      },
      {
        heading: 'Linking Members to the Family Tree',
        body: 'In the web admin dashboard, go to "Tree ↔ Member Links". This page lists every node in the family tree. For any node not yet linked, select the corresponding app member from the dropdown and tap Link.\n\nOnce linked, the member will see a "View in Family Tree 🌳" button on their profile screen, which takes them directly to the family tree.',
      },
      {
        heading: 'Timeless Moments Albums',
        body: 'In the web admin, open Timeless Moments and tap "Manage Albums →". From there you can:\n\n• Create new albums with a title and description\n• Rename, hide, or delete albums\n• Switch to the "Assign Photos" or "Assign Videos" tab to bulk-move photos/videos into an album (click to select, choose a destination album, then tap Move)\n\nAlbums appear as the first tab in the Timeless Moments screen for members.',
      },
    ],
  },
]

// ── Role label ────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, { label: string; colour: string; bg: string }> = {
  visitor:    { label: 'Visitor',      colour: '#6b7280', bg: '#f3f4f6' },
  pending:    { label: 'Pending',      colour: '#92400e', bg: '#fef3c7' },
  member:     { label: 'Member',       colour: '#065f46', bg: '#d1fae5' },
  admin:      { label: 'Admin',        colour: '#1d4ed8', bg: '#dbeafe' },
  superadmin: { label: 'Super Admin',  colour: '#6d28d9', bg: '#ede9fe' },
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Polyline
        points={open ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}
        stroke="#9ca3af"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export default function HelpScreen() {
  const { session, user } = useAuth()
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  const effectiveRole = session ? (user?.role ?? 'pending') : 'visitor'
  const roleInfo = ROLE_LABELS[effectiveRole] ?? ROLE_LABELS.visitor

  const sections = ALL_SECTIONS.filter(s =>
    !s.onlyFor || s.onlyFor.includes(effectiveRole as UserRole)
  )

  function toggle(id: string) {
    setOpenIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <PurpleHeader title="Help" showBack />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* Role badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <View style={{ backgroundColor: roleInfo.bg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: roleInfo.colour }}>
              {roleInfo.label}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: '#9ca3af', flex: 1 }}>
            Showing help relevant to your account level
          </Text>
        </View>

        {/* Accordion sections */}
        {sections.map(section => {
          const open = openIds.has(section.id)
          return (
            <View
              key={section.id}
              style={{
                backgroundColor: '#fff',
                borderRadius: 14,
                marginBottom: 10,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              {/* Header */}
              <TouchableOpacity
                onPress={() => toggle(section.id)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  gap: 12,
                }}
              >
                <Text style={{ fontSize: 22 }}>{section.icon}</Text>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: '#111827' }}>
                  {section.title}
                </Text>
                <ChevronIcon open={open} />
              </TouchableOpacity>

              {/* Body */}
              {open && (
                <View style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 }}>
                  {section.items.map((item, i) => (
                    <View key={i} style={{ marginTop: 14 }}>
                      {item.heading && (
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#2d1b69', marginBottom: 5 }}>
                          {item.heading}
                        </Text>
                      )}
                      <Text style={{ fontSize: 13, color: '#4b5563', lineHeight: 21 }}>
                        {item.body}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}
