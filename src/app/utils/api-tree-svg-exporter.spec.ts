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
                complexity: 0
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
            complexity: 0
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
});
