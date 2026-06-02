import { z } from 'zod';

export const appPayloadSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  url: z.string().trim().url('URL must be valid').refine((value) => /^https?:\/\//i.test(value), {
    message: 'URL must start with http:// or https://',
  }),
  icon_url: z.string().trim().url('Icon URL must be valid').or(z.literal('')).optional(),
  description: z.string().trim().optional(),
  category: z.string().trim().optional(),
  open_in: z.preprocess((value) => value || 'tab', z.enum(['tab', 'newwindow'])).default('tab'),
  pinned: z.boolean().default(true),
});

export type AppPayload = z.infer<typeof appPayloadSchema>;
