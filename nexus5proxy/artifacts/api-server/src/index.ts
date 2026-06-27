import app from "./app";
import { logger } from "./lib/logger";

import { startExpiryJob } from "./jobs/expiry";
import { startCartCleanupJob } from "./jobs/cart-cleanup";
import { startProxyIngestJob } from "./jobs/proxy-ingest";
import { startProxyHealthJob } from "./jobs/proxy-health";

const rawPort = process.env.PORT;

/**
 * Validate PORT (required in Hyperlift)
 */
if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number.parseInt(rawPort, 10);

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

/**
 * Start server (must bind to 0.0.0.0 for containers)
 */
const server = app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Server listening");

  /**
   * Start background jobs AFTER server is ready
   */
  startExpiryJob();
  startCartCleanupJob();
  startProxyIngestJob();
  startProxyHealthJob();
});

/**
 * Handle startup errors properly
 */
server.on("error", (err) => {
  logger.error({ err }, "Server failed to start");
  process.exit(1);
});

/**
 * Graceful shutdown (important for Hyperlift restarts)
 */
const shutdown = () => {
  logger.info("Shutting down server...");

  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
