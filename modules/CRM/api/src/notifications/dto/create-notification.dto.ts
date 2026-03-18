export class CreateNotificationDto {
  brandId!: string;
  userId?: string;
  targetType?: "user" | "group" | "all";
  targetUserId?: string;
  channel?: string;
  title!: string;
  body!: string;
}
