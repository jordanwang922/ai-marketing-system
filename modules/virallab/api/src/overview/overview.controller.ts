import { Controller, Get } from "@nestjs/common";
import { ViralLabStoreService } from "../store/store.service";
import { PrismaService } from "../prisma.service";

@Controller("overview")
export class OverviewController {
  constructor(
    private readonly store: ViralLabStoreService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getOverview() {
    if (this.prisma.isEnabled()) {
      const [jobs, runningJobs, samples, patterns, contents] = await Promise.all([
        this.prisma.collectionJob.count(),
        this.prisma.collectionJob.count({ where: { status: "running" } }),
        this.prisma.contentSample.count(),
        this.prisma.pattern.count(),
        this.prisma.generatedContent.count(),
      ]);

      return {
        success: true,
        stats: [
          { label: "Collection Jobs", value: String(jobs), note: `${runningJobs} running` },
          { label: "Samples", value: String(samples), note: "xiaohongshu" },
          { label: "Patterns", value: String(patterns), note: "pattern library" },
          { label: "Generated Drafts", value: String(contents), note: "mvp drafts" },
        ],
      };
    }

    const db = await this.store.read();
    const runningJobs = db.collectionJobs.filter((item) => item.status === "running").length;
    return {
      success: true,
      stats: [
        { label: "Collection Jobs", value: String(db.collectionJobs.length), note: `${runningJobs} running` },
        { label: "Samples", value: String(db.samples.length), note: "xiaohongshu" },
        { label: "Patterns", value: String(db.patterns.length), note: "pattern library" },
        { label: "Generated Drafts", value: String(db.generatedContents.length), note: "mvp drafts" },
      ],
    };
  }
}
