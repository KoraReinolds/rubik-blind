<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue'
import { axisToVector, getLayer, rotateLayer } from '@/entities/layer'
import type { IPiece } from '@/entities/piece/types'
import type { TCoord, TAxis } from '@/entities/coord/types'
import type { ILayer } from '@/entities/layer/types'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'

const SIZE = 3
const gui = new GUI()
const canvas = ref<HTMLCanvasElement | null>(null)
let renderCube: (pieces: IPiece[]) => void | undefined

const coordMap: Record<string, TCoord> = {}
const material = [
  new THREE.MeshBasicMaterial({ color: 0x0000ff }), // (blue)
  new THREE.MeshBasicMaterial({ color: 0x008000 }), // (green)
  new THREE.MeshBasicMaterial({ color: 0xffff00 }), // (yellow)
  new THREE.MeshBasicMaterial({ color: 0xffffff }), // (white)
  new THREE.MeshBasicMaterial({ color: 0xff0000 }), // (red)
  new THREE.MeshBasicMaterial({ color: 0xffa500 }) // (orange)
]

type TCubeState = Map<TCoord, IPiece>

const initCube = (size: number) => {
  const state: TCubeState = new Map()
  const half = (size - 1) / 2
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        const coord: TCoord = { x: +x - half, y: +y - half, z: +z - half }
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize), material)
        mesh.translateX(x - 1)
        mesh.translateY(y - 1)
        mesh.translateZ(z - 1)
        const piece: IPiece = { mesh }
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

const getState = (coord: TCoord) => {
  return state.value.get(getCoord(coord))
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
  pointLight.position.y = 8
  pointLight.position.z = 4
  scene.add(pointLight)

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
  camera.position.x = -4
  camera.position.y = 4
  camera.position.z = 6
  scene.add(camera)

  const controls = new OrbitControls(camera, canvas.value)
  controls.enableDamping = true

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas.value
  })
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  const axesHelper = new THREE.AxesHelper(5)
  scene.add(axesHelper)
  const o3d = new THREE.Object3D()
  scene.add(o3d)
  o3d.add(axesHelper)

  const rotate = (axes: TAxis, coords: TCoord[], angle: number) => {
    const meshes = coords.map((coord) => getState(coord)?.mesh).filter((mesh) => !!mesh)
    meshes.forEach((mesh) => o3d.add(mesh))
    const normalizedAxis = axisToVector(axes).normalize()
    const quaternion = new THREE.Quaternion()
    quaternion.setFromAxisAngle(normalizedAxis, angle)
    o3d.applyQuaternion(quaternion)
    meshes.forEach((mesh) => scene.add(mesh.applyQuaternion(quaternion)))
    o3d.clear()
  }

  const notation = {
    'U ': () => layersY && rotate(layersY.rotateAxis, layersY.coords[2], -Math.PI / 2),
    "U'": () => layersY && rotate(layersY.rotateAxis, layersY.coords[2], Math.PI / 2),

    'D ': () => layersY && rotate(layersY.rotateAxis, layersY.coords[0], Math.PI / 2),
    "D'": () => layersY && rotate(layersY.rotateAxis, layersY.coords[0], -Math.PI / 2),

    'R ': () => layersX && rotate(layersX.rotateAxis, layersX.coords[2], -Math.PI / 2),
    "R'": () => layersX && rotate(layersX.rotateAxis, layersX.coords[2], Math.PI / 2),

    'L ': () => layersX && rotate(layersX.rotateAxis, layersX.coords[0], Math.PI / 2),
    "L'": () => layersX && rotate(layersX.rotateAxis, layersX.coords[0], -Math.PI / 2),

    'F ': () => layersZ && rotate(layersZ.rotateAxis, layersZ.coords[2], -Math.PI / 2),
    "F'": () => layersZ && rotate(layersZ.rotateAxis, layersZ.coords[2], Math.PI / 2),

    'B ': () => layersZ && rotate(layersZ.rotateAxis, layersZ.coords[0], Math.PI / 2),
    "B'": () => layersZ && rotate(layersZ.rotateAxis, layersZ.coords[0], -Math.PI / 2)
  }

  Object.keys(notation).forEach((key) => {
    gui.add(notation, key)
  })

  const clock = new THREE.Clock()

  const tick = () => {
    const elapsedTime = clock.getElapsedTime()

    controls.update()

    renderer.render(scene, camera)

    window.requestAnimationFrame(tick)
  }

  tick()
  state.value = initCube(SIZE)

  renderCube = (pieces: IPiece[]) => {
    pieces.forEach(({ mesh }) => scene.add(mesh))
  }
})

const cubeSize = 0.97

watch(
  () => state.value,
  (value) => renderCube([...value.values()])
)
</script>

<template>
  <canvas ref="canvas"></canvas>
</template>
