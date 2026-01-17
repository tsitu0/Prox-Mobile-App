import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../src/lib/supabase'

type GroceryItem = {
  id: string
  name: string
  size: string
  category: string
  qty: number
}

type ProductPrice = {
  id: string
  product_name: string
  retailer_name: string
  price: number
  size: string
}

type BestPlan = {
  stores: string[]
  total: number
  items: Array<{ name: string; price: number; retailer: string; qty: number }>
  missing: string[]
}

const GUEST_ITEMS_KEY = 'guest_grocery_items'

export default function Prices() {
  const [items, setItems] = useState<GroceryItem[]>([])
  const [prices, setPrices] = useState<ProductPrice[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [storeCountInput, setStoreCountInput] = useState('1')

  const normalizedPrices = useMemo(() => {
    return prices.map((record) => ({
      ...record,
      product_name: record.product_name.trim().toLowerCase(),
      retailer_name: record.retailer_name.trim(),
    }))
  }, [prices])

  const normalizedItems = useMemo(() => {
    return items.map((item) => ({
      ...item,
      name: item.name.trim().toLowerCase(),
    }))
  }, [items])

  const retailerList = useMemo(() => {
    const unique = new Set(normalizedPrices.map((record) => record.retailer_name))
    return Array.from(unique).sort()
  }, [normalizedPrices])

  const priceIndex = useMemo(() => {
    const index = new Map<string, Map<string, number>>()
    normalizedPrices.forEach((record) => {
      if (!index.has(record.product_name)) {
        index.set(record.product_name, new Map())
      }
      index.get(record.product_name)!.set(record.retailer_name, record.price)
    })
    return index
  }, [normalizedPrices])

  const storeCount = Math.max(1, Math.min(5, Number.parseInt(storeCountInput, 10) || 1))

  const bestPlan = useMemo<BestPlan | null>(() => {
    if (normalizedItems.length === 0 || retailerList.length === 0) {
      return null
    }

    const combos: string[][] = []
    const maxStores = Math.min(storeCount, retailerList.length)

    const buildCombos = (start: number, current: string[]) => {
      if (current.length === maxStores) {
        combos.push([...current])
        return
      }
      for (let i = start; i < retailerList.length; i += 1) {
        current.push(retailerList[i])
        buildCombos(i + 1, current)
        current.pop()
      }
    }

    buildCombos(0, [])

    let best: BestPlan | null = null

    combos.forEach((stores) => {
      let total = 0
      const itemDetails: Array<{ name: string; price: number; retailer: string; qty: number }> = []
      const missing: string[] = []

      normalizedItems.forEach((item) => {
        const productPrices = priceIndex.get(item.name)
        if (!productPrices) {
          missing.push(item.name)
          return
        }
        let bestPrice = Infinity
        let bestRetailer = ''
        stores.forEach((store) => {
          const price = productPrices.get(store)
          if (price !== undefined && price < bestPrice) {
            bestPrice = price
            bestRetailer = store
          }
        })
        if (bestPrice === Infinity) {
          missing.push(item.name)
          return
        }
        total += bestPrice * item.qty
        itemDetails.push({
          name: item.name,
          price: bestPrice,
          retailer: bestRetailer,
          qty: item.qty,
        })
      })

      if (missing.length > 0) {
        return
      }

      if (!best || total < best.total) {
        best = {
          stores,
          total,
          items: itemDetails,
          missing,
        }
      }
    })

    return best
  }, [normalizedItems, priceIndex, retailerList, storeCount])

  useEffect(() => {
    let isMounted = true

    const loadGuestItems = async () => {
      const stored = await AsyncStorage.getItem(GUEST_ITEMS_KEY)
      if (!isMounted) {
        return
      }
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as GroceryItem[]
          setItems(parsed)
        } catch {
          setMessage('Failed to load guest items.')
        }
      }
    }

    const loadUserItems = async (userId: string) => {
      const { data, error } = await supabase
        .from('grocery_items')
        .select('id, name, size, category, qty')
        .eq('user_id', userId)

      if (!isMounted) {
        return
      }
      if (error) {
        setMessage(error.message)
        return
      }
      setItems(data as GroceryItem[])
    }

    const loadPrices = async () => {
      const { data, error } = await supabase
        .from('product_prices')
        .select('id, product_name, retailer_name, price, size')

      if (!isMounted) {
        return
      }
      if (error) {
        setMessage(error.message)
        return
      }
      setPrices(data as ProductPrice[])
    }

    const bootstrap = async () => {
      const guestSession = await AsyncStorage.getItem('guest_session')
      if (!isMounted) {
        return
      }
      if (guestSession === 'true') {
        await loadGuestItems()
      } else {
        const { data, error } = await supabase.auth.getUser()
        if (error || !data.user) {
          setMessage('Please log in to view prices.')
          setLoading(false)
          return
        }
        await loadUserItems(data.user.id)
      }
      await loadPrices()
      if (isMounted) {
        setLoading(false)
      }
    }

    bootstrap()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#DFF6EF', '#BFEBDD', '#F4FBF8']}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>PRICE COMPARISON</Text>
        <Text style={styles.title}>Find Best Prices</Text>
        {loading ? <Text style={styles.statusText}>Loading data...</Text> : null}
        {message.length > 0 ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Number of Stores</Text>
          <Text style={styles.cardSubtitle}>Choose 1–5 retailers.</Text>
          <TextInput
            value={storeCountInput}
            onChangeText={setStoreCountInput}
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor="#7A948C"
            style={styles.input}
          />
          <Pressable style={styles.secondaryButton} onPress={() => setStoreCountInput(`${storeCount}`)}>
            <Text style={styles.secondaryButtonText}>Recalculate</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Best Plan</Text>
          {!bestPlan && !loading ? (
            <Text style={styles.statusText}>
              No matching prices found. Try increasing the number of stores.
            </Text>
          ) : null}
          {bestPlan ? (
            <View style={styles.planWrap}>
              <View style={styles.planSummary}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>${bestPlan.total.toFixed(2)}</Text>
                <Text style={styles.planMeta}>Stores: {bestPlan.stores.join(', ')}</Text>
              </View>
              {bestPlan.items.map((item) => (
                <View key={`${item.name}-${item.retailer}`} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>
                      {item.name} x{item.qty}
                    </Text>
                    <Text style={styles.itemMeta}>{item.retailer}</Text>
                  </View>
                  <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Grocery Items</Text>
          {items.length === 0 && !loading ? (
            <Text style={styles.statusText}>No items found.</Text>
          ) : null}
          {items.map((item) => (
            <Text key={item.id} style={styles.itemLine}>
              {item.name}
            </Text>
          ))}
        </View>

        {prices.length === 0 && !loading ? (
          <Text style={styles.statusText}>No price data available.</Text>
        ) : null}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4FBF8',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
    gap: 16,
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
    fontSize: 14,
    lineHeight: 20,
    color: '#083B2E',
    fontFamily: 'Inter',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#F8FFFC',
    borderWidth: 1,
    borderColor: '#C9DED6',
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    color: '#0A4D3C',
    fontFamily: 'CormorantGaramond',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#5C7D73',
    fontFamily: 'Inter',
  },
  input: {
    borderWidth: 1,
    borderColor: '#C9DED6',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
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
  planWrap: {
    gap: 10,
    marginTop: 4,
  },
  planSummary: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDEBE5',
    gap: 4,
  },
  totalLabel: {
    fontSize: 12,
    color: '#5C7D73',
    fontFamily: 'Inter',
  },
  totalValue: {
    fontSize: 24,
    color: '#0A4D3C',
    fontFamily: 'CormorantGaramond',
  },
  planMeta: {
    fontSize: 12,
    color: '#083B2E',
    fontFamily: 'Inter',
  },
  itemRow: {
    borderWidth: 1,
    borderColor: '#E3EFE9',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 15,
    color: '#0A4D3C',
    fontFamily: 'CormorantGaramond',
  },
  itemMeta: {
    fontSize: 12,
    color: '#083B2E',
    fontFamily: 'Inter',
  },
  itemPrice: {
    fontSize: 14,
    color: '#0A4D3C',
    fontFamily: 'Inter',
  },
  itemLine: {
    fontSize: 13,
    color: '#083B2E',
    fontFamily: 'Inter',
  },
  message: {
    color: '#8A5E57',
    fontSize: 12,
    fontFamily: 'Inter',
  },
})
