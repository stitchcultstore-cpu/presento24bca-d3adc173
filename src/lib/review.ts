export const REVIEW_GRADES = [
  "Excellent",
  "Very Good",
  "Good",
  "Average",
  "Needs Improvement",
  "Poor",
] as const;

export type ReviewGrade = (typeof REVIEW_GRADES)[number];

export const GRADE_RATING: Record<string, number> = {
  Excellent: 5,
  "Very Good": 5,
  Good: 4,
  Average: 3,
  "Needs Improvement": 2,
  Poor: 1,
};
