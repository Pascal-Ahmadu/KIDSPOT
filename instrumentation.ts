/** Runs once when the server starts: makes sure the database tables and columns exist. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureSchema } = await import("@/lib/db");
    await ensureSchema();
  }
}
