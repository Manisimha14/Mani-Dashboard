-- Create meal_logs table
CREATE TABLE IF NOT EXISTS public.meal_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    raw_input TEXT,
    total_calories INTEGER DEFAULT 0,
    protein NUMERIC DEFAULT 0,
    carbs NUMERIC DEFAULT 0,
    fat NUMERIC DEFAULT 0,
    fiber NUMERIC DEFAULT 0,
    confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
    ai_provider TEXT,
    ai_latency_ms INTEGER,
    parse_version INTEGER,
    raw_input_hash TEXT,
    edited_by_user BOOLEAN DEFAULT FALSE,
    confidence_reason TEXT,
    source TEXT DEFAULT 'chat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meal_items table
CREATE TABLE IF NOT EXISTS public.meal_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_log_id UUID NOT NULL REFERENCES public.meal_logs(id) ON DELETE CASCADE,
    food_name TEXT NOT NULL,
    canonical_food_id UUID, -- For future normalization mapping
    quantity NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    calories INTEGER DEFAULT 0,
    protein NUMERIC DEFAULT 0,
    carbs NUMERIC DEFAULT 0,
    fat NUMERIC DEFAULT 0,
    fiber NUMERIC DEFAULT 0,
    estimated BOOLEAN DEFAULT TRUE,
    confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
    assumption_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create saved_meals table
CREATE TABLE IF NOT EXISTS public.saved_meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create saved_meal_items table
CREATE TABLE IF NOT EXISTS public.saved_meal_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saved_meal_id UUID NOT NULL REFERENCES public.saved_meals(id) ON DELETE CASCADE,
    food_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    calories INTEGER DEFAULT 0,
    protein NUMERIC DEFAULT 0,
    carbs NUMERIC DEFAULT 0,
    fat NUMERIC DEFAULT 0,
    fiber NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_meal_items ENABLE ROW LEVEL SECURITY;

-- Policies for meal_logs
CREATE POLICY "Users can manage their own meal logs"
    ON public.meal_logs
    FOR ALL
    USING (auth.uid() = user_id);

-- Policies for meal_items (inherited from meal_log_id implicitly through app logic, but let's make it secure)
CREATE POLICY "Users can manage their own meal items"
    ON public.meal_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.meal_logs ml 
            WHERE ml.id = meal_items.meal_log_id 
            AND ml.user_id = auth.uid()
        )
    );

-- Policies for saved_meals
CREATE POLICY "Users can manage their own saved meals"
    ON public.saved_meals
    FOR ALL
    USING (auth.uid() = user_id);

-- Policies for saved_meal_items
CREATE POLICY "Users can manage their own saved meal items"
    ON public.saved_meal_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.saved_meals sm 
            WHERE sm.id = saved_meal_items.saved_meal_id 
            AND sm.user_id = auth.uid()
        )
    );

-- Create Indexes for performance
CREATE INDEX idx_meal_logs_user_id ON public.meal_logs(user_id);
CREATE INDEX idx_meal_logs_logged_at ON public.meal_logs(logged_at);
CREATE INDEX idx_meal_logs_raw_input_hash ON public.meal_logs(raw_input_hash);
CREATE INDEX idx_meal_items_meal_log_id ON public.meal_items(meal_log_id);
CREATE INDEX idx_saved_meals_user_id ON public.saved_meals(user_id);
CREATE INDEX idx_saved_meal_items_saved_meal_id ON public.saved_meal_items(saved_meal_id);
