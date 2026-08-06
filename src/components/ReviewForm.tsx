import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { REVIEW_GRADES, type ReviewGrade } from "@/lib/review";
import { cn } from "@/lib/utils";

type Props = {
  studentName: string;
  rollNo: number;
  onSubmit: (value: {
    grade: ReviewGrade;
    remarks: string;
    needsRepeat: boolean;
  }) => void;
  submitting?: boolean;
};

export function ReviewForm({ studentName, rollNo, onSubmit, submitting }: Props) {
  const [grade, setGrade] = useState<ReviewGrade>("Good");
  const [remarks, setRemarks] = useState("");
  const [needsRepeat, setNeedsRepeat] = useState(false);

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ grade, remarks: remarks.trim().slice(0, 2000), needsRepeat });
      }}
    >
      <div>
        <p className="text-sm text-muted-foreground">Reviewing</p>
        <p className="text-base font-medium">
          {rollNo} — {studentName}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="grade">Review</Label>
        <select
          id="grade"
          value={grade}
          onChange={(e) => setGrade(e.target.value as ReviewGrade)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {REVIEW_GRADES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="remarks">Remarks (optional)</Label>
        <Textarea
          id="remarks"
          value={remarks}
          maxLength={2000}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Clarity, preparation, delivery, subject knowledge…"
          rows={4}
        />
      </div>

      <label
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors",
          needsRepeat ? "border-primary bg-primary/5" : "border-border",
        )}
      >
        <input
          type="checkbox"
          checked={needsRepeat}
          onChange={(e) => setNeedsRepeat(e.target.checked)}
          className="h-4 w-4 accent-[var(--color-primary)]"
        />
        Needs re-presentation
      </label>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Saving…" : "Save review"}
      </Button>
    </form>
  );
}
