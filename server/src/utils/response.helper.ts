export function sendSuccess<T>(res: import('express').Response, data: T, status = 200) {
  res.status(status).json({ success: true, data });
}

export function sendCreated<T>(res: import('express').Response, data: T, message?: string) {
  res.status(201).json({ success: true, message, data });
}

export function sendMessage(res: import('express').Response, message: string, status = 200) {
  res.status(status).json({ success: true, message });
}
