
-- Create a table to store workflow status updates
CREATE TABLE public.workflow_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('progress', 'message', 'complete', 'error')),
  progress INTEGER DEFAULT 0,
  message TEXT,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create an index for efficient querying by session_id and created_at
CREATE INDEX idx_workflow_status_session_created ON public.workflow_status (session_id, created_at DESC);

-- Add Row Level Security (RLS)
ALTER TABLE public.workflow_status ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to read status updates (since this is for real-time updates)
CREATE POLICY "Anyone can read workflow status" 
  ON public.workflow_status 
  FOR SELECT 
  USING (true);

-- Create a policy that allows anyone to insert status updates (for n8n webhooks)
CREATE POLICY "Anyone can insert workflow status" 
  ON public.workflow_status 
  FOR INSERT 
  WITH CHECK (true);

-- Clean up old status records function (we'll call this manually from our edge function)
CREATE OR REPLACE FUNCTION cleanup_old_workflow_status()
RETURNS void AS $$
BEGIN
  DELETE FROM public.workflow_status 
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;
