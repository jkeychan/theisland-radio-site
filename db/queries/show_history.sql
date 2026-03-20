-- All shows that featured a given artist.
-- Param: :artist (case-insensitive substring match)
SELECT
    sh.id          AS show_id,
    sh.aired_at    AS aired_at,
    t.title        AS track_title,
    t.raw_artist   AS raw_artist,
    t.album        AS album,
    st.position    AS position
FROM artists a
JOIN track_artists ta ON a.id = ta.artist_id
JOIN tracks t         ON ta.track_id = t.id
JOIN show_tracks st   ON t.id = st.track_id
JOIN shows sh         ON st.show_id = sh.id
WHERE lower(a.name) LIKE lower('%' || :artist || '%')
ORDER BY sh.aired_at DESC, st.position ASC;
