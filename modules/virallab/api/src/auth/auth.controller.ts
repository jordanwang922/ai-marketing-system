import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";

type LoginDto = {
  email?: string;
  password?: string;
};

type RegisterDto = {
  email?: string;
  password?: string;
  displayName?: string;
};

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() body: RegisterDto) {
    return this.authService.register(
      String(body.email || "").trim(),
      String(body.password || "").trim(),
      String(body.displayName || "ViralLab User").trim(),
    );
  }

  @Post("login")
  login(@Body() body: LoginDto) {
    return this.authService.login(String(body.email || "").trim(), String(body.password || "").trim());
  }

  @Get("me")
  me(@Headers("authorization") authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, "").trim();
    return this.authService.me(token);
  }

  @Post("logout")
  logout(@Headers("authorization") authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, "").trim();
    return this.authService.logout(token);
  }
}
