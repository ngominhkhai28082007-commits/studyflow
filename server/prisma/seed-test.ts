import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding 20 test users...');

  const password = await bcrypt.hash('12345678', 10);
  const now = new Date();

  for (let i = 1; i <= 20; i++) {
    const user = await prisma.user.create({
      data: {
        name: `User Test ${i}`,
        email: `test${i}@studyflow.com`,
        password,
        selectedMascot: i % 2 === 0 ? 'dog' : 'cat',
        coins: Math.floor(Math.random() * 100),
      },
    });

    // Create a task
    const task = await prisma.task.create({
      data: {
        userId: user.id,
        name: 'Math',
      },
    });

    // Create a study session for today so they have some time
    await prisma.studySession.create({
      data: {
        userId: user.id,
        taskId: task.id,
        seconds: 1800 + Math.floor(Math.random() * 7200), // between 0.5h to 2.5h
        startedAt: new Date(now.getTime() - 1000 * 60 * 60), // 1 hour ago
      },
    });
  }

  console.log('Seeded 20 users successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
