import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

// Authoring-only WYSIWYG (bold/italic/links/lists). The player and SCORM
// bundle never import this — they render the produced HTML via RichText in
// BlockView.tsx, so Tiptap stays out of the learner bundles.

interface Props {
  html: string;
  placeholder?: string;
  onChange: (html: string, plainText: string) => void;
}

export function RichTextEditor({ html, placeholder, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        link: { openOnClick: false },
      }),
    ],
    content: html,
    onUpdate: ({ editor }) => onChange(editor.getHTML(), editor.getText()),
  });

  if (!editor) return null;

  function setLink() {
    const previous = editor!.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (empty to remove)", previous ?? "https://");
    if (url === null) return;
    if (url === "" || url === "https://") {
      editor!.chain().focus().unsetLink().run();
    } else {
      editor!.chain().focus().setLink({ href: url }).run();
    }
  }

  return (
    <div className="rte">
      <div className="rte-toolbar">
        <button
          type="button"
          className={editor.isActive("bold") ? "on" : ""}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
          aria-label="Bold"
          aria-pressed={editor.isActive("bold")}
        >
          <b>B</b>
        </button>
        <button
          type="button"
          className={editor.isActive("italic") ? "on" : ""}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
          aria-label="Italic"
          aria-pressed={editor.isActive("italic")}
        >
          <i>I</i>
        </button>
        <button
          type="button"
          className={editor.isActive("bulletList") ? "on" : ""}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
          aria-label="Bullet list"
          aria-pressed={editor.isActive("bulletList")}
        >
          ••
        </button>
        <button
          type="button"
          className={editor.isActive("link") ? "on" : ""}
          onClick={setLink}
          title="Link"
          aria-label="Link"
          aria-pressed={editor.isActive("link")}
        >
          🔗
        </button>
      </div>
      <EditorContent editor={editor} className="rte-content" data-placeholder={placeholder} />
    </div>
  );
}
