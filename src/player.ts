import { RigidBody } from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import { UP_AXIS } from "./constants";
import { Physics } from "./physics";

export class Player {
  renderer: THREE.WebGLRenderer
  camera: THREE.PerspectiveCamera
  canvas: HTMLCanvasElement
  keys: Record<string, boolean> = {}
  settings = {
    speed: 5,
    jumpStength: 8
  }
  physicsObject: RigidBody
  physics: Physics

  constructor(renderer: THREE.WebGLRenderer, canvas: HTMLCanvasElement, physics: Physics) {
    this.physics = physics
    this.renderer = renderer
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
      let playerPos = this.physicsObject.translation()
      playerPos.y -= 0.9 // move raycast to the player's feet
      let dist = this.physics.castRay(playerPos, {x: 0, y: -1, z: 0}, 0.01)
      if(dist != null) {
        velocity.y = this.settings.jumpStength
      }
    }

    if(this.keys['r']) {
      location.reload()
    }

    if(this.keys['Shift']) {
      velocity.x *= 2
      velocity.z *= 2
    }

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
}