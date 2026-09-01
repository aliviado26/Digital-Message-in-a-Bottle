type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

function log(level: LogLevel, message: string, context?: LogContext) {
  const entry = { level, message, time: new Date().toISOString(), ...context };
  const method = level === "debug" ? "log" : level;
  console[method](JSON.stringify(entry));
}

export const logger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, context?: LogContext) => log("error", message, context),
};
