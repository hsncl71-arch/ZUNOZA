-- Admin-managed homepage catalog lanes: İlham Al + Keşfet

alter table showcase_clips add column if not exists lane text not null default 'ilham';
alter table showcase_clips add column if not exists tag text not null default '';
alter table showcase_clips add column if not exists studio_path text not null default '/olustur';
alter table showcase_clips add column if not exists prompt text not null default '';

create index if not exists showcase_clips_lane_idx on showcase_clips (lane, active, sort_order, id);
