update app_settings
set value = 'Sal', updated_at = now()
where key = 'assistant_voice' and value = 'Rex';
