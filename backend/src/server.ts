import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize routers
import authRouter from "./routes/auth";
import branchesRouter from "./routes/branches";
import employeesRouter from "./routes/employees";
import customersRouter from "./routes/customers";
import collaboratorsRouter from "./routes/collaborators";
import commoditiesRouter from "./routes/commodities";
import cashRouter from "./routes/cash";
import pawnRouter from "./routes/pawn";
import unsecuredRouter from "./routes/unsecured";
import installmentRouter from "./routes/installment";
import vouchersRouter from "./routes/vouchers";
import capitalRouter from "./routes/capital";
import reportsRouter from "./routes/reports";
import profileRouter from "./routes/profile";
import warningsRouter from "./routes/warnings";
import settingsRouter from "./routes/settings";
import interestTypesRouter from "./routes/interestTypes";
import publicRouter from "./routes/public";

// Global error handler
import { errorHandler } from "./middleware/errorHandler";


const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(
  cors({
    origin: true, // Chấp nhận động origin gửi từ client (localhost:3000, 8080, 5173, production domain)
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Branch-ID"],
  })
);
app.use(express.json());

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/branches", branchesRouter);
app.use("/api/stores", branchesRouter); // Backward compatibility
app.use("/api/employees", employeesRouter);
app.use("/api/customers", customersRouter);
app.use("/api/collaborators", collaboratorsRouter);
app.use("/api/commodities", commoditiesRouter);
app.use("/api/cash", cashRouter);
app.use("/api/contracts/pawn", pawnRouter);
app.use("/api/contracts/unsecured", unsecuredRouter);
app.use("/api/contracts/installment", installmentRouter);
app.use("/api/contracts/capital", capitalRouter);
app.use("/api/vouchers", vouchersRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/profile", profileRouter);
app.use("/api/warnings", warningsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/interest-types", interestTypesRouter);
app.use("/api/public", publicRouter);

// Serve Frontend static build in production
const frontendBuildPath = path.join(__dirname, "../../frontend/dist");
app.use(express.static(frontendBuildPath));

// Fallback for React Router (Single Page Application routing)
app.get("*", (req, res, next) => {
  // If the request is for an API endpoint that wasn't matched above, return 404
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API route not found" });
  }
  // Otherwise, serve index.html for React SPA
  res.sendFile(path.join(frontendBuildPath, "index.html"), (err) => {
    if (err) {
      // In development when build folder doesn't exist yet, return a simple placeholder or next
      res.status(200).send("PawnManagerV2 API Server running. Build the frontend to view the client app.");
    }
  });
});

// Global error handler — MUST be last middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
