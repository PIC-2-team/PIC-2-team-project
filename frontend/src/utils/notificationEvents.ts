const UNREAD_CHANGED = 'samgyeol:notifications-changed';

export function emitNotificationsChanged(): void {
  window.dispatchEvent(new Event(UNREAD_CHANGED));
}

export function onNotificationsChanged(listener: () => void): () => void {
  window.addEventListener(UNREAD_CHANGED, listener);
  return () => window.removeEventListener(UNREAD_CHANGED, listener);
}
