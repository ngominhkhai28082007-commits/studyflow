import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.update({
    where: { email: 'nmkhai2536@clc.fitus.edu.vn' },
    data: { coins: 999999 },
    select: { name: true, email: true, coins: true },
  });
  console.log('✅ Đã nạp coins:', u);
}

main().finally(() => prisma.$disconnect());
