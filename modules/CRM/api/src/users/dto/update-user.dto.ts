export class UpdateUserDto {
  name?: string;
  role?: string;
  teamId?: string | null;
  title?: string | null;
  managerId?: string | null;
  positionId?: string | null;
}
