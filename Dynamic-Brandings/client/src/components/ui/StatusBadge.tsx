import { cn } from "@/lib/utils";

type Status = "present" | "late" | "absent" | "excused";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles: Record<Status, string> = {
    present: "bg-green-100 text-green-700 border-green-200",
    late: "bg-orange-100 text-orange-700 border-orange-200",
    absent: "bg-red-100 text-red-700 border-red-200",
    excused: "bg-blue-100 text-blue-700 border-blue-200",
  };

  // Safe fallback for unknown status
  const style = styles[status as Status] || "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize",
      style,
      className
    )}>
      {status}
    </span>
  );
}
