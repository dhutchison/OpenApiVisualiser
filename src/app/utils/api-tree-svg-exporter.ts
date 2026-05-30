import { TreeNode } from 'primeng/api';

interface OperationExportTreeNode extends TreeNode {
  method?: string;
  type?: string;
}

interface SvgExportNode {
  children: SvgExportNode[];
  height: number;
  isOperation: boolean;
  label: string;
  method: string;
  subtreeHeight: number;
  width: number;
  x: number;
  y: number;
}

interface SvgExportLayout {
  hasVirtualRoot: boolean;
  height: number;
  width: number;
}

interface SvgNodePalette {
  fill: string;
  stroke: string;
  text: string;
}

interface SvgExportPalette {
  background: string;
  line: string;
  methods: Record<string, SvgNodePalette>;
  operationFallback: SvgNodePalette;
  path: SvgNodePalette;
}

export interface ApiTreeSvgExportOptions {
  background?: string;
  cssVar?: (name: string, fallback: string) => string;
  metadata?: string[];
  measureText?: (text: string, font: string) => number;
}

const SVG_EXPORT_LAYOUT = {
  fontFamily: 'Inter, Arial, sans-serif',
  fontSize: 14,
  fontWeight: 800,
  levelGap: 72,
  lineHeight: 18,
  nodePaddingX: 16,
  nodePaddingY: 10,
  pagePadding: 24,
  metadataGap: 18,
  metadataLineHeight: 18,
  metadataFontSize: 13,
  metadataFontWeight: 700,
  rootRailGap: 32,
  siblingGap: 18
};

export function createApiTreeSvg(nodes: TreeNode[], options: ApiTreeSvgExportOptions = {}): string {
  const palette = createSvgPalette(options);
  const sourceNodes = getSvgExportSourceNodes(nodes);
  const roots = sourceNodes.map(node => createSvgExportNode(node, options));
  const metadata = options.metadata?.filter(line => line.trim().length > 0) ?? [];
  const metadataHeight = getSvgMetadataHeight(metadata);
  const layout = layoutSvgExportNodes(roots, metadataHeight, metadata, options);
  const connectors = renderSvgConnectors(roots, layout.hasVirtualRoot, palette);
  const renderedNodes = roots.map(node => renderSvgNodes(node, palette)).join('');
  const renderedMetadata = renderSvgMetadata(metadata, palette);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}">`,
    '<defs>',
    '<filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="160%">',
    '<feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000000" flood-opacity="0.22"/>',
    '</filter>',
    '</defs>',
    `<rect width="100%" height="100%" fill="${escapeSvgAttribute(palette.background)}"/>`,
    renderedMetadata,
    connectors,
    renderedNodes,
    '</svg>'
  ].join('');
}

function getSvgExportSourceNodes(nodes: TreeNode[]): TreeNode[] {
  if (nodes.length === 1 && nodes[0].label === '/' && nodes[0].children) {
    return nodes[0].children;
  }

  return nodes;
}

function createSvgExportNode(treeNode: TreeNode, options: ApiTreeSvgExportOptions): SvgExportNode {
  const operationNode = treeNode as OperationExportTreeNode;
  const isOperation = operationNode.type === 'operation';
  const label = String(treeNode.label ?? '');
  const measuredWidth = measureSvgText(label, options) + (SVG_EXPORT_LAYOUT.nodePaddingX * 2);
  const width = Math.max(Math.ceil(measuredWidth), isOperation ? 86 : 96);
  const height = Math.ceil(SVG_EXPORT_LAYOUT.lineHeight + (SVG_EXPORT_LAYOUT.nodePaddingY * 2));
  const children = treeNode.expanded === false
    ? []
    : (treeNode.children ?? []).map(child => createSvgExportNode(child, options));

  return {
    children,
    height,
    isOperation,
    label,
    method: operationNode.method?.toLowerCase() ?? label.toLowerCase(),
    subtreeHeight: height,
    width,
    x: 0,
    y: 0
  };
}

function layoutSvgExportNodes(
  roots: SvgExportNode[],
  topOffset = 0,
  metadata: string[] = [],
  options: ApiTreeSvgExportOptions = {}
): SvgExportLayout {
  const { pagePadding, rootRailGap, siblingGap } = SVG_EXPORT_LAYOUT;
  const startX = pagePadding + (roots.length > 1 ? rootRailGap : 0);
  let currentY = pagePadding + topOffset;
  let maxX = startX;

  roots.forEach(root => calculateSvgSubtreeHeight(root));
  roots.forEach(root => {
    positionSvgNode(root, startX, currentY);
    maxX = Math.max(maxX, getSvgMaxX(root));
    currentY += root.subtreeHeight + siblingGap;
  });

  return {
    hasVirtualRoot: roots.length > 1,
    height: Math.ceil(Math.max(currentY - siblingGap + pagePadding, pagePadding * 2)),
    width: Math.ceil(Math.max(maxX + pagePadding, getSvgMetadataWidth(metadata, options)))
  };
}

function calculateSvgSubtreeHeight(node: SvgExportNode): number {
  if (node.children.length === 0) {
    node.subtreeHeight = node.height;
    return node.subtreeHeight;
  }

  const childrenHeight = node.children.reduce((total, child, index) => {
    return total + calculateSvgSubtreeHeight(child) + (index > 0 ? SVG_EXPORT_LAYOUT.siblingGap : 0);
  }, 0);

  node.subtreeHeight = Math.max(node.height, childrenHeight);
  return node.subtreeHeight;
}

function positionSvgNode(node: SvgExportNode, x: number, subtreeTop: number) {
  node.x = x;
  node.y = subtreeTop + ((node.subtreeHeight - node.height) / 2);

  const childX = node.x + node.width + SVG_EXPORT_LAYOUT.levelGap;
  let childTop = subtreeTop;

  node.children.forEach(child => {
    positionSvgNode(child, childX, childTop);
    childTop += child.subtreeHeight + SVG_EXPORT_LAYOUT.siblingGap;
  });
}

function getSvgMaxX(node: SvgExportNode): number {
  return Math.max(
    node.x + node.width,
    ...node.children.map(child => getSvgMaxX(child))
  );
}

function renderSvgConnectors(roots: SvgExportNode[], hasVirtualRoot: boolean, palette: SvgExportPalette): string {
  const connectors = roots.flatMap(root => renderSvgNodeConnectors(root, palette));

  if (hasVirtualRoot && roots.length > 0) {
    const railX = SVG_EXPORT_LAYOUT.pagePadding;
    const firstCenter = getSvgNodeCenterY(roots[0]);
    const lastCenter = getSvgNodeCenterY(roots[roots.length - 1]);

    connectors.unshift(
      `<path d="M ${railX} ${firstCenter} V ${lastCenter}" fill="none" stroke="${escapeSvgAttribute(palette.line)}" stroke-width="1"/>`,
      ...roots.map(root => `<path d="M ${railX} ${getSvgNodeCenterY(root)} H ${root.x}" fill="none" stroke="${escapeSvgAttribute(palette.line)}" stroke-width="1"/>`)
    );
  }

  return connectors.join('');
}

function renderSvgNodeConnectors(node: SvgExportNode, palette: SvgExportPalette): string[] {
  const connectors = node.children.flatMap(child => renderSvgNodeConnectors(child, palette));

  if (node.children.length === 0) {
    return connectors;
  }

  const startX = node.x + node.width;
  const startY = getSvgNodeCenterY(node);
  const elbowX = startX + (SVG_EXPORT_LAYOUT.levelGap / 2);
  const firstChildCenter = getSvgNodeCenterY(node.children[0]);
  const lastChildCenter = getSvgNodeCenterY(node.children[node.children.length - 1]);
  const childX = node.children[0].x;
  const line = escapeSvgAttribute(palette.line);

  connectors.unshift(`<path d="M ${startX} ${startY} H ${elbowX} V ${firstChildCenter}" fill="none" stroke="${line}" stroke-width="1"/>`);

  if (node.children.length > 1) {
    connectors.unshift(`<path d="M ${elbowX} ${firstChildCenter} V ${lastChildCenter}" fill="none" stroke="${line}" stroke-width="1"/>`);
  }

  node.children.forEach(child => {
    connectors.unshift(`<path d="M ${elbowX} ${getSvgNodeCenterY(child)} H ${childX}" fill="none" stroke="${line}" stroke-width="1"/>`);
  });

  return connectors;
}

function renderSvgNode(node: SvgExportNode, palette: SvgExportPalette): string {
  const nodePalette = getSvgNodePalette(node, palette);
  const rx = node.height / 2;
  const textX = node.x + SVG_EXPORT_LAYOUT.nodePaddingX;
  const textY = node.y + (node.height / 2) + (SVG_EXPORT_LAYOUT.fontSize * 0.36);

  return [
    '<g filter="url(#nodeShadow)">',
    `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${rx}" fill="${escapeSvgAttribute(nodePalette.fill)}" stroke="${escapeSvgAttribute(nodePalette.stroke)}" stroke-width="1"/>`,
    `<text x="${textX}" y="${textY}" fill="${escapeSvgAttribute(nodePalette.text)}" font-family="${escapeSvgAttribute(SVG_EXPORT_LAYOUT.fontFamily)}" font-size="${SVG_EXPORT_LAYOUT.fontSize}" font-weight="${SVG_EXPORT_LAYOUT.fontWeight}">${escapeSvgText(node.label)}</text>`,
    '</g>'
  ].join('');
}

function renderSvgNodes(node: SvgExportNode, palette: SvgExportPalette): string {
  return [
    renderSvgNode(node, palette),
    ...node.children.map(child => renderSvgNodes(child, palette))
  ].join('');
}

function renderSvgMetadata(lines: string[], palette: SvgExportPalette): string {
  if (lines.length === 0) {
    return '';
  }

  const { metadataFontSize, metadataFontWeight, metadataLineHeight, pagePadding } = SVG_EXPORT_LAYOUT;

  return [
    '<g>',
    ...lines.map((line, index) => {
      const y = pagePadding + metadataFontSize + (index * metadataLineHeight);

      return `<text x="${pagePadding}" y="${y}" fill="${escapeSvgAttribute(palette.path.text)}" font-family="${escapeSvgAttribute(SVG_EXPORT_LAYOUT.fontFamily)}" font-size="${metadataFontSize}" font-weight="${metadataFontWeight}">${escapeSvgText(line)}</text>`;
    }),
    '</g>'
  ].join('');
}

function getSvgMetadataHeight(lines: string[]): number {
  if (lines.length === 0) {
    return 0;
  }

  return (lines.length * SVG_EXPORT_LAYOUT.metadataLineHeight) + SVG_EXPORT_LAYOUT.metadataGap;
}

function getSvgMetadataWidth(lines: string[], options: ApiTreeSvgExportOptions): number {
  if (lines.length === 0) {
    return 0;
  }

  const font = `${SVG_EXPORT_LAYOUT.metadataFontWeight} ${SVG_EXPORT_LAYOUT.metadataFontSize}px ${SVG_EXPORT_LAYOUT.fontFamily}`;
  const textWidth = Math.max(...lines.map(line => options.measureText
    ? options.measureText(line, font)
    : line.length * SVG_EXPORT_LAYOUT.metadataFontSize * 0.62));

  return textWidth + (SVG_EXPORT_LAYOUT.pagePadding * 2);
}

function getSvgNodePalette(node: SvgExportNode, palette: SvgExportPalette) {
  if (!node.isOperation) {
    return palette.path;
  }

  return palette.methods[node.method] ?? palette.operationFallback;
}

function getSvgNodeCenterY(node: SvgExportNode): number {
  return node.y + (node.height / 2);
}

function measureSvgText(text: string, options: ApiTreeSvgExportOptions): number {
  if (options.measureText) {
    return options.measureText(text, `${SVG_EXPORT_LAYOUT.fontWeight} ${SVG_EXPORT_LAYOUT.fontSize}px ${SVG_EXPORT_LAYOUT.fontFamily}`);
  }

  return text.length * SVG_EXPORT_LAYOUT.fontSize * 0.62;
}

function createSvgPalette(options: ApiTreeSvgExportOptions): SvgExportPalette {
  const cssVar = options.cssVar ?? ((_name: string, fallback: string) => fallback);

  return {
    background: options.background ?? cssVar('--app-surface-solid', '#1b1f1b'),
    line: cssVar('--app-line', '#6d7d69'),
    methods: {
      delete: {
        fill: '#351f23',
        stroke: '#f93e3e',
        text: '#f93e3e'
      },
      get: {
        fill: '#1f3344',
        stroke: '#61affe',
        text: '#61affe'
      },
      post: {
        fill: '#173a2a',
        stroke: '#49cc90',
        text: '#49cc90'
      },
      put: {
        fill: '#3f2f18',
        stroke: '#fca130',
        text: '#fca130'
      }
    },
    operationFallback: {
      fill: cssVar('--app-surface-muted', '#20251f'),
      stroke: cssVar('--app-border-strong', '#66735f'),
      text: cssVar('--app-text', '#f5f5ef')
    },
    path: {
      fill: cssVar('--app-surface-solid', '#1b1f1b'),
      stroke: cssVar('--app-border-strong', '#66735f'),
      text: cssVar('--app-text', '#f5f5ef')
    }
  };
}

function escapeSvgText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeSvgAttribute(value: string): string {
  return escapeSvgText(value)
    .replace(/"/g, '&quot;');
}
