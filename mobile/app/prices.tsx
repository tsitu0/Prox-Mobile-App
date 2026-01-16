import { useEffect, useMemo, useState } from 'react'
import { Button, ScrollView, Text, TextInput, View } from 'react-native'
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

  const bestPlan = useMemo(() => {
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

    let best: {
      stores: string[]
      total: number
      items: Array<{ name: string; price: number; retailer: string; qty: number }>
      missing: string[]
    } | null = null

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
    <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Find Best Prices</Text>
      {loading ? <Text>Loading data...</Text> : null}
      {message.length > 0 ? <Text>{message}</Text> : null}

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: '600' }}>Number of Stores (1-5)</Text>
        <TextInput
          value={storeCountInput}
          onChangeText={setStoreCountInput}
          keyboardType="number-pad"
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            padding: 10,
            borderRadius: 8,
          }}
        />
        <Button title="Recalculate" onPress={() => setStoreCountInput(`${storeCount}`)} />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: '600' }}>Best Plan</Text>
        {!bestPlan && !loading ? (
          <Text>
            No matching prices found. Try increasing the number of stores.
          </Text>
        ) : null}
        {bestPlan ? (
          <View style={{ gap: 4 }}>
            <Text>Total: ${bestPlan.total.toFixed(2)}</Text>
            <Text>Stores: {bestPlan.stores.join(', ')}</Text>
            {bestPlan.items.map((item) => (
              <Text key={`${item.name}-${item.retailer}`}>
                {item.name} x{item.qty} • {item.retailer} • ${item.price.toFixed(2)}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: '600' }}>Grocery Items</Text>
        {items.length === 0 && !loading ? <Text>No items found.</Text> : null}
        {items.map((item) => (
          <Text key={item.id}>{item.name}</Text>
        ))}
      </View>

      {prices.length === 0 && !loading ? (
        <Text>No price data available.</Text>
      ) : null}
    </ScrollView>
  )
}
