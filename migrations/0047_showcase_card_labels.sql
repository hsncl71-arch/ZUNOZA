-- Diversify homepage clip badges and drop generic card labels.
-- Existing custom titles are kept.

update showcase_clips set badge = '';

update showcase_clips set badge = 'trend' where id in ('wildlife', 'action', 'kesfet-istanbul', 'kesfet-konser');
update showcase_clips set badge = 'populer' where id in ('city', 'history', 'kesfet-sahil', 'kesfet-portre');
update showcase_clips set badge = 'one-cikan' where id in ('nature', 'portrait', 'kesfet-kapadokya', 'kesfet-urun');
update showcase_clips set badge = 'premium' where id in ('car', 'kesfet-araba');
update showcase_clips set badge = 'izlenen' where id in ('product', 'viral', 'kesfet-moda');
update showcase_clips set badge = 'yeni' where id in ('fantasy', 'kesfet-mutfak');

update showcase_clips
set title = subject
where length(trim(coalesce(subject, ''))) >= 2
  and lower(trim(title)) in ('yeni video', 'ilham al', 'keşfet', 'video', 'yeni');
