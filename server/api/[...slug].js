// server/api/[...slug].js
// Catch-all Vercel serverless function — forwards all /api/* requests to your Express app

import connectDB from "./database/db.js";
import app from "./app.js";

async function ensureDB() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not defined");
  }
  // connectDB should handle readyState internally
  await connectDB();
  console.log("MongoDB connected (vercel)");
}

export default async function handler(req, res) {
  try {
    await ensureDB();
    // Forward request to Express app — app(req,res) works in Vercel Node handlers
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
