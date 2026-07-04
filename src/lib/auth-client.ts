import { passkeyClient } from '@better-auth/passkey/client'
import { createAuthClient } from 'better-auth/solid'

/**
 * Browser-side auth client. Talks to the handler mounted at `/api/auth/$`.
 * Passkey-only: no password or email flows are exposed.
 */
export const authClient = createAuthClient({
  plugins: [passkeyClient()],
})
