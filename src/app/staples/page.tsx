import { db } from '@/lib/db'
import { StaplesList } from '@/components/staples/StaplesList'

export default async function StaplesPage() {
  const [staples, people, stores, suggestions] = await Promise.all([
    db.stapleItem.findMany({ include: { assignedPerson: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
    db.person.findMany({ orderBy: { name: 'asc' } }),
    db.store.findMany({ orderBy: { sortOrder: 'asc' } }),
    db.stapleSuggestion.findMany({ orderBy: { name: 'asc' } }),
  ])

  return <StaplesList staples={staples} people={people} stores={stores} suggestions={suggestions} />
}
