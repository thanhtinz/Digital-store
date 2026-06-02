import rateLimit from 'express-rate-limit';

export const defaultRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { detail: 'Too many requests, please try again later' },
});

export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { detail: 'Too many login attempts, please wait' },
});

export const paymentRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { detail: 'Too many payment requests' },
});

export const webhookRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { detail: 'Too many webhook calls' },
});

// Polling trạng thái thanh toán (trang checkout hỏi liên tục) — rộng tay hơn
// nhưng vẫn chặn spam; việc gọi API SePay được throttle thêm ở tầng route.
export const statusRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { detail: 'Too many status checks, please slow down' },
});
