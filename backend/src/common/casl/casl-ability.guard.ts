import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AbilityFactory, Subjects } from './ability.factory'
import { CHECK_ABILITY, RequiredRule } from './check-ability.decorator'

@Injectable()
export class AbilityGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private abilityFactory: AbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rules = this.reflector.get<RequiredRule[]>(CHECK_ABILITY, context.getHandler()) ?? []
    if (!rules.length) return true

    const { user } = context.switchToHttp().getRequest()
    if (!user) return false

    const ability = this.abilityFactory.createForUser(user)
    return rules.every(rule => ability.can(rule.action, rule.subject as Subjects))
  }
}
