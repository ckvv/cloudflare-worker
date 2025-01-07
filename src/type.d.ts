import type { R2Bucket } from '@cloudflare/workers-types'

export interface BlankEnv {
  Bindings: {
    MY_BUCKET: R2Bucket
    password: string
  }
}
