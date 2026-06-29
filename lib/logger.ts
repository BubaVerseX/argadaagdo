type LogContext = Record<string, unknown>;

type LogLevel = "info" | "warn" | "error" | "debug";

function serializeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: process.env.NODE_ENV === "development" ? value.stack : undefined,
    };
  }

  return value;
}

function writeLog(level: LogLevel, message: string, context?: LogContext) {
  const payload = {
    app: "argadaagdo",
    level,
    message,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    ...(context
      ? {
          context: Object.fromEntries(
            Object.entries(context).map(([key, value]) => [
              key,
              serializeValue(value),
            ])
          ),
        }
      : {}),
  };

  const serializedPayload = JSON.stringify(payload);

  if (level === "error") {
    console.error(serializedPayload);
    return;
  }

  if (level === "warn") {
    console.warn(serializedPayload);
    return;
  }

  if (level === "debug") {
    if (process.env.NODE_ENV === "development") {
      console.debug(serializedPayload);
    }
    return;
  }

  console.info(serializedPayload);
}

export const logger = {
  info(message: string, context?: LogContext) {
    writeLog("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    writeLog("warn", message, context);
  },
  error(message: string, context?: LogContext) {
    writeLog("error", message, context);
  },
  debug(message: string, context?: LogContext) {
    writeLog("debug", message, context);
  },
};
