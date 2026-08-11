import { z } from "zod";
import { authResponseSchema, userResponseSchema } from "./schemas/auth.js";
import { categoriesResponseSchema } from "./schemas/categories.js";
import { contractSchema } from "./schemas/contracts.js";
import { depositResponseSchema } from "./schemas/escrow.js";
import { milestoneResponseSchema } from "./schemas/milestones.js";
import { portfolioItemSchema, professionalSchema } from "./schemas/professionals.js";
import { projectDetailSchema, projectSummarySchema } from "./schemas/projects.js";
import { reviewSchema, userReviewsResponseSchema } from "./schemas/reviews.js";
import { walletResponseSchema } from "./schemas/wallet.js";
import type {
  AuthResponse,
  LoginBody,
  RegisterBody,
  SetRoleBody,
  UserResponse,
} from "./schemas/auth.js";
import type { ContractResponse, CreateContractBody } from "./schemas/contracts.js";
import type { DepositBody } from "./schemas/escrow.js";
import type { MilestoneResponse } from "./schemas/contracts.js";
import type {
  ListProfessionalsQuery,
  Professional,
  PortfolioItem,
} from "./schemas/professionals.js";
import type { Category } from "./schemas/categories.js";
import type { CreateProjectBody, ProjectDetail, ProjectSummary } from "./schemas/projects.js";
import type { CreateReviewBody, Review, UserReviewsResponse } from "./schemas/reviews.js";
import type { UpdateMeBody } from "./schemas/users.js";
import type { WalletResponse } from "./schemas/wallet.js";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`API request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => string | null | undefined | Promise<string | null | undefined>;
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | undefined>,
): string {
  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;

  const params = Object.entries(query).filter(
    (entry): entry is [string, string] => entry[1] !== undefined,
  );
  if (params.length === 0) return url;

  const qs = params
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  return `${url}?${qs}`;
}

export function createApiClient(config: ApiClientConfig) {
  async function request<T>(
    method: string,
    path: string,
    options: {
      body?: unknown;
      query?: Record<string, string | undefined>;
      schema: z.ZodType<T>;
      auth?: boolean;
    },
  ): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (options.auth !== false && config.getToken) {
      const token = await config.getToken();
      if (token) headers.authorization = `Bearer ${token}`;
    }

    const response = await fetch(buildUrl(config.baseUrl, path, options.query), {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const json = await response.json().catch(() => undefined);
    if (!response.ok) {
      throw new ApiError(response.status, json);
    }

    return options.schema.parse(json);
  }

  return {
    auth: {
      register: (body: RegisterBody): Promise<AuthResponse> =>
        request("POST", "/auth/register", { body, schema: authResponseSchema, auth: false }),
      login: (body: LoginBody): Promise<AuthResponse> =>
        request("POST", "/auth/login", { body, schema: authResponseSchema, auth: false }),
      setRole: (body: SetRoleBody): Promise<UserResponse> =>
        request("POST", "/auth/role", { body, schema: userResponseSchema }),
      me: (): Promise<UserResponse> => request("GET", "/auth/me", { schema: userResponseSchema }),
    },
    categories: {
      list: (): Promise<Category[]> =>
        request("GET", "/categories", { schema: categoriesResponseSchema }),
    },
    users: {
      updateMe: (body: UpdateMeBody): Promise<UserResponse> =>
        request("PATCH", "/me", { body, schema: userResponseSchema }),
      reviews: (userId: string): Promise<UserReviewsResponse> =>
        request("GET", `/users/${userId}/reviews`, { schema: userReviewsResponseSchema }),
    },
    professionals: {
      list: (query?: ListProfessionalsQuery): Promise<Professional[]> =>
        request("GET", "/professionals", { query, schema: z.array(professionalSchema) }),
      get: (id: string): Promise<Professional> =>
        request("GET", `/professionals/${id}`, { schema: professionalSchema }),
      portfolio: (id: string): Promise<PortfolioItem[]> =>
        request("GET", `/professionals/${id}/portfolio`, { schema: z.array(portfolioItemSchema) }),
    },
    projects: {
      list: (): Promise<ProjectSummary[]> =>
        request("GET", "/projects", { schema: z.array(projectSummarySchema) }),
      create: (body: CreateProjectBody): Promise<ProjectSummary> =>
        request("POST", "/projects", { body, schema: projectSummarySchema }),
      get: (id: string): Promise<ProjectDetail> =>
        request("GET", `/projects/${id}`, { schema: projectDetailSchema }),
    },
    contracts: {
      create: (body: CreateContractBody): Promise<ContractResponse> =>
        request("POST", "/contracts", { body, schema: contractSchema }),
      get: (id: string): Promise<ContractResponse> =>
        request("GET", `/contracts/${id}`, { schema: contractSchema }),
    },
    milestones: {
      submit: (id: string): Promise<MilestoneResponse> =>
        request("POST", `/milestones/${id}/submit`, { schema: milestoneResponseSchema }),
      approve: (id: string): Promise<MilestoneResponse> =>
        request("POST", `/milestones/${id}/approve`, { schema: milestoneResponseSchema }),
    },
    escrow: {
      deposit: (body: DepositBody): Promise<ContractResponse> =>
        request("POST", "/escrow/deposit", { body, schema: depositResponseSchema }),
    },
    wallet: {
      get: (): Promise<WalletResponse> =>
        request("GET", "/wallet", { schema: walletResponseSchema }),
    },
    reviews: {
      create: (body: CreateReviewBody): Promise<Review> =>
        request("POST", "/reviews", { body, schema: reviewSchema }),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
