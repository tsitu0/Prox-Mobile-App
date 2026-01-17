import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../src/lib/supabase'

export default function SignUp() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' })
  const [globalError, setGlobalError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const validateEmail = (value: string) => {
    if (!value.trim()) {
      return 'Email is required.'
    }
    if (!/.+@.+\..+/.test(value)) {
      return 'Enter a valid email.'
    }
    return ''
  }

  const validatePassword = (value: string) => {
    if (!value) {
      return 'Password is required.'
    }
    if (value.length < 6) {
      return 'Password must be at least 6 characters.'
    }
    return ''
  }

  const handleEmailChange = (value: string) => {
    setEmail(value)
    if (fieldErrors.email) {
      setFieldErrors((prev) => ({ ...prev, email: '' }))
    }
    if (globalError) {
      setGlobalError('')
    }
    if (successMessage) {
      setSuccessMessage('')
    }
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: '' }))
    }
    if (globalError) {
      setGlobalError('')
    }
    if (successMessage) {
      setSuccessMessage('')
    }
  }

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

  const handleSignUp = async () => {
    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)
    const nextErrors = { email: emailError, password: passwordError }
    setFieldErrors(nextErrors)
    setGlobalError('')
    setSuccessMessage('')

    if (emailError || passwordError) {
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })
    if (error) {
      setGlobalError(error.message)
      setLoading(false)
      return
    }
    setSuccessMessage('Check your email to confirm sign up.')
    setLoading(false)
  }

  const canSubmit =
    !loading &&
    !validateEmail(email) &&
    !validatePassword(password)

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#DFF6EF', '#BFEBDD', '#F4FBF8']}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
      <View style={styles.content}>
        <Text style={styles.kicker}>CREATE YOUR ACCOUNT</Text>
        <Text style={styles.title}>Sign up for Prox</Text>
        <Text style={styles.subtitle}>
          Start building your list and compare prices across retailers.
        </Text>
        <View style={styles.form}>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor="#7A948C"
            value={email}
            onChangeText={handleEmailChange}
            onBlur={() =>
              setFieldErrors((prev) => ({
                ...prev,
                email: validateEmail(email),
              }))
            }
            style={styles.input}
          />
          <Text style={styles.errorText}>
            {fieldErrors.email ? fieldErrors.email : ' '}
          </Text>
          <TextInput
            placeholder="Password"
            placeholderTextColor="#7A948C"
            secureTextEntry
            value={password}
            onChangeText={handlePasswordChange}
            onBlur={() =>
              setFieldErrors((prev) => ({
                ...prev,
                password: validatePassword(password),
              }))
            }
            style={styles.input}
          />
          <Text style={styles.errorText}>
            {fieldErrors.password ? fieldErrors.password : ' '}
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.globalError}>
          {globalError ? globalError : ' '}
        </Text>
        <Pressable
          style={[styles.primaryButton, !canSubmit && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={!canSubmit}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Signing up...' : 'Sign Up'}
          </Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.push('/login')}>
          <Text style={styles.secondaryButtonText}>Already have an account? Log In</Text>
        </Pressable>
        {successMessage.length > 0 ? (
          <Text style={styles.message}>{successMessage}</Text>
        ) : null}
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
    gap: 14,
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
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    color: '#083B2E',
    fontFamily: 'Inter',
  },
  form: {
    gap: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#C9DED6',
    backgroundColor: '#F8FFFC',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    fontFamily: 'Inter',
  },
  footer: {
    gap: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  errorText: {
    minHeight: 18,
    fontSize: 12,
    color: '#8A5E57',
    fontFamily: 'Inter',
  },
  globalError: {
    minHeight: 18,
    fontSize: 12,
    color: '#8A5E57',
    fontFamily: 'Inter',
  },
  buttonDisabled: {
    opacity: 0.6,
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
    fontSize: 14,
    fontFamily: 'Inter',
  },
  message: {
    color: '#083B2E',
    fontSize: 14,
    fontFamily: 'Inter',
  },
})
