"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// Initialize routers
const auth_1 = __importDefault(require("./routes/auth"));
const stores_1 = __importDefault(require("./routes/stores"));
const employees_1 = __importDefault(require("./routes/employees"));
const customers_1 = __importDefault(require("./routes/customers"));
const collaborators_1 = __importDefault(require("./routes/collaborators"));
const commodities_1 = __importDefault(require("./routes/commodities"));
const cash_1 = __importDefault(require("./routes/cash"));
const pawn_1 = __importDefault(require("./routes/pawn"));
const unsecured_1 = __importDefault(require("./routes/unsecured"));
const installment_1 = __importDefault(require("./routes/installment"));
const vouchers_1 = __importDefault(require("./routes/vouchers"));
const capital_1 = __importDefault(require("./routes/capital"));
const reports_1 = __importDefault(require("./routes/reports"));
const profile_1 = __importDefault(require("./routes/profile"));
const warnings_1 = __importDefault(require("./routes/warnings"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
// Middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// API Routes
app.use("/api/auth", auth_1.default);
app.use("/api/stores", stores_1.default);
app.use("/api/employees", employees_1.default);
app.use("/api/customers", customers_1.default);
app.use("/api/collaborators", collaborators_1.default);
app.use("/api/commodities", commodities_1.default);
app.use("/api/cash", cash_1.default);
app.use("/api/contracts/pawn", pawn_1.default);
app.use("/api/contracts/unsecured", unsecured_1.default);
app.use("/api/contracts/installment", installment_1.default);
app.use("/api/contracts/capital", capital_1.default);
app.use("/api/vouchers", vouchers_1.default);
app.use("/api/reports", reports_1.default);
app.use("/api/profile", profile_1.default);
app.use("/api/warnings", warnings_1.default);
// Serve Frontend static build in production
const frontendBuildPath = path_1.default.join(__dirname, "../../frontend/dist");
app.use(express_1.default.static(frontendBuildPath));
// Fallback for React Router (Single Page Application routing)
app.get("*", (req, res, next) => {
    // If the request is for an API endpoint that wasn't matched above, return 404
    if (req.path.startsWith("/api")) {
        return res.status(404).json({ error: "API route not found" });
    }
    // Otherwise, serve index.html for React SPA
    res.sendFile(path_1.default.join(frontendBuildPath, "index.html"), (err) => {
        if (err) {
            // In development when build folder doesn't exist yet, return a simple placeholder or next
            res.status(200).send("PawnManagerV2 API Server running. Build the frontend to view the client app.");
        }
    });
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
