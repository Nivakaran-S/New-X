import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { SettingsService } from './settings.service'
import { UpdateSettingDto } from './dto/update-setting.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('public')
  async findPublic() {
    return this.settingsService.findPublic()
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN')
  async findAll() {
    return this.settingsService.findAll()
  }

  @Patch(':key')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN')
  async update(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    return this.settingsService.update(key, dto.value)
  }
}
