import { db, systemSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export type SettingKey = "auto_confirm_payments" | "proxy_ingest_enabled";

export async function getSetting<T = unknown>(key: SettingKey, fallback: T): Promise<T> {
  const [row] = await db
    .select()
    .from(systemSettingsTable)
    .where(eq(systemSettingsTable.key, key))
    .limit(1);
  return (row?.value as T) ?? fallback;
}

export async function setSetting<T = unknown>(key: SettingKey, value: T): Promise<void> {
  await db
    .insert(systemSettingsTable)
    .values({ key, value: value as any, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: systemSettingsTable.key,
      set: { value: value as any, updatedAt: new Date() },
    });
}
