import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.toLowerCase();
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Gebruik: npx tsx scripts/restore-admin.ts <email> <wachtwoord>');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'admin', passwordHash },
    create: {
      email,
      name: email.split('@')[0],
      passwordHash,
      role: 'admin',
    },
  });

  console.log('Account hersteld als admin:', { id: user.id, email: user.email, role: user.role });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
