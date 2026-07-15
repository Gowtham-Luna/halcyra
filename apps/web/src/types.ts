export type Block =
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "heading"; text: string; level: 2 | 3 }
  | { id: string; type: "list"; items: string[]; style: "bullet" | "number" }
  | { id: string; type: "divider" }
  | { id: string; type: "image"; url: string; alt: string; caption: string }
  | {
      id: string;
      type: "mcq";
      question: string;
      options: string[];
      correctIndex: number;
      feedback: string;
    };

export type BlockType = Block["type"];

export function newBlock(type: BlockType): Block {
  const id = crypto.randomUUID();
  switch (type) {
    case "paragraph":
      return { id, type, text: "" };
    case "heading":
      return { id, type, text: "", level: 2 };
    case "list":
      return { id, type, items: [""], style: "bullet" };
    case "divider":
      return { id, type };
    case "image":
      return { id, type, url: "", alt: "", caption: "" };
    case "mcq":
      return { id, type, question: "", options: ["", ""], correctIndex: 0, feedback: "" };
  }
}

export interface Lesson {
  id: string;
  heading: string;
  body: string;
  position: number;
}

export interface CourseSummary {
  id: string;
  title: string;
  topic: string;
  updated_at: string;
}
