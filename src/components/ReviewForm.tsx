import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = {
  studentName: string;
  rollNo: number;
  onSubmit: (value: { review: string; rating: number; needsRepeat: boolean }) => void;
  submitting?: boolean;
};

export function ReviewForm({ studentName, rollNo, onSubmit, submitting }: Props) {
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(4);
  const [needsRepeat, setNeedsRepeat] = useState(false);

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ review: review.trim().slice(0, 2000), rating, needsRepeat });
      }}
    >
      <div>
        <p className="text-sm text-muted-foreground">Reviewing</p>
        <p className="text-base font-medium">
          {rollNo} — {studentName}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="review">Teacher review</Label>
        <Textarea
          id="review"
          value={review}
          maxLength={2000}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Clarity, preparation, delivery, subject knowledge…"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>Overall rating</Label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={cn(
                "h-10 w-10 rounded-md border text-sm font-medium transition-colors",
                rating === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-muted",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Require re-presentation</Label>
        <div className="flex gap-2">
          {[
            { label: "No", value: false },
            { label: "Yes", value: true },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setNeedsRepeat(opt.value)}
              className={cn(
                "h-10 rounded-md border px-5 text-sm font-medium transition-colors",
                needsRepeat === opt.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-muted",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Saving…" : "Save review"}
      </Button>
    </form>
  );
}
