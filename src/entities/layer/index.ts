import type { TCoord, TAxis } from '../coord/types'
import type { IPiece } from '../piece/types'
import type { ILayer } from './types'
import * as THREE from 'three'

export const getLayer = (allCoords: TCoord[], axis: TAxis): ILayer => {
  const coords: TCoord[][] = []
  for (let i = 0; i < Math.cbrt(allCoords.length); i++) {
    coords.push(allCoords.filter((coord) => coord[axis] === i))
  }
  return { rotateAxis: axis, coords }
}

export const rotateLayer = (coords: TCoord[], axis: TAxis) => {
  const angle = Math.PI / 2
  const axisVec = new THREE.Vector3(+(axis === 'x'), +(axis === 'y'), +(axis === 'z'))
  const newCoords: TCoord[] = []
  coords.forEach(({ x, y, z }) => {
    const point = new THREE.Vector3(x, y, z)
    const rotationMatrix = new THREE.Matrix4()
    rotationMatrix.makeRotationAxis(axisVec.normalize(), angle)
    const rotatedPointMatrix = point.clone().applyMatrix4(rotationMatrix)

    newCoords.push({
      x: Math.round(rotatedPointMatrix.x),
      y: Math.round(rotatedPointMatrix.y),
      z: Math.round(rotatedPointMatrix.z)
    })
  })

  return newCoords
}
