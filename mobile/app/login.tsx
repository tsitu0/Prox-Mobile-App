import { useEffect, useState } from 'react'
import { Button, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../src/lib/supabase'

export default function LogIn() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

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
      if (isMounted && data.session) {
        router.replace('/account')
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
          }
        })
      }
    )

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [router])

  const handleLogIn = async () => {
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }
    setMessage('Logged in!')
    setLoading(false)
    router.replace('/account')
  }

  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Log In</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 12,
          borderRadius: 8,
        }}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 12,
          borderRadius: 8,
        }}
      />
      <Button
        title={loading ? 'Logging in...' : 'Log In'}
        onPress={handleLogIn}
        disabled={loading}
      />
      <Button
        title="Need an account? Sign Up"
        onPress={() => router.push('/signup')}
      />
      {message.length > 0 ? <Text>{message}</Text> : null}
    </View>
  )
}
