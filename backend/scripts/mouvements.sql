CREATE TABLE IF NOT EXISTS mouvements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actif_id UUID NOT NULL REFERENCES actifs(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  details JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mouvements_actif_id ON mouvements(actif_id);
CREATE INDEX IF NOT EXISTS idx_mouvements_date ON mouvements(date);