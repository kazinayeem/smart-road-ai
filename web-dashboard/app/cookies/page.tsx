import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDoc } from '@/components/site/MarketingPage';

export const metadata: Metadata = {
  title: 'Cookie policy',
  description: 'SmartPothole AI sets no advertising or analytics cookies. Here is the small amount of browser storage the website uses, and why.',
};

export default function CookiesPage() {
  return (
    <LegalDoc
      eyebrow="Legal"
      title="Cookie policy"
      updated="26 November 2026"
      intro="Short answer: this website sets no advertising or analytics cookies. It stores only what it needs to keep you signed in and remember your language."
      sections={[
        {
          id: 'what', title: 'Cookies and browser storage',
          body: <p>Cookies are small files a website saves in your browser. Websites can also save data with similar tools called local storage and IndexedDB. This policy covers all of them, and we call them &quot;storage&quot; below.</p>,
        },
        {
          id: 'ours', title: 'What this website stores',
          body: (
            <table>
              <thead><tr><th>Name</th><th>Type</th><th>Purpose</th><th>How long</th></tr></thead>
              <tbody>
                <tr><td><code>firebaseLocalStorageDb</code></td><td>IndexedDB (Firebase Authentication)</td><td>Keeps you signed in between visits. Strictly necessary for the dashboard.</td><td>Until you sign out or clear site data</td></tr>
                <tr><td><code>sp-lang</code></td><td>Local storage</td><td>Remembers whether you chose English or বাংলা.</td><td>Until you clear site data</td></tr>
              </tbody>
            </table>
          ),
        },
        {
          id: 'not', title: 'What we do not use',
          body: (
            <ul>
              <li>No advertising cookies.</li>
              <li>No analytics or tracking cookies, and no tracking pixels.</li>
              <li>No cookies used to build a profile of you or follow you across other websites.</li>
            </ul>
          ),
        },
        {
          id: 'third', title: 'Third-party services',
          body: (
            <>
              <ul>
                <li><strong>YouTube</strong>: the demo video uses YouTube&apos;s privacy-enhanced mode (<code>youtube-nocookie.com</code>) and loads only after you press play. Once it plays, YouTube&apos;s own policies apply.</li>
                <li><strong>Map tiles, fonts and stylesheets</strong> from OpenStreetMap, Google Fonts and unpkg are fetched like any image or file. These requests do not set cookies from this website.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'consent', title: 'Why there is no cookie banner',
          body: <p>Everything we store is either strictly necessary (keeping you signed in) or a preference you set yourself (language). We do not use optional tracking, so there is nothing to opt in to. If that ever changes, we will ask for your consent first.</p>,
        },
        {
          id: 'control', title: 'How to clear it',
          body: (
            <ul>
              <li>Signing out removes your sign-in session.</li>
              <li>You can clear everything for this site in your browser&apos;s settings, usually under Privacy, Site data or Cookies.</li>
              <li>Blocking storage will stop you from staying signed in to the dashboard, but the public pages still work.</li>
            </ul>
          ),
        },
        {
          id: 'app', title: 'The Android app',
          body: <p>The Android app does not use browser cookies. It keeps your sign-in, settings and not-yet-uploaded reports in the app&apos;s private storage on your phone. See the <Link href="/privacy">privacy policy</Link> for details.</p>,
        },
        {
          id: 'contact', title: 'Questions',
          body: <p><a href="https://github.com/kazinayeem/smart-road-ai/issues" target="_blank" rel="noopener noreferrer">Open an issue on GitHub</a> or reach the project lead through <a href="https://nayeem.bornosoft.bd" target="_blank" rel="noopener">nayeem.bornosoft.bd</a>.</p>,
        },
      ]}
    />
  );
}
