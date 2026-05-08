import { db } from '@/lib/db'
import { ShoppingList } from '@/components/shopping/ShoppingList'

export default async function ShoppingPage() {
  const [items, stores, people] = await Promise.all([
    db.shoppingItem.findMany({ include: { store: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
    db.store.findMany({ include: { assignedPerson: true }, orderBy: { sortOrder: 'asc' } }),
    db.person.findMany({ orderBy: { name: 'asc' } }),
  ])

  return <ShoppingList items={items} stores={stores} people={people} />
}
