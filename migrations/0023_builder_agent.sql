-- İnşa Et ajan: çok dosyalı sürüm, iş raporu
alter table builder_versions add column if not exists files_json text;
alter table builder_jobs add column if not exists files_json text;
alter table builder_jobs add column if not exists report_json text;
alter table builder_projects add column if not exists publish_note text;

create index if not exists builder_jobs_status_idx on builder_jobs (project_id, status);