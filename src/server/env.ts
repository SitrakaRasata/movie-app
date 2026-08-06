import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  TMDB_READ_TOKEN: z.string().min(1),
})

/** Fails loudly at boot rather than producing confusing errors at request time. */
export const env = schema.parse(process.env)
