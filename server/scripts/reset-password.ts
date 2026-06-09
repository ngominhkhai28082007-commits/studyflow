import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const newPassword = '12345678';
  const hash = await bcrypt.hash(newPassword, 10);

  const updated = await prisma.user.update({
    where: { email: 'nmkhai2536@clc.fitus.edu.vn' },
    data: { password: hash },
    select: { name: true, email: true },
  });

  console.log('✅ Đã đổi mật khẩu thành công cho:', updated);
}

main().finally(() => prisma.$disconnect());
