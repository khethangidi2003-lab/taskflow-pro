export interface Todo {
  id: number;
  text: string;
  completed: boolean;
  dueDate: string;   // YYYY-MM-DD format
  dueTime: string;  // HH:MM format
  priority: 'low' | 'medium' | 'high';
  isEditing?: boolean;
}

export type PriorityColors = {
  [key in Todo['priority']]: string;
};