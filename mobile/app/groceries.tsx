import { useEffect, useMemo, useState } from 'react'
import { Button, ScrollView, Text, TextInput, View } from 'react-native'
import DropDownPicker from 'react-native-dropdown-picker'
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
  const [category, setCategory] = useState<Category>('produce')
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [categoryItems, setCategoryItems] = useState(
    categories.map((option) => ({ label: option, value: option }))
  )
  const [qty, setQty] = useState('')
  const [message, setMessage] = useState('')
  const [items, setItems] = useState<GroceryItem[]>([])
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
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Grocery List</Text>
      {loading ? <Text>Loading items...</Text> : null}
      {!loading && isGuest ? <Text>Guest mode (saved locally)</Text> : null}

      <View style={{ gap: 8 }}>
        <Text style={{ fontWeight: '600' }}>Add Item</Text>
        <TextInput
          placeholder="Name (required)"
          value={name}
          onChangeText={setName}
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            padding: 12,
            borderRadius: 8,
          }}
        />
        <TextInput
          placeholder="Size (optional)"
          value={size}
          onChangeText={setSize}
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            padding: 12,
            borderRadius: 8,
          }}
        />
        <Text style={{ fontWeight: '600' }}>Category</Text>
        <DropDownPicker
          open={categoryOpen}
          value={category}
          items={categoryItems}
          setOpen={setCategoryOpen}
          setValue={setCategory}
          setItems={setCategoryItems}
          placeholder="Select a category"
          listMode="SCROLLVIEW"
          style={{ borderColor: '#ccc' }}
          dropDownContainerStyle={{ borderColor: '#ccc' }}
          zIndex={2000}
        />
        <TextInput
          placeholder="Quantity"
          value={qty}
          onChangeText={setQty}
          keyboardType="number-pad"
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            padding: 12,
            borderRadius: 8,
          }}
        />
        <Button title={saving ? 'Saving...' : 'Add Item'} onPress={handleAddItem} />
        {message.length > 0 ? <Text>{message}</Text> : null}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontWeight: '600' }}>List View</Text>
        {sortedItems.length === 0 && !loading ? <Text>No items yet.</Text> : null}
        {sortedItems.map((item) => (
          <View
            key={item.id}
            style={{
              borderWidth: 1,
              borderColor: '#eee',
              padding: 12,
              borderRadius: 8,
              gap: 4,
            }}
          >
            <Text style={{ fontWeight: '600' }}>{item.name}</Text>
            <Text>
              {item.category} • {item.qty}
              {item.size ? ` • ${item.size}` : ''}
            </Text>
            <Button
              title={saving ? 'Working...' : 'Remove'}
              onPress={() => handleRemoveItem(item.id)}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  )
}
