-- Total times a specific artist has appeared across all shows.
-- Param: :artist (case-insensitive substring match)
SELECT
    a.name                     AS artist,
    COUNT(st.id)               AS play_count,
    COUNT(DISTINCT st.show_id) AS shows_appeared
FROM artists a
JOIN track_artists ta ON a.id = ta.artist_id
JOIN show_tracks st   ON ta.track_id = st.track_id
WHERE lower(a.name) LIKE lower('%' || :artist || '%')
GROUP BY a.id, a.name
ORDER BY play_count DESC;
