import type { TAxis, TCoord } from '../coord/types'

export interface ILayer {
  rotateAxis: TAxis
  coords: TCoord[][]
}
