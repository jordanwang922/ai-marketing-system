import { Injectable } from "@nestjs/common";
import axios from "axios";

@Injectable()
export class RiskRadarService {
  private baseUrl() {
    return String(process.env.RISKRADAR_BASE_URL || "http://localhost:3015").replace(/\/$/, "");
  }

  async evaluate(payload: {
    company_name: string;
    country: string;
    mode: string;
    locale: string;
    user_id: string;
    tenant_id: string;
    client_ref?: string;
  }) {
    const res = await axios.post(`${this.baseUrl()}/api/riskradar/evaluate`, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });
    return res.data;
  }

  async task(taskId: string) {
    const res = await axios.get(`${this.baseUrl()}/api/riskradar/task/${taskId}`, { timeout: 15000 });
    return res.data;
  }

  async report(params: { company_name: string; country: string; mode: string; locale: string }) {
    const res = await axios.get(`${this.baseUrl()}/api/riskradar/report`, {
      params,
      timeout: 15000,
    });
    return res.data;
  }
}
