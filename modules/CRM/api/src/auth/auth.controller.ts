import { Body, Controller, Post, Req } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  login(@Body() body: LoginDto) {
    return this.auth.login(body.email, body.password);
  }

  @Post("change-password")
  changePassword(@Req() req: any, @Body() body: ChangePasswordDto) {
    const userId = req.user?.id;
    return this.auth.changePassword(userId, body.currentPassword, body.newPassword);
  }

  @Post("reset-password")
  resetPassword(@Req() req: any, @Body() body: ResetPasswordDto) {
    const adminUserId = req.user?.id;
    return this.auth.resetPassword(adminUserId, body.userId, body.newPassword);
  }
}
