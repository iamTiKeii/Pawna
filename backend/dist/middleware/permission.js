"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = void 0;
const requirePermission = (requiredCodes) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        // superuser (SETTINGS_MANAGE) has all permissions automatically
        const hasPermission = requiredCodes.some((code) => req.user.permissions.includes(code)) || req.user.permissions.includes("SETTINGS_MANAGE");
        if (!hasPermission) {
            return res.status(403).json({
                error: `Forbidden: You do not have the required permissions (${requiredCodes.join(", ")}) to perform this action.`,
            });
        }
        next();
    };
};
exports.requirePermission = requirePermission;
