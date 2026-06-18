/**
 * Tiny dependency-free toast bus.
 *
 * Any module can call `toast(...)` to surface a non-blocking notification; the
 * <Toaster /> component subscribes and renders them. This replaces the blocking
 * `alert()` calls that interrupted the canvas workflow.
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();

const emit = () => listeners.forEach((l) => l([...toasts]));

export const subscribeToasts = (listener: Listener): (() => void) => {
  listeners.add(listener);
  listener([...toasts]);
  return () => listeners.delete(listener);
};

export const dismissToast = (id: string) => {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
};

export const toast = (
  message: string,
  type: ToastType = 'info',
  duration = type === 'error' ? 6000 : 3500,
): string => {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  toasts = [...toasts, { id, type, message, duration }];
  emit();
  if (duration > 0) {
    setTimeout(() => dismissToast(id), duration);
  }
  return id;
};
