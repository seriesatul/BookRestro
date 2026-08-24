import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const INDIA_BOUNDS = {
  minLat: 8.4,
  maxLat: 37.6,
  minLng: 68.7,
  maxLng: 97.25,
};

const cuisinePool = [
  'North Indian',
  'South Indian',
  'Mughlai',
  'Chinese',
  'Italian',
  'Cafe',
  'Street Food',
  'Continental',
  'Thai',
  'Japanese',
];

function randomCoordinate(min: number, max: number) {
  return Number(faker.number.float({ min, max, fractionDigits: 6 }).toFixed(6));
}

function slugify(value: string, suffix: number) {
  return `${value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}-${suffix}`;
}

async function main() {
  const password_hash = await bcrypt.hash('BookRestro@123', 12);

  const owner = await prisma.user.upsert({
    where: { email: 'owner@bookrestro.test' },
    update: {},
    create: {
      name: 'Test Owner',
      email: 'owner@bookrestro.test',
      password_hash,
      phone: '+919000000002',
      role: 'owner',
      dietary_pref: [],
    },
  });

  await prisma.user.upsert({
    where: { email: 'customer@bookrestro.test' },
    update: {},
    create: {
      name: 'Test Customer',
      email: 'customer@bookrestro.test',
      password_hash,
      phone: '+919000000001',
      role: 'customer',
      dietary_pref: ['vegetarian'],
    },
  });

  await prisma.user.upsert({
    where: { email: 'staff@bookrestro.test' },
    update: {},
    create: {
      name: 'Test Staff',
      email: 'staff@bookrestro.test',
      password_hash,
      phone: '+919000000003',
      role: 'staff',
      dietary_pref: [],
    },
  });

  const existingCount = await prisma.restaurant.count();
  if (existingCount >= 5000) {
    return;
  }

  for (let index = existingCount; index < 5000; index += 1) {
    const name = `${faker.company.name()} Kitchen`;
    const cuisines = faker.helpers.arrayElements(cuisinePool, { min: 1, max: 3 });
    const lat = randomCoordinate(INDIA_BOUNDS.minLat, INDIA_BOUNDS.maxLat);
    const lng = randomCoordinate(INDIA_BOUNDS.minLng, INDIA_BOUNDS.maxLng);

    await prisma.$executeRaw`
      INSERT INTO restaurants (
        id,
        owner_id,
        name,
        slug,
        description,
        address,
        city,
        phone,
        cuisine_type,
        opening_time,
        closing_time,
        is_active,
        total_tables,
        avg_rating,
        location
      )
      VALUES (
        ${randomUUID()}::uuid,
        ${owner.id}::uuid,
        ${name},
        ${slugify(name, index)},
        ${faker.lorem.sentence()},
        ${faker.location.streetAddress()},
        ${faker.location.city()},
        ${faker.phone.number()},
        ${cuisines}::text[],
        ${'09:00:00'}::time,
        ${'23:00:00'}::time,
        true,
        ${faker.number.int({ min: 6, max: 40 })},
        ${faker.number.float({ min: 3.1, max: 4.9, fractionDigits: 1 })},
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      )
      ON CONFLICT (slug) DO NOTHING
    `;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
