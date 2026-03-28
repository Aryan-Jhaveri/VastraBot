# Ideas
    - [ ] Features
        - Save outfit, create folders/moods page to save ideas and future references, add file references to original files so we dont have to rely on generated gemini images. Bundles of clothes can be saved together to either save or save a photo someone takes themselves. Maybe check reference projects for inspiration

    - [ ] : Cron Jobs
       - A setting where people can put in time and reminders, where an automate pipe of get weather, and suggest some outfits is generated to send a photo and outfits.

    - [ ] : Front-end
        - [x] Home page vanishes when pages are switched. (sessionStorage cache in useOutfits)
        - [x] Restrict suggestion on trigger (manual Suggest/Refresh button only)
        - [ ] Try On page needs to show the save image
        - [x] Try On page needs to have delete photo button
        - [x] Remove password functionality (removed from Settings)
        - [x] When a card is opened, the garment photo is not visible.
        - [x] To close a card, it a small cross in the corner. It'd be better to close a card when a background click happens.
        - [x] Try on image needs to be big enough to see. Need to figure out why and how having multiple try-on referenc image is wired  (should have max 4)


    - [x] : Data Schema
        - Each shirt card, needs to show it's respective label photo stored. There needs to be upload label space in the card if a label photo is not saved

    - [x] : Remove Worn (?) count, it is useless counter.

    - [ ] : Material and information about material needs to be OCR'red specifically from the materials label if available on clothing.
 If the field is manually, edited or OCR'ed the schema needs to subtly mention or keep track of that, so theres a difference of hey this was the composition on label vs this is what the material feels like to me.

    - [ ] : Research data cleaning pipeline where, an added garment image gets appropriately segmented before being saved.

    - [ ] Need to improve chat functionality
        - [ ] Allow gemini agent to chat/respond to chat by tool calling
            - What if we need to change the model api down the road?

    - [ ] Address how to share and deploy the project for others to use? Will they subscribe to the bot and use it as a closet?

    - [] : Edit the telegram open message to be compact.
            - Work on maybe adding gemini api to messages the bot generates aswell


    - Check security to see if the API leaks in front end, check security research.
