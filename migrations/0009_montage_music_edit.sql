-- Music uploads + trim/volume metadata. Montage mix (voice/music levels, overlay).

alter table music_assets add column if not exists source text not null default 'generated';
alter table music_assets add column if not exists trim_start double precision not null default 0;
alter table music_assets add column if not exists trim_end double precision;
alter table music_assets add column if not exists volume double precision not null default 1;

alter table montage_projects add column if not exists mix_json text not null default '{}';
