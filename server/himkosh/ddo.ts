import { eq } from "drizzle-orm";
import { db } from "../db";
import { ddoCodes } from "../../shared/schema";

const normalizeDistrictForMatch = (value?: string | null) => {
  if (!value) {
    return [];
  }

  const cleaned = value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(
      /\b(division|sub-division|subdivision|hq|office|district|development|tourism|ddo|dto|dt|section|unit|range|circle|zone|serving|for|the|at|and)\b/g,
      " ",
    )
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return [];
  }

  const tokens = cleaned
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 2);

  return Array.from(new Set(tokens));
};

export const resolveDistrictDdo = async (district?: string | null) => {
  if (!district) {
    return undefined;
  }

  const [exact] = await db
    .select()
    .from(ddoCodes)
    .where(eq(ddoCodes.district, district))
    .limit(1);

  if (exact) {
    return exact;
  }

  const allCodes = await db.select().from(ddoCodes);
  const districtTokens = normalizeDistrictForMatch(district);

  if (!districtTokens.length) {
    return undefined;
  }

  return allCodes.find((code) => {
    const codeTokens = normalizeDistrictForMatch(code.district);
    return codeTokens.some((token) => districtTokens.includes(token));
  });
};

export const fetchAllDdoCodes = async () => {
  const codes = await db
    .select({
      id: ddoCodes.id,
      district: ddoCodes.district,
      ddoCode: ddoCodes.ddoCode,
      ddoDescription: ddoCodes.ddoDescription,
      treasuryCode: ddoCodes.treasuryCode,
      isActive: ddoCodes.isActive,
      updatedAt: ddoCodes.updatedAt,
    })
    .from(ddoCodes)
    .orderBy(ddoCodes.district);

  return codes;
};
