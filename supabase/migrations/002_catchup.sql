ALTER TABLE daily_summaries
  ADD COLUMN is_catchup BOOLEAN NOT NULL DEFAULT false;
