import express from "express";
import cors from "cors";

import recipeRoutes from "./routes/recipeRoutes";
import authRoutes from "./routes/authRoutes";
import historyRoutes from "./routes/historyRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import proxyRoutes from "./routes/proxyRoutes";
import reviewRoutes from "./routes/reviewRoutes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "API MealSync funcionando" });
});

app.use("/auth", authRoutes);
app.use("/recipes", recipeRoutes);
app.use("/history", historyRoutes);
app.use("/upload", uploadRoutes); // RNF4 — Cloudinary
app.use("/proxy", proxyRoutes);  // RF11/RF18/RF19/RF28 — proxies para APIs externas
app.use("/reviews", reviewRoutes); // RF21 — avaliações de receitas

export default app;