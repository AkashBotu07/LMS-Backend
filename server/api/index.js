// server/api/index.js
// Vercel serverless wrapper (debug-friendly)

import connectDB from "./database/db.js";
import app from "./app.js";

async function ensureDB() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined");
    }
    await connectDB();
    console.log("MongoDB connected (vercel)");
  } catch (err) {
    console.error("Mongo connection error (vercel):", err && err.stack ? err.stack : err);
    throw err;
  }
}

export default async function handler(req, res) {
  try {
    await ensureDB();
    // forward request to express app
    return app(req, res);
  } catch (err) {
    console.error("Handler error (vercel):", err && err.stack ? err.stack : err);

    // Temporary debug output when DEBUG=true (remove or set false after fix)
    if (process.env.DEBUG === "true") {
      const message = err && err.stack ? err.stack : String(err);
      res.status(500).type("text/plain").send(`DEBUG ERROR:\n\n${message}`);
      return;
    }

    res.status(500).send("internal server error");
  }
}
