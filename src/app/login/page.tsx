import { signIn } from '@/auth'

export default function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="verre w-full max-w-sm rounded-xl px-8 py-10 text-center ring-1 ring-white/10">
        <p className="text-lg font-semibold tracking-tight">
          Entrepreneurs<span className="text-brand">.</span>
        </p>
        <p className="mt-1.5 text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          Ops cockpit
        </p>

        <h1 className="mt-8 text-2xl font-light tracking-tight">Connexion</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Accès réservé aux comptes Entrepreneurs.
        </p>

        <form
          action={async () => {
            'use server'
            await signIn('google', { redirectTo: '/' })
          }}
          className="mt-8"
        >
          <button
            type="submit"
            className="violet-plein inline-flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold transition-all"
          >
            Se connecter avec Google
          </button>
        </form>
      </div>
    </div>
  )
}
