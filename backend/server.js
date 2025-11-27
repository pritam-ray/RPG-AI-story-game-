import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import gameRoutes from "./routes/game.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/game", gameRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Dungeon Master backend is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: "Something went wrong!", 
    message: err.message 
  });
});

app.listen(PORT, () => {
  console.log(`🎲 Dungeon Master backend running on port ${PORT}`);
  console.log(`📡 Azure OpenAI Endpoint: ${process.env.AZURE_OPENAI_ENDPOINT}`);
  console.log(`🎮 Deployment: ${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`);
});
