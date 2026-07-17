import { z } from "zod";

export const ShareTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
