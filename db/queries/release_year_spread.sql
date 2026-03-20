-- Distribution of track plays by release year.
SELECT
    substr(t.release_date, 1, 4)  AS release_year,
    COUNT(st.id)                  AS play_count,
    COUNT(DISTINCT t.id)          AS unique_tracks
FROM tracks t
JOIN show_tracks st ON t.id = st.track_id
WHERE t.release_date IS NOT NULL
  AND length(substr(t.release_date, 1, 4)) = 4
  AND substr(t.release_date, 1, 4) GLOB '[0-9][0-9][0-9][0-9]'
GROUP BY release_year
ORDER BY release_year DESC;
