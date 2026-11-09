require("dotenv").config();
const express = require("express");
const cors = require("cors");
const routes = require("./routes");

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required. Add it to backend/.env before starting the backend.");
}

const configuredOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.NODE_ENV === "production" && configuredOrigins.length === 0) {
  throw new Error("CORS_ORIGINS is required in production. Set it to a comma-separated list of trusted frontend origins.");
}

const allowedOrigins = new Set(configuredOrigins);
if (process.env.NODE_ENV !== "production") {
  ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"]
    .forEach((origin) => allowedOrigins.add(origin));
}

const app = express();

app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin));
  },
}));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => res.send("health"));
app.get("/", (req, res) => res.send("OK"));
app.use("/api", routes);

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  if (err.code === "P2025") return res.status(404).json({ error: "Record not found" });
  if (err.code === "P2002") return res.status(409).json({ error: "A record with these values already exists" });
  if (err.code === "P2003") return res.status(400).json({ error: "A referenced record does not exist" });
  if (err.code === "P2034") return res.status(409).json({ error: "The record changed concurrently. Please retry." });
  const safeStatus = Number.isInteger(status) && status >= 400 && status < 600 ? status : 500;
  const message = safeStatus < 500 ? err.message : "Something went wrong on the server";
  res.status(safeStatus).json({ error: message || "Request failed" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));