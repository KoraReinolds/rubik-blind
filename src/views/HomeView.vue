<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue'
import { axisToVector } from '@/entities/layer'
import type { IPiece } from '@/entities/piece/types'
import type { TCoord, TAxis } from '@/entities/coord/types'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'

const url = new URL(window.location.href)
const params = new URLSearchParams(url.search)

const SIZE = 3
const gui = new GUI()

if (!params.get('debug')) gui.hide()

const canvas = ref<HTMLCanvasElement | null>(null)
let renderCube: (pieces: IPiece[]) => void | undefined

const coordMap: Record<string, TCoord> = {}

enum ECubeMaterial {
  GREEN,
  BLUE,
  YELLOW,
  WHITE,
  RED,
  ORANGE,
  EMPTY,
  SELECTED
}

const colorMap: Record<number, string> = {
  0x008000: 'G',
  0x0000ff: 'B',
  0xffff00: 'Y',
  0xffffff: 'W',
  0xff0000: 'R',
  0xffa500: 'O'
}

const material: Record<ECubeMaterial, THREE.MeshBasicMaterial> = {
  [ECubeMaterial.SELECTED]: new THREE.MeshBasicMaterial({ color: 0x991144 }),
  [ECubeMaterial.EMPTY]: new THREE.MeshBasicMaterial({ color: 0x555555 }),
  [ECubeMaterial.GREEN]: new THREE.MeshBasicMaterial({ color: 0x008000 }),
  [ECubeMaterial.BLUE]: new THREE.MeshBasicMaterial({ color: 0x0000ff }),
  [ECubeMaterial.YELLOW]: new THREE.MeshBasicMaterial({ color: 0xffff00 }),
  [ECubeMaterial.WHITE]: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  [ECubeMaterial.RED]: new THREE.MeshBasicMaterial({ color: 0xff0000 }),
  [ECubeMaterial.ORANGE]: new THREE.MeshBasicMaterial({ color: 0xffa500 })
}

type TCubeState = Map<TCoord, IPiece>
type TCubeColorState = Map<TCoord, string[]>

const backgroundColor = '#1e1e1e'
const neutralMaterial = new THREE.MeshBasicMaterial({ color: backgroundColor })

const initCube = (size: number) => {
  const state: TCubeState = new Map()
  const half = (size - 1) / 2

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        const coord: TCoord = { x: +x - half, y: +y - half, z: +z - half }

        const faceMaterials = [
          coord.x === half ? material[ECubeMaterial.GREEN] : neutralMaterial, // 0
          coord.x === -half ? material[ECubeMaterial.BLUE] : neutralMaterial, // 1
          coord.y === half ? material[ECubeMaterial.YELLOW] : neutralMaterial, // 2
          coord.y === -half ? material[ECubeMaterial.WHITE] : neutralMaterial, // 3
          coord.z === half ? material[ECubeMaterial.RED] : neutralMaterial, // 4
          coord.z === -half ? material[ECubeMaterial.ORANGE] : neutralMaterial // 5
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

const getState = (state: TCubeState): TCubeColorState => {
  return new Map(
    [...state.entries()]
      .map(([coord]) => [coord, getMeshesFromState(state, [coord]).map((mesh) => mesh.material)[0]])
      .map(([coord, colors]) => [
        coord,
        [...(colors as THREE.MeshBasicMaterial[])]
          .reverse()
          .map((mat) => mat.color.getHex())
          .filter((hex) => !!hex)
          .map((hex) => colorMap[hex])
      ])
  ) as TCubeColorState
}

const compareState = (state1: TCubeColorState, state2: TCubeColorState): TCubeColorState => {
  const compareState = new Map()

  ;[...state1.keys()].forEach((key) => {
    const rawState1 = state1.get(key)?.join()
    const rawState2 = state2.get(key)?.join()
    if (rawState1 !== rawState2) {
      compareState.set(key, rawState2)
    }
  })

  return compareState
}

const getMeshesFromState = (state: TCubeState, positions: Partial<TCoord>[]) => {
  return [...state.values()]
    .map((piece) => piece.mesh)
    .filter((mesh) => {
      return positions.every((position) => {
        const { x, y, z } = position
        return (
          (x === undefined ? true : Math.round(mesh.position.x) === x) &&
          (y === undefined ? true : Math.round(mesh.position.y) === y) &&
          (z === undefined ? true : Math.round(mesh.position.z) === z)
        )
      })
    })
}

const selectPieces = (state: TCubeState, meshes: THREE.Mesh[]) => {
  return [...state.values()].map(({ mesh }) => {
    if (meshes.includes(mesh)) {
      mesh.material = material[ECubeMaterial.SELECTED]
    } else {
      mesh.material = material[ECubeMaterial.EMPTY]
    }
  })
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
  camera.position.x = -3
  camera.position.y = 3
  camera.position.z = 4
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
  scene.background = new THREE.Color(backgroundColor)

  const rotateObject = (o3d: THREE.Object3D, axes: TAxis, angle: number) => {
    const normalizedAxis = axisToVector(axes).normalize()
    const quaternion = new THREE.Quaternion()
    quaternion.setFromAxisAngle(normalizedAxis, angle)
    o3d.applyQuaternion(quaternion)
    return o3d
  }

  const rotate3D = (pos: { x: number; y: number; z: number }, axis: TAxis, angle: number) => {
    // Convert angle to radians
    const radians = angle

    const { x, y, z } = pos

    let newX = x
    let newY = y
    let newZ = z

    if (axis) {
      switch (axis.toLowerCase()) {
        case 'x': // Rotate around X-axis
          newY = y * Math.cos(radians) - z * Math.sin(radians)
          newZ = y * Math.sin(radians) + z * Math.cos(radians)
          break

        case 'y': // Rotate around Y-axis
          newX = x * Math.cos(radians) + z * Math.sin(radians)
          newZ = -x * Math.sin(radians) + z * Math.cos(radians)
          break

        case 'z': // Rotate around Z-axis
          newX = x * Math.cos(radians) - y * Math.sin(radians)
          newY = x * Math.sin(radians) + y * Math.cos(radians)
          break

        default:
          console.error("Invalid axis. Please use 'x', 'y', or 'z'.")
          break
      }
    }

    return { x: Math.round(newX), y: Math.round(newY), z: Math.round(newZ) }
  }

  const rotate = (axes: TAxis, positions: number[], angle: number) => {
    positions.forEach((position) => {
      let o3d = new THREE.Object3D()
      scene.add(o3d)

      const pos: Partial<TCoord> = {}
      pos[axes] = position

      const meshes = getMeshesFromState(state.value, [pos])
      meshes.forEach((mesh) => o3d.add(mesh))

      o3d = rotateObject(o3d, axes, angle)

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
    })
  }

  const notation: Record<string, () => void> = {
    X: () => rotate('x', [-1, 0, 1], -Math.PI / 2),
    "X'": () => rotate('x', [-1, 0, 1], Math.PI / 2),

    Y: () => rotate('y', [-1, 0, 1], -Math.PI / 2),
    "Y'": () => rotate('y', [-1, 0, 1], Math.PI / 2),

    Z: () => rotate('z', [-1, 0, 1], -Math.PI / 2),
    "Z'": () => rotate('z', [-1, 0, 1], Math.PI / 2),

    U: () => rotate('y', [1], -Math.PI / 2),
    "U'": () => rotate('y', [1], Math.PI / 2),

    D: () => rotate('y', [-1], Math.PI / 2),
    "D'": () => rotate('y', [-1], -Math.PI / 2),

    R: () => rotate('x', [1], -Math.PI / 2),
    "R'": () => rotate('x', [1], Math.PI / 2),

    L: () => rotate('x', [-1], Math.PI / 2),
    "L'": () => rotate('x', [-1], -Math.PI / 2),

    F: () => rotate('z', [1], -Math.PI / 2),
    "F'": () => rotate('z', [1], Math.PI / 2),

    B: () => rotate('z', [-1], Math.PI / 2),
    "B'": () => rotate('z', [-1], -Math.PI / 2)
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

  const reverseNotation = (not: string) => {
    return not[1] ? not[0] : not[0] + "'"
  }

  const reverseSequence = (seq: string[]) => {
    return [...seq].reverse().map(reverseNotation)
  }

  const allStates: Record<string, any[]> = {}

  const a = ["L'", "D'", 'L']
  const b = ['U', 'U']

  const rotateAB = (a: string[], b: string[], c?: string[]) => {
    if (c) c.forEach((n) => notation[n]())

    b.forEach((not) => notation[not]())
    a.forEach((not) => notation[not]())

    reverseSequence(b).forEach((not) => notation[not]())
    reverseSequence(a).forEach((not) => notation[not]())

    if (c) c.reverse().forEach((n) => notation[reverseNotation(n)]())
  }

  const ab_ba = (a: string[], b: string[], c?: string[]) => {
    if (c) c.forEach((n) => notation[n]())
    const state1 = getState(state.value)

    rotateAB(a, b)

    const state2 = getState(state.value)
    const compare = compareState(state1, state2)
    if (compare.size !== 3) {
      console.warn(a, b, compare.size)
    }
    const seq = [c, a, b].join('-').toString()
    if (allStates[seq]) allStates[seq].push(compare)
    else allStates[seq] = [compare]

    rotateAB(a, b)
    rotateAB(a, b)

    if (c) c.reverse().forEach((n) => notation[reverseNotation(n)]())
  }

  const rotatePosition = (pos: { x: number; y: number; z: number }, notation: string) => {
    const prefixes = notation.split('-')[0].split(',')
    let p = pos

    prefixes.forEach((prefix) => {
      const axes = prefix.toLowerCase()[0] as TAxis
      const angle = prefix[1] ? -Math.PI / 2 : Math.PI / 2

      p = rotate3D(p, axes, angle)
    })

    return Object.values(p).join(',')
  }

  const generateStates = () => {
    ab_ba(a, b)
    ab_ba(b, a)
    ;[["Z'", "Y'"], ['Z'], ["Z'"], ['X'], ["X'"], ['Y'], ["Y'"]].forEach((not) => {
      ab_ba(a, b, not)
      ab_ba(b, a, not)
    })

    console.log(
      JSON.stringify(
        Object.entries(allStates).map(([notation, val]) => {
          return [
            notation,
            val.map((item) =>
              [...item.entries()].map(([key, val]) => [rotatePosition(key, notation), val])
            )
          ]
        })
      )
    )
  }

  renderCube = (pieces: IPiece[]) => {
    pieces.forEach(({ mesh }) => scene.add(mesh))

    generateStates()

    // const mesh = [...state.value.values()].map((item) => item.mesh)[6]
    // selectPieces(state.value, [mesh])

    const [rot, a, b] = params.get('not')?.split('-') || []

    rotateAB(a.split(','), b.split(','), rot ? rot.split(',') : undefined)
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
