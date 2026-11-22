import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common'
import { WorldService } from './world.service.js'

interface FloorBody {
  width?: number
  height?: number
}

interface PositionBody {
  x?: number
  y?: number
}

interface CommandBody {
  command?: unknown
}

@Controller('api/world')
export class WorldController {
  constructor(private readonly worldService: WorldService) {}

  @Get()
  getWorld() {
    return this.worldService.getWorld()
  }

  @Delete('history')
  clearHistory() {
    return this.worldService.clearHistory()
  }

  @Post('floor')
  createFloor(@Body() body?: FloorBody) {
    return this.worldService.createFloor(body?.width, body?.height)
  }

  @Post('robots')
  placeRobot(@Body() body?: PositionBody) {
    return this.worldService.placeRobot(body)
  }

  @Post('robots/:robotId/commands')
  queueCommand(
    @Param('robotId') robotId: string,
    @Body() body?: CommandBody,
  ) {
    return this.worldService.queueCommand(robotId, body?.command)
  }

  @Post('obstacles')
  toggleObstacle(@Body() body?: PositionBody) {
    return this.worldService.toggleObstacle(body)
  }

  @Post('tick')
  advanceTick() {
    return this.worldService.advanceTick()
  }
}
