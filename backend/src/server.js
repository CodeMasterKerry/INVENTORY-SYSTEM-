require("dotenv").config();
const express = require("express");
const cors = require("cors");
const routes = require("./routes");

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required. Add it to backend/.env before starting the backend.");
}

const app = express();

app.use(cors());           // lets the frontend (port 3000) talk to this server
app.use(express.json());   // lets us read JSON sent by the frontend

app.get("/health", (req, res) => res.send("health"));
app.get("/", (req, res) => res.send("OK"));
app.use("/api", routes);

// Catches every error and sends a clean message
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  // Prisma "record not found" errors
  if (err.code === "P2025") return res.status(404).json({ error: "Record not found" });
  res.status(status).json({ error: status === 500 ? "Something went wrong on the server" : err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));