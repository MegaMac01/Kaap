-- Kaap: add the Blouberg area (Bloubergstrand / Table View coast).
-- Note: run outside an explicit transaction (Supabase SQL editor is fine).

alter type area_id add value if not exists 'blouberg';
