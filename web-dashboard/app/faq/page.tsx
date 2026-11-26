import type { Metadata } from 'next';
import { FaqContent } from '@/components/site/FaqContent';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Answers about the SmartPothole AI pilot, privacy, the Android app, accuracy, offline use and accounts.',
};

export default function FaqPage() {
  return <FaqContent />;
}
