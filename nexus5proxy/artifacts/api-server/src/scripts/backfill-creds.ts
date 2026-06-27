import { db, proxiesTable } from "@workspace/db";
import { isNull, or, eq } from "drizzle-orm";
import { generateProxyUsername, generateProxyPassword } from "../lib/proxy-creds";

async function main() {
  const broken = await db.select().from(proxiesTable).where(
    or(isNull(proxiesTable.username), isNull(proxiesTable.password), eq(proxiesTable.username, ""), eq(proxiesTable.password, "")),
  );
  console.log(`Found ${broken.length} proxies missing creds. Generating...`);
  for (const p of broken) {
    await db.update(proxiesTable)
      .set({ username: generateProxyUsername(), password: generateProxyPassword() })
      .where(eq(proxiesTable.id, p.id));
  }
  console.log("Done.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
