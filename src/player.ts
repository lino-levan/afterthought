import { RigidBody } from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import { UP_AXIS } from "./constants";
import { Physics } from "./physics";
import { textures } from "./textures";
import { World } from "./world";
import config from "./config.json"


export class Player {
  renderer: THREE.WebGLRenderer
  camera: THREE.PerspectiveCamera
  canvas: HTMLCanvasElement
  keys: Record<string, boolean> = {}
  mouseDown: boolean = false
  settings = {
    speed: 5,
    jumpStength: 8,
  }
  physicsObject: RigidBody
  physics: Physics
  world: World
  break: {
    blockOutline: THREE.Line | null
    blockShell: THREE.Mesh | null
    destructionTimer: number
    lastBlock: {x: number, y: number, z: number}
  } = {
    blockOutline: null,
    blockShell: null,
    destructionTimer: 0,
    lastBlock: {x: 0, y: 0, z: 0}
  }

  constructor(renderer: THREE.WebGLRenderer, canvas: HTMLCanvasElement, physics: Physics, world: World) {
    this.physics = physics
    this.renderer = renderer
    this.world = world
    this.renderer.setClearColor(0xccfffc)

    const fov = 75;
    const aspect = 2;
    const near = 0.1;
    const far = 200;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far)

    this.camera.position.z = 2

    this.canvas = canvas

    this.canvas.addEventListener('click', () => {
      this.canvas.requestPointerLock()
    })

    this.canvas.addEventListener('mousemove', (e) => {
      if(!e.movementX) return

      this.camera.rotateOnWorldAxis(UP_AXIS, e.movementX * -0.001)
      this.camera.rotateX(e.movementY * -0.001)
    })

    this.canvas.addEventListener('mousedown', () => {
      this.mouseDown = true
    })

    this.canvas.addEventListener('mouseup', () => {
      this.mouseDown = false
    })

    this.canvas.addEventListener('keydown', (e) => {
      this.keys[e.key] = true

      e.preventDefault()
    })

    this.canvas.addEventListener('keyup', (e) => {
      this.keys[e.key] = false

      e.preventDefault()
    })

    this.physicsObject = physics.addPhysicsObject(0.3, 0.9, 0.3, 0, 70, 0)
  }

  update() {
    const velocity = {
      x: 0,
      y: 0,
      z: 0
    }

    const forwardVector = new THREE.Vector3();
    this.camera.getWorldDirection(forwardVector)
    forwardVector.add(new THREE.Vector3(0,-forwardVector.y,0))
    forwardVector.normalize()

    const sideVector = new THREE.Vector3();
    sideVector.copy(forwardVector);
    sideVector.cross(UP_AXIS);

    if(this.keys['w']) {
      velocity.x += this.settings.speed * forwardVector.x
      velocity.z += this.settings.speed * forwardVector.z
    }

    if(this.keys['s']) {
      velocity.x -= this.settings.speed * forwardVector.x
      velocity.z -= this.settings.speed * forwardVector.z
    }

    if(this.keys['a']) {
      velocity.x -= this.settings.speed * sideVector.x
      velocity.z -= this.settings.speed * sideVector.z
    }

    if(this.keys['d']) {
      velocity.x += this.settings.speed * sideVector.x
      velocity.z += this.settings.speed * sideVector.z
    }

    const vel = this.physicsObject.linvel()

    if(this.keys[' ']) {
      velocity.y = this.settings.jumpStength
    }

    if(this.keys['r']) {
      location.reload()
    }

    if(this.keys['Shift']) {
      velocity.x *= 2
      velocity.z *= 2
    }
    
    // handle raycasting
    this.raycast()

    this.physicsObject.setLinvel({
      x: velocity.x,
      y: Math.max(Math.min(vel.y + velocity.y, 10), -20),
      z: velocity.z
    }, true)

    const pos = this.physicsObject.translation()

    this.camera.position.x = pos.x
    this.camera.position.y = pos.y + 0.85
    this.camera.position.z = pos.z
  }

  private raycast() {
    if(this.break.blockOutline) {
      this.break.blockOutline.removeFromParent()
      this.break.blockOutline = null
    }

    if(this.break.blockShell) {
      this.break.blockShell.removeFromParent()
      this.break.blockShell = null
    }

    const dist = 4
    const steps = 100

    let pos = new THREE.Vector3(0, 0, 0).copy(this.camera.position)
    let dir = new THREE.Vector3(0,0, -1);
    dir.applyQuaternion(this.camera.quaternion);
    let step = new THREE.Vector3(0, 0, 0).copy(dir).divideScalar(steps)

    let hit = false
    let blockPos = {x: 0, y: 0, z: 0}
    let blockType: string

    for(let i = 0; i < dist * steps; i++) {
      pos.add(step)

      blockPos = {
        x: Math.floor(pos.x),
        y: Math.floor(pos.y),
        z: Math.floor(pos.z)
      }

      blockType = this.world.getBlock(blockPos.x, blockPos.y, blockPos.z)

      if(blockType) {
        hit = true
        break
      }
    }

    blockType = this.world.getBlock(blockPos.x, blockPos.y, blockPos.z)

    if(!hit) return

    if(this.break.lastBlock.x !== blockPos.x || this.break.lastBlock.y !== blockPos.y || this.break.lastBlock.z !== blockPos.z) {
      this.break.lastBlock = blockPos
      this.break.destructionTimer = 0
    }
    
    // draw outline around block selected (very ugly I know)
    const material = new THREE.LineBasicMaterial( { color: 0x000000, linewidth: 100 } );
    const points: THREE.Vector3[] = [];

    points.push( new THREE.Vector3( blockPos.x, blockPos.y, blockPos.z) );
    points.push( new THREE.Vector3( blockPos.x+1, blockPos.y, blockPos.z) );
    points.push( new THREE.Vector3( blockPos.x+1, blockPos.y+1, blockPos.z) );
    points.push( new THREE.Vector3( blockPos.x, blockPos.y+1, blockPos.z) );
    points.push( new THREE.Vector3( blockPos.x, blockPos.y, blockPos.z) );
    points.push( new THREE.Vector3( blockPos.x, blockPos.y, blockPos.z+1) );
    points.push( new THREE.Vector3( blockPos.x+1, blockPos.y, blockPos.z+1) );
    points.push( new THREE.Vector3( blockPos.x+1, blockPos.y, blockPos.z) );
    points.push( new THREE.Vector3( blockPos.x+1, blockPos.y, blockPos.z+1) );
    points.push( new THREE.Vector3( blockPos.x+1, blockPos.y+1, blockPos.z+1) );
    points.push( new THREE.Vector3( blockPos.x+1, blockPos.y+1, blockPos.z) );
    points.push( new THREE.Vector3( blockPos.x+1, blockPos.y+1, blockPos.z+1) );
    points.push( new THREE.Vector3( blockPos.x, blockPos.y+1, blockPos.z+1) );
    points.push( new THREE.Vector3( blockPos.x, blockPos.y+1, blockPos.z) );
    points.push( new THREE.Vector3( blockPos.x, blockPos.y+1, blockPos.z+1) );
    points.push( new THREE.Vector3( blockPos.x, blockPos.y, blockPos.z+1) );

    const geometry = new THREE.BufferGeometry().setFromPoints( points );
    const line = new THREE.Line( geometry, material );
    this.world.scene.add( line );

    this.break.blockOutline = line

    if (this.mouseDown) {
      this.break.destructionTimer++

      // draw destruction texture (even more ugly I know)
      const geometry = new THREE.BufferGeometry();
      const {x, y, z} = blockPos
      const texture = Math.floor(this.break.destructionTimer / (config.blocks[blockType].resistance/10)).toString()
      let positions: number[] = [] // vertex buffer
      let uv: number[] = [] // uv buffer

      const b = (1/textures["break"].textures.length) // the size of each texture
      const e = 0.01 // error correction amount
      const k = textures["break"].textures.findIndex((val)=>val===texture)

      positions.push(
        x+1+e,y+1+e,z-e,
        x-e,y+1+e,z+1+e,
        x+1+e,y+1+e,z+1+e,
        x+1+e,y+1+e,z-e,
        x-e,y+1+e,z-e,
        x-e,y+1+e,z+1+e,
        x-e,y-e,z+1+e,
        x+1+e,y-e,z-e,
        x+1+e,y-e,z+1+e,
        x+1+e,y-e,z-e,
        x-e,y-e,z+1+e,
        x-e,y-e,z-e,
        x-e,y-e,z+1+e,
        x-e,y+1+e,z+1+e,
        x-e,y-e,z-e,
        x-e,y+1+e,z+1+e,
        x-e,y+1+e,z-e,
        x-e,y-e,z-e,
        x+1+e,y-e,z+1+e,
        x+1+e,y-e,z-e,
        x+1+e,y+1+e,z+1+e,
        x+1+e,y+1+e,z+1+e,
        x+1+e,y-e,z-e,
        x+1+e,y+1+e,z-e,
        x-e,y-e,z-e,
        x-e,y+1+e,z-e,
        x+1+e,y-e,z-e,
        x+1+e,y-e,z-e,
        x-e,y+1+e,z-e,
        x+1+e,y+1+e,z-e,
        x-e,y-e,z+1+e,
        x+1+e,y-e,z+1+e,
        x-e,y+1+e,z+1+e,
        x+1+e,y-e,z+1+e,
        x+1+e,y+1+e,z+1+e,
        x-e,y+1+e,z+1+e,
      )
      uv.push(
        1, k*b,
        0, (k+1)*b,
        1, (k+1)*b,
        1, k*b,
        0, k*b,
        0, (k+1)*b,
        0, (k+1)*b,
        1, k*b,
        1, (k+1)*b,
        1, k*b,
        0, (k+1)*b,
        0, k*b,
        0, k*b,
        0, (k+1)*b,
        1, k*b,
        0, (k+1)*b,
        1, (k+1)*b,
        1, k*b,
        0, k*b,
        1, k*b,
        0, (k+1)*b,
        0, (k+1)*b,
        1, k*b,
        1, (k+1)*b,
        0, k*b,
        0, (k+1)*b,
        1, k*b,
        1, k*b,
        0, (k+1)*b,
        1, (k+1)*b,
        0, k*b,
        1, k*b,
        0, (k+1)*b,
        1, k*b,
        1, (k+1)*b,
        0, (k+1)*b,
      )

      geometry.setAttribute('position', new THREE.Float32BufferAttribute( positions, 3 ) );
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute( uv, 2 ) );
      geometry.computeVertexNormals();
      textures["break"].raw.transparent = true
      const mesh = new THREE.Mesh( geometry, textures["break"].raw);
      this.world.scene.add(mesh);

      this.break.blockShell = mesh

    } else {
      this.break.destructionTimer = 0
    }

    if(this.break.destructionTimer > config.blocks[blockType].resistance) {
      this.break.destructionTimer = 0
      this.world.removeBlock(blockPos.x, blockPos.y, blockPos.z)

      if(this.break.blockOutline) {
        this.break.blockOutline.removeFromParent()
        this.break.blockOutline = null
      }
  
      if(this.break.blockShell) {
        this.break.blockShell.removeFromParent()
        this.break.blockShell = null
      }
    }
  }
}