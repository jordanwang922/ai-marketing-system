import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { AiEvalDto } from "./dto/ai-eval.dto";
import { getSubordinateIds } from "../common/hierarchy.util";

function normalizeCompanyName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\p{P}\p{S}]+/gu, "");
}

type AuthUser = {
  id: string;
  role: string;
  brandId: string;
  teamId?: string | null;
};

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getHierarchyUserIds(user: AuthUser) {
    const subordinates = await getSubordinateIds(this.prisma, user.brandId, user.id);
    return [user.id, ...subordinates];
  }

  private async ensureLeadAccess(id: string, user: AuthUser) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead || lead.isMerged || lead.brandId !== user.brandId) {
      throw new NotFoundException("Lead not found");
    }
    const hierarchyIds = await this.getHierarchyUserIds(user);
    const allowed = !lead.ownerId || hierarchyIds.includes(lead.ownerId);
    if (!allowed) throw new NotFoundException("Lead not found");
    return lead;
  }

  async listForUser(user: AuthUser) {
    const hierarchyIds = await this.getHierarchyUserIds(user);
    return this.prisma.lead.findMany({
      where: {
        brandId: user.brandId,
        isMerged: false,
        OR: [{ ownerId: null }, { ownerId: { in: hierarchyIds } }],
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getForUser(id: string, user: AuthUser) {
    return this.ensureLeadAccess(id, user);
  }

  async create(body: any, user: AuthUser) {
    if (!body.companyName) {
      throw new BadRequestException("companyName is required");
    }
    const dedupeKey = normalizeCompanyName(body.companyName);
    const ownerId = user.id === "form" ? null : (body.ownerId ?? user.id);
    return this.prisma.lead.create({
      data: {
        brandId: user.brandId,
        ownerId,
        companyName: body.companyName,
        companyNameEn: body.companyNameEn ?? null,
        dedupeKey,
        name: body.name ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
        notes: body.notes ?? null,
        contractAmount: body.contractAmount ?? null,
        status: body.status ?? "New",
      },
    });
  }

  async update(id: string, body: any, user: AuthUser) {
    const lead = await this.ensureLeadAccess(id, user);
    const hierarchyIds = await this.getHierarchyUserIds(user);
    if (lead.ownerId && !hierarchyIds.includes(lead.ownerId)) {
      throw new UnauthorizedException("Not allowed");
    }
    const nextCompanyName = body.companyName ?? lead.companyName;
    const dedupeKey = normalizeCompanyName(nextCompanyName);
    return this.prisma.lead.update({
      where: { id },
      data: {
        companyName: nextCompanyName,
        dedupeKey,
        companyNameEn: body.companyNameEn ?? undefined,
        name: body.name ?? undefined,
        email: body.email ?? undefined,
        phone: body.phone ?? undefined,
        notes: body.notes ?? undefined,
        contractAmount: body.contractAmount ?? undefined,
        status: body.status ?? undefined,
        ownerId: body.ownerId ?? undefined,
        score: body.score ?? undefined,
        aiSummary: body.aiSummary ?? undefined,
      },
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.ensureLeadAccess(id, user);
    return this.prisma.lead.delete({ where: { id } });
  }
  async assign(id: string, ownerId: string, user: AuthUser) {
    if (!ownerId) {
      throw new BadRequestException("ownerId is required");
    }
    await this.ensureLeadAccess(id, user);
    return this.prisma.lead.update({
      where: { id },
      data: { ownerId },
    });
  }

  async mergeByCompany(companyName: string, user: AuthUser) {
    if (!companyName) {
      throw new BadRequestException("companyName is required");
    }
    const dedupeKey = normalizeCompanyName(companyName);
    const leads = await this.prisma.lead.findMany({
      where: { brandId: user.brandId, dedupeKey, isMerged: false },
      orderBy: { createdAt: "asc" },
    });
    if (leads.length <= 1) {
      return { merged: false, reason: "no duplicates", leadId: leads[0]?.id ?? null };
    }
    const primary = leads[0];
    const duplicates = leads.slice(1);

    const merged = duplicates.reduce(
      (acc, cur) => ({
        name: acc.name ?? cur.name,
        email: acc.email ?? cur.email,
        phone: acc.phone ?? cur.phone,
      }),
      { name: primary.name, email: primary.email, phone: primary.phone }
    );

    await this.prisma.lead.update({
      where: { id: primary.id },
      data: {
        name: merged.name,
        email: merged.email,
        phone: merged.phone,
      },
    });

    await this.prisma.lead.updateMany({
      where: { id: { in: duplicates.map((d) => d.id) } },
      data: { isMerged: true, mergedIntoId: primary.id, mergedAt: new Date() },
    });

    return { merged: true, primaryId: primary.id, mergedIds: duplicates.map((d) => d.id) };
  }

  async aiEval(id: string, body: AiEvalDto, user: AuthUser) {
    if (body.score < 0 || body.score > 100) {
      throw new BadRequestException("score must be 0-100");
    }
    await this.ensureLeadAccess(id, user);
    return this.prisma.lead.update({
      where: { id },
      data: {
        score: body.score,
        aiSummary: body.summary,
        aiNotes: body.notes ?? null,
        aiStatus: "completed",
        aiEvaluatedAt: new Date(),
      },
    });
  }

  async aiEvalStart(id: string, user: AuthUser) {
    await this.ensureLeadAccess(id, user);
    return this.prisma.lead.update({
      where: { id },
      data: {
        aiStatus: "pending",
        aiRequestedAt: new Date(),
      },
    });
  }

  async listActivities(leadId: string, user: AuthUser) {
    await this.ensureLeadAccess(leadId, user);
    return this.prisma.leadActivity.findMany({
      where: { leadId, brandId: user.brandId },
      orderBy: { occurredAt: "desc" },
    });
  }

  async createActivity(leadId: string, payload: { type: string; title: string; notes?: string; occurredAt?: string }, user: AuthUser) {
    const lead = await this.ensureLeadAccess(leadId, user);
    if (!payload.type || !payload.title) {
      throw new BadRequestException("type and title are required");
    }
    const occurredAt = payload.occurredAt ? new Date(payload.occurredAt) : new Date();
    const activity = await this.prisma.leadActivity.create({
      data: {
        brandId: lead.brandId,
        leadId: lead.id,
        actorId: user.id,
        type: payload.type,
        title: payload.title,
        notes: payload.notes ?? null,
        occurredAt,
      },
    });
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: { lastActivityAt: occurredAt },
    });
    return activity;
  }
}
