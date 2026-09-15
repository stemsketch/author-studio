export interface CompileJob {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  diagnostics: unknown[];
  validated?: boolean;
  compiled?: boolean;
  result?: unknown;
}

export interface AuthorServicesClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  getToken?: () => string | undefined;
}

export class AuthorServicesClient {
  constructor(private readonly options: AuthorServicesClientOptions) {}

  async health(): Promise<{ status: string }> {
    return this.get("/api/v1/health");
  }

  async validate(unit: unknown): Promise<{ ok: boolean; diagnostics: unknown[] }> {
    return this.post("/api/v1/validate", { unit });
  }

  async compile(unit: unknown): Promise<{ jobId: string }> {
    return this.post("/api/v1/compile", { unit });
  }

  async job(jobId: string): Promise<CompileJob> {
    return this.get(`/api/v1/jobs/${jobId}`);
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    const token = this.options.getToken?.();
    if (token !== undefined && token.length > 0) {
      headers.authorization = `Bearer ${token}`;
    }
    return headers;
  }

  private async get<T>(path: string): Promise<T> {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const response = await fetchImpl(`${this.options.baseUrl}${path}`, { headers: this.headers() });
    return (await response.json()) as T;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const response = await fetchImpl(`${this.options.baseUrl}${path}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    return (await response.json()) as T;
  }
}
