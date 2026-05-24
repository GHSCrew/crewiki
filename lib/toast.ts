type ToastFn = (message: string, type?: "success" | "error" | "info") => void;

let _listener: ToastFn | null = null;

export function toast(message: string, type: "success" | "error" | "info" = "success") {
  _listener?.(message, type);
}

export function setToastListener(fn: ToastFn) {
  _listener = fn;
}
