import { Router } from "express";
import { notificationStore } from "../stores/notifications.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", (req, res) => {
  res.json(notificationStore.getWebhooks());
});

notificationsRouter.post("/", (req, res) => {
  const webhook = notificationStore.addWebhook(req.body);
  res.json(webhook);
});

notificationsRouter.put("/:id", (req, res) => {
  const result = notificationStore.updateWebhook(req.params.id, req.body);
  if (!result) return res.status(404).json({ error: "Not found" });
  res.json(result);
});

notificationsRouter.delete("/:id", (req, res) => {
  notificationStore.deleteWebhook(req.params.id);
  res.json({ ok: true });
});

notificationsRouter.post("/:id/test", async (req, res) => {
  const results = await notificationStore.test(req.params.id);
  res.json(results);
});
