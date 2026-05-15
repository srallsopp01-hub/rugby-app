import Link from 'next/link';
import { PageHeader } from '@/app/components/PageHeader';
import PlaysList from './PlaysList';

export default function PlaybookPage() {
  return (
    <div className="p-6">
      <PageHeader
        title="Playbook"
        subtitle="Tactical plays and animations"
        primaryAction={
          <Link
            href="/coach/playbook/new"
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            New play
          </Link>
        }
      />
      <PlaysList />
    </div>
  );
}
