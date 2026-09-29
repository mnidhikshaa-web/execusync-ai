import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { apiRouter } from "./routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logger
app.use((req, _res, next) => {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[${t}] ${req.method} ${req.originalUrl}`);
  next();
});

// API Routes
app.use("/api", apiRouter);

// Root greeting
app.get("/", (_req, res) => {
  res.json({
    name: "EXECUSYNC AI Backend API",
    organization: "Oil India Limited (SIH Prototype)",
    status: "online",
    endpoints: "/api/health, /api/activities, /api/reports, /api/events, /api/stats, etc.",
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  EXECUSYNC AI — Backend Server Active on port ${PORT}`);
  console.log(`  Bridge: Planning (L5/L6) <-> Execution (Site Reality)`);
  console.log(`  API Base: http://localhost:${PORT}/api`);
  console.log(`=======================================================`);
});
