import Notification from '../models/Notification.js';
import { emitToUser } from '../socket.js';

export async function notifyUser({ userId, type, title, message, link = null, meta = {} }) {
  const notification = await Notification.create({
    user: userId,
    type,
    title,
    message,
    link,
    meta,
  });

  const payload = notification.toJSON();
  emitToUser(userId.toString(), 'notification:new', payload);

  return notification;
}
