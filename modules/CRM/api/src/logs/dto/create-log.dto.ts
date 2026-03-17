export class CreateLogDto {
  brandId!: string;
  action!: string;
  entity!: string;
  entityId?: string;
  actorId?: string;
  payload?: Record<string, any>;
}
