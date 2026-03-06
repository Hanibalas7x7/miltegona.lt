-- Calculator price addons for colour types.
-- Existing prices (painting_price, priming_price, sandblasting_price, minimum_charge)
-- are already in admin_settings. Only the colour addons are new.

INSERT INTO public.admin_settings (setting_key, setting_value) VALUES
  ('calc_price_color_light_ral_addon', '1'),   -- €/m² addon for light RAL colours (on top of painting_price)
  ('calc_price_color_metallic_addon',  '2'),   -- €/m² addon for metallic / pearlescent
  ('calc_price_color_ncs_addon',       '4')    -- €/m² addon for NCS / special colours
ON CONFLICT (setting_key) DO NOTHING;
