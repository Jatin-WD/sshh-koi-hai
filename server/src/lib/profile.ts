import type { Profile, User } from "@prisma/client";

export function getAge(dateOfBirth: Date) {
  const today = new Date();
  let age = today.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const beforeBirthday = today.getUTCMonth() < dateOfBirth.getUTCMonth() || (today.getUTCMonth() === dateOfBirth.getUTCMonth() && today.getUTCDate() < dateOfBirth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function profileCompletion(user: Pick<User, "displayName" | "gender" | "city" | "maritalStatus" | "lookingFor">, profile: Pick<Profile, "bio" | "profileImageUrls" | "interests" | "occupation" | "education" | "languages" | "relationshipIntent">) {
  const checks = [Boolean(user.displayName), Boolean(user.gender), Boolean(user.city), Boolean(user.maritalStatus), Boolean(user.lookingFor), Boolean(profile.bio), profile.profileImageUrls.length > 0, profile.interests.length > 0, Boolean(profile.occupation || profile.education), profile.languages.length > 0, Boolean(profile.relationshipIntent)];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function publicProfile(user: Pick<User, "id" | "displayName" | "dateOfBirth" | "gender" | "city" | "maritalStatus" | "lookingFor">, profile: Profile) {
  return { id: user.id, displayName: user.displayName, age: getAge(user.dateOfBirth), gender: user.gender, city: profile.showCity ? user.city : null, maritalStatus: user.maritalStatus, lookingFor: user.lookingFor, bio: profile.bio, interests: profile.interests, profileImages: profile.profileImageUrls, primaryImageIndex: profile.primaryImageIndex, occupation: profile.occupation, education: profile.education, languages: profile.languages, relationshipIntent: profile.relationshipIntent, visibility: profile.visibility, ...(profile.showOnlineStatus ? { onlineStatus: profile.onlineStatus } : {}) };
}
