import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { SearchService } from './search.service'
import { SearchQueryDto } from './dto/search-query.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@Query() dto: SearchQueryDto) {
    return this.searchService.search(dto)
  }

  @Post('sync')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN')
  async syncAll() {
    return this.searchService.syncAll()
  }
}
