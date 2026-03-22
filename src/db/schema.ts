import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  imageUri: text('image_uri').notNull(),
  tagImageUri: text('tag_image_uri'),

  category: text('category').notNull(),
  subcategory: text('subcategory'),
  primaryColor: text('primary_color'),
  colors: text('colors').default('[]'),
  material: text('material'),
  careInstructions: text('care_instructions').default('[]'),
  brand: text('brand'),
  size: text('size'),
  season: text('season').default('[]'),
  tags: text('tags').default('[]'),
  aiDescription: text('ai_description'),
  occasion: text('occasion').default('[]'),

  timesWorn: integer('times_worn').default(0),
  lastWornAt: integer('last_worn_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export const outfits = sqliteTable('outfits', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  itemIds: text('item_ids').notNull(),
  occasion: text('occasion'),
  season: text('season').default('[]'),
  aiGenerated: integer('ai_generated').default(0),
  weatherContext: text('weather_context'),
  notes: text('notes'),
  timesWorn: integer('times_worn').default(0),
  lastWornAt: integer('last_worn_at'),
  createdAt: integer('created_at').notNull(),
})

export const userPhotos = sqliteTable('user_photos', {
  id: text('id').primaryKey(),
  imageUri: text('image_uri').notNull(),
  label: text('label'),
  isPrimary: integer('is_primary').default(0),
  createdAt: integer('created_at').notNull(),
})

export const tryonResults = sqliteTable('tryon_results', {
  id: text('id').primaryKey(),
  userPhotoId: text('user_photo_id').notNull(),
  outfitId: text('outfit_id'),
  itemIds: text('item_ids').notNull(),
  resultImageUri: text('result_image_uri').notNull(),
  createdAt: integer('created_at').notNull(),
})
