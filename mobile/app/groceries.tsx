import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import DropDownPicker from 'react-native-dropdown-picker'
import { LinearGradient } from 'expo-linear-gradient'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../src/lib/supabase'

const categories = ['produce', 'protein', 'snacks', 'pantry', 'household'] as const
type Category = (typeof categories)[number]

type GroceryItem = {
  id: string
  name: string
  size: string
  category: Category
  qty: number
}

const GUEST_ITEMS_KEY = 'guest_grocery_items'

export default function Groceries() {
  const [name, setName] = useState('')
  const [size, setSize] = useState('')
  const [category, setCategory] = useState<Category | null>(null)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [categoryItems, setCategoryItems] = useState(
    categories.map((option) => ({
      label: option.charAt(0).toUpperCase() + option.slice(1),
      value: option,
    }))
  )
  const [qty, setQty] = useState('')
  const [message, setMessage] = useState('')
  const [items, setItems] = useState<GroceryItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isGuest, setIsGuest] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
      setLoading(false)
    }

    const loadSupabaseItems = async (currentUserId: string) => {
      const { data, error } = await supabase
        .from('grocery_items')
        .select('id, name, size, category, qty')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })

      if (!isMounted) {
        return
      }
      if (error) {
        setMessage(error.message)
        setLoading(false)
        return
      }
      setItems(data as GroceryItem[])
      setLoading(false)
    }

    const bootstrap = async () => {
      const guestSession = await AsyncStorage.getItem('guest_session')
      if (!isMounted) {
        return
      }
      if (guestSession === 'true') {
        setIsGuest(true)
        await loadGuestItems()
        return
      }

      const { data, error } = await supabase.auth.getUser()
      if (!isMounted) {
        return
      }
      if (error || !data.user) {
        setMessage('Please log in to view groceries.')
        setLoading(false)
        return
      }
      setUserId(data.user.id)
      await loadSupabaseItems(data.user.id)
    }

    bootstrap()

    return () => {
      isMounted = false
    }
  }, [])

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.name.localeCompare(b.name))
  }, [items])

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      return sortedItems
    }
    return sortedItems.filter((item) =>
      item.name.toLowerCase().includes(query)
    )
  }, [searchQuery, sortedItems])

  const saveGuestItems = async (nextItems: GroceryItem[]) => {
    await AsyncStorage.setItem(GUEST_ITEMS_KEY, JSON.stringify(nextItems))
  }

  const handleAddItem = async () => {
    const trimmedName = name.trim()
    const parsedQty = Number.parseInt(qty, 10)

    if (!trimmedName) {
      setMessage('Name is required.')
      return
    }
    if (!category) {
      setMessage('Category is required.')
      return
    }
    if (Number.isNaN(parsedQty) || parsedQty < 1) {
      setMessage('Quantity must be 1 or more.')
      return
    }

    setSaving(true)
    setMessage('')

    if (isGuest) {
      const newItem: GroceryItem = {
        id: `${Date.now()}-${Math.random()}`,
        name: trimmedName,
        size: size.trim(),
        category,
        qty: parsedQty,
      }
      const nextItems = [newItem, ...items]
      setItems(nextItems)
      await saveGuestItems(nextItems)
    } else if (userId) {
      const { data, error } = await supabase
        .from('grocery_items')
        .insert({
          user_id: userId,
          name: trimmedName,
          size: size.trim(),
          category,
          qty: parsedQty,
        })
        .select('id, name, size, category, qty')
        .single()

      if (error) {
        setMessage(error.message)
        setSaving(false)
        return
      }
      setItems((prev) => [data as GroceryItem, ...prev])
    } else {
      setMessage('Please log in to add items.')
      setSaving(false)
      return
    }

    setName('')
    setSize('')
    setQty('')
    setCategory(null)
    setSaving(false)
  }

  const handleRemoveItem = async (id: string) => {
    setSaving(true)
    setMessage('')

    if (isGuest) {
      const nextItems = items.filter((item) => item.id !== id)
      setItems(nextItems)
      await saveGuestItems(nextItems)
      setSaving(false)
      return
    }

    const { error } = await supabase.from('grocery_items').delete().eq('id', id)
    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }
    setItems((prev) => prev.filter((item) => item.id !== id))
    setSaving(false)
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#DFF6EF', '#BFEBDD', '#F4FBF8']}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>YOUR GROCERIES</Text>
        <Text style={styles.title}>Grocery List</Text>
        {loading ? <Text style={styles.statusText}>Loading items...</Text> : null}
        {!loading && isGuest ? (
          <Text style={styles.statusText}>Guest mode (saved locally)</Text>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Item</Text>
          <TextInput
            placeholder="Name (required)"
            placeholderTextColor="#7A948C"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
          <TextInput
            placeholder="Size (optional)"
            placeholderTextColor="#7A948C"
            value={size}
            onChangeText={setSize}
            style={styles.input}
          />
          <Text style={styles.label}>Category</Text>
          <View style={styles.dropdownWrap}>
            <DropDownPicker
              open={categoryOpen}
              value={category}
              items={categoryItems}
              setOpen={setCategoryOpen}
              setValue={setCategory as (val: Category | null) => void}
              setItems={setCategoryItems}
              placeholder="Select a category"
              listMode="SCROLLVIEW"
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownMenu}
              textStyle={styles.dropdownText}
            />
          </View>
          <TextInput
            placeholder="Quantity"
            placeholderTextColor="#7A948C"
            value={qty}
            onChangeText={setQty}
            keyboardType="number-pad"
            style={styles.input}
          />
          <Pressable
            style={[styles.primaryButton, saving && styles.buttonDisabled]}
            onPress={handleAddItem}
            disabled={saving}
          >
            <Text style={styles.primaryButtonText}>
              {saving ? 'Saving...' : 'Add Item'}
            </Text>
          </Pressable>
          {message.length > 0 ? <Text style={styles.message}>{message}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>List View</Text>
          <TextInput
            placeholder="Search items"
            placeholderTextColor="#7A948C"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.input}
          />
          {filteredItems.length === 0 && !loading ? (
            <Text style={styles.statusText}>No items yet.</Text>
          ) : null}
          {filteredItems.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>
                  {item.category} • {item.qty}
                  {item.size ? ` • ${item.size}` : ''}
                </Text>
              </View>
              <Pressable
                style={[styles.outlineButton, saving && styles.buttonDisabled]}
                onPress={() => handleRemoveItem(item.id)}
                disabled={saving}
              >
                <Text style={styles.outlineButtonText}>
                  {saving ? 'Working...' : 'Remove'}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
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
  label: {
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
  dropdownWrap: {
    zIndex: 10,
  },
  dropdown: {
    borderColor: '#C9DED6',
    backgroundColor: '#FFFFFF',
  },
  dropdownMenu: {
    borderColor: '#C9DED6',
    backgroundColor: '#FFFFFF',
  },
  dropdownText: {
    fontFamily: 'Inter',
    color: '#083B2E',
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
  outlineButton: {
    borderWidth: 1,
    borderColor: '#C9DED6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  outlineButtonText: {
    color: '#0A4D3C',
    fontSize: 12,
    fontFamily: 'Inter',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  message: {
    color: '#8A5E57',
    fontSize: 12,
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
    fontSize: 16,
    color: '#0A4D3C',
    fontFamily: 'CormorantGaramond',
  },
  itemMeta: {
    fontSize: 12,
    color: '#083B2E',
    fontFamily: 'Inter',
  },
})
