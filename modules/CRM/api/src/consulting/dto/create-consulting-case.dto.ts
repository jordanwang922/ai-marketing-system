export class CreateConsultingCaseDto {
  brandId!: string;
  leadId!: string;
  expertId?: string;
  status?: string;
  channel?: string;
  price?: number;
  currency?: string;
  requirements?: string;
  notes?: string;
}
