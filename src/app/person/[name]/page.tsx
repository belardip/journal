import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { PersonList } from '@/components/person/PersonList'

export default async function PersonPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const personName = decodeURIComponent(name)

  const person = await db.person.findFirst({ where: { name: personName } })
  if (!person) notFound()

  const [myStores, myStaples] = await Promise.all([
    db.store.findMany({ where: { assignedPersonId: person.id }, orderBy: { sortOrder: 'asc' } }),
    db.stapleItem.findMany({ where: { assignedPersonId: person.id }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
  ])

  const storeIds = myStores.map(s => s.id)
  const shoppingItems = storeIds.length
    ? await db.shoppingItem.findMany({
        where: { storeId: { in: storeIds } },
        include: { store: true },
        orderBy: [{ storeId: 'asc' }, { sortOrder: 'asc' }],
      })
    : []

  const byStore = myStores.map(store => ({
    store,
    items: shoppingItems.filter(i => i.storeId === store.id),
  }))

  return (
    <PersonList
      byStore={byStore}
      staples={myStaples}
      personName={personName}
    />
  )
}
