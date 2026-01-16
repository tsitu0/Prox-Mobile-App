import { useEffect, useState } from 'react'
import { Button, Text, View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../src/lib/supabase'

export default function Account() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)

  useEffect(() => {
    ;(async () => {
      const guestSession = await AsyncStorage.getItem('guest_session')
      if (guestSession === 'true') {
        setIsGuest(true)
        setLoading(false)
        return
      }
      const { data, error } = await supabase.auth.getUser()
      if (error) {
        setMessage(error.message)
        setLoading(false)
        return
      }
      setEmail(data.user?.email ?? null)
      setLoading(false)
    })()
  }, [])

  const handleSignOut = async () => {
    setMessage('')
    await AsyncStorage.removeItem('guest_session')
    if (!isGuest) {
      const { error } = await supabase.auth.signOut()
      if (error) {
        setMessage(error.message)
        return
      }
    }
    router.replace('/')
  }

  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Stack.Screen options={{ headerBackVisible: false, title: 'Account' }} />
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Account</Text>
      {loading ? <Text>Loading user...</Text> : null}
      {!loading && isGuest ? <Text>Guest mode</Text> : null}
      {!loading && !isGuest && email ? <Text>Signed in as: {email}</Text> : null}
      {!loading && !isGuest && !email ? <Text>No user found.</Text> : null}
      <Button title="Groceries" onPress={() => router.push('/groceries')} />
      <Button title="Sign Out" onPress={handleSignOut} />
      {message.length > 0 ? <Text>{message}</Text> : null}
    </View>
  )
}
