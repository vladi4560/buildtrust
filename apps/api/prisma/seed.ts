import { PrismaClient, type LedgerAccount, type LedgerEntryType } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// Internal double-entry accounting convention used consistently here and by
// the Phase 2 ledger service:
//   DEPOSIT  debit PLATFORM_HOLD  credit CLIENT_ESCROW         (cash enters the pool)
//   RESERVE  debit CLIENT_ESCROW  credit CLIENT_ESCROW         (net-zero milestone earmark, audit row only)
//   RELEASE  debit CLIENT_ESCROW  credit PROFESSIONAL_PAYABLE  (escrow -> professional)
//   REFUND   debit CLIENT_ESCROW  credit PLATFORM_HOLD         (escrow -> back out of the pool)
const LEDGER_ACCOUNTS: Record<LedgerEntryType, { debit: LedgerAccount; credit: LedgerAccount }> = {
  DEPOSIT: { debit: "PLATFORM_HOLD", credit: "CLIENT_ESCROW" },
  RESERVE: { debit: "CLIENT_ESCROW", credit: "CLIENT_ESCROW" },
  RELEASE: { debit: "CLIENT_ESCROW", credit: "PROFESSIONAL_PAYABLE" },
  REFUND: { debit: "CLIENT_ESCROW", credit: "PLATFORM_HOLD" },
};

// Trade taxonomy for the Discover marketplace (BUILD_SPEC section 4/7/8).
// Icon names are Ionicons (@expo/vector-icons), rendered by CategoryTile.
const CATEGORY_TAXONOMY = [
  { name: "Electrical", slug: "electrical", icon: "flash-outline" },
  { name: "Plumbing", slug: "plumbing", icon: "water-outline" },
  { name: "Flooring", slug: "flooring", icon: "square-outline" },
  { name: "Painting", slug: "painting", icon: "color-palette-outline" },
  { name: "HVAC", slug: "hvac", icon: "thermometer-outline" },
  { name: "Carpentry", slug: "carpentry", icon: "hammer-outline" },
  { name: "Kitchens", slug: "kitchens", icon: "restaurant-outline" },
  { name: "Structural", slug: "structural", icon: "business-outline" },
  { name: "Waterproofing", slug: "waterproofing", icon: "umbrella-outline" },
  { name: "Aluminum & Glass", slug: "aluminum-glass", icon: "browsers-outline" },
  { name: "Drywall", slug: "drywall", icon: "layers-outline" },
] as const;

async function main() {
  console.log("Wiping existing data...");
  await prisma.review.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.portfolioItem.deleteMany();
  await prisma.project.deleteMany();
  await prisma.professionalCategory.deleteMany();
  await prisma.category.deleteMany();
  await prisma.professionalProfile.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 12);

  console.log("Seeding categories...");
  const categories = await Promise.all(
    CATEGORY_TAXONOMY.map((category) => prisma.category.create({ data: category })),
  );
  const flooringCategory = categories.find((c) => c.slug === "flooring")!;

  console.log("Seeding users...");
  const john = await prisma.user.create({
    data: {
      role: "CLIENT",
      fullName: "John",
      email: "john@buildtrust.dev",
      phone: "+972-50-1234567",
      passwordHash,
      verified: true,
    },
  });

  const david = await prisma.user.create({
    data: {
      role: "PROFESSIONAL",
      fullName: "David Parquet",
      email: "david@buildtrust.dev",
      phone: "+972-50-7654321",
      passwordHash,
      verified: true,
    },
  });

  await prisma.professionalProfile.create({
    data: {
      userId: david.id,
      specialty: "Flooring Specialist",
      yearsExperience: 3,
      skills: ["Parquet", "Laminate", "VINYL", "Floor Leveling"],
      onTimePercent: 98,
      projectsCount: 3,
      dailyRate: 800_00,
      available: true,
    },
  });

  await prisma.professionalCategory.create({
    data: { professionalId: david.id, categoryId: flooringCategory.id },
  });

  console.log("Seeding portfolio...");
  const portfolioCaptions = [
    "Living room parquet — herringbone pattern",
    "Oak laminate flooring, full apartment",
    "Vinyl plank installation, kitchen",
    "Floor leveling before parquet install",
    "Staircase parquet finishing",
    "Bedroom parquet — natural oak",
  ];
  for (const [index, caption] of portfolioCaptions.entries()) {
    await prisma.portfolioItem.create({
      data: {
        professionalId: david.id,
        imageUrl: `https://picsum.photos/seed/buildtrust-portfolio-${index + 1}/800/600`,
        caption,
      },
    });
  }

  // --- Project 1: Parquet Installation — Living Room (25m²) ---
  // Fully specified by BUILD_SPEC section 10: budget 8500, spent 5525 (65%),
  // milestone 2 released for 2550. Deposited in full at activation per the
  // RESERVE-at-activation rule (section 5): the deposit is earmarked across
  // all milestones as soon as the contract goes ACTIVE.
  console.log("Seeding Parquet Installation project...");
  const parquetProject = await prisma.project.create({
    data: {
      clientId: john.id,
      title: "Parquet Installation — Living Room (25m²)",
      sizeLabel: "Living Room (25m²)",
      description: "Herringbone oak parquet installation for the living room.",
      status: "IN_PROGRESS",
      budgetPlanned: 8_500_00,
    },
  });

  const parquetContract = await prisma.contract.create({
    data: {
      projectId: parquetProject.id,
      clientId: john.id,
      professionalId: david.id,
      amount: 8_500_00,
      startDate: new Date("2024-05-10"),
      estimatedEnd: new Date("2024-05-16"),
      workingDays: 6,
      scope: "Sand and level subfloor, install herringbone oak parquet, finish and trim.",
      status: "ACTIVE",
      version: 1,
    },
  });

  const [parquetM1, parquetM2, parquetM3] = await Promise.all([
    prisma.milestone.create({
      data: {
        contractId: parquetContract.id,
        order: 1,
        title: "Sanding & Subfloor Prep",
        amount: 2_975_00,
        status: "RELEASED",
        dueDate: new Date("2024-05-11"),
        submittedAt: new Date("2024-05-11"),
        approvedAt: new Date("2024-05-11"),
        releasedAt: new Date("2024-05-12"),
      },
    }),
    prisma.milestone.create({
      data: {
        contractId: parquetContract.id,
        order: 2,
        title: "Parquet Installation",
        amount: 2_550_00,
        status: "RELEASED",
        dueDate: new Date("2024-05-13"),
        submittedAt: new Date("2024-05-13"),
        approvedAt: new Date("2024-05-13"),
        releasedAt: new Date("2024-05-14"),
      },
    }),
    prisma.milestone.create({
      data: {
        contractId: parquetContract.id,
        order: 3,
        title: "Finishing & Trim",
        amount: 2_975_00,
        status: "IN_PROGRESS",
        dueDate: new Date("2024-05-16"),
      },
    }),
  ]);

  await seedLedgerForContract(parquetContract.id, parquetContract.amount, new Date("2024-05-10"), [
    { milestoneId: parquetM1.id, amount: parquetM1.amount, releasedAt: parquetM1.releasedAt },
    { milestoneId: parquetM2.id, amount: parquetM2.amount, releasedAt: parquetM2.releasedAt },
    { milestoneId: parquetM3.id, amount: parquetM3.amount, releasedAt: null },
  ]);

  // --- Project 2: Bathroom Renovation — Tel Aviv ---
  // Budget 35000 and "milestone 1 released +5000" are explicit in the spec.
  // Project.status stays PLANNING per spec even though a contract already
  // exists and one milestone has been released — a minor inconsistency in
  // the source mockup data that we reproduce literally rather than silently
  // "fixing".
  console.log("Seeding Bathroom Renovation project...");
  const bathroomProject = await prisma.project.create({
    data: {
      clientId: john.id,
      title: "Bathroom Renovation — Tel Aviv",
      description: "Full bathroom renovation: demo, plumbing, tiling, fixtures.",
      status: "PLANNING",
      budgetPlanned: 35_000_00,
    },
  });

  const bathroomContract = await prisma.contract.create({
    data: {
      projectId: bathroomProject.id,
      clientId: john.id,
      professionalId: david.id,
      amount: 35_000_00,
      startDate: new Date("2024-06-01"),
      estimatedEnd: new Date("2024-07-15"),
      workingDays: 30,
      scope: "Demo, plumbing rerouting, tiling, fixture installation.",
      status: "ACTIVE",
      version: 1,
    },
  });

  const [bathroomM1, bathroomM2, bathroomM3] = await Promise.all([
    prisma.milestone.create({
      data: {
        contractId: bathroomContract.id,
        order: 1,
        title: "Deposit & Demo",
        amount: 5_000_00,
        status: "RELEASED",
        dueDate: new Date("2024-06-03"),
        submittedAt: new Date("2024-06-03"),
        approvedAt: new Date("2024-06-03"),
        releasedAt: new Date("2024-06-04"),
      },
    }),
    prisma.milestone.create({
      data: {
        contractId: bathroomContract.id,
        order: 2,
        title: "Plumbing & Tiling",
        amount: 15_000_00,
        status: "PENDING",
        dueDate: new Date("2024-06-20"),
      },
    }),
    prisma.milestone.create({
      data: {
        contractId: bathroomContract.id,
        order: 3,
        title: "Fixtures & Finishing",
        amount: 15_000_00,
        status: "PENDING",
        dueDate: new Date("2024-07-15"),
      },
    }),
  ]);

  await seedLedgerForContract(
    bathroomContract.id,
    bathroomContract.amount,
    new Date("2024-06-01"),
    [
      { milestoneId: bathroomM1.id, amount: bathroomM1.amount, releasedAt: bathroomM1.releasedAt },
      { milestoneId: bathroomM2.id, amount: bathroomM2.amount, releasedAt: null },
      { milestoneId: bathroomM3.id, amount: bathroomM3.amount, releasedAt: null },
    ],
  );

  // --- Project 3: Kitchen Cabinets — Custom Build ---
  // Not listed among "Projects for John" in section 10, but implied by the
  // wallet transaction "Kitchen Cabinets Payment Reserved -3000". Modeled as
  // a small, just-started contract so that transaction has a real backing
  // milestone/contract, per the rule that money movements are never free-floating.
  console.log("Seeding Kitchen Cabinets project...");
  const kitchenProject = await prisma.project.create({
    data: {
      clientId: john.id,
      title: "Kitchen Cabinets — Custom Build",
      status: "IN_PROGRESS",
      budgetPlanned: 3_000_00,
    },
  });

  const kitchenContract = await prisma.contract.create({
    data: {
      projectId: kitchenProject.id,
      clientId: john.id,
      professionalId: david.id,
      amount: 3_000_00,
      startDate: new Date("2024-07-01"),
      estimatedEnd: new Date("2024-07-10"),
      workingDays: 8,
      scope: "Measure, build, and install custom kitchen cabinets.",
      status: "ACTIVE",
      version: 1,
    },
  });

  const kitchenM1 = await prisma.milestone.create({
    data: {
      contractId: kitchenContract.id,
      order: 1,
      title: "Cabinet Installation",
      amount: 3_000_00,
      status: "IN_PROGRESS",
      dueDate: new Date("2024-07-10"),
    },
  });

  await seedLedgerForContract(kitchenContract.id, kitchenContract.amount, new Date("2024-07-01"), [
    { milestoneId: kitchenM1.id, amount: kitchenM1.amount, releasedAt: null },
  ]);

  // --- Reviews ---
  // Breakdown from section 10: 5x112, 4x12, 3x3, 2x1, 1x0 (128 total).
  // All authored by John since he's the only seeded client — a simplification
  // for demo data; a real dataset would have many distinct clients.
  console.log("Seeding reviews...");
  const ratingCounts: Array<[number, number]> = [
    [5, 112],
    [4, 12],
    [3, 3],
    [2, 1],
    [1, 0],
  ];
  const sampleComments = [
    "David was punctual, tidy, and the parquet finish is flawless. Highly recommend.",
    "Great communication throughout the project, delivered on time.",
    "Solid work overall, a couple of small touch-ups needed at the end.",
    "Very professional, would hire again for the next phase.",
  ];
  const contractsForReviews = [parquetContract.id, bathroomContract.id, kitchenContract.id];

  let reviewIndex = 0;
  for (const [rating, count] of ratingCounts) {
    for (let i = 0; i < count; i++) {
      const contractId = contractsForReviews[reviewIndex % contractsForReviews.length]!;
      await prisma.review.create({
        data: {
          contractId,
          authorId: john.id,
          subjectId: david.id,
          direction: "CLIENT_TO_PRO",
          rating,
          comment: reviewIndex < sampleComments.length ? sampleComments[reviewIndex] : null,
          createdAt: new Date(Date.now() - reviewIndex * 24 * 60 * 60 * 1000),
        },
      });
      reviewIndex++;
    }
  }

  console.log("Seed complete.");
}

async function seedLedgerForContract(
  contractId: string,
  depositAmount: number,
  depositDate: Date,
  milestones: Array<{ milestoneId: string; amount: number; releasedAt: Date | null }>,
) {
  const depositAccounts = LEDGER_ACCOUNTS.DEPOSIT;
  await prisma.ledgerEntry.create({
    data: {
      contractId,
      type: "DEPOSIT",
      debitAccount: depositAccounts.debit,
      creditAccount: depositAccounts.credit,
      amount: depositAmount,
      createdAt: depositDate,
    },
  });

  const reserveAccounts = LEDGER_ACCOUNTS.RESERVE;
  for (const milestone of milestones) {
    await prisma.ledgerEntry.create({
      data: {
        contractId,
        milestoneId: milestone.milestoneId,
        type: "RESERVE",
        debitAccount: reserveAccounts.debit,
        creditAccount: reserveAccounts.credit,
        amount: milestone.amount,
        createdAt: depositDate,
      },
    });
  }

  const releaseAccounts = LEDGER_ACCOUNTS.RELEASE;
  for (const milestone of milestones) {
    if (!milestone.releasedAt) continue;
    await prisma.ledgerEntry.create({
      data: {
        contractId,
        milestoneId: milestone.milestoneId,
        type: "RELEASE",
        debitAccount: releaseAccounts.debit,
        creditAccount: releaseAccounts.credit,
        amount: milestone.amount,
        createdAt: milestone.releasedAt,
      },
    });
  }
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
