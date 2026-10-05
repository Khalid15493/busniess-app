import type { DatePreset } from '@/services/reports';

interface Props {
  preset: DatePreset;
  onChange: (preset: DatePreset) => void;
}

const PRESETS: { label: string; value: DatePreset }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'this_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'This Year', value: 'this_year' },
  { label: 'All Time', value: 'all' },
];

export function DateRangePicker({ preset, onChange }: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
      {PRESETS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            preset === p.value
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
