// Import core libraries
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Import the main API router
import router from "./routes";

// Load environment variables from .env into process.env
dotenv.config();

// Create the Express application (does NOT start the server)
const app = express();

// Read allowed client origin from environment variables
// Fallback is the local Vite dev server
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

// Enable CORS so the client can communicate with this server
app.use(
    cors({
        origin: CLIENT_ORIGIN,   // Allowed frontend origin
        credentials: true,       // Allow cookies / auth headers (future use)
    })
);

// Parse incoming JSON requests (req.body)
app.use(express.json());

// Mount all API routes under /api
// Example: /health -> /api/health
app.use("/api", router);

// Export the app instance
// The server (listen) is started in server.ts
export default app;
