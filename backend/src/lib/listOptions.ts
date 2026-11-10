/**
 * Drop-down lists that admins can manage (Settings). Each list has built-in starting choices,
 * saved on first use, so forms keep working even before an admin touches anything.
 * Only plain-text fields are managed here: statuses, roles and other values the system's rules depend on stay in code.
 */
import prisma from './prisma'

export interface ListDef {
  key: string
  title: string
  /** The "something else" entry: always present, cannot be renamed, hidden or deleted */
  other: string
  defaults: { value: string; label: string }[]
  /** How many saved records use this value (blocks deleting a choice that is in use) */
  usage: (value: string) => Promise<number>
}

export const LISTS: ListDef[] = [
  {
    key: 'training_type', title: 'Training types', other: 'OTHER',
    defaults: [
      { value: 'SANHUB', label: 'SANHUB' }, { value: 'EVS', label: 'EVS Training' }, { value: 'SANTRACK', label: 'SANTRACK' },
      { value: 'SOFTWARE_DEV', label: 'Software Dev' }, { value: 'AI_IOT', label: 'AI & IoT' }, { value: 'DIGITAL', label: 'Digital Marketing' },
      { value: 'OTHER', label: 'Other' },
    ],
    usage: value => prisma.trainingSession.count({ where: { type: value } }),
  },
  {
    key: 'support_product', title: 'Support products / services', other: 'Other',
    defaults: ['EVS', 'SANTRACK', 'REVIXSAN', 'Website', 'Other'].map(v => ({ value: v, label: v })),
    usage: value => prisma.supportTicket.count({ where: { product: value } }),
  },
  {
    key: 'campaign_type', title: 'Campaign types', other: 'OTHER',
    defaults: [
      { value: 'EXPO_EVENT', label: 'Expo / Event' }, { value: 'FIELD_VISITS', label: 'Field Visits' }, { value: 'SOCIAL_MEDIA', label: 'Social Media' },
      { value: 'EMAIL_CAMPAIGN', label: 'Email Campaign' }, { value: 'REFERRAL', label: 'Referral' }, { value: 'COLD_OUTREACH', label: 'Cold Outreach' },
      { value: 'OTHER', label: 'Other' },
    ],
    usage: value => prisma.campaign.count({ where: { type: value } }),
  },
  {
    key: 'campaign_channel', title: 'Campaign channels', other: 'Other',
    defaults: ['Social Media', 'Events', 'Email', 'Direct', 'Referral', 'Other'].map(v => ({ value: v, label: v })),
    usage: value => prisma.campaign.count({ where: { channel: value } }),
  },
]

export const findList = (key: string) => LISTS.find(l => l.key === key)

/** Saves the built-in choices the first time a list is used (never overwrites an admin's edits) */
export async function ensureDefaults(def: ListDef): Promise<void> {
  const count = await prisma.listOption.count({ where: { list: def.key } })
  if (count > 0) return
  await prisma.$transaction(def.defaults.map((d, i) =>
    prisma.listOption.upsert({
      where: { list_value: { list: def.key, value: d.value } },
      update: {}, create: { list: def.key, value: d.value, label: d.label, sortOrder: i },
    })))
}
