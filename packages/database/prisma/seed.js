// Seed script: populates the database with minimal sample data for development
// Run with: npm run prisma:seed (or npx prisma db seed)

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clear existing data (in dev only — Prisma will warn before running in prod)
  await prisma.dislikeCooldown.deleteMany({});
  await prisma.watchlistItem.deleteMany({});
  await prisma.userMovieTaste.deleteMany({});
  await prisma.swipe.deleteMany({});
  await prisma.matchSession.deleteMany({});
  await prisma.friendship.deleteMany({});
  await prisma.movie.deleteMany({});
  await prisma.user.deleteMany({});

  // Sample users
  const user1 = await prisma.user.create({
    data: {
      name: "Alice",
      email: "alice@example.com",
      passwordHash: "$2b$10$...", // placeholder, real hash will be computed
      letterboxdUsername: "alice-lb",
      avatarUrl: "https://example.com/avatar1.jpg",
    },
  });

  const user2 = await prisma.user.create({
    data: {
      name: "Bob",
      email: "bob@example.com",
      passwordHash: "$2b$10$...",
      letterboxdUsername: "bob-lb",
      avatarUrl: "https://example.com/avatar2.jpg",
    },
  });

  // Sample movies (real TMDB data would be loaded here)
  const movie1 = await prisma.movie.create({
    data: {
      id: "550",
      title: "Fight Club",
      year: 1999,
      overview:
        "An insomniac office worker and a devil-may-care soapmaker form an underground fight club that evolves into much more.",
      posterPath: "/adw6Lq9FiC9zjYEpOqfq03itm7.jpg",
    },
  });

  const movie2 = await prisma.movie.create({
    data: {
      id: "278",
      title: "The Shawshank Redemption",
      year: 1994,
      overview:
        "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.",
      posterPath: "/9O7gLzmreU0nGkIB1zohaUUK0JS.jpg",
    },
  });

  const movie3 = await prisma.movie.create({
    data: {
      id: "19995",
      title: "Avatar",
      year: 2009,
      overview:
        "A paraplegic Marine dispatched to the moon Pandora on a unique mission becomes torn between following his orders and protecting the world he feels is his home.",
      posterPath: "/jRXYj3sqzObL8TT0rPH5geHRluV.jpg",
    },
  });

  // Sample user taste (favorites + diary)
  await prisma.userMovieTaste.create({
    data: {
      userId: user1.id,
      movieId: movie1.id,
      source: "FAVORITE",
      rating: 10,
    },
  });

  await prisma.userMovieTaste.create({
    data: {
      userId: user1.id,
      movieId: movie2.id,
      source: "DIARY",
      rating: 9,
      watchedAt: new Date("2026-05-01"),
    },
  });

  await prisma.userMovieTaste.create({
    data: {
      userId: user2.id,
      movieId: movie2.id,
      source: "FAVORITE",
      rating: 10,
    },
  });

  await prisma.userMovieTaste.create({
    data: {
      userId: user2.id,
      movieId: movie3.id,
      source: "DIARY",
      rating: 8,
      watchedAt: new Date("2026-05-10"),
    },
  });

  console.log("✓ Seed complete");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
