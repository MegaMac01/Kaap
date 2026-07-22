-- Kaap: add the Durbanville area (Northern Suburbs: Durbanville, Sonstraal,
-- Bellville, Kraaifontein, Brackenfell, the Durbanville wine valley).

alter type area_id add value if not exists 'durbanville';
