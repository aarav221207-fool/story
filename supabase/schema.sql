-- Worldbound Supabase Schema (JJK Edition)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: worlds
CREATE TABLE IF NOT EXISTS worlds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  setting TEXT,
  day INTEGER DEFAULT 1,
  time_of_day TEXT DEFAULT 'Morning',
  weather TEXT DEFAULT 'Clear',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: players
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  world_id UUID REFERENCES worlds(id) ON DELETE CASCADE,
  user_id UUID, -- For future auth integration
  name TEXT NOT NULL,
  
  -- Core Stats
  health INTEGER DEFAULT 100,
  max_health INTEGER DEFAULT 100,
  stamina INTEGER DEFAULT 100,
  max_stamina INTEGER DEFAULT 100,
  
  -- JJK Specific Stats
  cursed_energy INTEGER DEFAULT 50,
  max_cursed_energy INTEGER DEFAULT 50,
  strength INTEGER DEFAULT 10,
  speed INTEGER DEFAULT 10,
  endurance INTEGER DEFAULT 10,
  reflexes INTEGER DEFAULT 10,
  cursed_energy_control INTEGER DEFAULT 10,
  technique_mastery INTEGER DEFAULT 5,
  combat_experience INTEGER DEFAULT 0,
  weapon_proficiency INTEGER DEFAULT 5,
  
  -- Details
  age INTEGER DEFAULT 16,
  gender TEXT,
  appearance TEXT,
  personality TEXT,
  background TEXT,
  affiliation TEXT, -- Tokyo Jujutsu High, Kyoto, etc.
  cursed_technique TEXT,
  personal_goal TEXT,
  
  money INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  location_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: locations
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  world_id UUID REFERENCES worlds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  region TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Add foreign key if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_player_location') THEN
        ALTER TABLE players ADD CONSTRAINT fk_player_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Table: characters (NPCs)
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  world_id UUID REFERENCES worlds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  appearance TEXT,
  background TEXT,
  personality TEXT,
  occupation TEXT,
  affiliation TEXT,
  
  -- Stats
  health INTEGER DEFAULT 100,
  max_health INTEGER DEFAULT 100,
  stamina INTEGER DEFAULT 100,
  max_stamina INTEGER DEFAULT 100,
  cursed_energy INTEGER DEFAULT 100,
  max_cursed_energy INTEGER DEFAULT 100,
  strength INTEGER DEFAULT 10,
  speed INTEGER DEFAULT 10,
  endurance INTEGER DEFAULT 10,
  reflexes INTEGER DEFAULT 10,
  cursed_energy_control INTEGER DEFAULT 10,
  technique_mastery INTEGER DEFAULT 10,
  combat_experience INTEGER DEFAULT 10,
  
  likes TEXT,
  dislikes TEXT,
  fears TEXT,
  ambitions TEXT,
  values TEXT,
  goals TEXT,
  
  current_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  current_activity TEXT,
  current_mood TEXT,
  
  schedule JSONB DEFAULT '{}', -- E.g. {"Morning": "location_id", "Afternoon": "location_id"}
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: memories
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  world_id UUID REFERENCES worlds(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE, -- Link memory to specific player
  type TEXT NOT NULL, -- e.g., 'permanent', 'episodic', 'relationship', 'promise', 'conflict'
  importance INTEGER DEFAULT 1, -- 1-10
  content TEXT NOT NULL,
  participants JSONB DEFAULT '[]', -- array of character/player IDs
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: relationships
CREATE TABLE IF NOT EXISTS relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  world_id UUID REFERENCES worlds(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  target_id UUID NOT NULL, -- player_id or another character_id
  target_type TEXT NOT NULL, -- 'player' or 'character'
  
  -- Dimensions
  friendship INTEGER DEFAULT 0,
  trust INTEGER DEFAULT 0,
  respect INTEGER DEFAULT 0,
  affection INTEGER DEFAULT 0,
  attraction INTEGER DEFAULT 0,
  comfort INTEGER DEFAULT 0,
  familiarity INTEGER DEFAULT 0,
  loyalty INTEGER DEFAULT 0,
  rivalry INTEGER DEFAULT 0,
  tension INTEGER DEFAULT 0,
  jealousy INTEGER DEFAULT 0,
  
  status TEXT DEFAULT 'Stranger', -- Stranger, Acquaintance, Friendly, Friend, Close Friend, Deep Bond, Romantic Interest, Exceptional Bond
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: items
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  world_id UUID REFERENCES worlds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- e.g., 'weapon', 'consumable', 'material'
  value INTEGER DEFAULT 0,
  effects JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: inventory (generic for both players and characters)
CREATE TABLE IF NOT EXISTS inventories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL,
  owner_type TEXT NOT NULL, -- 'player' or 'character'
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: world_events
CREATE TABLE IF NOT EXISTS world_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  world_id UUID REFERENCES worlds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  day_occurred INTEGER,
  importance INTEGER DEFAULT 1,
  participants JSONB DEFAULT '[]',
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: missions
CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  world_id UUID REFERENCES worlds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'available', -- available, active, completed, failed
  giver_id UUID REFERENCES characters(id),
  location_id UUID REFERENCES locations(id),
  rewards JSONB DEFAULT '{}',
  objectives JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: actions_history
CREATE TABLE IF NOT EXISTS actions_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  world_id UUID REFERENCES worlds(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  action_text TEXT NOT NULL,
  narration TEXT,
  day INTEGER,
  time_of_day TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_characters_world ON characters(world_id);
CREATE INDEX IF NOT EXISTS idx_locations_world ON locations(world_id);
CREATE INDEX IF NOT EXISTS idx_memories_character ON memories(character_id);
CREATE INDEX IF NOT EXISTS idx_relationships_character ON relationships(character_id);
CREATE INDEX IF NOT EXISTS idx_inventories_owner ON inventories(owner_id, owner_type);

-- RLS Policies
-- The backend uses Service Role to access database, so we deny all direct client access
-- to ensure clients cannot arbitrarily manipulate game state.
ALTER TABLE worlds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to worlds" ON worlds;
DROP POLICY IF EXISTS "Allow public insert to worlds" ON worlds;
DROP POLICY IF EXISTS "Allow public update to worlds" ON worlds;
CREATE POLICY "Deny all client access on worlds" ON worlds FOR ALL USING (false);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on players" ON players;
CREATE POLICY "Deny all client access on players" ON players FOR ALL USING (false);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on locations" ON locations;
CREATE POLICY "Deny all client access on locations" ON locations FOR ALL USING (false);

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on characters" ON characters;
CREATE POLICY "Deny all client access on characters" ON characters FOR ALL USING (false);

ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on memories" ON memories;
CREATE POLICY "Deny all client access on memories" ON memories FOR ALL USING (false);

ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on relationships" ON relationships;
CREATE POLICY "Deny all client access on relationships" ON relationships FOR ALL USING (false);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on items" ON items;
CREATE POLICY "Deny all client access on items" ON items FOR ALL USING (false);

ALTER TABLE inventories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on inventories" ON inventories;
CREATE POLICY "Deny all client access on inventories" ON inventories FOR ALL USING (false);

ALTER TABLE world_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on world_events" ON world_events;
CREATE POLICY "Deny all client access on world_events" ON world_events FOR ALL USING (false);

ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on missions" ON missions;
CREATE POLICY "Deny all client access on missions" ON missions FOR ALL USING (false);

ALTER TABLE actions_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on actions_history" ON actions_history;
CREATE POLICY "Deny all client access on actions_history" ON actions_history FOR ALL USING (false);

