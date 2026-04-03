import { Router } from "express";
import { costStore } from "../stores/costs.js";

export const costsRouter = Router();

costsRouter.get("/", (req, res) => {
  res.json(costStore.getSummary());
});

costsRouter.get("/entries", (req, res) => {
  res.json(costStore.getEntries());
});

// Called internally when token usage updates
costsRouter.post("/record", (req, res) => {
  const { sessionId, project, usage } = req.body;
  const entry = costStore.record(sessionId, project, usage);
  res.json(entry);
});
