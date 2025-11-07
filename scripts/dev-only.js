// Prevent accidental Studio runs in prod/CI
if (process.env.NODE_ENV === 'production' || process.env.CI) {
  console.error('Prisma Studio is disabled in production/CI.');
  process.exit(1);
}
