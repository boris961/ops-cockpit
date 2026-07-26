import { signIn } from '@/auth'

export default function Login() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <form action={async () => { 'use server'; await signIn('google', { redirectTo: '/' }) }}>
        <button type="submit" style={{ padding: '12px 20px', fontSize: 16, cursor: 'pointer' }}>
          Se connecter avec Google
        </button>
      </form>
    </div>
  )
}
