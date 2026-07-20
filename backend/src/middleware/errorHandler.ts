import { Request, Response, NextFunction } from "express";

/**
 * AppError — Custom error class mang HTTP status code.
 * Ném lỗi này từ bất kỳ route nào để errorHandler xử lý nhất quán.
 *
 * Ví dụ:
 *   throw new AppError(400, "Thiếu thông tin bắt buộc");
 *   throw new AppError(404, "Không tìm thấy hợp đồng");
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
    // Maintain proper stack trace (V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Global Express error handler.
 * Đặt cuối cùng sau tất cả routes trong server.ts.
 *
 * Xử lý:
 * - AppError → statusCode tùy chỉnh + message
 * - Prisma errors → 400/409 với message thân thiện
 * - Generic errors → 500
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  // Known application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Prisma unique constraint violation (P2002)
  if ((err as any).code === "P2002") {
    res.status(409).json({
      error: "Dữ liệu đã tồn tại. Vui lòng kiểm tra lại thông tin.",
    });
    return;
  }

  // Prisma record not found (P2025)
  if ((err as any).code === "P2025") {
    res.status(404).json({
      error: "Không tìm thấy bản ghi yêu cầu.",
    });
    return;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    res.status(401).json({ error: "Token không hợp lệ hoặc đã hết hạn." });
    return;
  }

  // Unexpected errors — log and return 500
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);
  res.status(500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Lỗi máy chủ nội bộ. Vui lòng thử lại sau."
        : err.message,
  });
};
