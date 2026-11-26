import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDoc } from '@/components/site/MarketingPage';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'What SmartPothole AI collects, why, who can see it and how to have it deleted. Camera video never leaves your phone.',
};

const GH = 'https://github.com/kazinayeem/smart-road-ai/issues';

export default function PrivacyPage() {
  return (
    <LegalDoc
      eyebrow="Legal"
      title="Privacy policy"
      updated="26 November 2026"
      intro="SmartPothole AI is built to collect as little as possible. Camera video stays on your phone. This page explains exactly what is collected, why, who can see it, and how to have it removed."
      sections={[
        {
          id: 'who', title: 'Who we are',
          body: (
            <>
              <p>SmartPothole AI (&quot;the service&quot;, &quot;we&quot;) is a <strong>pilot project in beta</strong>, designed, developed and led by Mohammad Ali Nayeem as a capstone project at Daffodil International University. It is <strong>not</strong> an official government service, although it is built so that a city corporation could use it.</p>
              <p>This policy covers the website at <code>cryptro.web.app</code>, the web dashboard and the SmartPothole Android app.</p>
            </>
          ),
        },
        {
          id: 'summary', title: 'The short version',
          body: (
            <ul>
              <li>Camera frames are analysed on your phone and thrown away. <strong>No photo or video is ever uploaded.</strong></li>
              <li>A pothole report contains a position, a time, the model&apos;s confidence, an estimated severity and your account ID.</li>
              <li>Your live location is shared only while you are inside a live companion session you started or joined.</li>
              <li>There are no adverts, no analytics trackers and no data sales.</li>
              <li>You can ask for your account to be deleted at any time.</li>
            </ul>
          ),
        },
        {
          id: 'collect', title: 'What we collect',
          body: (
            <>
              <table>
                <thead><tr><th>Data</th><th>What it is</th><th>Why</th></tr></thead>
                <tbody>
                  <tr><td>Account</td><td>Display name, username, email address, role (rider, city or contractor) and, if you choose one, your vehicle type.</td><td>To sign you in, show who made a report to city staff, and keep roles separate.</td></tr>
                  <tr><td>Pothole reports</td><td>Latitude and longitude, GPS accuracy, date and time seen, model confidence, estimated severity, detection source (camera or manual) and your account ID.</td><td>So the city can find, verify and repair the pothole, and so other riders can be warned.</td></tr>
                  <tr><td>Detection records</td><td>Each individual sighting of a pothole, with the same fields as a report.</td><td>To count how many riders confirmed a pothole and merge duplicates.</td></tr>
                  <tr><td>Repair activity</td><td>Status changes, notes, deadlines and which staff member or contractor made each change.</td><td>To keep an audit trail of every report from new to resolved.</td></tr>
                  <tr><td>Live companion sessions</td><td>The scanner&apos;s position, breadcrumb trail, detections and the session code, only while a session is running.</td><td>So the people you invited can follow the session live.</td></tr>
                  <tr><td>Push notification token</td><td>A device token from Firebase Cloud Messaging.</td><td>To send alerts such as &quot;new pothole detected&quot; during a live session.</td></tr>
                  <tr><td>Sign-in protection</td><td>A count of recent failed sign-in attempts per account.</td><td>To lock out repeated password guessing for 15 minutes.</td></tr>
                </tbody>
              </table>
            </>
          ),
        },
        {
          id: 'not-collect', title: 'What we do not collect',
          body: (
            <ul>
              <li>Camera photos or video, at any time.</li>
              <li>Your route history or a record of where you travel outside a report or a live session.</li>
              <li>Contacts, microphone audio, files or other apps&apos; data.</li>
              <li>Advertising IDs or analytics events. The website has no analytics or advertising scripts.</li>
            </ul>
          ),
        },
        {
          id: 'phone', title: 'Permissions on your phone',
          body: (
            <ul>
              <li><strong>Camera</strong>: to look for potholes. Frames are processed in memory on the phone and discarded.</li>
              <li><strong>Location</strong>: to attach a position to a report, warn you about potholes ahead and draw the drive map.</li>
              <li><strong>Notifications</strong>: for warnings and live companion alerts.</li>
              <li><strong>Internet</strong>: to upload reports and download maps. Reports are kept on the phone until they upload.</li>
            </ul>
          ),
        },
        {
          id: 'share', title: 'Who can see your data',
          body: (
            <>
              <ul>
                <li><strong>City corporation staff</strong> can see all reports, including the reporter&apos;s name, and the repair history.</li>
                <li><strong>Contractors</strong> can see only the reports assigned to them.</li>
                <li><strong>Other signed-in users</strong> see pothole positions, severity and status on the map. The rider screens do not show who reported a pothole, but report records, including the reporter&apos;s display name, can be read by any signed-in account during the pilot. Use a display name you are comfortable sharing.</li>
                <li><strong>People in your live session</strong> see your position only while the session runs.</li>
              </ul>
              <p>Roles and who can change what are enforced by the database&apos;s security rules, not just hidden in the app. We do not sell or rent personal data to anyone.</p>
            </>
          ),
        },
        {
          id: 'third', title: 'Services we rely on',
          body: (
            <>
              <p>The service uses these providers. Each handles data under its own privacy policy:</p>
              <ul>
                <li><strong>Google Firebase</strong> (Authentication, Realtime Database, Cloud Functions, Cloud Messaging, Hosting) stores accounts and reports and serves this website.</li>
                <li><strong>OpenStreetMap</strong> and <strong>OpenFreeMap</strong> provide map tiles. Your device requests tiles for the area on screen.</li>
                <li><strong>Google Fonts</strong> and <strong>unpkg</strong> serve fonts and the map stylesheet for the website.</li>
                <li><strong>YouTube</strong> serves the demo video, and only after you press play. We use YouTube&apos;s privacy-enhanced embed.</li>
              </ul>
              <p>When your browser or phone fetches anything from these services, they receive your IP address, as with any website.</p>
            </>
          ),
        },
        {
          id: 'retention', title: 'How long we keep it',
          body: (
            <ul>
              <li>Reports and their repair history are kept while the pilot runs, because the city needs them to track repairs.</li>
              <li>Live session data is only useful while the session runs and is not used afterwards.</li>
              <li>Accounts are kept until you ask for deletion or the pilot ends.</li>
            </ul>
          ),
        },
        {
          id: 'rights', title: 'Your choices and rights',
          body: (
            <>
              <ul>
                <li><strong>See or correct</strong> your profile at any time in the app or dashboard.</li>
                <li><strong>Stop sharing</strong> by leaving a live session, turning off detection, or revoking camera and location permission in Android settings.</li>
                <li><strong>Delete your account</strong> by <a href={GH} target="_blank" rel="noopener noreferrer">opening a request on GitHub</a> or contacting the project team. We remove your profile. Pothole positions you reported may be kept without your name, because the city relies on them for repairs.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'security', title: 'Security',
          body: (
            <p>Data travels over HTTPS. Access is controlled by Firebase Authentication and database security rules that are covered by automated tests. Sign-in errors are generic and repeated failures trigger a temporary lockout. No system is perfectly secure, and this is a pilot, so please do not store anything sensitive in report notes.</p>
          ),
        },
        {
          id: 'children', title: 'Children',
          body: <p>The service is not aimed at children under 13 and we do not knowingly collect their data. Young riders should use it only with a parent or guardian.</p>,
        },
        {
          id: 'cookies', title: 'Cookies and browser storage',
          body: <p>The website does not set advertising or analytics cookies. The small amount of storage it does use is described in the <Link href="/cookies">cookie policy</Link>.</p>,
        },
        {
          id: 'changes', title: 'Changes to this policy',
          body: <p>Because this is a pilot, this policy may change as features are added. The date at the top shows the latest version. Significant changes will be announced on this website.</p>,
        },
        {
          id: 'contact', title: 'Contact',
          body: <p>Questions or requests: <a href={GH} target="_blank" rel="noopener noreferrer">open an issue on the project&apos;s GitHub page</a>, or reach the project lead through <a href="https://nayeem.bornosoft.bd" target="_blank" rel="noopener">nayeem.bornosoft.bd</a>.</p>,
        },
      ]}
    />
  );
}
