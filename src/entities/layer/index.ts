import type { TAxis } from '../coord/types'
import * as THREE from 'three'

export const axisToVector = (axes: TAxis) => {
  return new THREE.Vector3(+(axes === 'x'), +(axes === 'y'), +(axes === 'z'))
}
