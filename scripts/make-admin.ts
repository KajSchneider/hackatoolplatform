import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.update({
    where: { email: 'schneiderkaj@gmail.com' },
    data: { role: 'admin' },
  });
  console.log('User marked as admin:', user);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
