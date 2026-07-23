import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200/60 dark:bg-slate-700/60", className)}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#1e1e2f] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <div>
        <Skeleton className="h-8 w-1/2 mb-2" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}

export function TableSkeleton({ columns = 5, rows = 10 }) {
  return (
    <div className="bg-white dark:bg-[#1e1e2f] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden w-full">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#151521] border-b border-slate-200 dark:border-slate-800">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="p-4">
                  <Skeleton className="h-4 w-3/4" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50">
                {Array.from({ length: columns }).map((_, j) => (
                  <td key={j} className="p-4">
                    <Skeleton className={`h-4 ${j === 0 ? 'w-full' : 'w-2/3'}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
