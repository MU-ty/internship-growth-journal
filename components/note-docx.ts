import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

type TextStyle = {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  strike?: boolean;
};

function dataUrlBytes(source: string) {
  const match = source.match(/^data:image\/(png|jpe?g|gif);base64,(.+)$/i);
  if (!match) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return {
    bytes,
    type: match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase(),
  };
}

function imageSize(source: string) {
  return new Promise<{ width: number; height: number }>((resolve) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 560 / image.naturalWidth, 440 / image.naturalHeight);
      resolve({
        width: Math.max(1, Math.round(image.naturalWidth * scale)),
        height: Math.max(1, Math.round(image.naturalHeight * scale)),
      });
    };
    image.onerror = () => resolve({ width: 480, height: 300 });
    image.src = source;
  });
}

function inlineRuns(
  node: Node,
  style: TextStyle = {},
): Array<TextRun | ExternalHyperlink> {
  if (node.nodeType === Node.TEXT_NODE) {
    return [
      new TextRun({
        text: node.textContent ?? '',
        bold: style.bold,
        italics: style.italics,
        underline: style.underline ? {} : undefined,
        strike: style.strike,
      }),
    ];
  }
  if (!(node instanceof HTMLElement)) return [];
  const next = { ...style };
  if (node.matches('strong,b')) next.bold = true;
  if (node.matches('em,i')) next.italics = true;
  if (node.matches('u')) next.underline = true;
  if (node.matches('s,strike')) next.strike = true;
  if (node.tagName === 'BR') return [new TextRun({ break: 1 })];
  const children = Array.from(node.childNodes).flatMap((child) =>
    inlineRuns(child, next),
  );
  if (node.tagName === 'A' && node.getAttribute('href')) {
    return [
      new ExternalHyperlink({
        link: node.getAttribute('href') ?? '',
        children: [
          new TextRun({
            text: node.textContent ?? node.getAttribute('href') ?? '',
            style: 'Hyperlink',
            bold: next.bold,
            italics: next.italics,
            underline: next.underline ? {} : undefined,
            strike: next.strike,
          }),
        ],
      }),
    ];
  }
  return children;
}

function textParagraph(element: HTMLElement, options: Record<string, unknown> = {}) {
  const children = Array.from(element.childNodes).flatMap((node) =>
    inlineRuns(node),
  );
  return new Paragraph({ children: children.length ? children : [new TextRun('')], ...options });
}

async function imageParagraph(image: HTMLImageElement) {
  const source = image.getAttribute('src') ?? '';
  const payload = dataUrlBytes(source);
  if (!payload) return textParagraph(image);
  const size = await imageSize(source);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new ImageRun({
        data: payload.bytes,
        type: payload.type as 'png' | 'jpg' | 'gif',
        transformation: size,
        altText: {
          title: image.alt || '笔记图片',
          description: image.alt || '笔记图片',
          name: image.alt || '笔记图片',
        },
      }),
    ],
  });
}

async function block(element: HTMLElement, listPrefix = ''): Promise<Paragraph | Table> {
  if (element instanceof HTMLImageElement) return imageParagraph(element);
  if (element.tagName === 'TABLE') {
    const rows = Array.from(element.querySelectorAll(':scope > thead > tr, :scope > tbody > tr, :scope > tr'));
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: rows.map(
        (row) =>
          new TableRow({
            children: Array.from(row.children).map(
              (cell) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: cell.textContent ?? '',
                          bold: cell.tagName === 'TH',
                        }),
                      ],
                    }),
                  ],
                }),
            ),
          }),
      ),
    });
  }
  if (element.tagName === 'HR') {
    return new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'C9C0B4' } },
      spacing: { before: 160, after: 160 },
    });
  }
  const heading =
    element.tagName === 'H1'
      ? HeadingLevel.HEADING_1
      : element.tagName === 'H2'
        ? HeadingLevel.HEADING_2
        : element.tagName === 'H3'
          ? HeadingLevel.HEADING_3
          : undefined;
  const isCode = element.tagName === 'PRE';
  return textParagraph(element, {
    heading,
    indent: element.tagName === 'BLOCKQUOTE' ? { left: 420 } : undefined,
    shading: isCode ? { fill: '20332E' } : undefined,
    spacing: { after: 120 },
    ...(listPrefix
      ? {
          children: [
            new TextRun({ text: listPrefix, bold: true }),
            ...Array.from(element.childNodes).flatMap((node) => inlineRuns(node)),
          ],
        }
      : {}),
  });
}

async function documentChildren(html: string) {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const children: Array<Paragraph | Table> = [];
  for (const element of Array.from(parsed.body.children)) {
    if (!(element instanceof HTMLElement)) continue;
    if (element.matches('ul,ol')) {
      const ordered = element.tagName === 'OL';
      const items = Array.from(element.children).filter((item) => item.tagName === 'LI');
      for (let index = 0; index < items.length; index += 1) {
        children.push(await block(items[index] as HTMLElement, ordered ? `${index + 1}. ` : '• '));
      }
      continue;
    }
    children.push(await block(element));
  }
  return children;
}

export async function htmlToDocx(title: string, html: string) {
  const safeTitle = title.trim() || '未命名笔记';
  const document = new Document({
    creator: '实习收获簿',
    title: safeTitle,
    description: '由实习收获簿随手记导出',
    styles: {
      default: {
        document: {
          run: { font: 'Microsoft YaHei', size: 22, color: '18342F' },
          paragraph: { spacing: { line: 360 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } },
        },
        children: [
          new Paragraph({
            text: safeTitle,
            heading: HeadingLevel.TITLE,
            spacing: { after: 360 },
          }),
          ...(await documentChildren(html)),
        ],
      },
    ],
  });
  return Packer.toBlob(document);
}
