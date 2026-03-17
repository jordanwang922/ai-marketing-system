import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import * as jwt from "jsonwebtoken";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const url = req.url || "";

    if (url.startsWith("/auth/login") || url.startsWith("/health") || url.startsWith("/leads/form")) {
      return true;
    }

    const header = req.headers["authorization"] as string | undefined;
    if (!header || !header.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing token");
    }
    const token = header.replace("Bearer ", "").trim();
    try {
      const secret = process.env.JWT_SECRET || "dev_secret";
      const payload = jwt.verify(token, secret) as any;
      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        brandId: payload.brandId,
        teamId: payload.teamId ?? null,
      };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
