import { ApiPathTreeNode } from '../models/hierarchy.models';
import { createApiTreeSvg } from './api-tree-svg-exporter';

describe('createApiTreeSvg', () => {
  it('renders SVG primitives without foreignObject DOM capture', () => {
    const nodes: ApiPathTreeNode[] = [
      {
        kind: 'path',
        label: '/',
        leaf: false,
        expanded: true,
        children: [
          {
            kind: 'path',
            label: '/pets',
            leaf: false,
            expanded: true,
            children: [
              {
                kind: 'operation',
                label: 'GET',
                leaf: true,
                children: [],
                tooltip: '',
                method: 'GET',
                path: '/pets',
                operation: {responses: {}},
                apiDefinition: {
                  openapi: '3.1.0',
                  info: {title: 'Pets', version: '1.0.0'},
                  paths: {}
                },
                scopeId: 'assessment-scope:test',
                assessmentKey: 'assessment-scope:test:get:/pets',
                assessmentState: 'Pending'
              }
            ]
          }
        ]
      }
    ];

    const svg = createApiTreeSvg(nodes, {
      background: '#101410',
      cssVar: (_name, fallback) => fallback,
      measureText: text => text.length * 8
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('<rect');
    expect(svg).toContain('<path');
    expect(svg).toContain('/pets');
    expect(svg).toContain('GET');
    expect(svg).not.toContain('foreignObject');
  });

  it('escapes labels before writing SVG text', () => {
    const nodes: ApiPathTreeNode[] = [
      {
        kind: 'path',
        label: '/pets & <cats>',
        leaf: false,
        expanded: true,
        children: []
      }
    ];

    const svg = createApiTreeSvg(nodes, {
      measureText: text => text.length * 8
    });

    expect(svg).toContain('/pets &amp; &lt;cats&gt;');
    expect(svg).not.toContain('/pets & <cats>');
  });

  it('does not render collapsed child nodes', () => {
    const nodes: ApiPathTreeNode[] = [
      {
        kind: 'path',
        label: '/pets',
        leaf: false,
        expanded: false,
        children: [
          {
            kind: 'operation',
            label: 'GET',
            leaf: true,
            children: [],
            tooltip: '',
            method: 'GET',
            path: '/pets',
            operation: {responses: {}},
            apiDefinition: {
              openapi: '3.1.0',
              info: {title: 'Pets', version: '1.0.0'},
              paths: {}
            },
            scopeId: 'assessment-scope:test',
            assessmentKey: 'assessment-scope:test:get:/pets',
            assessmentState: 'Pending'
          }
        ]
      }
    ];

    const svg = createApiTreeSvg(nodes, {
      measureText: text => text.length * 8
    });

    expect(svg).toContain('/pets');
    expect(svg).not.toContain('GET');
  });

  it('renders metadata above the tree', () => {
    const nodes: ApiPathTreeNode[] = [
      {
        kind: 'path',
        label: '/pets',
        leaf: false,
        expanded: true,
        children: []
      }
    ];

    const svg = createApiTreeSvg(nodes, {
      measureText: text => text.length * 8,
      metadata: ['Sort: A-Z', 'Tags: pets, Untagged']
    });

    expect(svg).toContain('Sort: A-Z');
    expect(svg).toContain('Tags: pets, Untagged');
    expect(svg.indexOf('Sort: A-Z')).toBeLessThan(svg.indexOf('/pets'));
  });

  it('escapes SVG metadata text', () => {
    const svg = createApiTreeSvg([], {
      metadata: ['Tags: pets & <admin>']
    });

    expect(svg).toContain('Tags: pets &amp; &lt;admin&gt;');
    expect(svg).not.toContain('Tags: pets & <admin>');
  });

  it('uses method palettes, fallback palettes, and escaped backgrounds', () => {
    const operation = (method: string, label: string) => ({
      kind: 'operation',
      label,
      leaf: true,
      children: [],
      method,
      path: '/pets',
      operation: {responses: {}},
      apiDefinition: {
        openapi: '3.1.0',
        info: {title: 'Pets', version: '1.0.0'},
        paths: {}
      },
      scopeId: 'assessment-scope:test',
      assessmentKey: 'assessment-scope:test:get:/pets',
      assessmentState: 'Pending'
    } as any);

    const svg = createApiTreeSvg([
      operation('DELETE', 'DELETE'),
      operation('POST', 'POST'),
      operation('PUT', 'PUT'),
      operation('OPTIONS', 'OPTIONS')
    ], {
      background: '#1b1f1b"&',
      cssVar: (_name, fallback) => fallback
    });

    expect(svg).toContain('fill="#1b1f1b&quot;&amp;"');
    expect(svg).toContain('stroke="#f93e3e"');
    expect(svg).toContain('stroke="#49cc90"');
    expect(svg).toContain('stroke="#fca130"');
    expect(svg).toContain('stroke="#66735f"');
  });

  it('renders an empty SVG when there are no tree nodes', () => {
    const svg = createApiTreeSvg([]);

    expect(svg).toContain('<svg');
    expect(svg).toContain('width="48"');
    expect(svg).toContain('height="48"');
    expect(svg).not.toContain('<path');
  });
});
