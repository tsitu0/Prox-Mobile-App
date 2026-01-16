import { useEffect } from 'react'
import { Text, View } from 'react-native'
import { supabase } from '../src/lib/supabase'

export default function Home() {
  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase.auth.getSession()
      console.log('session:', data, error)
    })()
  }, [])

  return (
    <View>
      <Text>Supabase test</Text>
    </View>
  )
}