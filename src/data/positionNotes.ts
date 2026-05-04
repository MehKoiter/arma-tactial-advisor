export type Rating = 1 | 2 | 3 | 4 | 5

export interface PositionNote {
  uid: string
  /** The CAP this position was rated relative to. */
  capId: string
  lng: number
  lat: number
  rating: Rating
}

export const RATING_COLORS: Record<Rating, string> = {
  1: '#ef5350',
  2: '#ffa726',
  3: '#ffee58',
  4: '#9ccc65',
  5: '#66bb6a',
}

export const RATING_LABELS: Record<Rating, string> = {
  1: 'Avoid',
  2: 'Poor',
  3: 'Okay',
  4: 'Good',
  5: 'Ideal',
}
