<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue'
import { getLayer, rotateLayer } from '@/entities/layer'
import type { IPiece } from '@/entities/piece/types'
import type { TCoord } from '@/entities/coord/types'
import type { ILayer } from '@/entities/layer/types'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'

const SIZE = 3
const gui = new GUI()
const canvas = ref<HTMLCanvasElement | null>(null)
let renderCube: (coords: TCoord[]) => void | undefined

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
  layersX = getLayer([...state.keys()], 'x')
  layersY = getLayer([...state.keys()], 'y')
  layersZ = getLayer([...state.keys()], 'z')
  return state
}

const state = shallowRef<TCubeState>(new Map())
let layersX: ILayer | undefined
let layersY: ILayer | undefined
let layersZ: ILayer | undefined

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

onMounted(() => {
  if (!canvas.value) return

  const scene = new THREE.Scene()

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5)
  scene.add(ambientLight)

  const pointLight = new THREE.PointLight(0xffffff, 50)
  pointLight.position.x = 2
  pointLight.position.y = 3
  pointLight.position.z = 4
  scene.add(pointLight)

  const material = [
    new THREE.MeshBasicMaterial({ color: 0xff0000 }), // Top face (red)
    new THREE.MeshBasicMaterial({ color: 0xffa500 }), // Bottom face (orange)
    new THREE.MeshBasicMaterial({ color: 0xffff00 }), // Right face (yellow)
    new THREE.MeshBasicMaterial({ color: 0xffffff }), // Left face (white)
    new THREE.MeshBasicMaterial({ color: 0x0000ff }), // Back face (blue)
    new THREE.MeshBasicMaterial({ color: 0x008000 }) // Front face (green)
  ]

  const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
  }

  window.addEventListener('resize', () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  })

  const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
  camera.position.x = 2
  camera.position.y = 2
  camera.position.z = 3
  scene.add(camera)

  const controls = new OrbitControls(camera, canvas.value)
  controls.enableDamping = true

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas.value
  })
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  const clock = new THREE.Clock()

  const tick = () => {
    const elapsedTime = clock.getElapsedTime()

    // cube.rotation.y = 0.1 * elapsedTime

    // cube.rotation.x = 0.15 * elapsedTime

    controls.update()

    renderer.render(scene, camera)

    window.requestAnimationFrame(tick)
  }

  tick()
  state.value = initCube(SIZE)

  renderCube = (coords: TCoord[]) => {
    coords.forEach(({ x, y, z }) => {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize), material)
      cube.translateX(x)
      cube.translateY(y)
      cube.translateZ(z)
      scene.add(cube)
    })
  }
})

const cubeSize = 0.97

watch(
  () => state.value,
  (value) => renderCube([...value.values()].map((piece) => piece.coord))
)
</script>

<template>
  <canvas ref="canvas"></canvas>
</template>
