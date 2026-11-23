import { Test } from '@nestjs/testing'
import { Logger } from '@nestjs/common'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import type { App } from 'supertest/types.js'
import { vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { AppModule } from '../src/app.module.js'

describe('World API persistence (e2e)', () => {
  let app: INestApplication<App> | undefined
  let temporaryDirectory: string

  async function createApp() {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()
    const application = moduleFixture.createNestApplication()
    await application.init()
    return application
  }

  beforeEach(async () => {
    temporaryDirectory = mkdtempSync(join(tmpdir(), 'fleet-world-api-'))
    process.env.FLEET_DB_PATH = join(temporaryDirectory, 'world.sqlite')
    app = await createApp()
  })

  afterEach(async () => {
    if (app) {
      await app.close()
      app = undefined
    }

    vi.restoreAllMocks()
    delete process.env.FLEET_DB_PATH
    rmSync(temporaryDirectory, { recursive: true, force: true })
  })

  it('saves world changes and history across an API restart', async () => {
    const saveLogs = vi.spyOn(Logger.prototype, 'log')

    await request(app!.getHttpServer())
      .post('/api/world/floor')
      .send({ width: 3, height: 3 })
      .expect(201)

    await request(app!.getHttpServer())
      .post('/api/world/robots')
      .send({ x: 1, y: 1 })
      .expect(201)

    await request(app!.getHttpServer())
      .post('/api/world/robots/R1/commands')
      .send({ command: 'MOVE' })
      .expect(201)

    await request(app!.getHttpServer())
      .post('/api/world/obstacles')
      .send({ x: 2, y: 2 })
      .expect(201)

    const tickResponse = await request(app!.getHttpServer())
      .post('/api/world/tick')
      .expect(201)

    expect(tickResponse.body.tickCount).toBe(1)
    expect(tickResponse.body.robots[0].position).toEqual({ x: 1, y: 2 })
    expect(tickResponse.body.robots[0].battery).toBe(99)
    expect(tickResponse.body.robots[0].queue).toEqual([])
    expect(tickResponse.body.history.map((entry) => entry.type)).toEqual([
      'floor.created',
      'robot.placed',
      'robot.command_queued',
      'obstacle.toggled',
      'tick.completed',
    ])
    expect(tickResponse.body.history.at(-1).payload.results[0].action).toBe(
      'moved',
    )
    expect(saveLogs.mock.calls.map(([message]) => message)).toEqual([
      'Saved world change "floor.created" at tick 0.',
      'Saved world change "robot.placed" at tick 0.',
      'Saved world change "robot.command_queued" at tick 0.',
      'Saved world change "obstacle.toggled" at tick 0.',
      'Saved world change "tick.completed" at tick 1.',
    ])

    await app!.close()
    app = await createApp()

    const restoredResponse = await request(app.getHttpServer())
      .get('/api/world')
      .expect(200)

    expect(restoredResponse.body.floor).toEqual({
      width: 3,
      height: 3,
      obstacles: [{ x: 2, y: 2 }],
      chargers: [],
    })
    expect(restoredResponse.body.robots[0].position).toEqual({ x: 1, y: 2 })
    expect(restoredResponse.body.tickCount).toBe(1)
    expect(restoredResponse.body.history).toHaveLength(5)
  })

  it('rejects invalid floors and obstacles placed under robots', async () => {
    await request(app!.getHttpServer())
      .post('/api/world/floor')
      .send({ width: 0, height: 5 })
      .expect(400)

    await request(app!.getHttpServer())
      .post('/api/world/robots')
      .send({ x: 0, y: 0 })
      .expect(201)

    await request(app!.getHttpServer())
      .post('/api/world/obstacles')
      .send({ x: 0, y: 0 })
      .expect(400)

    await request(app!.getHttpServer())
      .post('/api/world/chargers')
      .send({ x: 10, y: 0 })
      .expect(400)
  })

  it('allows chargers under robots and lets robots move through charger cells', async () => {
    await request(app!.getHttpServer())
      .post('/api/world/floor')
      .send({ width: 3, height: 1 })
      .expect(201)

    await request(app!.getHttpServer())
      .post('/api/world/robots')
      .send({ x: 0, y: 0 })
      .expect(201)

    const underRobotResponse = await request(app!.getHttpServer())
      .post('/api/world/chargers')
      .send({ x: 0, y: 0 })
      .expect(201)
    expect(underRobotResponse.body.floor.chargers).toEqual([{ x: 0, y: 0 }])

    await request(app!.getHttpServer())
      .post('/api/world/chargers')
      .send({ x: 1, y: 0 })
      .expect(201)

    await request(app!.getHttpServer())
      .post('/api/world/robots/R1/commands')
      .send({ command: 'RIGHT' })
      .expect(201)
    await request(app!.getHttpServer()).post('/api/world/tick').expect(201)

    await request(app!.getHttpServer())
      .post('/api/world/robots/R1/commands')
      .send({ command: 'MOVE' })
      .expect(201)
    const chargerTick = await request(app!.getHttpServer())
      .post('/api/world/tick')
      .expect(201)
    expect(chargerTick.body.robots[0].position).toEqual({ x: 1, y: 0 })
    expect(chargerTick.body.robots[0].battery).toBe(100)

    await request(app!.getHttpServer())
      .post('/api/world/robots/R1/commands')
      .send({ command: 'MOVE' })
      .expect(201)
    const exitTick = await request(app!.getHttpServer())
      .post('/api/world/tick')
      .expect(201)
    expect(exitTick.body.robots[0].position).toEqual({ x: 2, y: 0 })
    expect(exitTick.body.robots[0].battery).toBe(99)
    expect(
      exitTick.body.history.filter((entry) => entry.type === 'charger.toggled'),
    ).toHaveLength(2)
  })

  it('queues GOTO, runs it through the shared engine, and records UNREACHABLE', async () => {
    await request(app!.getHttpServer())
      .post('/api/world/floor')
      .send({ width: 3, height: 2 })
      .expect(201)
    await request(app!.getHttpServer())
      .post('/api/world/robots')
      .send({ x: 0, y: 0 })
      .expect(201)

    const queuedResponse = await request(app!.getHttpServer())
      .post('/api/world/robots/R1/commands')
      .send({ command: 'GOTO', target: { x: 2, y: 1 } })
      .expect(201)
    expect(queuedResponse.body.robots[0].queue).toEqual([
      { type: 'GOTO', target: { x: 2, y: 1 }, noPathTicks: 0 },
    ])
    await request(app!.getHttpServer())
      .post('/api/world/robots/R1/commands')
      .send({ command: 'GOTO', target: { x: -1, y: 0 } })
      .expect(400)
    await request(app!.getHttpServer())
      .post('/api/world/robots/R1/commands')
      .send({ command: 'GOTO', target: { x: 1000, y: 1000 } })
      .expect(400)

    let tickResponse
    for (let tick = 0; tick < 3; tick += 1) {
      tickResponse = await request(app!.getHttpServer())
        .post('/api/world/tick')
        .expect(201)
    }
    expect(tickResponse.body.robots[0].position).toEqual({ x: 2, y: 1 })
    expect(tickResponse.body.robots[0].queue).toEqual([])

    await request(app!.getHttpServer())
      .post('/api/world/floor')
      .send({ width: 3, height: 1 })
      .expect(201)
    await request(app!.getHttpServer())
      .post('/api/world/robots')
      .send({ x: 0, y: 0 })
      .expect(201)
    await request(app!.getHttpServer())
      .post('/api/world/obstacles')
      .send({ x: 1, y: 0 })
      .expect(201)
    await request(app!.getHttpServer())
      .post('/api/world/robots/R1/commands')
      .send({ command: 'GOTO', target: { x: 2, y: 0 } })
      .expect(201)

    for (let tick = 0; tick < 3; tick += 1) {
      tickResponse = await request(app!.getHttpServer())
        .post('/api/world/tick')
        .expect(201)
    }
    const unreachableResult =
      tickResponse.body.history.at(-1).payload.results[0]
    expect(unreachableResult.action).toBe('unreachable')
    expect(unreachableResult.reason).toBe('UNREACHABLE')
    expect(tickResponse.body.robots[0].queue).toEqual([])
  })

  it('clears history without changing the saved world', async () => {
    await request(app!.getHttpServer())
      .post('/api/world/floor')
      .send({ width: 4, height: 3 })
      .expect(201)

    await request(app!.getHttpServer())
      .post('/api/world/robots')
      .send({ x: 1, y: 1 })
      .expect(201)

    await request(app!.getHttpServer())
      .post('/api/world/robots/R1/commands')
      .send({ command: 'RIGHT' })
      .expect(201)

    await request(app!.getHttpServer())
      .post('/api/world/tick')
      .expect(201)

    await request(app!.getHttpServer())
      .post('/api/world/robots/R1/commands')
      .send({ command: 'LEFT' })
      .expect(201)

    const clearResponse = await request(app!.getHttpServer())
      .delete('/api/world/history')
      .expect(200)

    expect(clearResponse.body.history).toEqual([])
    expect(clearResponse.body.floor).toEqual({
      width: 4,
      height: 3,
      obstacles: [],
      chargers: [],
    })
    expect(clearResponse.body.robots).toEqual([
      {
        id: 'R1',
        position: { x: 1, y: 1 },
        facing: 'EAST',
        battery: 100,
        queue: ['LEFT'],
      },
    ])
    expect(clearResponse.body.tickCount).toBe(1)

    const restoredResponse = await request(app!.getHttpServer())
      .get('/api/world')
      .expect(200)
    expect(restoredResponse.body.history).toEqual([])
    expect(restoredResponse.body.robots).toEqual(clearResponse.body.robots)
    expect(restoredResponse.body.tickCount).toBe(1)
  })
})
