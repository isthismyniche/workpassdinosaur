ALTER TABLE daily_summaries
  ADD COLUMN correct_count INT NOT NULL DEFAULT 0;

-- Backfill from existing attempts
UPDATE daily_summaries ds
SET correct_count = (
  SELECT COUNT(*)
  FROM attempts a
  JOIN questions q ON a.question_id = q.id
  WHERE a.user_id = ds.user_id
    AND q.date = ds.date
    AND a.is_correct = true
);
