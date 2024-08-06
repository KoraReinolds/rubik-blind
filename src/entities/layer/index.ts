import type { TCoord, TAxis } from '../coord/types'
import type { ILayer } from './types'
import * as THREE from 'three'

export const getLayer = (allCoords: TCoord[], axes: TAxis): ILayer => {
  const coords: TCoord[][] = []
  for (let i = 0; i < Math.cbrt(allCoords.length); i++) {
    coords.push(allCoords.filter((coord) => coord[axes] === i - 1))
  }
  return { rotateAxis: axes, coords }
}

export const axisToVector = (axes: TAxis) => {
  return new THREE.Vector3(+(axes === 'x'), +(axes === 'y'), +(axes === 'z'))
}

export const rotateLayer = (coords: TCoord[], axes: TAxis) => {
  const angle = Math.PI / 2
  const axisVec = axisToVector(axes)
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
