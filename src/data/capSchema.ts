import { z } from 'zod'

export const CAPSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  shortName: z.string().optional(),
  coords: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  /** Neighbouring CAP IDs — used for adjacency/movement feasibility */
  neighbors: z.array(z.string()).default([]),
  /** Broad area classification */
  zone: z.enum(['north', 'central', 'south', 'east', 'west']).optional(),
  /** Major bases are larger objectives; minor are smaller capture points */
  type: z.enum(['major', 'minor']).default('minor'),
})

export type CAP = z.infer<typeof CAPSchema>

export const CAPDatasetSchema = z.array(CAPSchema).refine(
  (caps) => {
    const ids = caps.map((c) => c.id)
    return ids.length === new Set(ids).size
  },
  { message: 'CAP IDs must be unique' },
)

export type CAPDataset = z.infer<typeof CAPDatasetSchema>

export function validateCAPDataset(raw: unknown): CAPDataset {
  return CAPDatasetSchema.parse(raw)
}
