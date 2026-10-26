import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getNotifications, markAllNotificationsRead } from '../db.js';

export default function notificationsRouter(io) {
  const router = Router();

  router.get('/', async (_req, res, next) => {
    try {
      const notifications = await getNotifications();
      res.json({ notifications, unreadCount: notifications.filter((n) => !n.read).length });
    } catch (err) { next(err); }
  });

  router.post('/mark-all-read', requireAuth, async (_req, res, next) => {
    try {
      const notifications = await markAllNotificationsRead();
      io.emit('notifications:markedAllRead', notifications);
      res.json({ notifications, unreadCount: 0 });
    } catch (err) { next(err); }
  });

  return router;
}
