-- Test darbuotojo sukūrimas tiesiogiai Supabase SQL Editor
-- (Naudoti tik jei tabelis app nepasiekiama)

-- 1. Sukurti darbuotoją
INSERT INTO darbuotojai (vardas, pavarde, ikainis, aktyvus)
VALUES ('Test', 'Darbuotojas', 5.50, true);

-- 2. Gauti darbuotojo ID (žiūrėti į Table Editor arba įvykdyti)
-- SELECT id FROM darbuotojai WHERE vardas = 'Test' AND pavarde = 'Darbuotojas';
-- Pvz: id = 1

-- 3. Sukurti auth vartotoją
-- Eiti į: Authentication → Users → Add user
-- Email: test@test.lt
-- Password: test123
-- Auto Confirm User: YES
-- Nukopijuoti User UID (pvz: 'abc123-def456-...')

-- 4. Sukurti app_users įrašą (pakeisti VALUES su tikrais)
INSERT INTO app_users (auth_user_id, role, darbuotojas_id)
VALUES (
    'PASTE_AUTH_USER_UID_HERE',  -- iš step 3
    'employee',
    1  -- darbuotojo id iš step 2
);

-- Dabar galite prisijungti su test@test.lt / test123
