import { useEffect } from 'react'
import { Button, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../src/lib/supabase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    const checkSession = async () => {
      const guestSession = await AsyncStorage.getItem('guest_session')
      if (!isMounted) {
        return
      }
      if (guestSession === 'true') {
        router.replace('/account')
        return
      }
      const { data } = await supabase.auth.getSession()
      if (!isMounted) {
        return
      }
      if (data.session) {
        router.replace('/account')
        return
      }
    }

    checkSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          router.replace('/account')
          return
        }
        AsyncStorage.getItem('guest_session').then((guestSession) => {
          if (guestSession === 'true') {
            router.replace('/account')
            return
          }
        })
      }
    )

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [router])

  const handleContinueAsGuest = async () => {
    await AsyncStorage.setItem('guest_session', 'true')
    router.replace('/account')
  }

  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Welcome</Text>
      <Text>Choose how you want to continue.</Text>
      <Button title="Sign Up" onPress={() => router.push('/signup')} />
      <Button title="Log In" onPress={() => router.push('/login')} />
      <Button title="Continue as Guest" onPress={handleContinueAsGuest} />
    </View>
  )
}
