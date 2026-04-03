import { Router } from "express";
import { agentStore } from "../agents/store.js";

export const agentsRouter = Router();

agentsRouter.get("/", (req, res) => {
  res.json(agentStore.getAll());
});

agentsRouter.post("/", (req, res) => {
  const arch = req.body;
  if (!arch.id) arch.id = `arch-${Date.now()}`;
  res.json(agentStore.saveArchitecture(arch));
});

agentsRouter.delete("/:id", (req, res) => {
  agentStore.deleteArchitecture(req.params.id);
  res.json({ ok: true });
});

agentsRouter.post("/:id/activate", (req, res) => {
  agentStore.setActive(req.params.id);
  res.json({ ok: true });
});
