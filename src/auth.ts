import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { prisma } from '@/lib/prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user }) {
      if (!user.email?.endsWith('@entrepreneurs.com')) return false
      await prisma.user.upsert({
        where: { email: user.email },
        update: { name: user.name ?? undefined, avatarUrl: user.image ?? undefined },
        create: { email: user.email, name: user.name ?? user.email, avatarUrl: user.image },
      })
      return true
    },
    async jwt({ token }) {
      if (token.email) {
        const u = await prisma.user.findUnique({ where: { email: token.email } })
        if (u) token.role = u.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) (session.user as { role?: string }).role = token.role as string
      return session
    },
  },
})
