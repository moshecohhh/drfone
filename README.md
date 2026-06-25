# ד״ר פון — חנות ומעבדה

פלטפורמת React (Vite) עבור העסק **ד״ר פון**, רשבי 49 מודיעין עילית.
האתר מאחד שני עולמות נפרדים לחלוטין: **חנות** (מכשירים) ו**מעבדה** (תיקונים).

## הפעלה

```bash
npm install   # התקנת תלויות (דורש Node.js 18+)
npm run dev   # הרצת שרת פיתוח -> http://localhost:5173
npm run build # בניה לפרודקשן
```

> דרוש Node.js 18 ומעלה. אם Node לא מותקן: `winget install OpenJS.NodeJS.LTS`

## כלל "ההפרדה המוחלטת" (Strict Separation)

החנות והמעבדה הם שני דומיינים מנותקים. כל חיפוש או סינון פועל **אך ורק** על
הדומיין הפעיל — אפס דליפה בין השניים. ההפרדה נאכפת מבנית בשלוש שכבות:

1. **שתי דאטהבייסים נפרדים** — `src/data/storeProducts.js` ו-`src/data/labServices.js`.
   הקבצים לעולם אינם מייבאים אחד את השני.
2. **מצב גלובלי עם דומיין יחיד פעיל** — `src/context/AppContext.jsx`.
   החלפת דומיין (`switchDomain`) **מאפסת אוטומטית** את כל הסינונים.
3. **בורר מקור לפי דומיין** — `src/hooks/useCatalog.js` בוחר רק את מערך הפריטים
   של הדומיין הפעיל, ולכן חיפוש/סינון לפי מותג רואים צד אחד בלבד.

## מבנה התיקיות

```
src/
├── components/      # רכיבי UI (Header, SearchBar, FilterBar, ItemCard, ...)
├── context/         # AppContext — דומיין פעיל + מצב סינון
├── data/            # storeProducts, labServices, brands, business
├── hooks/           # useCatalog — סינון מבודד לפי דומיין
├── App.jsx          # הרכבת העמוד
├── main.jsx         # נקודת כניסה
└── index.css        # Tailwind
```

## עיצוב

Tailwind CSS בסכמת **טורקיז / לבן / שחור**. צבע המותג מוגדר כ-`brand` ב-
`tailwind.config.js` (בסיס cyan-500/600). RTL מלא דרך `dir="rtl"` ב-`index.html`.

## מותגים

Samsung, Apple, Xiaomi, OnePlus, Qliux, Nokia — משותפים לשני הדומיינים אך
מסוננים בנפרד בכל אחד.
