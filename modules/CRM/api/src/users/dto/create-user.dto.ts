export class CreateUserDto {
  brandId!: string;
  email!: string;
  name!: string;
  role!: string;
  teamId?: string;
  title?: string;
  managerId?: string;
  positionId?: string;
  password?: string;
}
