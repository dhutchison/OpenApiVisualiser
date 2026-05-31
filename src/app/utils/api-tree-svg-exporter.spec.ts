import { TreeNode } from 'primeng/api';

import { createApiTreeSvg } from './api-tree-svg-exporter';

describe('createApiTreeSvg', () => {
  it('renders SVG primitives without foreignObject DOM capture', () => {
    const nodes: TreeNode[] = [
      {
        label: '/',
        leaf: false,
        expanded: true,
        children: [
          {
            label: '/pets',
            leaf: false,
            expanded: true,
            children: [
              {
                label: 'GET',
                leaf: true,
                type: 'operation',
                method: 'GET'
              } as TreeNode
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
    const nodes: TreeNode[] = [
      {
        label: '/pets & <cats>',
        leaf: true
      }
    ];

    const svg = createApiTreeSvg(nodes, {
      measureText: text => text.length * 8
    });

    expect(svg).toContain('/pets &amp; &lt;cats&gt;');
    expect(svg).not.toContain('/pets & <cats>');
  });

  it('does not render collapsed child nodes', () => {
    const nodes: TreeNode[] = [
      {
        label: '/pets',
        leaf: false,
        expanded: false,
        children: [
          {
            label: 'GET',
            leaf: true,
            type: 'operation',
            method: 'GET'
          } as TreeNode
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
    const nodes: TreeNode[] = [
      {
        label: '/pets',
        leaf: true
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
