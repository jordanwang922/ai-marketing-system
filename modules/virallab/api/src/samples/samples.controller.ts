import { Controller, Get, Param } from "@nestjs/common";
import { SamplesService } from "./samples.service";

@Controller("samples")
export class SamplesController {
  constructor(private readonly samplesService: SamplesService) {}

  @Get()
  listSamples() {
    return this.samplesService.list();
  }

  @Get(":sampleId")
  getSample(@Param("sampleId") sampleId: string) {
    return this.samplesService.getOne(sampleId);
  }
}
