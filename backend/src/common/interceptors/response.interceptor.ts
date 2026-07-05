import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  meta?: Record<string, unknown>
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((result) => {
        // If the handler already returns { success, data, message, meta } — pass through
        if (result && typeof result === 'object' && 'success' in result) return result

        // Wrap in standard envelope
        if (result && typeof result === 'object' && 'data' in result && 'meta' in result) {
          return { success: true, ...result }
        }

        return { success: true, data: result }
      })
    )
  }
}
