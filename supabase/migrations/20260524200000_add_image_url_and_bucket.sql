-- Add image_url to meal_logs table
ALTER TABLE public.meal_logs ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-images', 'food-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for public storage bucket access
CREATE POLICY "Public Access to Food Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'food-images');

CREATE POLICY "Authenticated Users Upload Food Images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'food-images');

CREATE POLICY "Authenticated Users Delete Own Food Images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);
