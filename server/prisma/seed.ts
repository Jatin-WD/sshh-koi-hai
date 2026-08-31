import "dotenv/config";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TERMS_VERSION = "2026-08-31";
const demoPassword = process.env.DEMO_INITIAL_PASSWORD || `Demo-${cryptoRandom()}-Only!`;

function cryptoRandom() {
  return crypto.randomBytes(6).toString("hex");
}

function dob(yearsAgo: number, month: number, day: number) {
  return new Date(Date.UTC(new Date().getUTCFullYear() - yearsAgo, month - 1, day));
}

const demoUsers = [
  { key: "aanya", email: "aanya.demo@example.test", displayName: "Aanya Mehta", gender: "FEMALE" as const, city: "Mumbai", maritalStatus: "SINGLE" as const, lookingFor: "DATING" as const, age: 28, interests: ["Cinema", "Travel", "Cooking"], bio: "Slow mornings, good films, and conversations with a little depth.", occupation: "Architect", education: "Design", languages: ["English", "Hindi"], relationshipIntent: "A thoughtful connection", onlineStatus: true },
  { key: "kabir", email: "kabir.demo@example.test", displayName: "Kabir Rao", gender: "MALE" as const, city: "Delhi", maritalStatus: "SINGLE" as const, lookingFor: "RELATIONSHIP" as const, age: 31, interests: ["Jazz", "Books", "Running"], bio: "Collecting records, city walks, and stories worth staying up for.", occupation: "Product designer", education: "Communication", languages: ["English", "Hindi"], relationshipIntent: "A genuine relationship", onlineStatus: false },
  { key: "meera", email: "meera.demo@example.test", displayName: "Meera Iyer", gender: "FEMALE" as const, city: "Bengaluru", maritalStatus: "DIVORCED" as const, lookingFor: "CHAT" as const, age: 36, interests: ["Gardening", "Art", "Podcasts"], bio: "Curious by nature, happiest near plants and an unhurried conversation.", occupation: "Editor", education: "Literature", languages: ["English", "Tamil"], relationshipIntent: "Companionship and conversation", onlineStatus: false },
  { key: "rohan", email: "rohan.demo@example.test", displayName: "Rohan Sen", gender: "MALE" as const, city: "Pune", maritalStatus: "MARRIED" as const, lookingFor: "FRIENDSHIP" as const, age: 42, interests: ["Cycling", "History"], bio: "Weekend cyclist and lifelong learner. Here for kind conversation.", occupation: "Teacher", education: "History", languages: ["English", "Marathi"], relationshipIntent: "New friendships", onlineStatus: true },
  { key: "tara", email: "tara.demo@example.test", displayName: "Tara Kapoor", gender: "NON_BINARY" as const, city: "Hyderabad", maritalStatus: "SINGLE" as const, lookingFor: "DATING" as const, age: 24, interests: ["Photography", "Theatre", "Coffee"], bio: "Finding beauty in ordinary places and people who notice the details.", occupation: "Photographer", education: "Fine arts", languages: ["English", "Telugu"], relationshipIntent: "Something intentional", onlineStatus: true },
  { key: "dev", email: "dev.demo@example.test", displayName: "Dev Malhotra", gender: "MALE" as const, city: "Jaipur", maritalStatus: "PREFER_NOT_TO_SAY" as const, lookingFor: "CHAT" as const, age: 22, interests: ["Gaming"], bio: null, occupation: null, education: null, languages: [], relationshipIntent: null, onlineStatus: false },
];

async function upsertPlan(input: { name: string; code: string; durationMonths: number; price: number; featured: boolean; sortOrder: number }) {
  return prisma.subscriptionPlan.upsert({ where: { code: input.code }, update: input, create: { ...input, currency: "INR", description: `Demo ${input.name} membership.` } });
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
  if (!adminEmail || !adminPassword) throw new Error("ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD are required to run the seed");
  if (adminPassword.length < 12) throw new Error("ADMIN_INITIAL_PASSWORD must be at least 12 characters");

  const [monthly, quarterly, yearly] = await Promise.all([
    upsertPlan({ name: "Monthly", code: "monthly", durationMonths: 1, price: 499, featured: false, sortOrder: 1 }),
    upsertPlan({ name: "Quarterly", code: "quarterly", durationMonths: 3, price: 1199, featured: true, sortOrder: 2 }),
    upsertPlan({ name: "Yearly", code: "yearly", durationMonths: 12, price: 3999, featured: false, sortOrder: 3 }),
  ]);

  const passwordHash = await bcrypt.hash(demoPassword, 12);
  const users = new Map<string, { id: string }>();
  for (const item of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: item.email },
      update: { displayName: item.displayName, gender: item.gender, city: item.city, maritalStatus: item.maritalStatus, lookingFor: item.lookingFor, isEmailVerified: true, status: item.key === "dev" ? "ACTIVE" : "ACTIVE", termsVersion: TERMS_VERSION, acceptedAt: new Date() },
      create: { email: item.email, passwordHash, displayName: item.displayName, dateOfBirth: dob(item.age, 6, 15), gender: item.gender, city: item.city, maritalStatus: item.maritalStatus, lookingFor: item.lookingFor, isEmailVerified: true, status: "ACTIVE", termsVersion: TERMS_VERSION, acceptedAt: new Date() },
      select: { id: true },
    });
    users.set(item.key, user);
    await prisma.profile.upsert({ where: { userId: user.id }, update: { bio: item.bio, interests: item.interests, occupation: item.occupation, education: item.education, languages: item.languages, relationshipIntent: item.relationshipIntent, genderPreference: item.key === "aanya" ? "MALE" : null, agePreferenceMin: 24, agePreferenceMax: 45, locationPreference: item.city, lookingFor: item.lookingFor, visibility: item.key === "dev" ? "HIDDEN" : "VISIBLE", showOnlineStatus: true, onlineStatus: item.onlineStatus, allowInterests: true }, create: { userId: user.id, bio: item.bio, interests: item.interests, occupation: item.occupation, education: item.education, languages: item.languages, relationshipIntent: item.relationshipIntent, genderPreference: item.key === "aanya" ? "MALE" : null, agePreferenceMin: 24, agePreferenceMax: 45, locationPreference: item.city, lookingFor: item.lookingFor, visibility: item.key === "dev" ? "HIDDEN" : "VISIBLE", showOnlineStatus: true, onlineStatus: item.onlineStatus, allowInterests: true } });
    await prisma.notificationPreference.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
  }

  const adminHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({ where: { email: adminEmail }, update: { role: "ADMIN", isEmailVerified: true, status: "ACTIVE", termsVersion: TERMS_VERSION, acceptedAt: new Date() }, create: { email: adminEmail, passwordHash: adminHash, displayName: "Site Administrator", dateOfBirth: dob(35, 1, 1), gender: "PREFER_NOT_TO_SAY", isEmailVerified: true, role: "ADMIN", status: "ACTIVE", termsVersion: TERMS_VERSION, acceptedAt: new Date() } });

  const now = new Date();
  const subscriptions = [
    ["aanya", monthly, "ACTIVE", -15, 15], ["kabir", quarterly, "ACTIVE", -45, 45], ["meera", yearly, "EXPIRED", -400, -35], ["rohan", monthly, "PENDING", 0, 30], ["tara", quarterly, "CANCELLED", -20, 70],
  ] as const;
  for (const [key, plan, status, startOffset, endOffset] of subscriptions) {
    const user = users.get(key)!;
    const startDate = new Date(now.getTime() + startOffset * 86400000);
    const endDate = new Date(now.getTime() + endOffset * 86400000);
    const existing = await prisma.subscription.findFirst({ where: { userId: user.id, planId: plan.id } });
    const subscription = existing ? await prisma.subscription.update({ where: { id: existing.id }, data: { status, startDate, endDate, autoRenew: status === "ACTIVE" } }) : await prisma.subscription.create({ data: { userId: user.id, planId: plan.id, status, startDate, endDate, autoRenew: status === "ACTIVE" } });
    if (status === "ACTIVE" || status === "EXPIRED") await prisma.payment.upsert({ where: { razorpayPaymentId: `demo_payment_${key}` }, update: { userId: user.id, planId: plan.id, subscriptionId: subscription.id, amount: plan.price, currency: "INR", status: "SUCCESS", paidAt: startDate }, create: { id: `demo_payment_${key}`, userId: user.id, planId: plan.id, subscriptionId: subscription.id, amount: plan.price, currency: "INR", status: "SUCCESS", razorpayPaymentId: `demo_payment_${key}`, paidAt: startDate } });
  }

  const aanya = users.get("aanya")!; const kabir = users.get("kabir")!; const meera = users.get("meera")!; const tara = users.get("tara")!;
  const interest = await prisma.interest.upsert({ where: { senderId_receiverId: { senderId: kabir.id, receiverId: aanya.id } }, update: { status: "ACCEPTED", respondedAt: now }, create: { senderId: kabir.id, receiverId: aanya.id, status: "ACCEPTED", respondedAt: now, note: "Your profile made me curious." } });
  await prisma.interest.upsert({ where: { senderId_receiverId: { senderId: meera.id, receiverId: aanya.id } }, update: { status: "PENDING" }, create: { senderId: meera.id, receiverId: aanya.id, status: "PENDING" } });
  await prisma.interest.upsert({ where: { senderId_receiverId: { senderId: tara.id, receiverId: aanya.id } }, update: { status: "REJECTED", respondedAt: now }, create: { senderId: tara.id, receiverId: aanya.id, status: "REJECTED", respondedAt: now } });

  const pair = kabir.id < aanya.id ? { firstUserId: kabir.id, secondUserId: aanya.id } : { firstUserId: aanya.id, secondUserId: kabir.id };
  const match = await prisma.match.upsert({ where: { firstUserId_secondUserId: pair }, update: {}, create: pair });
  const conversation = await prisma.conversation.upsert({ where: { matchId: match.id }, update: {}, create: { matchId: match.id, members: { connect: [{ id: aanya.id }, { id: kabir.id }] } } });
  await prisma.message.upsert({ where: { id: "demo_message_hello" }, update: {}, create: { id: "demo_message_hello", conversationId: conversation.id, senderId: kabir.id, content: "Hello Aanya, your profile sounds like a good conversation.", type: "TEXT", deliveredAt: now, readAt: now } });
  await prisma.message.upsert({ where: { id: "demo_message_reply" }, update: {}, create: { id: "demo_message_reply", conversationId: conversation.id, senderId: aanya.id, content: "That is a lovely way to start. How is your week going?", type: "TEXT", deliveredAt: now } });
  await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: now } });
  await prisma.notification.deleteMany({ where: { userId: aanya.id, metadata: { path: ["seed"], equals: true } } });
  await prisma.notification.create({ data: { userId: aanya.id, type: "INTEREST_RECEIVED", title: "New interest", body: "Meera Iyer sent you an interest.", metadata: { seed: true } } });
  await prisma.notification.create({ data: { userId: kabir.id, type: "NEW_MATCH", title: "New match", body: "You and Aanya Mehta can now start a private conversation.", metadata: { seed: true } } });

  await prisma.siteSetting.upsert({ where: { key: "business_model" }, update: {}, create: { key: "business_model", value: "EVERYONE_PAID", description: "Demo membership mode" } });
  console.log(`Seeded ${demoUsers.length} fictional demo users, three plans, subscriptions, interests, a match, a conversation, messages, and notifications.`);
  console.log(`Demo login password: ${demoPassword}${process.env.DEMO_INITIAL_PASSWORD ? " (from DEMO_INITIAL_PASSWORD)" : " (generated for this run)"}`);
  console.log(`Admin account: ${adminEmail} (password supplied through ADMIN_INITIAL_PASSWORD)`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
