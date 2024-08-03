<script setup lang="ts">
import { shallowRef } from 'vue'
import { getLayer, rotateLayer } from '@/entities/layer'
import type { IPiece } from '@/entities/piece/types'
import type { TCoord } from '@/entities/coord/types'

const SIZE = 3

const coordMap: Record<string, TCoord> = {}

type TCubeState = Map<TCoord, IPiece>

const initCube = (size: number) => {
  const state: TCubeState = new Map()
  const half = (size - 1) / 2
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        const coord: TCoord = { x: +x - half, y: +y - half, z: +z - half }
        const piece: IPiece = { coord }
        coordMap[`${Object.values(coord)}`] = coord
        state.set(coord, piece)
      }
    }
  }
  return state
}

const state = shallowRef<TCubeState>(initCube(SIZE))

const getCoord = (coord: TCoord) => {
  const rawCoord = `${Object.values(coord)}`
  const newCoord = coordMap[rawCoord]
  if (!newCoord) {
    console.warn('Not find state')
  }
  return newCoord
}

const changeState = (state: TCubeState, coords: TCoord[], newCoords: TCoord[]) => {
  const newState: TCubeState = new Map(JSON.parse(JSON.stringify([...state.entries()])))

  coords.forEach((coord, i) => {
    const replaceCoord = getCoord(coord)
    if (replaceCoord) {
      replaceCoord.x = newCoords[i].x
      replaceCoord.y = newCoords[i].y
      replaceCoord.z = newCoords[i].z
    } else {
      console.warn('Prev state not found')
    }
  })

  return newState
}

const layersX = getLayer([...state.value.keys()], 'x')
const layersY = getLayer([...state.value.keys()], 'y')
const layersZ = getLayer([...state.value.keys()], 'z')

const newCoords = rotateLayer(layersX.coords[0], layersX.rotateAxis)
state.value = changeState(state.value, layersX.coords[0], newCoords)
</script>

<template>
  <div v-for="coord in layersX.coords[0]">{{ coord.y }} {{ coord.z }}</div>
</template>
