-- Read-only deferred provider ACL check. This is not a pgTAP acceptance gate
-- or a repair script. Broad SQL grants do not prove that Storage's HTTP API
-- exposes TRUNCATE, that browser roles can log in via SQL, or that the migration
-- role is allowed to revoke grants made by the platform's Storage role.
select
  current_user as migration_role,
  role.rolsuper as migration_role_is_superuser,
  pg_has_role(current_user, 'supabase_storage_admin', 'MEMBER') as storage_role_membership
from pg_roles as role
where role.rolname = current_user;

select
  namespace.nspname as schema_name,
  relation.relname as table_name,
  relation.relowner::regrole as table_owner,
  privilege.grantor::regrole as grantor,
  privilege.grantee::regrole as grantee,
  browser_role.rolcanlogin as grantee_can_log_in,
  privilege.privilege_type,
  has_table_privilege(privilege.grantee, relation.oid, privilege.privilege_type) as effective_privilege
from pg_class as relation
join pg_namespace as namespace on namespace.oid = relation.relnamespace
cross join lateral aclexplode(relation.relacl) as privilege
join pg_roles as browser_role on browser_role.oid = privilege.grantee
where namespace.nspname = 'storage'
  and relation.relname in ('objects', 'buckets')
  and browser_role.rolname in ('anon', 'authenticated')
  and privilege.privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')
order by relation.relname, browser_role.rolname, privilege.privilege_type;
