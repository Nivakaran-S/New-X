import { SetMetadata } from '@nestjs/common'
import type { Actions } from './ability.factory'

export interface RequiredRule {
  action: Actions
  subject: string
}

export const CHECK_ABILITY = 'check_ability'
export const CheckAbility = (...rules: RequiredRule[]) => SetMetadata(CHECK_ABILITY, rules)
