export type CreateLeadDto = {
  brandId: string;
  ownerId?: string | null;
  companyName: string;
  companyNameEn?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  contractAmount?: number | null;
  status?: string | null;
};
