import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef, useState } from 'react';
import { uploadFile } from '@/lib/api';
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Quote, Code,
  Heading1, Heading2, Heading3, Link as LinkIcon, Image as ImageIcon, ImagePlus, Undo, Redo, Minus, Loader2,
} from 'lucide-react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

async function resizeImage(file: File, maxEdge: number): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  const dataUrl: string = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img: HTMLImageElement = await new Promise((res, rej) => {
    const i = new window.Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const longest = Math.max(img.width, img.height);
  if (longest <= maxEdge) return file;
  const scale = maxEdge / longest;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const isPng = file.type === 'image/png';
  const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b!), isPng ? 'image/png' : 'image/jpeg', isPng ? undefined : 0.85)!);
  const newName = file.name.replace(/\.(jpe?g|png|webp)$/i, isPng ? '.png' : '.jpg');
  return new File([blob], newName, { type: isPng ? 'image/png' : 'image/jpeg' });
}

export function RichTextEditor({ value, onChange, placeholder }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-accent underline' } }),
      Image.configure({ HTMLAttributes: { class: 'rounded-md max-w-full my-2' } }),
      Placeholder.configure({ placeholder: placeholder || 'Write lesson content…' }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none min-h-[200px] px-3 py-2 focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return null;

  const btn = (active: boolean, onClick: () => void, title: string, Icon: any) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded hover:bg-muted transition-colors ${active ? 'bg-muted text-accent' : 'text-muted-foreground'}`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );

  const addLink = () => {
    const url = window.prompt('URL', editor.getAttributes('link').href || 'https://');
    if (url === null) return;
    if (url === '') { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };
  const addImageByUrl = () => {
    const url = window.prompt('Image URL');
    if (!url) return;
    const caption = window.prompt('Caption (optional)') || '';
    insertImage(url, caption);
  };

  const insertImage = (url: string, caption: string) => {
    editor.chain().focus().setImage({ src: url, alt: caption || undefined }).run();
    if (caption.trim()) {
      editor.chain().focus().insertContent(`<p style="text-align:center"><em>${escapeHtml(caption)}</em></p>`).run();
    }
  };

  const onPickFile = () => fileInputRef.current?.click();

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const resized = await resizeImage(file, 1600);
      const url = await uploadFile(resized, 'lesson-images');
      const caption = window.prompt('Caption (optional)') || '';
      insertImage(url, caption);
    } catch (e: any) {
      alert('Upload failed: ' + (e.message || e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border border-input rounded-md bg-background">
      <div className="flex flex-wrap gap-0.5 border-b border-border p-1 bg-muted/30">
        {btn(editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'Heading 1', Heading1)}
        {btn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'Heading 2', Heading2)}
        {btn(editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'Heading 3', Heading3)}
        <span className="w-px bg-border mx-1" />
        {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'Bold', Bold)}
        {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'Italic', Italic)}
        {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), 'Underline', UnderlineIcon)}
        <span className="w-px bg-border mx-1" />
        {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), 'Bullet list', List)}
        {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), 'Numbered list', ListOrdered)}
        {btn(editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), 'Quote', Quote)}
        {btn(editor.isActive('codeBlock'), () => editor.chain().focus().toggleCodeBlock().run(), 'Code block', Code)}
        <span className="w-px bg-border mx-1" />
        {btn(editor.isActive('link'), addLink, 'Link', LinkIcon)}
        {btn(false, addImageByUrl, 'Image by URL', ImageIcon)}
        {btn(false, onPickFile, uploading ? 'Uploading…' : 'Upload image', uploading ? Loader2 : ImagePlus)}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { handleUpload(f); e.target.value = ''; } }} />
        {btn(false, () => editor.chain().focus().setHorizontalRule().run(), 'Divider', Minus)}
        <span className="w-px bg-border mx-1" />
        {btn(false, () => editor.chain().focus().undo().run(), 'Undo', Undo)}
        {btn(false, () => editor.chain().focus().redo().run(), 'Redo', Redo)}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
