export class CreateNotificationDto {
  brandId!: string;
  userId!: string;
  channel?: string;
  title!: string;
  body!: string;
}
