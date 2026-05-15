export type AppCategory = 
  | 'productivity' 
  | 'development' 
  | 'learning' 
  | 'communication' 
  | 'entertainment' 
  | 'utilities' 
  | 'finance' 
  | 'shopping' 
  | 'other';

export type IconType = 'emoji' | 'lucide' | 'image' | 'favicon';

export interface AppLink {
  id: string;
  name: string;
  url: string;
  description?: string;
  
  // Icon Model
  iconType: IconType;
  iconValue: string;
  favicon?: string;
  color?: string;

  category: AppCategory;
  tags?: string[];

  // Analytics & History
  visitCount: number;
  launchCountToday?: number;
  lastVisited?: string; // ISODateString
  createdAt: string;
  updatedAt: string;

  // UX State
  isPinned: boolean;
  isFavorite?: boolean;
  isHidden?: boolean;
  sortOrder?: number;
  openMode?: 'same-tab' | 'new-tab';
}

export interface LauncherState {
  schemaVersion: number;
  appLinks: AppLink[];
  
  // View State
  searchQuery: string;
  selectedCategory?: AppCategory;
  layoutMode: 'grid' | 'list' | 'compact';
  sortMode: 'manual' | 'most-used' | 'recent';
  showPinnedOnly: boolean;
  launcherOpen: boolean;
}
