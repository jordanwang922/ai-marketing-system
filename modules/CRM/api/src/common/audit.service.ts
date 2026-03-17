import { Injectable } from "@nestjs/common";

@Injectable()
export class AuditService {
  log(event: string, payload: Record<string, any>) {
    // Placeholder: replace with DB-backed audit log later
    if (process.env.AUDIT_LOG === "true") {
      console.log("[AUDIT]", event, payload);
    }
  }
}
