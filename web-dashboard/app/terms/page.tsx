import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDoc } from '@/components/site/MarketingPage';

export const metadata: Metadata = {
  title: 'Terms and conditions',
  description: 'The rules for using the SmartPothole AI pilot: beta software, safe use while riding, honest reports and account roles.',
};

const GH = 'https://github.com/kazinayeem/smart-road-ai/issues';

export default function TermsPage() {
  return (
    <LegalDoc
      eyebrow="Legal"
      title="Terms and conditions"
      updated="26 November 2026"
      intro="Please read these terms before using SmartPothole AI. By creating an account, installing the app or using the dashboard, you agree to them."
      sections={[
        {
          id: 'about', title: 'About the service',
          body: (
            <>
              <p>SmartPothole AI is a <strong>pilot project in beta</strong>, designed, developed and led by Mohammad Ali Nayeem as a capstone project at Daffodil International University. It includes an Android app that detects potholes, a web dashboard for city staff and contractors, and this website.</p>
              <p>It is not an official government service and is not operated by any city corporation.</p>
            </>
          ),
        },
        {
          id: 'beta', title: 'Beta software, provided as is',
          body: (
            <>
              <p>Features, data and detection accuracy are still being tested. The service may change, pause or stop at any time, and data may be reset during the pilot.</p>
              <p>The service is provided <strong>&quot;as is&quot; and &quot;as available&quot;</strong>, without warranties of any kind, including that it will be accurate, uninterrupted or error-free.</p>
            </>
          ),
        },
        {
          id: 'safety', title: 'Road safety comes first',
          body: (
            <ul>
              <li>SmartPothole AI is <strong>not a safety device</strong>. It can miss potholes and can report things that are not potholes.</li>
              <li>A road with no reports is <strong>not</strong> a safe road. Always ride or drive for the road you can see.</li>
              <li>Mount your phone securely before you set off. <strong>Do not touch or look at the phone while moving.</strong> Warnings are spoken so you do not have to.</li>
              <li>Obey all traffic laws and the instructions of traffic police. Nothing in the app overrides them.</li>
              <li>Do not stop in an unsafe place to mark a pothole.</li>
            </ul>
          ),
        },
        {
          id: 'accounts', title: 'Your account',
          body: (
            <ul>
              <li>Give accurate account details and keep your password private. You are responsible for activity on your account.</li>
              <li>New accounts are rider accounts. City and contractor roles are granted only by an administrator.</li>
              <li>Do not try to give yourself a role you were not granted, access other people&apos;s data, or get around the security rules.</li>
            </ul>
          ),
        },
        {
          id: 'conduct', title: 'Acceptable use',
          body: (
            <>
              <p>You agree not to:</p>
              <ul>
                <li>Submit false, fake or deliberately misleading reports.</li>
                <li>Use the service to track, follow or harass anyone, including through live companion sessions.</li>
                <li>Put personal, offensive or illegal content in names, notes or any other field.</li>
                <li>Overload, attack, scrape or reverse-engineer the service&apos;s backend, or use automated tools against it.</li>
                <li>Use the service for anything unlawful.</li>
              </ul>
              <p>We may suspend or remove accounts that break these rules.</p>
            </>
          ),
        },
        {
          id: 'reports', title: 'Reports you submit',
          body: (
            <>
              <p>When you submit a report, you allow the project, city corporation staff and their contractors to store, display and use it to plan and carry out road repairs, and to show pothole positions to other users as warnings.</p>
              <p>City staff decide whether a report is verified, rejected or treated as a duplicate. Submitting a report does not guarantee that a repair will happen or when.</p>
            </>
          ),
        },
        {
          id: 'staff', title: 'City staff and contractors',
          body: (
            <ul>
              <li>Staff accounts must be used only for official repair work and only by the person they were issued to.</li>
              <li>Contractors may update only the jobs assigned to them and may not close a job. Only the city can mark a report resolved.</li>
              <li>Every status change is recorded with who made it and when.</li>
            </ul>
          ),
        },
        {
          id: 'maps', title: 'Maps and third-party content',
          body: <p>Map data © OpenStreetMap contributors. Map tiles are served by OpenStreetMap and OpenFreeMap, and the demo video by YouTube. Their own terms apply to their content.</p>,
        },
        {
          id: 'ip', title: 'Source code and branding',
          body: <p>The SmartPothole AI source code is published on <a href="https://github.com/kazinayeem/smart-road-ai" target="_blank" rel="noopener noreferrer">GitHub</a>. The SmartPothole AI name, logo and website design belong to the project. Please ask before using them for another service.</p>,
        },
        {
          id: 'liability', title: 'Limitation of liability',
          body: <p>To the fullest extent the law allows, the project and its contributors are not liable for any damage, injury, loss or cost arising from using or relying on the service, including missed or incorrect pothole warnings, map errors, downtime or data loss.</p>,
        },
        {
          id: 'privacy', title: 'Privacy',
          body: <p>How we handle your data is explained in the <Link href="/privacy">privacy policy</Link> and the <Link href="/cookies">cookie policy</Link>.</p>,
        },
        {
          id: 'changes', title: 'Changes and ending the service',
          body: <p>We may update these terms as the pilot develops; the date at the top shows the latest version. If you keep using the service after a change, you accept the new terms. You can stop using the service at any time and ask for your account to be deleted.</p>,
        },
        {
          id: 'law', title: 'Governing law',
          body: <p>These terms are governed by the laws of Bangladesh.</p>,
        },
        {
          id: 'contact', title: 'Contact',
          body: <p>Questions about these terms: <a href={GH} target="_blank" rel="noopener noreferrer">open an issue on GitHub</a> or reach the project lead through <a href="https://nayeem.bornosoft.bd" target="_blank" rel="noopener">nayeem.bornosoft.bd</a>.</p>,
        },
      ]}
    />
  );
}
