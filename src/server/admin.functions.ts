import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const passwordSchema = z.object({
  userId: z.string().uuid(),
  newPassword: z.string().min(6).max(72),
});

export const adminOverwritePassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => passwordSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: roles, error: roleErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (roleErr) throw new Error(roleErr.message);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) throw new Error("Admin required");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.newPassword,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DEFAULT_ADMIN_EMAIL = "admin@test.com";
const DEFAULT_ADMIN_PASSWORD = "admin123";

/**
 * Idempotent: ensures the default admin account exists with the canonical
 * credentials and the 'admin' role. Safe to call from the admin portal login
 * page — it will only create the account once, and on subsequent calls just
 * verifies that role is set and password matches.
 */
export const ensureDefaultAdmin = createServerFn({ method: "POST" })
  .handler(async () => {
    // Look up existing user by email
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw new Error(listErr.message);
    let user = list.users.find((u) => u.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL);

    if (!user) {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: DEFAULT_ADMIN_EMAIL,
        password: DEFAULT_ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { username: "admin" },
      });
      if (createErr) throw new Error(createErr.message);
      user = created.user!;
    } else {
      // Ensure password matches the canonical default (in case it was changed)
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: DEFAULT_ADMIN_PASSWORD,
        email_confirm: true,
      });
    }

    // Ensure admin role
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const hasAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!hasAdmin) {
      await supabaseAdmin.from("user_roles").insert({ user_id: user.id, role: "admin" });
    }

    return { ok: true, email: DEFAULT_ADMIN_EMAIL };
  });
