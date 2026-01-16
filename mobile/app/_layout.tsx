import { Stack } from 'expo-router'
import { useFonts } from 'expo-font'

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter: require('../assets/fonts/Inter_28pt-Regular.ttf'),
    CormorantGaramond: require('../assets/fonts/CormorantGaramond-Regular.ttf'),
  })

  if (!fontsLoaded) {
    return null
  }

  return <Stack />
}
