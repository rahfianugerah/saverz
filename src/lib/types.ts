export interface Prompt {
  id?: number;
  title: string;
  role: string;
  taskType: 'textarea' | 'list';
  taskContent: string;
  rules: string[];
  createdAt: Date;
}

export interface Link {
  id?: number;
  name: string;
  url: string;
  createdAt: Date;
}

export interface Note {
  id?: number;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}
