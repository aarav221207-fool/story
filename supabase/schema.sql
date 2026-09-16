-- Worldbound Supabase Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: worlds
CREATE TABLE worlds (
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
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  world_id UUID REFERENCES worlds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  health INTEGER DEFAULT 100,
  max_health INTEGER DEFAULT 100,
  stamina INTEGER DEFAULT 100,
  max_stamina INTEGER DEFAULT 100,
  money INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  location_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: locations
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  world_id UUID REFERENCES worlds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  region TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE players ADD CONSTRAINT fk_player_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;

-- Table: characters (NPCs)
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  world_id UUID REFERENCES worlds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER, -- explicit adult age if applicable
  appearance TEXT,
  background TEXT,
  personality TEXT,
  occupation TEXT,
  health INTEGER DEFAULT 100,
  max_health INTEGER DEFAULT 100,
  stamina INTEGER DEFAULT 100,
  max_stamina INTEGER DEFAULT 100,
  current_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  current_activity TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: memories
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  world_id UUID REFERENCES worlds(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- e.g., 'permanent', 'episodic', 'relationship'
  importance INTEGER DEFAULT 1, -- 1-10
  content TEXT NOT NULL,
  participants JSONB DEFAULT '[]', -- array of character/player IDs
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: relationships
CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  world_id UUID REFERENCES worlds(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  target_id UUID NOT NULL, -- can be player_id or another character_id
  target_type TEXT NOT NULL, -- 'player' or 'character'
  friendship INTEGER DEFAULT 0,
  trust INTEGER DEFAULT 0,
  respect INTEGER DEFAULT 0,
  affection INTEGER DEFAULT 0,
  rivalry INTEGER DEFAULT 0,
  status TEXT DEFAULT 'acquaintance',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: items
CREATE TABLE items (
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
CREATE TABLE inventories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL,
  owner_type TEXT NOT NULL, -- 'player' or 'character'
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: world_events
CREATE TABLE world_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  world_id UUID REFERENCES worlds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  day_occurred INTEGER,
  participants JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: missions
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  world_id UUID REFERENCES worlds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'available', -- available, active, completed, failed
  giver_id UUID REFERENCES characters(id),
  location_id UUID REFERENCES locations(id),
  rewards JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: actions_history
CREATE TABLE actions_history (
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
CREATE INDEX idx_characters_world ON characters(world_id);
CREATE INDEX idx_locations_world ON locations(world_id);
CREATE INDEX idx_memories_character ON memories(character_id);
CREATE INDEX idx_relationships_character ON relationships(character_id);
CREATE INDEX idx_inventories_owner ON inventories(owner_id, owner_type);

-- RLS Policies
ALTER TABLE worlds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to worlds" ON worlds FOR SELECT USING (true);
CREATE POLICY "Allow public insert to worlds" ON worlds FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to worlds" ON worlds FOR UPDATE USING (true);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on players" ON players FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on locations" ON locations FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on characters" ON characters FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on memories" ON memories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on relationships" ON relationships FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on items" ON items FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE inventories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on inventories" ON inventories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE world_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on world_events" ON world_events FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on missions" ON missions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE actions_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on actions_history" ON actions_history FOR ALL USING (true) WITH CHECK (true);
