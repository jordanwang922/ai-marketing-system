import { PrismaService } from "../prisma.service";

export async function getSubordinateIds(prisma: PrismaService, brandId: string, managerId: string) {
  const users = await prisma.user.findMany({
    where: { brandId },
    select: { id: true, managerId: true },
  });
  const byManager = new Map<string, string[]>();
  for (const user of users) {
    const key = user.managerId || "root";
    if (!byManager.has(key)) byManager.set(key, []);
    byManager.get(key)!.push(user.id);
  }

  const result = new Set<string>();
  const stack = [managerId];
  while (stack.length) {
    const current = stack.pop()!;
    const children = byManager.get(current) || [];
    for (const child of children) {
      if (!result.has(child)) {
        result.add(child);
        stack.push(child);
      }
    }
  }
  return Array.from(result);
}
