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
  { key: "ishita", email: "ishita.demo@example.test", displayName: "Ishita Sharma", gender: "FEMALE" as const, city: "Mumbai", maritalStatus: "SINGLE" as const, lookingFor: "RELATIONSHIP" as const, age: 27, interests: ["Yoga", "Books", "Travel"], bio: "Warm conversations, weekend escapes, and a soft spot for old bookstores.", occupation: "Marketing strategist", education: "Business", languages: ["English", "Hindi"], relationshipIntent: "A steady, meaningful connection", onlineStatus: true },
  { key: "naina", email: "naina.demo@example.test", displayName: "Naina Verma", gender: "FEMALE" as const, city: "Bengaluru", maritalStatus: "SINGLE" as const, lookingFor: "CHAT" as const, age: 30, interests: ["Music", "Cooking", "Podcasts"], bio: "Good food, better playlists, and conversations that do not feel rushed.", occupation: "UX researcher", education: "Psychology", languages: ["English", "Hindi"], relationshipIntent: "Companionship and curiosity", onlineStatus: false },
  { key: "simran", email: "simran.demo@example.test", displayName: "Simran Gill", gender: "FEMALE" as const, city: "Delhi", maritalStatus: "DIVORCED" as const, lookingFor: "DATING" as const, age: 34, interests: ["Art", "Brunch", "Cinema"], bio: "Independent, cheerful, and always up for a thoughtful exchange.", occupation: "Gallery curator", education: "Fine arts", languages: ["English", "Hindi", "Punjabi"], relationshipIntent: "Something honest and unhurried", onlineStatus: true },
  { key: "avani", email: "avani.demo@example.test", displayName: "Avani Shah", gender: "FEMALE" as const, city: "Pune", maritalStatus: "SINGLE" as const, lookingFor: "MARRIAGE" as const, age: 29, interests: ["Dance", "Nature", "Photography"], bio: "Finding joy in small rituals, green spaces, and people with kind eyes.", occupation: "Product manager", education: "Engineering", languages: ["English", "Hindi", "Gujarati"], relationshipIntent: "A sincere long-term partnership", onlineStatus: false },
  { key: "riya", email: "riya.demo@example.test", displayName: "Riya Menon", gender: "FEMALE" as const, city: "Chennai", maritalStatus: "SINGLE" as const, lookingFor: "FRIENDSHIP" as const, age: 26, interests: ["Reading", "Beach walks", "Coffee"], bio: "Quietly optimistic, fond of coastal evenings and good questions.", occupation: "Content editor", education: "Literature", languages: ["English", "Tamil", "Malayalam"], relationshipIntent: "New friendships with depth", onlineStatus: true },
  { key: "kavya", email: "kavya.demo@example.test", displayName: "Kavya Nair", gender: "FEMALE" as const, city: "Kochi", maritalStatus: "SINGLE" as const, lookingFor: "DATING" as const, age: 28, interests: ["Food", "Travel", "Painting"], bio: "Always curious about new places, local food, and people who listen well.", occupation: "Interior designer", education: "Design", languages: ["English", "Malayalam"], relationshipIntent: "A genuine connection", onlineStatus: false },
  { key: "pihu", email: "pihu.demo@example.test", displayName: "Pihu Arora", gender: "FEMALE" as const, city: "Chandigarh", maritalStatus: "SINGLE" as const, lookingFor: "CHAT" as const, age: 25, interests: ["Dance", "Fashion", "Coffee"], bio: "Bright days, good music, and conversations that make time disappear.", occupation: "Brand consultant", education: "Commerce", languages: ["English", "Hindi"], relationshipIntent: "Easy, thoughtful conversation", onlineStatus: true },
  { key: "ananya", email: "ananya.demo@example.test", displayName: "Ananya Bose", gender: "FEMALE" as const, city: "Kolkata", maritalStatus: "DIVORCED" as const, lookingFor: "RELATIONSHIP" as const, age: 37, interests: ["Theatre", "Poetry", "History"], bio: "A lover of old cities, live theatre, and emotionally honest conversations.", occupation: "Museum educator", education: "History", languages: ["English", "Hindi", "Bengali"], relationshipIntent: "A mature and meaningful bond", onlineStatus: false },
  { key: "zoya", email: "zoya.demo@example.test", displayName: "Zoya Siddiqui", gender: "FEMALE" as const, city: "Lucknow", maritalStatus: "SINGLE" as const, lookingFor: "DATING" as const, age: 32, interests: ["Cooking", "Books", "Music"], bio: "Homemade food, late-night playlists, and a soft spot for kind people.", occupation: "Food writer", education: "Journalism", languages: ["English", "Hindi", "Urdu"], relationshipIntent: "Something warm and intentional", onlineStatus: true },
  { key: "manya", email: "manya.demo@example.test", displayName: "Manya Joshi", gender: "FEMALE" as const, city: "Indore", maritalStatus: "SINGLE" as const, lookingFor: "MARRIAGE" as const, age: 30, interests: ["Fitness", "Gardening", "Travel"], bio: "Grounded, optimistic, and happiest when planning the next weekend escape.", occupation: "Chartered accountant", education: "Finance", languages: ["English", "Hindi"], relationshipIntent: "A sincere life partnership", onlineStatus: false },
  { key: "shruti", email: "shruti.demo@example.test", displayName: "Shruti Kulkarni", gender: "FEMALE" as const, city: "Nagpur", maritalStatus: "SINGLE" as const, lookingFor: "FRIENDSHIP" as const, age: 27, interests: ["Cycling", "Podcasts", "Books"], bio: "A little introverted, very curious, and always ready for a long walk.", occupation: "Software engineer", education: "Computer science", languages: ["English", "Hindi", "Marathi"], relationshipIntent: "Friendship that feels natural", onlineStatus: false },
  { key: "leela", email: "leela.demo@example.test", displayName: "Leela Krishnan", gender: "FEMALE" as const, city: "Coimbatore", maritalStatus: "WIDOWED" as const, lookingFor: "CHAT" as const, age: 44, interests: ["Classical music", "Plants", "Reading"], bio: "Still finding new chapters, with a fondness for calm and considerate people.", occupation: "School principal", education: "Education", languages: ["English", "Tamil"], relationshipIntent: "Companionship and conversation", onlineStatus: false },
  { key: "sana", email: "sana.demo@example.test", displayName: "Sana Qureshi", gender: "FEMALE" as const, city: "Ahmedabad", maritalStatus: "SINGLE" as const, lookingFor: "RELATIONSHIP" as const, age: 29, interests: ["Photography", "Running", "Cinema"], bio: "Collecting little moments, city photographs, and honest conversations.", occupation: "Visual designer", education: "Media", languages: ["English", "Hindi", "Gujarati"], relationshipIntent: "A patient, genuine relationship", onlineStatus: true },
  { key: "diya", email: "diya.demo@example.test", displayName: "Diya Rao", gender: "FEMALE" as const, city: "Mysuru", maritalStatus: "SINGLE" as const, lookingFor: "DATING" as const, age: 26, interests: ["Baking", "Nature", "Movies"], bio: "Weekend baker, nature lover, and fan of people who keep things real.", occupation: "HR specialist", education: "Psychology", languages: ["English", "Kannada", "Hindi"], relationshipIntent: "A joyful, intentional connection", onlineStatus: true },
  { key: "aarohi", email: "aarohi.demo@example.test", displayName: "Aarohi Desai", gender: "FEMALE" as const, city: "Surat", maritalStatus: "SINGLE" as const, lookingFor: "CHAT" as const, age: 31, interests: ["Design", "Travel", "Tea"], bio: "A design enthusiast who appreciates slow evenings and thoughtful people.", occupation: "Graphic designer", education: "Visual communication", languages: ["English", "Hindi", "Gujarati"], relationshipIntent: "A comfortable, genuine beginning", onlineStatus: false },
  { key: "dev", email: "dev.demo@example.test", displayName: "Dev Malhotra", gender: "MALE" as const, city: "Jaipur", maritalStatus: "PREFER_NOT_TO_SAY" as const, lookingFor: "CHAT" as const, age: 22, interests: ["Gaming"], bio: null, occupation: null, education: null, languages: [], relationshipIntent: null, onlineStatus: false },
];
const demoImageByKey: Record<string, string> = { ishita: "/demo-profiles/ishita.png", naina: "/demo-profiles/naina.png", simran: "/demo-profiles/simran.png", avani: "/demo-profiles/avani.png", riya: "/demo-profiles/riya.png", kavya: "/demo-profiles/kavya.png", pihu: "/demo-profiles/pihu.png", ananya: "/demo-profiles/ananya.png", zoya: "/demo-profiles/zoya.png", manya: "/demo-profiles/manya.png", shruti: "/demo-profiles/shruti.png", leela: "/demo-profiles/leela.png", sana: "/demo-profiles/sana.png", diya: "/demo-profiles/ishita.png", aarohi: "/demo-profiles/naina.png" };

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
    upsertPlan({ name: "Quarterly", code: "quarterly", durationMonths: 3, price: 999, featured: true, sortOrder: 2 }),
    upsertPlan({ name: "Yearly", code: "yearly", durationMonths: 12, price: 2499, featured: false, sortOrder: 3 }),
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
    const profileImageUrl = demoImageByKey[item.key] ?? "/og-image.png";
    await prisma.profile.upsert({ where: { userId: user.id }, update: { bio: item.bio, profileImageUrls: [profileImageUrl], interests: item.interests, occupation: item.occupation, education: item.education, languages: item.languages, relationshipIntent: item.relationshipIntent, genderPreference: item.key === "aanya" ? "MALE" : null, agePreferenceMin: 24, agePreferenceMax: 45, locationPreference: item.city, lookingFor: item.lookingFor, visibility: item.key === "dev" ? "HIDDEN" : "VISIBLE", showOnlineStatus: true, onlineStatus: item.onlineStatus, allowInterests: true }, create: { userId: user.id, profileImageUrls: [profileImageUrl], bio: item.bio, interests: item.interests, occupation: item.occupation, education: item.education, languages: item.languages, relationshipIntent: item.relationshipIntent, genderPreference: item.key === "aanya" ? "MALE" : null, agePreferenceMin: 24, agePreferenceMax: 45, locationPreference: item.city, lookingFor: item.lookingFor, visibility: item.key === "dev" ? "HIDDEN" : "VISIBLE", showOnlineStatus: true, onlineStatus: item.onlineStatus, allowInterests: true } });
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

  await prisma.siteSetting.upsert({ where: { key: "business_model" }, update: {}, create: { key: "business_model", value: "MEN_PAID_WOMEN_FREE", description: "Controls which members require paid access." } });
  console.log(`Seeded ${demoUsers.length} fictional demo users, three plans, subscriptions, interests, a match, a conversation, messages, and notifications.`);
  console.log(`Demo login password: ${demoPassword}${process.env.DEMO_INITIAL_PASSWORD ? " (from DEMO_INITIAL_PASSWORD)" : " (generated for this run)"}`);
  console.log(`Admin account: ${adminEmail} (password supplied through ADMIN_INITIAL_PASSWORD)`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
