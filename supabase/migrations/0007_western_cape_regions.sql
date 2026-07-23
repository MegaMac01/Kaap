-- Kaap: add Western Cape regions beyond the Cape Town metro, used by the
-- activity discovery sweeps (quad biking, shark cage diving, ...) whose
-- venues live in day-trip territory: the Winelands (Stellenbosch,
-- Franschhoek, Paarl, Ceres), the Overberg (Hermanus, Gansbaai, Elgin),
-- the West Coast (Langebaan, Paternoster, Atlantis dunes) and the
-- Garden Route (Mossel Bay, Knysna, Plettenberg Bay, Oudtshoorn).

alter type area_id add value if not exists 'winelands';
alter type area_id add value if not exists 'overberg';
alter type area_id add value if not exists 'westcoast';
alter type area_id add value if not exists 'gardenroute';
