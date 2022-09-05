export class Physics {
  RAPIER: any
  world: any
  blocks: Record<string, any> = {}

  constructor(RAPIER: any) {
    this.RAPIER = RAPIER
    this.world = new RAPIER.World({x: 0, y: -20, z: 0})
  }

  addBlock(x, y, z) {
    const boxBody = this.RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5).setTranslation(x + 0.5, y + 0.5, z + 0.5)
    this.blocks[`${x}|${y}|${z}`] = this.world.createCollider(boxBody)

    return `${x}|${y}|${z}`
  }

  removeBlock(blockName) {
    if(!this.blocks.hasOwnProperty(blockName)) throw "Tried to remove a physics box that didn't exist"

    this.world.removeCollider(this.blocks[blockName], false)
    delete this.blocks[blockName]
  }

  addPhysicsObject(dx, dy, dz, x, y, z) {
    const rigidBodyDesc = this.RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z)
  
    const rigidBody = this.world.createRigidBody(rigidBodyDesc)
    rigidBody.lockRotations(true, true)

    let colliderDesc = this.RAPIER.ColliderDesc.cuboid(dx, dy, dz);
    this.world.createCollider(colliderDesc, rigidBody);

    return rigidBody
  }

  step() {
    this.world.step()
  }
}