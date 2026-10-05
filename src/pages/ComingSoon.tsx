import { Construction } from 'lucide-react';
import { EmptyState } from '@/components/ui/Feedback';

export function ComingSoon({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-100 mb-6">{title}</h1>
      <div className="bg-slate-800/80 rounded-xl shadow-sm border border-slate-700/50">
        <EmptyState
          icon={<Construction className="w-8 h-8" />}
          title="Coming Soon"
          message={`The ${title} module will be available in a future phase. We're building Phase 1 (Products, Inventory & Settings) first.`}
        />
      </div>
    </div>
  );
}
