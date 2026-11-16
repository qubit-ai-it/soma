alter table notifications add column seq bigint generated always as identity;
create unique index notifications_seq on notifications (seq);
