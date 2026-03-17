export type UpdateLeadDto = {
  companyName?: string;
  companyNameEn?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  contractAmount?: number | null;
  status?: string;
  ownerId?: string | null;
  score?: number | null;
  aiSummary?: string | null;
};
