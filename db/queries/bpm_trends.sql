-- Average BPM per show. Pass :show_id = NULL to get all shows.
SELECT
    sh.id                       AS show_id,
    sh.aired_at                 AS aired_at,
    ROUND(AVG(t.bpm), 1)        AS avg_bpm,
    ROUND(MIN(t.bpm), 1)        AS min_bpm,
    ROUND(MAX(t.bpm), 1)        AS max_bpm,
    COUNT(t.bpm)                AS tracks_with_bpm
FROM shows sh
JOIN show_tracks st ON sh.id = st.show_id
JOIN tracks t       ON st.track_id = t.id
WHERE t.bpm IS NOT NULL
  AND (:show_id IS NULL OR sh.id = :show_id)
GROUP BY sh.id, sh.aired_at
ORDER BY sh.aired_at DESC;
