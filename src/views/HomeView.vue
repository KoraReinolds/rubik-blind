<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue'
import { axisToVector } from '@/entities/layer'
import type { IPiece } from '@/entities/piece/types'
import type { TCoord, TAxis } from '@/entities/coord/types'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'

const SIZE = 3
const gui = new GUI()
const canvas = ref<HTMLCanvasElement | null>(null)
let renderCube: (pieces: IPiece[]) => void | undefined

const coordMap: Record<string, TCoord> = {}
enum ECubeMaterial {
  GREEN,
  BLUE,
  YELLOW,
  WHITE,
  RED,
  ORANGE
}

const material: Record<ECubeMaterial, any> = {
  [ECubeMaterial.GREEN]: new THREE.MeshBasicMaterial({ color: 0x008000 }),
  [ECubeMaterial.BLUE]: new THREE.MeshBasicMaterial({ color: 0x0000ff }),
  [ECubeMaterial.YELLOW]: new THREE.MeshBasicMaterial({ color: 0xffff00 }),
  [ECubeMaterial.WHITE]: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  [ECubeMaterial.RED]: new THREE.MeshBasicMaterial({ color: 0xff0000 }),
  [ECubeMaterial.ORANGE]: new THREE.MeshBasicMaterial({ color: 0xffa500 })
}

type TCubeState = Map<TCoord, IPiece>

const neutralMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })

const initCube = (size: number) => {
  const state: TCubeState = new Map()
  const half = (size - 1) / 2

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        const coord: TCoord = { x: +x - half, y: +y - half, z: +z - half }

        const faceMaterials = [
          coord.x === half ? material[ECubeMaterial.GREEN] : neutralMaterial,
          coord.x === -half ? material[ECubeMaterial.BLUE] : neutralMaterial,
          coord.y === half ? material[ECubeMaterial.YELLOW] : neutralMaterial,
          coord.y === -half ? material[ECubeMaterial.WHITE] : neutralMaterial,
          coord.z === half ? material[ECubeMaterial.RED] : neutralMaterial,
          coord.z === -half ? material[ECubeMaterial.ORANGE] : neutralMaterial
        ]

        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize),
          faceMaterials
        )

        mesh.translateX(x - 1)
        mesh.translateY(y - 1)
        mesh.translateZ(z - 1)

        const piece: IPiece = { mesh }
        coordMap[`${Object.values(coord)}`] = coord
        state.set(coord, piece)
      }
    }
  }

  return state
}

const state = shallowRef<TCubeState>(new Map())

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

  const rotate = (axes: TAxis, position: number, angle: number) => {
    const o3d = new THREE.Object3D()
    scene.add(o3d)

    const meshes = [...state.value.values()]
      .map((piece) => piece.mesh)
      .filter((mesh) => Math.round(mesh.position[axes]) === position)
    meshes.forEach((mesh) => o3d.add(mesh))

    const normalizedAxis = axisToVector(axes).normalize()
    const quaternion = new THREE.Quaternion()
    quaternion.setFromAxisAngle(normalizedAxis, angle)
    o3d.applyQuaternion(quaternion)

    meshes.forEach((mesh) => {
      mesh.updateMatrixWorld(true)

      const worldPosition = new THREE.Vector3()
      const worldQuaternion = new THREE.Quaternion()

      mesh.position.copy(mesh.getWorldPosition(worldPosition))
      mesh.quaternion.copy(mesh.getWorldQuaternion(worldQuaternion))

      mesh.position.set(mesh.position.x, mesh.position.y, mesh.position.z)

      scene.add(mesh)
    })

    scene.remove(o3d)
  }

  const notation = {
    'U ': () => rotate('y', 1, -Math.PI / 2),
    "U'": () => rotate('y', 1, Math.PI / 2),

    'D ': () => rotate('y', -1, Math.PI / 2),
    "D'": () => rotate('y', -1, -Math.PI / 2),

    'R ': () => rotate('x', 1, -Math.PI / 2),
    "R'": () => rotate('x', 1, Math.PI / 2),

    'L ': () => rotate('x', -1, Math.PI / 2),
    "L'": () => rotate('x', -1, -Math.PI / 2),

    'F ': () => rotate('z', 1, -Math.PI / 2),
    "F'": () => rotate('z', 1, Math.PI / 2),

    'B ': () => rotate('z', -1, Math.PI / 2),
    "B'": () => rotate('z', -1, -Math.PI / 2)
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
    notation['R ']()
    notation['U ']()
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
