
# Manual Guide: Updating Category Cover Images

This guide explains how to manually update category cover images in the template library without needing to code.

## Steps to Update Category Images

### 1. Upload Image to Supabase Storage

1. Go to your Supabase Dashboard: `https://supabase.com/dashboard/project/qpikvtyxwbvytrjeiphr`
2. Navigate to **Storage** in the left sidebar
3. Select the `template-screenshots` bucket (or create it if it doesn't exist)
4. Click **Upload file** 
5. Choose your image file and upload it
6. Note the exact filename (e.g., `studios.png`)

### 2. Update Category in Database

1. Go to **SQL Editor** in your Supabase Dashboard
2. Run this SQL command to update a specific category:

```sql
UPDATE lib_categories 
SET image_path = 'your-image-filename.png' 
WHERE name = 'Exact Category Name';
```

**Example:**
```sql
UPDATE lib_categories 
SET image_path = 'studios.png' 
WHERE name = 'Art/Dance/Music Studios';
```

### 3. Alternative: Update by Pattern Matching

If you're not sure of the exact category name, you can use pattern matching:

```sql
UPDATE lib_categories 
SET image_path = 'your-image-filename.png' 
WHERE name ILIKE '%keyword%';
```

**Examples:**
```sql
-- For studios category
UPDATE lib_categories 
SET image_path = 'studios.png' 
WHERE name ILIKE '%studio%';

-- For events category  
UPDATE lib_categories 
SET image_path = 'events.png' 
WHERE name ILIKE '%event%';

-- For golf category
UPDATE lib_categories 
SET image_path = 'golf.png' 
WHERE name ILIKE '%golf%';
```

### 4. Verify the Update

1. Go to **Table Editor** in Supabase Dashboard
2. Select the `lib_categories` table
3. Check that the `image_path` column shows your new filename
4. Visit your application homepage to see the updated category card

## Image Requirements

- **Format:** PNG, JPG, or JPEG
- **Size:** Recommended 800x600px or similar 4:3 aspect ratio
- **Quality:** Web-optimized (under 500KB recommended)
- **Naming:** Use descriptive filenames like `studios.png`, `events.png`

## Troubleshooting

**Image not showing?**
- Check the filename is exactly correct (case-sensitive)
- Ensure the image was uploaded to the `template-screenshots` bucket
- Try refreshing your browser cache (Ctrl+F5)

**Can't find category name?**
Run this query to see all categories:
```sql
SELECT id, name, image_path FROM lib_categories;
```

**Storage bucket doesn't exist?**
Create it with:
```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('template-screenshots', 'template-screenshots', true);
```

## Quick Reference Commands

```sql
-- View all categories
SELECT id, name, image_path FROM lib_categories;

-- Clear an image (set to NULL)
UPDATE lib_categories SET image_path = NULL WHERE name = 'Category Name';

-- Update multiple categories at once
UPDATE lib_categories 
SET image_path = CASE 
  WHEN name ILIKE '%studio%' THEN 'studios.png'
  WHEN name ILIKE '%event%' THEN 'events.png'
  WHEN name ILIKE '%golf%' THEN 'golf.png'
  ELSE image_path 
END;
```
