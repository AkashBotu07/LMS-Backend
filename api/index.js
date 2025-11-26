// api/index.js
import connectDB from "./server/database/db.js";
import app from "./server/app.js";

async function ensureDB() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in environment");
    }
    // connectDB should check mongoose.connection.readyState internally;
    await connectDB();
    console.log("MongoDB connected (vercel)");
  } catch (err) {
    console.error("Mongo connection error (vercel):", err.stack || err);
    throw err;
  }
}

export default async function handler(req, res) {
  try {
    await ensureDB();
    // Express app can be invoked directly as a handler
    return app(req, res);
  } catch (err) {
    console.error("Handler error (vercel):", err.stack || err);
    res.status(500).send("internal server error");
  }
}
