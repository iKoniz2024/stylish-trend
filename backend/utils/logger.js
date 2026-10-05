/**
 * Production Logger Utility
 * Provides formatted timestamps and log levels (info, warn, error).
 */

const logger = {
    info: (...args) => {
        console.log(`[INFO] [${new Date().toISOString()}]`, ...args);
    },
    warn: (...args) => {
        console.warn(`[WARN] [${new Date().toISOString()}]`, ...args);
    },
    error: (...args) => {
        console.error(`[ERROR] [${new Date().toISOString()}]`, ...args);
    }
};

module.exports = logger;
