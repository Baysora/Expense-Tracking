import { prisma } from "./prisma";

let cachedHoldCoOpCoId: string | null = null;

export async function getHoldCoOpCo() {
  return prisma.opCo.findFirstOrThrow({ where: { isHoldCo: true } });
}

export async function getHoldCoOpCoId(): Promise<string> {
  if (cachedHoldCoOpCoId) return cachedHoldCoOpCoId;
  const opco = await getHoldCoOpCo();
  cachedHoldCoOpCoId = opco.id;
  return opco.id;
}

export function isHoldCoRole(role: string): boolean {
  return role === "HOLDCO_ADMIN" || role === "HOLDCO_MANAGER" || role === "HOLDCO_USER";
}
