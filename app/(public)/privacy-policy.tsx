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

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#1f2937', marginTop: 8, marginBottom: 6 }}>
      {children}
    </Text>
  )
}

function Para({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 22, marginBottom: 8 }}>
      {children}
    </Text>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
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

        <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 20 }}>Last updated: June 2026</Text>

        <Section number="1" title="Introduction">
          <Para>
            This Privacy Policy (the &ldquo;Policy&rdquo;) describes how Bazidpur.com and the Bazidpur mobile
            application (together, &ldquo;Bazidpur&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;)
            collect, store, process, disclose, and protect the personal information of registered members and
            visitors (&ldquo;you&rdquo; or &ldquo;Member&rdquo;). By accessing the platform, registering for an
            account, or using any feature, you acknowledge that you have read, understood, and agreed to this
            Policy. If you do not agree, please discontinue use of the platform.
          </Para>
          <Para>
            Bazidpur is a private community heritage platform serving members and descendants of families connected
            to Bazidpur village (Nawada district, Bihar, India) and the wider diaspora. We process personal
            information in accordance with this Policy and applicable data protection law, including the
            Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023 of India, the
            General Data Protection Regulation (EU) 2016/679 (where applicable), the California Consumer Privacy
            Act 2018 (where applicable), and the laws of any other jurisdiction in which our Members reside.
          </Para>
        </Section>

        <Section number="2" title="Information We Collect">
          <Para>
            We collect only the minimum personal information reasonably necessary to provide and maintain the
            Bazidpur service. Information falls into the following categories:
          </Para>

          <SubHeading>2.1 Identification Data</SubHeading>
          <Bullet>First name, last name, and (optionally) date of birth</Bullet>
          <Bullet>Sex / gender</Bullet>
          <Bullet>A profile photograph, where you choose to provide one</Bullet>
          <Bullet>Your family link to Bazidpur (e.g., &ldquo;grandson of [name]&rdquo;)</Bullet>

          <SubHeading>2.2 Contact Data</SubHeading>
          <Bullet>Email address</Bullet>
          <Bullet>City, state / region, and country of residence</Bullet>

          <SubHeading>2.3 Authentication Data</SubHeading>
          <Bullet>Hashed password (we do not store passwords in plain text and cannot recover them)</Bullet>
          <Bullet>Session tokens, login timestamps, and IP address at the time of login</Bullet>

          <SubHeading>2.4 User-Generated Content</SubHeading>
          <Bullet>Photographs and media files you upload to personal or community albums</Bullet>
          <Bullet>Forum threads, replies, and attached media</Bullet>
          <Bullet>Poetry, memoirs, and other written submissions</Bullet>
          <Bullet>Comments, likes, reactions, and reports of content posted by others</Bullet>

          <SubHeading>2.5 Technical Data</SubHeading>
          <Bullet>IP address (for security, abuse prevention, and rate limiting)</Bullet>
          <Bullet>Device type, operating system, and application version</Bullet>
          <Bullet>Approximate geographic location derived from IP, where relevant for safety</Bullet>

          <SubHeading>2.6 Communication Records</SubHeading>
          <Bullet>Records of communications between you and our administration team via the Contact form</Bullet>
          <Bullet>Notification emails we send to you about your account, content reports, or moderation actions</Bullet>

          <Para>We do not collect financial or payment information. Membership is provided free of cost.</Para>
        </Section>

        <Section number="3" title="Legal Basis for Processing">
          <Para>We process your personal data on one or more of the following legal bases under applicable law:</Para>
          <Bullet>Your explicit consent, including consent to this Policy and the Community Guidelines at sign-up;</Bullet>
          <Bullet>Performance of our contractual obligation to provide the platform service to you;</Bullet>
          <Bullet>Compliance with legal obligations to which we are subject; and</Bullet>
          <Bullet>Our legitimate interest in maintaining a safe, lawful, and respectful community space.</Bullet>
        </Section>

        <Section number="4" title="How We Use Your Information">
          <Para>Your personal data is used solely for the following purposes:</Para>
          <Bullet>Creating and managing your member account;</Bullet>
          <Bullet>Providing access to community features (forum, photo and video albums, family tree, poetry, memoirs, and similar);</Bullet>
          <Bullet>Displaying your name and approximate location on the community world map, only where you have provided consent;</Bullet>
          <Bullet>Communicating with you about your account, membership status, content reports, or administrative matters;</Bullet>
          <Bullet>Investigating and responding to violations of our Community Guidelines or any applicable law;</Bullet>
          <Bullet>Improving the safety, security, and usability of the platform.</Bullet>
          <Para>
            We do not sell, rent, lease, or share your personal information with any third party for advertising,
            marketing, or other commercial purposes.
          </Para>
        </Section>

        <Section number="5" title="Sharing and Disclosure of Information">
          <Para>
            We share your personal data only with the following categories of recipients, and only to the extent
            strictly necessary:
          </Para>

          <SubHeading>5.1 Service Providers (Data Processors)</SubHeading>
          <Bullet>Supabase, Inc. — authentication, user database, and real-time services, processed under Supabase&apos;s Data Processing Addendum;</Bullet>
          <Bullet>Cloudflare, Inc. (Cloudflare R2) — storage of photographs and media files;</Bullet>
          <Bullet>Vercel, Inc. — hosting of the website and serverless functions;</Bullet>
          <Bullet>Resend, Inc. — delivery of transactional and notification emails on our behalf.</Bullet>
          <Bullet>Expo (650 Industries, Inc.) — delivery of push notifications to your device via the Expo Push Service, which in turn relays to Apple Push Notification Service (APNs, iOS) and Firebase Cloud Messaging (FCM, Android).</Bullet>
          <Para>
            Each of these providers operates under written data-processing agreements that limit their use of your
            personal data to the services we have contracted them to provide.
          </Para>

          <SubHeading>5.2 Legal and Regulatory Disclosures</SubHeading>
          <Para>
            We may disclose your personal data where required to do so by law, by a court of competent jurisdiction,
            or by a regulatory authority — for example, in response to a subpoena, lawful court order, or
            law-enforcement request. We will, where legally permitted, notify you before any such disclosure.
          </Para>

          <SubHeading>5.3 Protection of Rights and Safety</SubHeading>
          <Para>
            We may also disclose personal data where necessary to protect the rights, property, or safety of
            Bazidpur, our Members, or any other person — including in connection with the investigation,
            prevention, or remediation of fraud, security issues, or violations of this Policy or the Community
            Guidelines.
          </Para>

          <Para>We do not transfer your personal data to any third party for any other purpose.</Para>
        </Section>

        <Section number="6" title="User-Generated Content and Photo Upload Policy">
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' }}>
            <Para>
              Members may upload photographs and other media to their personal albums and to other designated
              sections of the platform. By uploading any photograph or media file, you agree to the following terms:
            </Para>
            <PolicyItem
              title="Licence to display uploaded media."
              body="By uploading, you grant Bazidpur.com (Bazidpur App) a permanent, non-exclusive, royalty-free, worldwide licence to store, display, distribute, and use the content on the platform for the purposes set out in this Policy. You retain ownership of and copyright in the content you upload."
            />
            <PolicyItem
              title="Source of photographs and right to upload."
              body="Members are solely responsible for ensuring that they own, or have obtained all necessary rights, permissions, and consents to upload and share, each photograph or media file submitted. Bazidpur is not responsible for verifying the original source or ownership of uploaded content."
            />
            <PolicyItem
              title="Decent and appropriate content."
              body="We expect all Members to upload content that is decent, respectful, and appropriate for a family community. Content that is offensive, sexually explicit, defamatory, unlawful, or otherwise inappropriate is strictly prohibited."
            />
            <PolicyItem
              title="Right to remove content."
              body="Bazidpur reserves the right to remove, hide, or delete any content at any time, with or without notice, at the sole discretion of the administration team."
            />
            <PolicyItem
              title="Right to refuse or revoke membership."
              body="We reserve the right to refuse membership applications or to suspend or terminate an existing membership where a Member is found to be in violation of this Policy, the Community Guidelines, or the laws of any applicable jurisdiction."
            />
          </View>
        </Section>

        <Section number="7" title="Reporting, Moderation, and Action on Flagged Content">
          <Para>
            Bazidpur provides a content-flagging mechanism on every category of user-generated content, including
            forum threads and replies, photo albums and individual photographs, video albums and embedded videos,
            poetry submissions, memoirs, comments, and any other content posted by a Member. We treat the integrity
            of this process as fundamental to the safety of our community.
          </Para>

          <SubHeading>7.1 Individual Review of Every Report</SubHeading>
          <Para>
            Each report submitted by a Member is reviewed individually by our administration team. No report is
            dismissed without examination. We do not use automated moderation as a substitute for human review.
          </Para>

          <SubHeading>7.2 Review Timeframe</SubHeading>
          <Para>
            We endeavour to review every flagged item within twenty-four (24) hours of submission. In exceptional
            cases involving severe or time-sensitive content (including credible threats of violence, child safety
            concerns, or doxxing), review and action are taken on an expedited basis.
          </Para>

          <SubHeading>7.3 Actions We May Take</SubHeading>
          <Para>Following review, the administration team may take any of the following actions, as appropriate:</Para>
          <Bullet>No action, where the content is found to comply with our Community Guidelines and applicable law;</Bullet>
          <Bullet>Issuance of a written warning to the Member who posted the content;</Bullet>
          <Bullet>Removal or hiding of the offending content from the platform;</Bullet>
          <Bullet>Temporary suspension of the Member&apos;s account, restricting access pending further review;</Bullet>
          <Bullet>Permanent termination of the Member&apos;s account, in cases of serious or repeated violations;</Bullet>
          <Bullet>Reporting to law-enforcement authorities, in cases involving suspected criminal conduct.</Bullet>

          <SubHeading>7.4 Notification of Outcome</SubHeading>
          <Para>
            Every reporter is notified of the outcome of their report by email, regardless of whether action was
            taken. Where action is taken against a Member, that Member is separately informed of the decision and
            the reason for it. We aim to close the loop on each report transparently and consistently, while
            protecting the confidentiality of the reporter.
          </Para>

          <SubHeading>7.5 Right of Appeal</SubHeading>
          <Para>
            A Member who disagrees with a decision made against their content or account may submit a written
            appeal to the administration team via the Contact page within fourteen (14) days of being notified.
            Appeals are reviewed by a different administrator wherever practicable, and our decision following
            appeal is final.
          </Para>

          <SubHeading>7.6 Blocking and Personal Filters</SubHeading>
          <Para>
            Independently of the formal flagging mechanism, Members may block any other Member directly from the
            platform&apos;s interface. A blocked Member&apos;s content will no longer be visible to the blocking party.
            Blocking is private — the blocked Member is not notified. Blocks may be reviewed and removed by the
            blocking Member at any time from the Profile screen.
          </Para>
        </Section>

        <Section number="8" title="Compliance with the Laws of Member Jurisdictions">
          <Para>
            Bazidpur deeply respects the rule of law in every country in which our Members reside or in which our
            services are accessed. We acknowledge that what constitutes lawful expression varies between
            jurisdictions, and we take this seriously.
          </Para>

          <SubHeading>8.1 Lawful Content Standard</SubHeading>
          <Para>Members agree that they will not upload, transmit, or store any content through the platform that:</Para>
          <Bullet>Violates any applicable law, statute, ordinance, or regulation of the country in which the Member resides;</Bullet>
          <Bullet>Violates the criminal laws of the Republic of India, in which our administration team is primarily located;</Bullet>
          <Bullet>Constitutes hate speech, incitement to violence, defamation, harassment, child sexual abuse material, infringement of copyright or trademark, fraudulent or misleading commercial activity, or any other content prohibited under applicable jurisdictional law.</Bullet>

          <SubHeading>8.2 Action Upon Notice of Local Law Violation</SubHeading>
          <Para>
            If the administration team is notified — whether by a Member, by a third party, or by any governmental
            or law-enforcement authority — of content on the platform that violates the law of the jurisdiction in
            which the affected Member or affected party resides, we will conduct a prompt review and, if the report
            is substantiated, take appropriate action. This may include removal of the content, suspension or
            termination of the responsible Member&apos;s account, and, where required, reporting to the relevant
            authorities.
          </Para>

          <SubHeading>8.3 No Safe Harbour for Unlawful Content</SubHeading>
          <Para>
            Bazidpur does not provide a safe harbour or refuge for any content that is unlawful under any
            applicable jurisdictional law. We reserve the absolute right to remove any such content immediately
            upon becoming aware of it, with or without prior notice to the responsible Member.
          </Para>

          <SubHeading>8.4 Specific Statutory References</SubHeading>
          <Para>Without limitation, Bazidpur operates in accordance with:</Para>
          <Bullet>The Information Technology Act, 2000, and the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 (India);</Bullet>
          <Bullet>The Digital Personal Data Protection Act, 2023 (India);</Bullet>
          <Bullet>The General Data Protection Regulation (EU) 2016/679, where Members reside in the European Economic Area or the United Kingdom;</Bullet>
          <Bullet>The California Consumer Privacy Act, 2018 (CCPA) and the California Privacy Rights Act, 2020 (CPRA), where Members reside in California;</Bullet>
          <Bullet>Applicable consumer protection, intellectual property, defamation, and criminal laws of jurisdictions in which our Members reside.</Bullet>
        </Section>

        <Section number="9" title="Cooperation with Law Enforcement">
          <Para>
            We cooperate fully with legitimate requests from law-enforcement agencies and judicial authorities,
            subject to the following:
          </Para>
          <Bullet>We require a valid legal instrument (court order, warrant, or equivalent recognised under the requesting jurisdiction&apos;s law) before disclosing any Member&apos;s personal data;</Bullet>
          <Bullet>Emergency disclosures may be made without prior legal process where there is a credible and imminent threat of harm to life or serious injury;</Bullet>
          <Bullet>We will inform the affected Member of any disclosure made about them where legally permissible.</Bullet>
          <Para>For all law-enforcement enquiries, please contact our designated Grievance Officer (see Section 20).</Para>
        </Section>

        <Section number="10" title="Your Rights as a User">
          <Para>
            Depending on the laws applicable in the jurisdiction in which you reside, you may have the following
            rights with respect to your personal data:
          </Para>
          <Bullet>The right to access the personal data we hold about you;</Bullet>
          <Bullet>The right to rectify inaccurate or incomplete personal data;</Bullet>
          <Bullet>The right to erase your personal data (the &ldquo;right to be forgotten&rdquo;);</Bullet>
          <Bullet>The right to restrict or object to the processing of your personal data;</Bullet>
          <Bullet>The right to data portability — to receive your personal data in a structured, commonly used, machine-readable format;</Bullet>
          <Bullet>The right to withdraw consent at any time, without prejudice to the lawfulness of processing carried out before withdrawal;</Bullet>
          <Bullet>The right to lodge a complaint with the data protection authority of the jurisdiction in which you reside.</Bullet>
          <Para>
            To exercise any of these rights, please contact us via the Contact page or our Grievance Officer (see
            Section 20). We will respond to verified requests within thirty (30) days, or such shorter period as may
            be required by applicable law.
          </Para>
        </Section>

        <Section number="11" title="Account Deletion">
          <Para>
            Members may request the deletion of their account and associated personal data at any time. Requests
            may be submitted via:
          </Para>
          <Bullet>The &ldquo;Delete Account&rdquo; option within the application (under Profile);</Bullet>
          <Bullet>The Contact page on the website;</Bullet>
          <Bullet>An email to the administration team.</Bullet>
          <Para>
            Upon receipt of a verified deletion request, we will permanently delete or irreversibly anonymise your
            personal data within thirty (30) days, save for data that we are required by law to retain (such as
            records of suspected criminal conduct retained for legitimate investigatory purposes).
          </Para>
        </Section>

        <Section number="12" title="Data Retention">
          <Para>
            We retain personal data only for as long as is necessary to provide our services and to comply with our
            legal obligations. Specifically:
          </Para>
          <Bullet>Account data is retained for the duration of your membership, and for up to thirty (30) days following account deletion to allow accidental-deletion recovery;</Bullet>
          <Bullet>User-generated content (forum posts, photographs, etc.) is retained while your account is active. Following deletion, public-section content may, at our discretion, be anonymised rather than removed, to preserve the integrity of community conversations;</Bullet>
          <Bullet>Suspension and moderation records are retained for a minimum of two (2) years for administrative and audit purposes;</Bullet>
          <Bullet>Reports of suspected criminal conduct, including those forwarded to law-enforcement authorities, are retained indefinitely.</Bullet>
        </Section>

        <Section number="13" title="International Data Transfers">
          <Para>
            Members of Bazidpur are located in many countries. By using the platform, you acknowledge and consent
            to the cross-border transfer of your personal data to and from India and to such other jurisdictions as
            may be necessary for the operation of the service.
          </Para>
          <Para>
            Where personal data is transferred from the European Economic Area or the United Kingdom to a third
            country, such transfer is conducted in accordance with the safeguards required by the General Data
            Protection Regulation (including Standard Contractual Clauses where applicable).
          </Para>
        </Section>

        <Section number="14" title="Push Notifications">
          <Para>
            The Bazidpur mobile application may send you push notifications regarding activity relevant to your
            account — for example, when a member replies to a thread you started, when an admin acts on a report
            you filed, or when your membership application is approved. Push notifications are entirely opt-in;
            they are never used for advertising or marketing.
          </Para>
          <Para>To support this feature, we store:</Para>
          <Bullet>A device-specific Expo push token issued by the operating system when you grant permission;</Bullet>
          <Bullet>The platform (iOS or Android) and a non-identifying device name, where available;</Bullet>
          <Bullet>Your category-by-category notification preferences (forum replies, photo comments, etc.);</Bullet>
          <Bullet>A log of notifications we have sent to you (subject, body, timestamp), accessible to you from the Notifications screen within the app.</Bullet>
          <Para>
            You may toggle individual categories or disable notifications entirely from Profile &rarr; Notification
            Settings within the application. You may also revoke the operating system&apos;s push permission at any
            time from your device&apos;s system settings; in that case, we retain your push token until the operating
            system invalidates it, but no further notifications will be delivered.
          </Para>
        </Section>

        <Section number="15" title="Data Security">
          <Para>
            We take reasonable and appropriate technical and organisational measures to protect your personal
            information from unauthorised access, alteration, disclosure, or destruction. These measures include:
          </Para>
          <Bullet>Encryption of data in transit using Transport Layer Security (TLS);</Bullet>
          <Bullet>Hashing of passwords using industry-standard algorithms (we do not store plain-text passwords);</Bullet>
          <Bullet>Role-based access controls to limit administrative access to personal data;</Bullet>
          <Bullet>Row-level security policies on our database to restrict data access at the record level;</Bullet>
          <Bullet>Use of reputable infrastructure providers with their own security certifications.</Bullet>
          <Para>
            However, no method of transmission over the Internet or method of electronic storage is completely
            secure, and we cannot guarantee absolute security. You play an important role in protecting your account
            by choosing a strong, unique password and by keeping your sign-in credentials confidential.
          </Para>
        </Section>

        <Section number="16" title="Cookies and Local Storage">
          <Para>
            On the website, we use a small number of strictly necessary cookies to maintain your login session and
            for cross-site request forgery protection. In the mobile application, we store an authentication token
            in the device&apos;s secure storage (Keychain on iOS, EncryptedSharedPreferences on Android).
          </Para>
          <Para>
            We do not use third-party advertising cookies, analytics cookies, behavioural tracking, or social-media
            tracking pixels.
          </Para>
        </Section>

        <Section number="17" title="Children's Privacy">
          <Para>
            Bazidpur is intended for use by adults (eighteen (18) years of age or older) and by members of the
            Bazidpur family community. We do not knowingly collect personal data from children under the age of
            thirteen (13), or under the age of sixteen (16) within the European Economic Area.
          </Para>
          <Para>
            If we become aware that a child has provided us with personal data in contravention of this Policy, we
            will delete that data immediately. Parents and guardians who become aware that their child has
            registered with the platform are requested to contact us so that the account may be removed.
          </Para>
        </Section>

        <Section number="18" title="Data Breach Notification">
          <Para>
            In the event of a data breach that poses a risk to the rights and freedoms of affected Members, we will
            notify the affected Members and the competent data-protection authority without undue delay and, where
            feasible, no later than seventy-two (72) hours after we have become aware of the breach, in accordance
            with applicable law.
          </Para>
        </Section>

        <Section number="19" title="Changes to This Policy">
          <Para>
            We may update this Privacy Policy from time to time to reflect changes in our practices, in the law, or
            in the services we provide. The &ldquo;Last updated&rdquo; date at the top of this page will reflect the
            latest revision.
          </Para>
          <Para>
            Material changes will be brought to your attention by a notice within the application or by email to
            the address associated with your account. Continued use of the platform after the effective date of any
            revised Policy constitutes acceptance of the revised terms.
          </Para>
        </Section>

        <Section number="20" title="Governing Law and Dispute Resolution">
          <Para>
            This Privacy Policy and any dispute arising out of or in connection with it shall be governed by and
            construed in accordance with the laws of the Republic of India, without regard to its conflict-of-laws
            principles. The courts of Nawada, Bihar, India shall have non-exclusive jurisdiction over any such
            dispute, without prejudice to the rights of Members to bring proceedings in the courts of the
            jurisdiction in which they reside, where required by applicable consumer protection law.
          </Para>
        </Section>

        <Section number="21" title="Grievance Officer and Contact">
          <Para>
            In accordance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code)
            Rules, 2021 of India, the following Grievance Officer is designated for the purpose of receiving and
            addressing complaints relating to this Policy or the platform:
          </Para>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', marginTop: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Nasir Ali — Grievance Officer, Bazidpur</Text>
            <Text style={{ fontSize: 14, color: '#374151', marginBottom: 2 }}>Email: support@bazidpur.com</Text>
            <Text style={{ fontSize: 14, color: '#374151', marginBottom: 8 }}>Web: https://www.bazidpur.com/contact</Text>
            <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 18 }}>
              Complaints are acknowledged within seventy-two (72) hours and resolved within fifteen (15) days, as
              required under Rule 3(2) of the said Rules.
            </Text>
          </View>
          <Para>
            For all other queries, please reach out via the Contact section in the app or on the website.
          </Para>
        </Section>

      </ScrollView>
    </View>
  )
}
