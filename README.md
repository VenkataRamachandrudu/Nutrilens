# NutriLens — AI Meal Nutrition Analyzer

A lightweight static web app that analyzes meal images and shows nutrition summaries using an n8n workflow with Google Gemini AI.

## Frontend

* **Pages**

  * `index.html` — Landing page, links to upload page.
  * `upload.html` — Upload image, preview, and Analyze. Posts to n8n webhook.
  * `analysis.html` — Shows totals, macros pie charts, detected items, and uploaded image.

* **Assets**

  * `styles.css` — Theme, animations, inputs.
  * `app.js` — Handles upload, webhook call, session storage, and analysis rendering.

* **Session Storage Keys**

  * `ns_preview` — Base64 image preview
  * `ns_result` — JSON returned from n8n
  * `ns_filename` — Uploaded file name

## Frontend ⇄ n8n Data Contract

```json
{
  "status": "success",
  "food": [
    { "name": "string", "quantity": "string", "calories": 0, "protein": 0, "carbs": 0, "fat": 0 }
  ],
  "total": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0 },
  "mealName?": "string"
}
```

Frontend reads: `const result = data[0]?.output;`

## n8n Workflow

* **Webhook** — POST `/webhook/meal_ai`
* **AI Agent (LangChain)** — Uses Google Gemini, passes image, prompt for nutrition analysis.
* **Structured Output Parser** — Ensures fixed JSON shape.
* **Respond to Webhook** — Returns `allIncomingItems` to frontend.

### Key Config Notes

* Webhook: Response Mode = `responseNode`
* AI Agent: `passthroughBinaryImages: true`
* Structured Parser: Use JSON example above
* CORS: Add headers if needed (`*` for origin, POST/OPTIONS)

## Page Flow

`Landing → Upload → Analysis`

* Upload: JPG/PNG ≤ 5MB
* Analysis: Shows image, totals, macro pie charts, detected items, meal name (API → filename → first item)

## Deployment

* Local: open `index.html` or serve with a static server
* Hosting: any static host (GitHub Pages, Netlify, Vercel)
* Ensure n8n webhook URL is publicly accessible

## Customization

* Update AI Agent prompt for dietary/allergen info
* Extend parser for micronutrients
* Adjust macro chart scaling (fixed vs proportional)
