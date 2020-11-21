export interface CookieOptions {
  readonly expires?: Date;
  readonly domain?: string;
  readonly httpOnly?: boolean;
  readonly maxAge?: number;
  readonly path?: string;
  readonly sameSite?: boolean | "strict" | "lax";
  readonly secure?: boolean;
  readonly signed?: boolean;
}
