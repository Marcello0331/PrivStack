export interface AppRecord {
  id: number;
  name: string;
  url: string;
  icon_url: string | null;
  description: string | null;
  category: string | null;
  open_in: string;
  sort_order: number;
  pinned: number;
}

export interface AppPayload {
  name: string;
  url: string;
  icon_url: string;
  description: string;
  category: string;
  open_in: string;
  pinned: boolean;
}

