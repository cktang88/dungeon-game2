import { Hono } from "hono";
import { gameRouter } from "./game/handlers";

type Env = {
  GOOGLE_API_KEY: string;
};

const app = new Hono<{ Bindings: Env }>();

// Health check endpoint
app.get("/api/", (c) => c.json({ 
  name: "Dungeon Crawler LLM Game API",
  version: "1.0.0"
}));

// Mount game routes
app.route("/api/game", gameRouter);

export default app;