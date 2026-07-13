import { PrismaClient, Prisma } from "@prisma/client";

export const prisma = new PrismaClient();
export { Prisma };

// Hook/Middleware: Anti-Delete / Master Data Protection
prisma.$use(async (params, next) => {
  if (params.model === "InterestType") {
    if (params.action === "delete" || params.action === "deleteMany") {
      // Throw exception to block deletion of system interest types
      throw new Error("Không thể xóa các hình thức tính lãi hệ thống (System Master Data).");
    }
  }
  return next(params);
});
