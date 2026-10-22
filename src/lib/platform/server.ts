import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";
import type { Database } from "./types";

export async function createSupabaseServerClient(writable = false) {
  const config = getSupabaseConfig();
  if (!config)
    throw new Error(
      "Supabase is not configured. Follow the platform setup guide.",
    );
  const cookieStore = await cookies();
  return createServerClient<Database>(config.url, config.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      ...(writable
        ? {
            setAll(
              values: { name: string; value: string; options: CookieOptions }[],
            ) {
              for (const { name, value, options } of values) {
                cookieStore.set(name, value, options);
              }
            },
          }
        : {}),
    },
  });
}
