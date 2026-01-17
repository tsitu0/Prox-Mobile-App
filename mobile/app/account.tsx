import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
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
    <View style={styles.container}>
      <LinearGradient
        colors={['#DFF6EF', '#BFEBDD', '#F4FBF8']}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
      <Stack.Screen options={{ headerBackVisible: false, title: 'Account' }} />
      <View style={styles.content}>
        <Text style={styles.kicker}>YOUR ACCOUNT</Text>
        <Text style={styles.title}>Account</Text>
        {loading ? <Text style={styles.statusText}>Loading user...</Text> : null}
        {!loading && isGuest ? (
          <Text style={styles.statusText}>Guest mode</Text>
        ) : null}
        {!loading && !isGuest && email ? (
          <Text style={styles.statusText}>Signed in as: {email}</Text>
        ) : null}
        {!loading && !isGuest && !email ? (
          <Text style={styles.statusText}>No user found.</Text>
        ) : null}
        <View style={styles.cardRow}>
          <Pressable style={styles.card} onPress={() => router.push('/groceries')}>
            <Text style={styles.cardTitle}>Groceries</Text>
            <Text style={styles.cardSubtitle}>Build and manage your list</Text>
          </Pressable>
          <Pressable style={styles.card} onPress={() => router.push('/prices')}>
            <Text style={styles.cardTitle}>Find Best Prices</Text>
            <Text style={styles.cardSubtitle}>Compare retailers instantly</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.footer}>
        <Pressable style={styles.ghostButton} onPress={handleSignOut}>
          <Text style={styles.ghostButtonText}>Sign Out</Text>
        </Pressable>
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
    gap: 10,
  },
  kicker: {
    fontSize: 12,
    letterSpacing: 2,
    color: '#5C7D73',
    fontFamily: 'Inter',
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    color: '#0A4D3C',
    fontFamily: 'CormorantGaramond',
  },
  statusText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#083B2E',
    fontFamily: 'Inter',
  },
  cardRow: {
    gap: 12,
    marginTop: 18,
  },
  card: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: '#F8FFFC',
    borderWidth: 1,
    borderColor: '#C9DED6',
  },
  cardTitle: {
    fontSize: 18,
    color: '#0A4D3C',
    fontFamily: 'CormorantGaramond',
  },
  cardSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#083B2E',
    fontFamily: 'Inter',
  },
  footer: {
    gap: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  ghostButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  ghostButtonText: {
    color: '#083B2E',
    fontSize: 14,
    fontFamily: 'Inter',
  },
  message: {
    color: '#083B2E',
    fontSize: 14,
    fontFamily: 'Inter',
  },
})
