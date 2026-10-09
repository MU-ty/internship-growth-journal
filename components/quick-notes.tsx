'use client';

import {
  Bold,
  Code2,
  Download,
  FileUp,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Quote,
  Redo2,
  RemoveFormatting,
  Save,
  Strikethrough,
  Table2,
  Trash2,
  Underline,
  Undo2,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

type Note = {
  id: number;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
};

type ExportFormat = 'md' | 'txt' | 'html' | 'pdf' | 'docx';

function safeHtml(html: string) {
  const documentNode = new DOMParser().parseFromString(html, 'text/html');
  documentNode
    .querySelectorAll('script,style,iframe,object,embed,form,input,button')
    .forEach((node) => node.remove());
  documentNode.body.querySelectorAll('*').forEach((element) => {
    const allowed = new Set([
      'P',
      'DIV',
      'BR',
      'H1',
      'H2',
      'H3',
      'H4',
      'STRONG',
      'B',
      'EM',
      'I',
      'U',
      'S',
      'STRIKE',
      'BLOCKQUOTE',
      'PRE',
      'CODE',
      'UL',
      'OL',
      'LI',
      'A',
      'IMG',
      'HR',
      'TABLE',
      'THEAD',
      'TBODY',
      'TR',
      'TH',
      'TD',
      'SPAN',
    ]);
    if (!allowed.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (
        !['href', 'src', 'alt'].includes(name) ||
        (name === 'href' && !/^(https?:\/\/|mailto:|#)/i.test(value))
      ) {
        element.removeAttribute(attribute.name);
      }
    });
    if (element.tagName === 'A') {
      element.setAttribute('rel', 'noreferrer noopener');
    }
    if (element.tagName === 'IMG') {
      const source = element.getAttribute('src') ?? '';
      const isInlineImage = /^data:image\/(jpeg|png|webp|gif);base64,/i.test(
        source,
      );
      let url: URL;
      try {
        url = new URL(source || '/', window.location.origin);
      } catch {
        element.remove();
        return;
      }
      const isOwnedImage =
        url.origin === window.location.origin &&
        url.pathname === '/api/note-images';
      if (!isInlineImage && !isOwnedImage) {
        element.remove();
        return;
      }
      Array.from(element.attributes).forEach((attribute) => {
        if (!['src', 'alt'].includes(attribute.name.toLowerCase())) {
          element.removeAttribute(attribute.name);
        }
      });
      element.setAttribute('loading', 'lazy');
    }
  });
  return documentNode.body.innerHTML;
}

function htmlToMarkdown(html: string) {
  const documentNode = new DOMParser().parseFromString(
    safeHtml(html),
    'text/html',
  );
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
    if (!(node instanceof HTMLElement)) return '';
    const inner = Array.from(node.childNodes).map(walk).join('');
    switch (node.tagName) {
      case 'H1':
        return `# ${inner}\n\n`;
      case 'H2':
        return `## ${inner}\n\n`;
      case 'H3':
        return `### ${inner}\n\n`;
      case 'H4':
        return `#### ${inner}\n\n`;
      case 'P':
      case 'DIV':
        return `${inner}\n\n`;
      case 'BR':
        return '\n';
      case 'B':
      case 'STRONG':
        return `**${inner}**`;
      case 'I':
      case 'EM':
        return `*${inner}*`;
      case 'S':
      case 'STRIKE':
        return `~~${inner}~~`;
      case 'U':
        return `<u>${inner}</u>`;
      case 'BLOCKQUOTE':
        return `${inner
          .trim()
          .split('\n')
          .map((line) => `> ${line}`)
          .join('\n')}\n\n`;
      case 'PRE':
        return `\`\`\`\n${node.textContent ?? ''}\n\`\`\`\n\n`;
      case 'CODE':
        return `\`${inner}\``;
      case 'A':
        return `[${inner}](${node.getAttribute('href') ?? ''})`;
      case 'IMG':
        return `![${node.getAttribute('alt') ?? '图片'}](${node.getAttribute('src') ?? ''})`;
      case 'LI':
        return `${inner.trim()}\n`;
      case 'UL':
        return `${Array.from(node.children)
          .map((item) => `- ${walk(item).trim()}`)
          .join('\n')}\n\n`;
      case 'OL':
        return `${Array.from(node.children)
          .map((item, index) => `${index + 1}. ${walk(item).trim()}`)
          .join('\n')}\n\n`;
      case 'HR':
        return '---\n\n';
      case 'TABLE': {
        const rows = Array.from(node.querySelectorAll('tr')).map((row) =>
          Array.from(row.children).map((cell) =>
            (cell.textContent ?? '').trim().replace(/\|/g, '\\|'),
          ),
        );
        if (!rows.length) return '';
        const width = Math.max(...rows.map((row) => row.length));
        const normalized = rows.map((row) => [
          ...row,
          ...Array(Math.max(0, width - row.length)).fill(''),
        ]);
        return `${normalized
          .map((row) => `| ${row.join(' | ')} |`)
          .flatMap((row, index) =>
            index === 0
              ? [row, `| ${Array(width).fill('---').join(' | ')} |`]
              : [row],
          )
          .join('\n')}\n\n`;
      }
      default:
        return inner;
    }
  };
  return walk(documentNode.body)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function markdownInline(value: string) {
  const code: string[] = [];
  let output = escapeHtml(value).replace(/`([^`]+)`/g, (_, content: string) => {
    code.push(`<code>${content}</code>`);
    return `%%CODE${code.length - 1}%%`;
  });
  output = output
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/~~([^~]+)~~/g, '<s>$1</s>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  return output.replace(/%%CODE(\d+)%%/g, (_, index: string) => code[Number(index)] ?? '');
}

function markdownToHtml(markdown: string) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const output: string[] = [];
  for (let index = 0; index < lines.length; ) {
    const line = lines[index];
    if (line.trim().startsWith('```')) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }
    if (
      line.includes('|') &&
      index + 1 < lines.length &&
      /^\s*\|?\s*:?-{3,}/.test(lines[index + 1])
    ) {
      const rows: string[][] = [];
      const cells = (row: string) =>
        row
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((cell) => cell.trim());
      rows.push(cells(line));
      index += 2;
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(cells(lines[index]));
        index += 1;
      }
      output.push(
        `<table><thead><tr>${rows[0].map((cell) => `<th>${markdownInline(cell)}</th>`).join('')}</tr></thead><tbody>${rows
          .slice(1)
          .map(
            (row) =>
              `<tr>${row.map((cell) => `<td>${markdownInline(cell)}</td>`).join('')}</tr>`,
          )
          .join('')}</tbody></table>`,
      );
      continue;
    }
    const listMatch = line.match(/^\s*(?:(- |\* )|(\d+\. ))(.+)$/);
    if (listMatch) {
      const ordered = Boolean(listMatch[2]);
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\s*(?:(- |\* )|(\d+\. ))(.+)$/);
        if (!item || Boolean(item[2]) !== ordered) break;
        items.push(`<li>${markdownInline(item[3])}</li>`);
        index += 1;
      }
      output.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }
    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      output.push('<hr>');
      index += 1;
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      output.push(`<h${level}>${markdownInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }
      output.push(`<blockquote>${quote.map(markdownInline).join('<br>')}</blockquote>`);
      continue;
    }
    if (!line.trim()) {
      index += 1;
      continue;
    }
    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^(#{1,4})\s|^```|^>|^\s*(?:-|\*|\d+\.)\s/.test(lines[index])) {
      paragraph.push(lines[index]);
      index += 1;
    }
    output.push(`<p>${paragraph.map(markdownInline).join('<br>')}</p>`);
  }
  return safeHtml(output.join(''));
}

function plainText(html: string) {
  const documentNode = new DOMParser().parseFromString(
    safeHtml(html),
    'text/html',
  );
  documentNode.querySelectorAll('br').forEach((node) => node.replaceWith('\n'));
  documentNode
    .querySelectorAll('p,div,h1,h2,h3,li,pre,blockquote,tr')
    .forEach((node) => node.append('\n'));
  return (documentNode.body.textContent ?? '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function inlineImages(html: string) {
  const documentNode = new DOMParser().parseFromString(
    safeHtml(html),
    'text/html',
  );
  await Promise.all(
    Array.from(documentNode.images).map(async (image) => {
      if (image.src.startsWith('data:')) return;
      const response = await fetch(image.src);
      if (!response.ok) throw new Error('图片读取失败，请重新登录或稍后再导出');
      image.src = await blobToDataUrl(await response.blob());
      image.removeAttribute('loading');
    }),
  );
  return documentNode.body.innerHTML;
}

function fileName(title: string, extension: string) {
  const safe = title.replace(/[\\/:*?"<>|]/g, '-').trim() || '未命名笔记';
  return `${safe}.${extension}`;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] ?? character,
  );
}

function documentHtml(title: string, content: string) {
  const safeTitle = escapeHtml(title || '未命名笔记');
  return `<!doctype html>
<html lang="zh-CN" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
  <meta charset="utf-8">
  <title>${safeTitle}</title>
  <style>
    @page { size: A4; margin: 22mm 20mm; }
    body { max-width: 760px; margin: 0 auto; color: #18342f; font: 16px/1.8 Arial, "Microsoft YaHei", sans-serif; }
    h1 { margin: 0 0 28px; font: 700 30px/1.35 Georgia, "Songti SC", serif; }
    h2 { margin: 24px 0 12px; font-size: 23px; }
    h3 { margin: 20px 0 10px; font-size: 19px; }
    p { margin: 0 0 12px; }
    blockquote { margin: 18px 0; padding: 10px 16px; border-left: 3px solid #d87345; background: #f4ede3; }
    pre { padding: 16px; overflow-wrap: anywhere; white-space: pre-wrap; color: #f6f0e6; background: #20332e; font: 13px/1.65 Consolas, monospace; }
    img { display: block; max-width: 100%; height: auto; margin: 20px auto; }
    table { width: 100%; border-collapse: collapse; margin: 18px 0; }
    th, td { padding: 8px 10px; border: 1px solid #c9c0b4; text-align: left; }
    th { background: #f4ede3; }
    hr { margin: 24px 0; border: 0; border-top: 1px solid #c9c0b4; }
    a { color: #b95e38; }
  </style>
</head>
<body><h1>${safeTitle}</h1>${content}</body>
</html>`;
}

function formatTime(value: number) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function QuickNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [revision, setRevision] = useState(0);
  const [message, setMessage] = useState('');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('md');
  const [focusMode, setFocusMode] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const markdownInputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const latestRef = useRef({ title: '', content: '' });
  const activeIdRef = useRef<number | null>(null);
  const dirtyRef = useRef(false);
  const transitionRef = useRef(false);
  const uploadRef = useRef(false);
  const saveQueue = useRef<Promise<boolean>>(Promise.resolve(true));
  const pendingSaves = useRef(0);
  dirtyRef.current = dirty;

  function loadNote(note: Note) {
    const clean = safeHtml(note.content);
    setActiveId(note.id);
    activeIdRef.current = note.id;
    setTitle(note.title);
    latestRef.current = { title: note.title, content: clean };
    setDirty(false);
    dirtyRef.current = false;
    selectionRef.current = null;
    setMessage('');
  }

  useLayoutEffect(() => {
    if (editorRef.current && activeId) {
      editorRef.current.innerHTML = latestRef.current.content;
    }
  }, [activeId]);

  async function readNotes() {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/notes');
      if (!response.ok) throw new Error();
      const rows = (await response.json()) as Note[];
      if (!Array.isArray(rows)) throw new Error('笔记格式无效');
      setNotes(rows);
      if (rows[0]) loadNote(rows[0]);
    } catch {
      setMessage('暂时无法读取笔记，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void readNotes();
  }, []);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current && !uploadRef.current && pendingSaves.current === 0)
        return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  useEffect(() => {
    if (!activeId || !dirty) return;
    const snapshot = latestRef.current;
    const timer = window.setTimeout(() => {
      void persist(activeId, snapshot, true);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [activeId, title, revision, dirty]);

  function persist(id: number, snapshot = latestRef.current, quiet = false) {
    // Serialize writes so a slow older request cannot overwrite newer input.
    const captured = { ...snapshot };
    pendingSaves.current += 1;
    setSaving(true);
    const job = saveQueue.current.then(async () => {
      if (!quiet) setMessage('');
      try {
        const response = await fetch('/api/notes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...captured }),
        });
        if (!response.ok) {
          const result = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(
            result.error ||
              (response.status === 401
                ? '登录已过期，请先导出备份，再重新登录'
                : '保存失败，请重试'),
          );
        }
        const saved = (await response.json()) as Note;
        setNotes((current) =>
          current.map((note) => (note.id === saved.id ? saved : note)),
        );
        if (
          activeIdRef.current === id &&
          latestRef.current.title === captured.title &&
          latestRef.current.content === captured.content
        ) {
          setDirty(false);
          dirtyRef.current = false;
        }
        if (!quiet && activeIdRef.current === id) setMessage('已保存');
        return true;
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '保存失败，请重试');
        return false;
      } finally {
        pendingSaves.current -= 1;
        setSaving(pendingSaves.current > 0);
      }
    });
    saveQueue.current = job;
    return job;
  }

  async function transition(action: () => Promise<void> | void) {
    if (transitionRef.current || uploadRef.current) return;
    transitionRef.current = true;
    setTransitioning(true);
    try {
      await saveQueue.current;
      if (
        activeIdRef.current &&
        dirtyRef.current &&
        !(await persist(activeIdRef.current))
      )
        return;
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败，请重试');
    } finally {
      transitionRef.current = false;
      setTransitioning(false);
    }
  }

  async function selectNote(note: Note) {
    if (note.id === activeIdRef.current) return;
    await transition(() => loadNote(note));
  }

  async function createNote() {
    await transition(async () => {
      setMessage('');
      try {
        const response = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: '未命名笔记', content: '' }),
        });
        if (!response.ok) throw new Error('新建失败，请重试');
        const note = (await response.json()) as Note;
        setNotes((current) => [note, ...current]);
        loadNote(note);
        requestAnimationFrame(() => editorRef.current?.focus());
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '新建失败，请重试');
      }
    });
  }

  async function deleteNote(note: Note) {
    if (transitionRef.current || uploadRef.current) return;
    if (!confirm(`确定删除“${note.title}”吗？`)) return;
    await transition(async () => {
      const response = await fetch(`/api/notes?id=${note.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        setMessage('删除失败，请重试');
        return;
      }
      const remaining = notes.filter((item) => item.id !== note.id);
      setNotes(remaining);
      if (activeId === note.id) {
        if (remaining[0]) loadNote(remaining[0]);
        else {
          setActiveId(null);
          activeIdRef.current = null;
          setTitle('');
          latestRef.current = { title: '', content: '' };
          setDirty(false);
        }
      }
    });
  }

  function updateTitle(value: string) {
    setTitle(value);
    latestRef.current = { ...latestRef.current, title: value };
    setRevision((current) => current + 1);
    setDirty(true);
    setMessage('');
  }

  function updateContent() {
    const value = safeHtml(editorRef.current?.innerHTML ?? '');
    latestRef.current = { ...latestRef.current, content: value };
    setRevision((current) => current + 1);
    setDirty(true);
    setMessage('');
  }

  function command(name: string, value?: string) {
    if (transitionRef.current) return;
    editorRef.current?.focus();
    document.execCommand(name, false, value);
    updateContent();
  }

  function insertTable() {
    const header = `<tr>${Array.from(
      { length: 3 },
      (_, column) => `<th>标题 ${column + 1}</th>`,
    ).join('')}</tr>`;
    const body = Array.from(
      { length: 2 },
      () => `<tr>${Array(3).fill('<td><br></td>').join('')}</tr>`,
    ).join('');
    command(
      'insertHTML',
      `<table><thead>${header}</thead><tbody>${body}</tbody></table><p><br></p>`,
    );
  }

  async function importMarkdown(file: File) {
    if (!activeIdRef.current || transitioning) return;
    if (file.size > 2 * 1024 * 1024) {
      setMessage('Markdown 文件需在 2MB 以内');
      return;
    }
    if (!confirm('导入会替换当前笔记正文，是否继续？')) return;
    try {
      const content = markdownToHtml(await file.text());
      if (!editorRef.current) return;
      editorRef.current.innerHTML = content;
      latestRef.current = { ...latestRef.current, content };
      if (!title.trim() || title === '未命名笔记') {
        updateTitle(file.name.replace(/\.(md|markdown|txt)$/i, ''));
      }
      setRevision((current) => current + 1);
      setDirty(true);
      setMessage('Markdown 已导入，将自动保存');
      requestAnimationFrame(() => editorRef.current?.focus());
    } catch {
      setMessage('Markdown 导入失败，请检查文件内容');
    } finally {
      if (markdownInputRef.current) markdownInputRef.current.value = '';
    }
  }

  function addLink() {
    const url = window.prompt('输入链接地址（https://…）');
    if (!url) return;
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    command('createLink', normalized);
  }

  function rememberSelection() {
    const selection = window.getSelection();
    if (
      selection?.rangeCount &&
      editorRef.current?.contains(selection.anchorNode)
    ) {
      selectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  }

  function chooseImage() {
    rememberSelection();
    imageInputRef.current?.click();
  }

  async function uploadImage(file: File) {
    if (uploadRef.current || transitionRef.current) return;
    const noteId = activeIdRef.current;
    const targetEditor = editorRef.current;
    const targetRange = selectionRef.current?.cloneRange();
    if (!file.type.startsWith('image/')) {
      setMessage('请选择 JPG、PNG、WebP 或 GIF 图片');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setMessage('图片大小需在 8MB 以内');
      return;
    }
    setUploading(true);
    uploadRef.current = true;
    setMessage('正在上传图片…');
    try {
      const form = new FormData();
      form.append('image', file);
      const response = await fetch('/api/note-images', {
        method: 'POST',
        body: form,
      });
      const result = (await response.json()) as {
        url?: string;
        error?: string;
      };
      if (!response.ok || !result.url) {
        throw new Error(result.error || '图片上传失败');
      }
      const editor = editorRef.current;
      if (
        !editor ||
        editor !== targetEditor ||
        activeIdRef.current !== noteId
      ) {
        throw new Error('笔记已切换，请在当前笔记重新插入图片');
      }
      const image = document.createElement('img');
      image.src = result.url;
      image.alt = file.name.replace(/\.[^.]+$/, '') || '笔记图片';
      editor.focus();
      const range = targetRange;
      if (range && editor.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        range.insertNode(image);
        range.setStartAfter(image);
        range.collapse(true);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      } else {
        editor.appendChild(image);
        editor.appendChild(document.createElement('p'));
      }
      selectionRef.current = null;
      updateContent();
      setMessage('图片已插入，将自动保存');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '图片上传失败');
    } finally {
      setUploading(false);
      uploadRef.current = false;
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  }

  async function exportNote() {
    if (!activeId || exporting || uploading) return;
    const snapshot = { ...latestRef.current };
    const format = exportFormat;
    const printWindow =
      format === 'pdf'
        ? window.open('', '_blank', 'width=900,height=1000')
        : null;
    if (format === 'pdf' && !printWindow) {
      setMessage('请允许浏览器打开打印窗口后再试');
      return;
    }
    if (printWindow) {
      printWindow.opener = null;
      printWindow.document.write(
        '<p style="font:16px sans-serif;padding:24px">正在准备 PDF…</p>',
      );
    }
    setMessage('正在准备导出文件…');
    setExporting(true);
    try {
      const clean = await inlineImages(snapshot.content);
      const richDocument = documentHtml(snapshot.title, clean);
      if (format === 'pdf' && printWindow) {
        printWindow.document.open();
        printWindow.document.write(richDocument);
        printWindow.document.close();
        printWindow.focus();
        await Promise.all(
          Array.from(printWindow.document.images).map((image) =>
            image.decode().catch(() => undefined),
          ),
        );
        await printWindow.document.fonts.ready;
        printWindow.print();
        setMessage('打印窗口已打开，请选择“另存为 PDF”');
        return;
      }
      if (format === 'docx') {
        const { htmlToDocx } = await import('@/components/note-docx');
        const url = URL.createObjectURL(await htmlToDocx(snapshot.title, clean));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName(snapshot.title, 'docx');
        anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessage('已导出可编辑的 Word 文件');
        return;
      }
      let body = `# ${snapshot.title || '未命名笔记'}\n\n${htmlToMarkdown(clean)}`;
      let type = 'text/markdown;charset=utf-8';
      if (format === 'txt') {
        body = `${snapshot.title || '未命名笔记'}\n\n${plainText(clean)}`;
        type = 'text/plain;charset=utf-8';
      } else if (format === 'html') {
        body = richDocument;
        type = 'text/html;charset=utf-8';
      }
      const url = URL.createObjectURL(new Blob([body], { type }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName(snapshot.title, format);
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(`已导出 ${format.toUpperCase()} 文件`);
    } catch (error) {
      printWindow?.close();
      setMessage(error instanceof Error ? error.message : '导出失败，请重试');
    } finally {
      setExporting(false);
    }
  }

  const active = notes.find((note) => note.id === activeId);
  const tools = [
    [Bold, '加粗', 'bold'],
    [Italic, '斜体', 'italic'],
    [Underline, '下划线', 'underline'],
    [Strikethrough, '删除线', 'strikeThrough'],
    [Heading1, '一级标题', 'formatBlock', 'H1'],
    [Heading2, '二级标题', 'formatBlock', 'H2'],
    [Heading3, '三级标题', 'formatBlock', 'H3'],
    [List, '无序列表', 'insertUnorderedList'],
    [ListOrdered, '有序列表', 'insertOrderedList'],
    [Quote, '引用', 'formatBlock', 'BLOCKQUOTE'],
    [Code2, '代码块', 'formatBlock', 'PRE'],
    [RemoveFormatting, '清除格式', 'removeFormat'],
    [Undo2, '撤销', 'undo'],
    [Redo2, '重做', 'redo'],
  ] as const;

  return (
    <div className={`quick-notes-shell${focusMode ? ' focus-mode' : ''}`}>
      <aside className="notes-sidebar">
        <div className="notes-sidebar-head">
          <div>
            <strong>全部笔记</strong>
            <span>{notes.length} 篇</span>
          </div>
          <button
            onClick={createNote}
            title="新建笔记"
            aria-label="新建笔记"
            disabled={loading || transitioning || uploading}
          >
            <Plus />
          </button>
        </div>
        <div className="notes-list">
          {loading ? (
            <p>正在打开笔记簿…</p>
          ) : notes.length === 0 ? (
            <button
              className="notes-empty"
              onClick={createNote}
              disabled={transitioning || uploading}
            >
              <Plus />
              <strong>写下第一条随手记</strong>
              <span>灵感、待办、复盘都可以记在这里</span>
            </button>
          ) : (
            notes.map((note) => (
              <button
                key={note.id}
                className={note.id === activeId ? 'active' : ''}
                onClick={() => void selectNote(note)}
                disabled={transitioning || uploading}
              >
                <strong>{note.title || '未命名笔记'}</strong>
                <span>
                  {plainText(note.content).slice(0, 44) || '空白笔记'}
                </span>
                <time>{formatTime(note.updated_at)}</time>
              </button>
            ))
          )}
        </div>
        {!activeId && message && (
          <div className="notes-read-error" role="alert">
            {message}
            <button
              onClick={() => void readNotes()}
              disabled={loading || transitioning}
            >
              重新读取
            </button>
          </div>
        )}
      </aside>

      <section className="note-workspace">
        {!active ? (
          <div className="note-blank">
            <div className="empty-icon">
              <Plus />
            </div>
            <strong>随手记下此刻的想法</strong>
            <span>新建笔记后即可开始编辑</span>
            <Button
              onClick={createNote}
              disabled={loading || transitioning || uploading}
            >
              <Plus /> 新建笔记
            </Button>
          </div>
        ) : (
          <>
            <div className="note-topline">
              <input
                className="note-title"
                aria-label="笔记标题"
                value={title}
                disabled={transitioning}
                maxLength={120}
                onChange={(event) => updateTitle(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                    event.preventDefault();
                    void persist(active.id);
                  }
                }}
                placeholder="未命名笔记"
              />
              <div className="note-actions">
                <select
                  aria-label="导出格式"
                  value={exportFormat}
                  onChange={(event) =>
                    setExportFormat(event.target.value as ExportFormat)
                  }
                >
                  <option value="md">Markdown</option>
                  <option value="txt">纯文本</option>
                  <option value="html">HTML</option>
                  <option value="pdf">PDF</option>
                  <option value="docx">Word (.docx)</option>
                </select>
                <Button
                  className="export-note"
                  variant="outline"
                  onClick={() => void exportNote()}
                  disabled={exporting || uploading || transitioning}
                >
                  <Download /> {exporting ? '导出中…' : '导出'}
                </Button>
                <Button
                  className="save-note"
                  onClick={() => void persist(active.id)}
                  disabled={saving || transitioning || !dirty}
                >
                  <Save /> {saving ? '保存中…' : dirty ? '保存' : '已保存'}
                </Button>
                <button
                  className="delete-note"
                  onClick={() => void deleteNote(active)}
                  title="删除笔记"
                  aria-label="删除笔记"
                  disabled={transitioning || uploading}
                >
                  <Trash2 />
                </button>
              </div>
            </div>

            <div className="note-toolbar" role="toolbar" aria-label="笔记格式">
              {tools.map(([Icon, label, name, value]) => (
                <button
                  key={label}
                  title={label}
                  aria-label={label}
                  disabled={transitioning}
                  onClick={(event) => {
                    if (event.detail === 0) command(name, value);
                  }}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    command(name, value);
                  }}
                >
                  <Icon />
                </button>
              ))}
              <button
                title="插入 3×3 表格"
                aria-label="插入 3×3 表格"
                disabled={transitioning}
                onMouseDown={(event) => {
                  event.preventDefault();
                  insertTable();
                }}
              >
                <Table2 />
              </button>
              <button
                title="插入分隔线"
                aria-label="插入分隔线"
                disabled={transitioning}
                onMouseDown={(event) => {
                  event.preventDefault();
                  command('insertHorizontalRule');
                }}
              >
                <Minus />
              </button>
              <button
                title="添加链接"
                aria-label="添加链接"
                disabled={transitioning}
                onClick={(event) => {
                  if (event.detail === 0) addLink();
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  addLink();
                }}
              >
                <Link2 />
              </button>
              <button
                title="导入 Markdown"
                aria-label="导入 Markdown"
                disabled={transitioning || uploading}
                onClick={() => markdownInputRef.current?.click()}
              >
                <FileUp />
              </button>
              <button
                title={focusMode ? '退出专注模式' : '专注模式'}
                aria-label={focusMode ? '退出专注模式' : '专注模式'}
                onClick={() => setFocusMode((current) => !current)}
              >
                {focusMode ? <Minimize2 /> : <Maximize2 />}
              </button>
              <button
                title={uploading ? '正在上传图片' : '插入图片'}
                aria-label="插入图片"
                disabled={uploading || transitioning}
                onClick={(event) => {
                  if (event.detail === 0) chooseImage();
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  chooseImage();
                }}
              >
                <ImagePlus />
              </button>
              <input
                ref={imageInputRef}
                className="note-image-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadImage(file);
                }}
              />
              <input
                ref={markdownInputRef}
                className="note-markdown-input"
                type="file"
                accept=".md,.markdown,.txt,text/markdown,text/plain"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importMarkdown(file);
                }}
              />
            </div>

            <div
              key={active.id}
              ref={editorRef}
              className="note-editor"
              contentEditable={!transitioning}
              role="textbox"
              aria-label="笔记正文"
              aria-multiline="true"
              suppressContentEditableWarning
              data-placeholder="从这里开始写……"
              onInput={updateContent}
              onDragOver={(event) => {
                if (event.dataTransfer.types.includes('Files'))
                  event.preventDefault();
              }}
              onDrop={(event) => {
                if (!event.dataTransfer.files.length) return;
                event.preventDefault();
                const image = Array.from(event.dataTransfer.files).find(
                  (file) => file.type.startsWith('image/'),
                );
                if (!image) {
                  setMessage('请拖入 JPG、PNG、WebP 或 GIF 图片');
                  return;
                }
                rememberSelection();
                void uploadImage(image);
              }}
              onPaste={(event) => {
                const image = Array.from(event.clipboardData.files).find(
                  (file) => file.type.startsWith('image/'),
                );
                if (!image) {
                  const html = event.clipboardData.getData('text/html');
                  if (html) {
                    event.preventDefault();
                    command('insertHTML', safeHtml(html));
                  }
                  return;
                }
                event.preventDefault();
                rememberSelection();
                void uploadImage(image);
              }}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                  event.preventDefault();
                  void persist(active.id);
                }
              }}
            />
            <div className="note-editor-meta">
              {plainText(latestRef.current.content).replace(/\s/g, '').length} 字 ·{' '}
              {plainText(latestRef.current.content)
                .trim()
                .split(/\s+/)
                .filter(Boolean).length}{' '}
              词 · {formatTime(active.updated_at)} 更新
            </div>
            <div className="note-status">
              <span role="status" aria-live="polite">
                {message ||
                  (saving
                    ? '正在保存…'
                    : dirty
                      ? '有未保存的修改'
                      : '内容已同步')}
              </span>
              <span>
                Ctrl / ⌘ + S 保存 · 编辑能力参考{' '}
                <a href="https://github.com/genspark-ai/genoffice" target="_blank" rel="noreferrer">
                  GenOffice
                </a>
              </span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
