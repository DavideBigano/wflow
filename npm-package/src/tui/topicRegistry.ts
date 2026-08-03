export type TopicId = "home" | "archiver";

export interface Topic {
  id: TopicId;
  label: string;
}

/** Tabs shown in the shell, in display order. Adding a new topic module means adding one entry here. */
export const TOPICS: Topic[] = [
  { id: "home", label: "Home" },
  { id: "archiver", label: "Archiver" },
];
