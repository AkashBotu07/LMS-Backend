// server/api/[...slug].js
// Catch-all Vercel function to forward all /api/* requests to Express

import connectDB from "./database/db.js";
import app from "./app.js";

async function ensureDB() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not defined");
  }
  await connectDB();
  console.log("MongoDB connected (vercel catch-all)");
}

export default async function handler(req, res) {
  try {
    await ensureDB();
    return app(req, res);
  } catch (err) {
    console.error("Handler error (vercel catch-all):", err && (err.stack || err));
    if (process.env.DEBUG === "true") {
      const message = err && (err.stack || String(err));
      res.status(500).type("text/plain").send(`DEBUG ERROR:\n\n${message}`);
      return;
    }
    res.status(500).send("internal server error");
  }
}
