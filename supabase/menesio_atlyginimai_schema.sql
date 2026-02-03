-- Mėnesio atlyginimų lentelė (saugomi apskaičiuoti duomenys iš Tabelis app)
CREATE TABLE IF NOT EXISTS menesio_atlyginimai (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    darbuotojas_id UUID NOT NULL REFERENCES darbuotojai(id) ON DELETE CASCADE,
    metai INT NOT NULL,
    menuo INT NOT NULL CHECK (menuo >= 1 AND menuo <= 12),
    
    -- Darbo duomenys
    normines_darbo_dienos INT,
    pradirbta_dienu INT,
    normines_valandos NUMERIC(10,2),
    pradirbta_valandy NUMERIC(10,2),
    
    -- Atlyginimo skaičiavimai
    bruto_ant_popieriaus NUMERIC(10,2) NOT NULL,
    pritaikytas_npd NUMERIC(10,2) DEFAULT 0,
    gpm NUMERIC(10,2) DEFAULT 0,
    sodra_darbuotojo NUMERIC(10,2) DEFAULT 0,
    sodra_darbdavio NUMERIC(10,2) DEFAULT 0,
    neto NUMERIC(10,2) NOT NULL,
    
    -- Papildomi mokėjimai
    avansu_suma NUMERIC(10,2) DEFAULT 0,
    priedas NUMERIC(10,2) DEFAULT 0,
    
    -- Galutinė suma
    likutis NUMERIC(10,2) NOT NULL,
    darbo_vietos_kaina NUMERIC(10,2) NOT NULL,
    
    sukurtas_data TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atnaujintas_data TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(darbuotojas_id, metai, menuo)
);

-- Indeksai
CREATE INDEX IF NOT EXISTS idx_menesio_atlyginimai_darbuotojas ON menesio_atlyginimai(darbuotojas_id);
CREATE INDEX IF NOT EXISTS idx_menesio_atlyginimai_data ON menesio_atlyginimai(metai, menuo);

-- RLS
ALTER TABLE menesio_atlyginimai ENABLE ROW LEVEL SECURITY;

-- Admin gali viską
CREATE POLICY "admin_full_access_atlyginimai" ON menesio_atlyginimai FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Employee gali matyti tik savo
CREATE POLICY "employee_view_own_atlyginimai" ON menesio_atlyginimai FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM app_users 
      WHERE id = auth.uid() 
        AND role = 'employee' 
        AND darbuotojas_id = menesio_atlyginimai.darbuotojas_id
    )
  );

-- Automatinis atnaujinimas updated_at
CREATE OR REPLACE FUNCTION update_menesio_atlyginimai_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atnaujintas_data = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_menesio_atlyginimai_updated_at
    BEFORE UPDATE ON menesio_atlyginimai
    FOR EACH ROW
    EXECUTE FUNCTION update_menesio_atlyginimai_updated_at();
