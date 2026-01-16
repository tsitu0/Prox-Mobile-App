import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../src/lib/supabase'

export default function Home() {
  const router = useRouter()
  const [message, setMessage] = useState('')

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
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      setMessage('Sign out to continue as guest.')
      return
    }
    await AsyncStorage.setItem('guest_session', 'true')
    router.replace('/account')
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#DFF6EF', '#BFEBDD', '#F4FBF8']}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
      <View style={styles.content}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>P</Text>
          </View>
          <Text style={styles.brand}>Prox</Text>
        </View>
        <Text style={styles.kicker}>A NEW SHOPPING PLATFORM FROM PROX</Text>
        <Text style={styles.headline}>Save more on every grocery run.</Text>
        <Text style={styles.tagline}>
          Build your grocery list, compare prices, and plan the cheapest basket in minutes.
        </Text>
      </View>
      <View style={styles.footer}>
        <View style={styles.buttonStack}>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/signup')}>
            <Text style={styles.primaryButtonText}>Sign Up</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => router.push('/login')}>
            <Text style={styles.secondaryButtonText}>Log In</Text>
          </Pressable>
          <Pressable style={styles.ghostButton} onPress={handleContinueAsGuest}>
            <Text style={styles.ghostButtonText}>Continue as Guest</Text>
          </Pressable>
        </View>
        {message.length > 0 ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4FBF8',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    gap: 18,
  },
  footer: {
    gap: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0FB872',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#F4FBF8',
    fontSize: 20,
    fontFamily: 'Inter',
  },
  brand: {
    fontSize: 30,
    color: '#0A4D3C',
    fontFamily: 'CormorantGaramond',
  },
  kicker: {
    fontSize: 12,
    letterSpacing: 2,
    color: '#5C7D73',
    fontFamily: 'Inter',
  },
  headline: {
    fontSize: 30,
    lineHeight: 36,
    color: '#0A4D3C',
    fontFamily: 'CormorantGaramond',
  },
  headlineItalic: {
    fontFamily: 'CormorantGaramond',
    fontStyle: 'italic',
    color: '#0FB872',
  },
  tagline: {
    fontSize: 16,
    lineHeight: 22,
    color: '#0A4D3C',
    fontFamily: 'Inter',
  },
  buttonStack: {
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#0FB872',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#F4FBF8',
    fontSize: 16,
    fontFamily: 'Inter',
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: '#0FB872',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0FB872',
    fontSize: 16,
    fontFamily: 'Inter',
  },
  ghostButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  ghostButtonText: {
    color: '#0A4D3C',
    fontSize: 14,
    fontFamily: 'Inter',
  },
  message: {
    color: '#0A4D3C',
    fontSize: 14,
    fontFamily: 'Inter',
  },
})
