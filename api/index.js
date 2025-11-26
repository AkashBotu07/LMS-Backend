// api/index.js  — temporary debug version (remove after fix)
import connectDB from "./server/database/db.js";
import app from "./server/app.js";

async function ensureDB() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in environment");
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
    return app(req, res);
  } catch (err) {
    console.error("Handler error (vercel):", err && err.stack ? err.stack : err);

    // DEBUG output — only return stack when DEBUG=true
    if (process.env.DEBUG === "true") {
      const message = err && err.stack ? err.stack : String(err);
      res.status(500).type("text/plain").send(`DEBUG ERROR:\n\n${message}`);
      return;
    }

    res.status(500).send("internal server error");
  }
}
