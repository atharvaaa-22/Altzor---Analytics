/**
 * seed.ts — Database seeder for development.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Create default organization
  const org = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      primaryColor: '#6366F1',
      secondaryColor: '#8B5CF6',
    },
  });

  // Create super admin
  const passwordHash = await bcrypt.hash('Admin@123456', 12);
  await prisma.user.upsert({
    where: { email: 'admin@acme.com' },
    update: {},
    create: {
      email: 'admin@acme.com',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      organizationId: org.id,
    },
  });

  // Create sample analyst
  const analystHash = await bcrypt.hash('Analyst@123456', 12);
  await prisma.user.upsert({
    where: { email: 'analyst@acme.com' },
    update: {},
    create: {
      email: 'analyst@acme.com',
      passwordHash: analystHash,
      firstName: 'Jane',
      lastName: 'Analyst',
      role: 'ANALYST',
      organizationId: org.id,
    },
  });

  console.log('Seed completed: org=%s, admin=admin@acme.com', org.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
