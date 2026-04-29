import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error("Missing env"); process.exit(1); }

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const { data: tenant, error: tErr } = await admin
  .from("tenants").select("id").eq("tenant_code", "UNIS").single();
if (tErr) { console.error("tenant lookup failed", tErr); process.exit(1); }
const UNIS_ID = tenant.id;
console.log("UNIS tenant_id:", UNIS_ID);

const users = [
  { email: "uat.scm@unis.test",    full_name: "UAT - SC Manager",     role: "sc_manager" },
  { email: "uat.cnm@unis.test",    full_name: "UAT - CN Manager HCM", role: "cn_manager" },
  { email: "uat.ceo@unis.test",    full_name: "UAT - CEO",            role: "ceo" },
  { email: "uat.dir@unis.test",    full_name: "UAT - Director",       role: "director" },
  { email: "uat.sales@unis.test",  full_name: "UAT - Sales",          role: "sales" },
  { email: "uat.buyer@unis.test",  full_name: "UAT - Buyer",          role: "buyer" },
  { email: "uat.viewer@unis.test", full_name: "UAT - Viewer",         role: "viewer" },
  { email: "uat.admin@unis.test",  full_name: "UAT - Admin",          role: "admin" },
];

const PASSWORD = "Uat@2026!";
const results = [];

for (const u of users) {
  try {
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: u.full_name },
    });
    if (cErr) { results.push({ email: u.email, ok: false, step: "createUser", error: cErr.message }); continue; }
    const uid = created.user.id;

    // Profile is auto-created by handle_new_user trigger; ensure full_name is correct
    const { error: pErr } = await admin.from("profiles")
      .update({ display_name: u.full_name })
      .eq("user_id", uid);
    if (pErr) { results.push({ email: u.email, ok: false, step: "profile", error: pErr.message }); continue; }

    // user_roles is auto-seeded as 'viewer' by trigger; update to target role
    const { error: rErr } = await admin.from("user_roles")
      .update({ role: u.role })
      .eq("user_id", uid);
    if (rErr) { results.push({ email: u.email, ok: false, step: "user_roles", error: rErr.message }); continue; }

    // user_tenants — insert link to UNIS
    const { error: utErr } = await admin.from("user_tenants")
      .insert({ user_id: uid, tenant_id: UNIS_ID, is_default: true });
    if (utErr) { results.push({ email: u.email, ok: false, step: "user_tenants", error: utErr.message }); continue; }

    results.push({ email: u.email, ok: true, id: uid, role: u.role });
  } catch (e) {
    results.push({ email: u.email, ok: false, step: "exception", error: String(e) });
  }
}

console.log(JSON.stringify(results, null, 2));
const fail = results.filter(r => !r.ok);
console.log(`\n=== Created ${results.length - fail.length}/${users.length} ===`);
if (fail.length) process.exit(1);
