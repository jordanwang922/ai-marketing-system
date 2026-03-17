export class CreateExpertDto {
  brandId!: string;
  name!: string;
  country?: string;
  background?: string;
  specialties?: string;
  pricing?: string;
  pricingCurrency?: string;
  pricingUnit?: string;
  contactEmail?: string;
  phone?: string;
  notes?: string;
}
