import { Router } from "express";
import { promptStore } from "../stores/prompts.js";

export const promptsRouter = Router();

promptsRouter.get("/", (req, res) => {
  res.json(promptStore.getAll());
});

promptsRouter.post("/", (req, res) => {
  const prompt = promptStore.create(req.body);
  res.json(prompt);
});

promptsRouter.put("/:id", (req, res) => {
  const result = promptStore.update(req.params.id, req.body);
  if (!result) return res.status(404).json({ error: "Not found" });
  res.json(result);
});

promptsRouter.delete("/:id", (req, res) => {
  promptStore.delete(req.params.id);
  res.json({ ok: true });
});

promptsRouter.post("/:id/use", (req, res) => {
  promptStore.recordUse(req.params.id);
  res.json({ ok: true });
});
