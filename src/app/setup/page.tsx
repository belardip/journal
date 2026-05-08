import { db } from '@/lib/db'
import { SetupPanel } from '@/components/setup/SetupPanel'

export default async function SetupPage() {
  const [setting, stores, people] = await Promise.all([
    db.setting.findFirst(),
    db.store.findMany({ include: { assignedPerson: true }, orderBy: { sortOrder: 'asc' } }),
    db.person.findMany({ orderBy: { name: 'asc' } }),
  ])

  const tripStartDate = setting?.tripStartDate
    ? setting.tripStartDate.toISOString().split('T')[0]
    : ''

  return <SetupPanel tripStartDate={tripStartDate} stores={stores} people={people} />
}
