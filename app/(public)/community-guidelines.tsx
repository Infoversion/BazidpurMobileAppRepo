import { View, Text, ScrollView } from 'react-native'
import { PurpleHeader } from '@/components/PurpleHeader'

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
        {number}. {title}
      </Text>
      {children}
    </View>
  )
}

function Para({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 22, marginBottom: 8 }}>
      {children}
    </Text>
  )
}

function Bullet({ children }: { children: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 5 }}>
      <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 1 }}>•</Text>
      <Text style={{ flex: 1, fontSize: 14, color: '#4b5563', lineHeight: 22 }}>{children}</Text>
    </View>
  )
}

export default function CommunityGuidelinesScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <PurpleHeader title="Community Guidelines" showBack />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

        <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 20 }}>Last updated: June 2026</Text>

        <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 22, marginBottom: 20 }}>
          Bazidpur is a private digital home for the families of Bazidpur village and the wider diaspora. We want this app to feel like a respectful family gathering — a place to share heritage, memories, photos, poetry, and conversation. These guidelines apply to everything you post: forum threads and replies, photo and video albums, memoirs, poetry, comments, and profile information.
        </Text>

        <Section number="1" title="Treat every member with respect">
          <Para>This community spans generations, regions, and viewpoints. Disagreement is fine; disrespect is not.</Para>
          <Bullet>No harassment, bullying, slurs, threats, or personal attacks.</Bullet>
          <Bullet>No content that demeans people based on religion, sect, gender, caste, region, language, or appearance.</Bullet>
          <Bullet>No hate speech or content that incites violence.</Bullet>
        </Section>

        <Section number="2" title="Keep content appropriate for a family audience">
          <Bullet>No nudity, sexual, or sexually suggestive content.</Bullet>
          <Bullet>No graphic violence, gore, or disturbing imagery.</Bullet>
          <Bullet>No promotion of illegal activity, drugs, gambling, or weapons.</Bullet>
          <Bullet>No content glorifying self-harm.</Bullet>
        </Section>

        <Section number="3" title="Respect privacy">
          <Para>Many members are elders and minors. Be careful with what you share about others.</Para>
          <Bullet>Do not post photos of someone without their consent (or the consent of a parent/guardian for minors).</Bullet>
          <Bullet>Do not share private contact details, home addresses, or financial information of others.</Bullet>
          <Bullet>If you want a photo or post taken down, contact us — see the contact page.</Bullet>
        </Section>

        <Section number="4" title="Be honest">
          <Bullet>Don't impersonate other people, living or deceased.</Bullet>
          <Bullet>Don't spread misinformation about people, families, lineage, or village history. If you're unsure, mark it as a memory or a story rather than a fact.</Bullet>
          <Bullet>Don't post spam, repetitive promotional content, or unrelated marketing.</Bullet>
        </Section>

        <Section number="5" title="Respect copyright">
          <Bullet>Only post photos, poetry, audio, video, or writing that you own or have permission to share.</Bullet>
          <Bullet>If you share another person's work (e.g. a poem by a known poet, a YouTube video), credit them and link to the original where possible.</Bullet>
        </Section>

        <Section number="6" title="Reporting and moderation">
          <Para>If you see content that breaks these guidelines, tap the small flag icon (⚑) on it. Reports are reviewed by our admin team within 48 hours.</Para>
          <Para>You can also block another member to stop seeing their content. From a member's name or post, choose "Block this user." You can unblock anyone later from your profile.</Para>
          <Para>Admin actions on a report can include: hiding the content from other members, deleting it, contacting the poster, or — for repeated or severe breaches — removing the member's account.</Para>
        </Section>

        <Section number="7" title="Zero tolerance">
          <Para>The following will result in immediate removal and account suspension, without warning:</Para>
          <Bullet>Child sexual abuse material (CSAM) — this is also reported to the relevant authorities.</Bullet>
          <Bullet>Credible threats of violence against a person or group.</Bullet>
          <Bullet>Doxxing — publishing someone's private information to harm them.</Bullet>
          <Bullet>Repeated, deliberate harassment of another member after a warning.</Bullet>
        </Section>

        <Section number="8" title="If something goes wrong">
          <Para>We are a small volunteer team. Mistakes will happen and so will disagreements. If you feel an admin decision was unfair, write to us through the Contact page and we will look at it again.</Para>
        </Section>

        <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 20, marginTop: 8 }}>
          By using Bazidpur, you agree to follow these guidelines. They are read together with our Privacy Policy. We may update them from time to time; the "Last updated" date at the top will reflect the latest revision.
        </Text>

      </ScrollView>
    </View>
  )
}
