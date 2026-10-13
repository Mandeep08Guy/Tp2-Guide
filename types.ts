
export interface GuideStep {
  title: string;
  description: string;
  tips?: string[];
  actionLabel?: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  visualCue?: string;
  imageUrl?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface OnlineMediaItem {
  title: string;
  url: string;
  source: string;
}

export interface ProTip {
  id: string;
  title: string;
  software: string;
  category: string;
  shortcut?: string;
  description: string;
  impact: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  icon: string;
}

export interface CommunityComment {
  id: string;
  author: string;
  role: string;
  avatar: string;
  content: string;
  timestamp: string;
  isAI?: boolean;
}

export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  author: string;
  authorRole: string;
  avatar: string;
  softwareTag: string;
  tutorialId?: string;
  category: 'Workflow' | 'Question' | 'Showcase' | 'Pro Tip';
  shortcut?: string;
  upvotes: number;
  timestamp: string;
  comments: CommunityComment[];
}

export enum ExploringMode {
  STANDARD = 'Standard',
  EXPERT = 'Expert'
}

export interface Tutorial {
  id: string;
  name: string;
  category: Category;
  description: string;
  icon: string;
  color: string;
  popularTopics: string[];
  advancedTopics: string[];
  versions: string[]; 
}

export interface AIResponse {
  steps: GuideStep[];
  overview: string;
  commonShortcuts: { key: string; action: string }[];
  beginnerChecklist: string[];
  faqs: FAQItem[];
}

export enum Category {
  OS = 'OS',
  SECURITY = 'Security',
  OFFICE = 'Office',
  PRODUCTIVITY = 'Productivity',
  CREATIVE = 'Creative',
  DEV = 'Development',
  DEVOPS = 'DevOps',
  CLOUD = 'Cloud Infrastructure',
  ENTERPRISE = 'Enterprise Systems',
  WEB = 'Web Platforms',
  ENGINEERING = 'Engineering & CAD',
  GAMING = 'Gaming Platforms',
  FINANCE = 'Finance & ERP',
  SOCIAL_MEDIA = 'Social & Marketing',
  COMMUNICATION = 'Communication',
  STREAMING = 'Streaming & Media',
  E_COMMERCE = 'Marketplaces',
  DESIGN = 'Design Tools',
  COLLABORATION = 'Team Collaboration'
}
