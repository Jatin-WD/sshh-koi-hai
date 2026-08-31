import type { Profile, User } from "@prisma/client";
import { getAge } from "./profile.js";

type Candidate = User & { profile: Profile };
type Preferences = Pick<User, "lookingFor" | "city"> & Pick<Profile, "genderPreference" | "agePreferenceMin" | "agePreferenceMax" | "locationPreference" | "interests">;

export function scoreCandidate(preferences: Preferences, candidate: Candidate) {
  const candidateAge = getAge(candidate.dateOfBirth);
  const candidateInterests = new Set(candidate.profile.interests.map(normalize));
  const sharedInterests = preferences.interests.map(normalize).filter((interest) => candidateInterests.has(interest)).length;
  let score = 0;
  if (preferences.genderPreference && preferences.genderPreference === candidate.gender) score += 35;
  if ((!preferences.agePreferenceMin || candidateAge >= preferences.agePreferenceMin) && (!preferences.agePreferenceMax || candidateAge <= preferences.agePreferenceMax)) score += 25;
  if (preferences.locationPreference && candidate.city && candidate.city.toLowerCase().includes(preferences.locationPreference.toLowerCase())) score += 15;
  if (preferences.lookingFor && preferences.lookingFor === candidate.lookingFor) score += 15;
  score += Math.min(sharedInterests * 2, 10);
  return score;
}

export function sortRecommendations(preferences: Preferences, candidates: Candidate[]) {
  return candidates.map((candidate) => ({ candidate, score: scoreCandidate(preferences, candidate) })).sort((a, b) => b.score - a.score || b.candidate.createdAt.getTime() - a.candidate.createdAt.getTime());
}

function normalize(value: string) { return value.trim().toLowerCase(); }
