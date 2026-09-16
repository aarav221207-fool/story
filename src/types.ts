export interface World {
  id: string;
  name: string;
  description: string;
  genre: string;
  setting: string;
  day: number;
  time_of_day: string;
}

export interface Player {
  id: string;
  world_id: string;
  name: string;
  health: number;
  max_health: number;
  stamina: number;
  max_stamina: number;
  money: number;
  level: number;
  xp: number;
  location_id: string;
  locations?: Location;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  region: string;
}

export interface Character {
  id: string;
  name: string;
  age: number;
  appearance: string;
  background: string;
  personality: string;
  occupation: string;
  current_location_id: string;
  current_activity: string;
}

export interface ActionHistory {
  id: string;
  action_text: string;
  narration: string;
  day: number;
  time_of_day: string;
  created_at: string;
}
