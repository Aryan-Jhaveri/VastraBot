# Ideas 
   - Production:
       - [ ] Address how to share and deploy the project for others to use? Will they subscribe to the bot and use it as a closet?

    - DB:
        - [ ] : Research data cleaning pipeline where, an added garment image gets appropriately segmented before being saved.

    - Ooutfits:
        - Remove carenotes for in outfits page <div><p class="text-[9px] font-bold font-mono uppercase tracking-[0.1em] border-b-2 border-[#111] pb-1.5 mb-2">Care Notes</p><div class="mb-2"><p class="text-[8px] font-mono text-[#888] uppercase tracking-[0.04em] mb-0.5 capitalize">t-shirt</p><ul class="space-y-0.5"><li class="text-[10px] font-mono text-[#555]">— Wash at 40°C</li><li class="text-[10px] font-mono text-[#555]">— Do not bleach</li><li class="text-[10px] font-mono text-[#555]">— Tumble dry medium heat</li><li class="text-[10px] font-mono text-[#555]">— Medium Iron avoiding print</li><li class="text-[10px] font-mono text-[#555]">— Do not dry clean</li><li class="text-[10px] font-mono text-[#555]">— Wash with similar colours</li></ul></div></div>

        - 

    - [ ] Security:
        - Check security to see if the API leaks in front end, check security research.

    - [x] Cron Jobs:
        - [ ] One time edit menu doesn't include time selector, only date selector
        - Currently cron jobs dont send messages, why is that?
        - need to add the ability to delete jobs, Cannot delete created cron jobs at the moment
        - Need the ability/plan to also set a cron job to remind for a saved outfit instead of asking for gemini suggested generated one. A simple cron implementation to send a message for an outift
        - [ ] Outfits page needs a schedule feature, where a selected outfit gets scheduled to be sent as reminder in telegram, a cron job automation type preset feature with what we have in jobs. We also need jobs to show such scheduled jobs.

    - [ ] Home:
        - Break weather, and suggest button, with location and weather fetched and cached for current location by default on app start up, and suggest button simply running the suggestion on clicking suggest. 

    - [ ] : Front-end
        - [ ] Research existing save button to add a download button to history of previou tryon images, clicking on save button doesn't start a download of file for me, why is that?
        - [ ] Try On page needs to show the save image
        - [x] Home page vanishes when pages are switched. (sessionStorage cache in useOutfits)
        - [x] Restrict suggestion on trigger (manual Suggest/Refresh button only)
        - [x] Try On page needs to have delete photo button
        - [x] Remove password functionality (removed from Settings)
        - [x] When a card is opened, the garment photo is not visible.
        - [x] To close a card, it a small cross in the corner. It'd be better to close a card when a background click happens.
        - [x] Try on image needs to be big enough to see. Need to figure out why and how having multiple try-on referenc image is wired  (should have max 4)


    - [ ] Closet:
        - [ ] page grid needs to be 3x4, with 3 items always for good design practise. 
        - [ ]Uploaded images need to cropped and unified to fit properly, despite whatever aspect ratio they were uploaded in
        - [ ] Add multi select for tags
        - [x] The type tags on the top need to update, for example theres a sneaker item but the tags don't reflect it, it needs to be automatic

    - [ ] Need to improve chat functionality in telegram chats. 
        - [ ] Remove /closet
        - prompts for /cancel when /tryon or /myphoto is triggered
        - add /add to trigger "add item page" and quickly allow add items.
        - [] : Edit the telegram open message to be compact.
        - Work on maybe adding gemini api to messages the bot generates aswell
        - [ ] Allow gemini agent to chat/respond to chat by tool calling
            - What if we need to change the model api down the road?

    - [x] Items page needs to be like closet really, with the ability to filter by tags, same for the otfits page.
    - [x] try on page doesn't show upload page. Only Items & Outfits page.

    - [x] DB: Need the ability for data labels and care labels ocr text to be added to the outfit field, and shown and be editable in outfit cards.
    - [x] Closet item edit page needs to ability to add and remove tags, and thoruoughly edit the item details where necessary. 
    
    - [x] Features — Outfits page (Step 9 below)
        - Save outfit, create folders/moods page to save ideas and future references, add file references to original files so we dont have to rely on generated gemini images. Bundles of clothes can be saved together to either save or save a photo someone takes themselves. Maybe check reference projects for inspiration

    - [x] : Cron Jobs (Step 8 + feature/cron-jobs ✅ DONE)


    - [x] : Data Schema
        - Each shirt card, needs to show it's respective label photo stored. There needs to be upload label space in the card if a label photo is not saved

    - [x] : Remove Worn (?) count, it is useless counter.

    - [ ] : Material and information about material needs to be OCR'red specifically from the materials label if available on clothing.
 If the field is manually, edited or OCR'ed the schema needs to subtly mention or keep track of that, so theres a difference of hey this was the composition on label vs this is what the material feels like to me.

---

## Step 9: Saved Outfits Page `feature/outfits`

Branch: `feature/outfits`

### Order of operations

#### Phase 1 — DB
- [ ] `src/db/schema.ts` — add `coverImageUri: text('cover_image_uri')` to `outfits` table
- [ ] Run `npx drizzle-kit generate` to produce `src/db/migrations/0002_*.sql`
- [ ] `src/storage/images.ts` — add `'outfits'` to `ImageFolder` union type

#### Phase 2 — Tools + Types
- [ ] `src/types/index.ts` — add `UpdateOutfitInputSchema` (name?, occasion?, notes?)
- [ ] `src/tools/outfits.ts` — add `updateOutfit(id, input)` function

#### Phase 3 — Backend Routes
- [ ] `src/transport/web/routes/outfits.ts`:
  - `PATCH /:id` — update name/occasion/notes
  - `POST /:id/cover` — multer upload → `images/outfits/` → set `coverImageUri`
  - Extend `GET /` to support `?hydrate=true` — embed `items: Item[]` per outfit
- [ ] `src/transport/web/server.ts` — ensure `images/outfits/` dir is created on startup
- [ ] Backend tests for all three new route behaviors

#### Phase 4 — Frontend API + Hook
- [ ] `src/transport/web/app/src/api/outfits.ts`:
  - Add `coverImageUri`, `lastWornAt` to `Outfit` interface
  - Add `HydratedOutfit` interface extending `Outfit` with `items: Item[]`
  - Add `updateOutfit(id, data)`, `uploadOutfitCover(id, file)`, `fetchOutfitsHydrated()`
- [ ] `src/transport/web/app/src/hooks/useSavedOutfits.ts` — fetch + refetch hook

#### Phase 5 — Frontend Components + Modals + Page
- [ ] `components/SavedOutfitCard.tsx` — cover photo OR 2×2 item thumbnails; name, occasion badge, AI badge
- [ ] `modals/OutfitDetail.tsx` — inline name/occasion edit, item strip, cover upload, mark worn, delete
- [ ] `modals/OutfitBuilder.tsx` — step 1: pick ≥2 items; step 2: name + occasion + notes → save
- [ ] `pages/Outfits.tsx` — occasion filter tabs + 2-col grid + empty state
- [ ] Frontend tests for SavedOutfitCard, OutfitBuilder, Outfits page

#### Phase 6 — Nav + Routing
- [ ] `App.tsx` — replace Jobs nav entry with Outfits; add `/outfits` route; keep `/jobs` route
- [ ] `pages/Settings.tsx` — add "Scheduled Jobs →" link to navigate to `/jobs`

### Critical files for reference during build
- `src/transport/web/routes/items.ts` — cover upload pattern (multer + saveImageFromBase64)
- `src/transport/web/app/src/modals/ItemDetail.tsx` — inline editing pattern, backdrop close
- `src/transport/web/app/src/components/ItemCard.tsx` — grid card layout
- `src/transport/web/app/src/components/CategoryFilter.tsx` — filter tab pattern (reuse for occasions)
