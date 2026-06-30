export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logRuntimeStartup } = await import("@/lib/monitoring");
    logRuntimeStartup();
  }
}
