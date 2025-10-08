import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Container } from '@/components/design-system/Container'
import { Card } from '@/components/design-system/Card'
import { Button } from '@/components/design-system/Button'
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser'
import { useToast } from '@/components/design-system/Toaster'
import { env } from '@/lib/env'
import { flags } from '@/lib/flags'

const notificationsCanonical = env.NEXT_PUBLIC_SITE_URL
  ? `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/notifications`
  : undefined
const notificationsEnabled = flags.enabled('notifications')

function NotificationsComingSoon() {
  return (
    <>
      <Head>
        <title>Notifications coming soon</title>
        {notificationsCanonical ? <link rel="canonical" href={notificationsCanonical} /> : null}
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content="Custom notifications and quiet hours are almost ready. You can keep studying while we finish the controls."
        />
      </Head>
      <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <Card className="max-w-2xl mx-auto space-y-5 p-6 rounded-ds-2xl text-center">
            <h1 className="font-slab text-h2">Notifications are almost ready</h1>
            <p className="text-body text-mutedText">
              We&apos;re wrapping up daily nudges and quiet hours so you can control how GramorX reaches you.
            </p>
            <p className="text-body text-mutedText">
              Sit tight—we&apos;ll switch this on for your account soon and let you choose email, SMS, or WhatsApp updates.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg">
                <Link href="/account">Go to account settings</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/study-plan">Continue studying</Link>
              </Button>
            </div>
          </Card>
        </Container>
      </section>
    </>
  )
}

export default function NotificationSettings() {
  if (!notificationsEnabled) {
    return <NotificationsComingSoon />
  }

  const router = useRouter()
  const { error: toastError, success: toastSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [channels, setChannels] = useState<string[]>([])
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          router.replace('/login')
          return
        }
        const { data, error } = await supabase
          .from('profiles')
          .select('notification_channels, quiet_hours_start, quiet_hours_end')
          .eq('user_id', session.user.id)
          .maybeSingle()

        if (error) throw new Error(error.message)

        if (data) {
          setChannels(data.notification_channels ?? [])
          setStart(data.quiet_hours_start ?? '')
          setEnd(data.quiet_hours_end ?? '')
        }
      } catch (error: any) {
        setFetchError('Failed to load user profile data')
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [router])

  const toggle = (c: string) => {
    setChannels((ch) => ch.includes(c) ? ch.filter((x) => x !== c) : [...ch, c])
  }

  const save = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { error } = await supabase
        .from('profiles')
        .update({
          notification_channels: channels,
          quiet_hours_start: start || null,
          quiet_hours_end: end || null,
        })
        .eq('user_id', session.user.id)

      if (error) throw new Error(error.message)
      toastSuccess('Settings saved')
    } catch (error: any) {
      toastError(error.message || 'Could not save settings')
    }
  }

  if (loading) {
    return (
      <section className="py-24">
        <Container>
          <Card className="p-6 max-w-xl mx-auto">Loading…</Card>
        </Container>
      </section>
    )
  }

  if (fetchError) {
    return (
      <section className="py-24">
        <Container>
          <Card className="p-6 max-w-xl mx-auto">{fetchError}</Card>
        </Container>
      </section>
    )
  }

  return (
    <section className="py-24">
      <Container>
        <Card className="p-6 max-w-xl mx-auto space-y-6">
          <h1 className="font-slab text-display">Notifications</h1>
          <div>
            <h2 className="font-medium mb-2">Channels</h2>
            <div className="space-y-2">
              {['email', 'sms', 'whatsapp'].map((c) => (
                <label key={c} className="flex items-center gap-2 text-body">
                  <input
                    type="checkbox"
                    checked={channels.includes(c)}
                    onChange={() => toggle(c)}
                  />
                  {c.toUpperCase()}
                </label>
              ))}
            </div>
          </div>
          <div>
            <h2 className="font-medium mb-2">Quiet hours</h2>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="border rounded p-2 flex-1"
              />
              <span>to</span>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="border rounded p-2 flex-1"
              />
            </div>
          </div>
          <Button onClick={save}>Save</Button>
        </Card>
      </Container>
    </section>
  )
}
