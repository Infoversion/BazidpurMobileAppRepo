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

function PolicyItem({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
      <Text style={{ fontSize: 14, color: '#9ca3af', fontWeight: '700', marginTop: 1 }}>—</Text>
      <Text style={{ flex: 1, fontSize: 14, color: '#4b5563', lineHeight: 22 }}>
        <Text style={{ fontWeight: '600', color: '#111827' }}>{title} </Text>
        {body}
      </Text>
    </View>
  )
}

export default function PrivacyPolicyScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <PurpleHeader title="Privacy Policy" showBack />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

        <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 20 }}>Last updated: May 2026</Text>

        <Section number="1" title="Introduction">
          <Para>
            Welcome to Bazidpur.com (Bazidpur App) — the official community and family heritage platform for people with
            roots in Bazidpur, Bihar, India. This Privacy Policy explains how we collect, use, and protect
            your personal information when you use our app and website. By using Bazidpur.com (Bazidpur App), you agree to the
            practices described in this policy.
          </Para>
        </Section>

        <Section number="2" title="Information We Collect">
          <Para>When you register as a member, we collect:</Para>
          <Bullet>Your name and email address</Bullet>
          <Bullet>Your location (country, state, city) for display on the community world map</Bullet>
          <Bullet>A profile photo, if you choose to upload one</Bullet>
          <Bullet>Any content you contribute — photos, album images, comments, and likes</Bullet>
          <Para>We do not collect payment information. Membership is free.</Para>
        </Section>

        <Section number="3" title="How We Use Your Information">
          <Bullet>To create and manage your member account</Bullet>
          <Bullet>To display your location on the community world map (with your consent)</Bullet>
          <Bullet>To allow you to participate in community features</Bullet>
          <Bullet>To communicate with you about your membership or account</Bullet>
          <Para>
            We do not sell, rent, or share your personal information with third parties for marketing purposes.
          </Para>
        </Section>

        <Section number="4" title="Photo & Media Upload Policy">
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' }}>
            <Para>
              Members may upload photos to their personal albums and other designated sections of the site.
              By uploading any photo or media file, you agree to the following terms:
            </Para>
            <PolicyItem
              title="Ownership of uploaded media."
              body="All photos and media uploaded by members become the property of Bazidpur.com (Bazidpur App). By uploading, you grant Bazidpur.com (Bazidpur App) a permanent, non-exclusive licence to store, display, and use that content on the website."
            />
            <PolicyItem
              title="Source of photos."
              body="Bazidpur.com (Bazidpur App) is not responsible for the original source or ownership of photos uploaded by members. Members are solely responsible for ensuring they have the right to upload and share any image they submit."
            />
            <PolicyItem
              title="Decent and appropriate content."
              body="We expect all members to upload photos that are decent, respectful, and appropriate for a family community website. Photos that are offensive, inappropriate, or unrelated to Bazidpur are not permitted."
            />
            <PolicyItem
              title="Right to remove content."
              body="Bazidpur.com (Bazidpur App) reserves the right to remove, hide, or delete any photo or media at any time, without notice, at the sole discretion of the administration team."
            />
            <PolicyItem
              title="Right to refuse or revoke membership."
              body="We reserve the right to refuse membership applications or revoke an existing membership if a member is found to be in violation of this policy or the general spirit and values of the Bazidpur community."
            />
          </View>
        </Section>

        <Section number="5" title="Data Security">
          <Para>
            We take reasonable steps to protect your personal information. Your account is secured
            with authentication provided by Supabase. Media files are stored on Cloudflare R2.
            However, no method of transmission or storage is completely secure, and we cannot
            guarantee absolute security.
          </Para>
        </Section>

        <Section number="6" title="Cookies">
          <Para>
            We use essential cookies to maintain your login session. We do not use tracking or
            advertising cookies.
          </Para>
        </Section>

        <Section number="7" title="Children's Privacy">
          <Para>
            Bazidpur.com (Bazidpur App) is intended for use by adults and family members with a genuine connection
            to Bazidpur. We do not knowingly collect personal information from children under 13.
          </Para>
        </Section>

        <Section number="8" title="Changes to This Policy">
          <Para>
            We may update this Privacy Policy from time to time. Changes will be posted on this
            page with an updated date. Continued use of the app after changes are posted
            constitutes acceptance of the revised policy.
          </Para>
        </Section>

        <Section number="9" title="Contact Us">
          <Para>
            If you have any questions about this Privacy Policy or how your data is handled,
            please reach out through the Contact Us section in the app.
          </Para>
        </Section>

      </ScrollView>
    </View>
  )
}
