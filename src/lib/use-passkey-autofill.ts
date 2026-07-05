import { onMount } from 'solid-js'
import { authClient } from '~/lib/auth-client'

interface PasskeyAutofillOptions {
  onSuccess: () => void | Promise<void>
  onError: (message: string) => void
}

/**
 * Sets up WebAuthn Conditional UI (passkey autofill) on mount. Once armed,
 * the browser offers the user's passkey in the autofill dropdown for any
 * input with `autocomplete="... webauthn"` — no button press required.
 * No-ops in browsers that don't support conditional mediation.
 */
export function usePasskeyAutofill(options: PasskeyAutofillOptions) {
  onMount(() => {
    if (
      typeof window.PublicKeyCredential === 'undefined' ||
      typeof PublicKeyCredential.isConditionalMediationAvailable !== 'function'
    ) {
      return
    }

    void PublicKeyCredential.isConditionalMediationAvailable().then(
      (available) => {
        if (!available) return

        void authClient.signIn
          .passkey({
            autoFill: true,
            fetchOptions: {
              onSuccess: async () => {
                await options.onSuccess()
              },
              onError: (context) => {
                // Ignore ceremony-aborted errors — the user ignored the
                // autofill prompt or used an explicit sign-in button instead.
                const message = context.error.message.toLowerCase()
                if (
                  message.includes('cancelled') ||
                  message.includes('aborted')
                )
                  return
                options.onError(context.error.message)
              },
            },
          })
          .catch(() => {
            // Some browsers reject synchronously when no resident credential
            // exists for this origin; this is expected and not user-facing.
          })
      },
    )
  })
}
