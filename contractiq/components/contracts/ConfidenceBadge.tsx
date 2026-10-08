import { Badge } from "@/components/ui/Badge";

// Thresholds per docs/design.md's Semantic Status Badge pattern:
// Green >=80, Yellow 50-79, Red <50.
export function ConfidenceBadge({ score }: { score: number }) {
  const color = score >= 80 ? "green" : score >= 50 ? "yellow" : "red";
  const isLow = score < 50;

  return (
    <Badge
      color={color}
      className="inline-flex items-center gap-1"
      title={isLow ? "Low confidence -- we recommend verifying this in the document directly" : undefined}
    >
      {isLow && <span aria-hidden="true">&#9888;</span>}
      {Math.round(score)}%
    </Badge>
  );
}
