// Minimal pub/sub so feature modules can react to each other without
// importing each other (keeps the dependency graph a tree).
const handlers = new Map();

export function on(event, fn) {
  if (!handlers.has(event)) handlers.set(event, new Set());
  handlers.get(event).add(fn);
  return () => handlers.get(event).delete(fn);
}

export function emit(event, payload) {
  handlers.get(event)?.forEach((fn) => fn(payload));
}
