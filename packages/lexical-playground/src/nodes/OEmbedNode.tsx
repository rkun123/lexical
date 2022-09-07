/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  ElementFormatType,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  Spread,
} from 'lexical';

import {BlockWithAlignableContents} from '@lexical/react/LexicalBlockWithAlignableContents';
import {
  DecoratorBlockNode,
  SerializedDecoratorBlockNode,
} from '@lexical/react/LexicalDecoratorBlockNode';
import {findProvider} from 'oembed-parser';
import * as React from 'react';
import {useEffect, useState} from 'react';

interface OEmbedBase {
  version: string;
  title: string;
  author_name: string;
  author_url: string;
  provider_name: string;
  provider_url: string;
}

export interface OEmbedPhoto extends OEmbedBase {
  type: 'photo';
  url: string;
  width: number;
  height: number;
}

export interface OEmbedVideo extends OEmbedBase {
  type: 'video';
  html: string;
  width: number;
  height: number;
}

export interface OEmbedLink extends OEmbedBase {
  type: 'link';
}

export interface OEmbedRich extends OEmbedBase {
  type: 'rich';
  html: string;
  width: number;
  height: number;
}

export type OEmbedData = OEmbedPhoto | OEmbedVideo | OEmbedLink | OEmbedRich;

type OEmbedComponentProps = Readonly<{
  className: Readonly<{
    base: string;
    focus: string;
  }>;
  format: ElementFormatType | null;
  loadingComponent?: JSX.Element | string;
  nodeKey: NodeKey;
  onError?: (error: string) => void;
  onLoad?: () => void;
  url?: string;
}>;

function convertOEmbedElement(
  domNode: HTMLDivElement,
): DOMConversionOutput | null {
  const url = domNode.getAttribute('data-lexical-oembed-url');
  if (url) {
    const node = $createOEmbedNode(url);
    return {node};
  }
  return null;
}

function renderPhoto(data: OEmbedPhoto) {
  return <img src={data.url} width={data.width} height={data.height} />;
}

function renderVideo(data: OEmbedVideo) {
  const el = document.createElement('div');
  el.innerHTML = data.html;
  return el;
}

function renderLink(data: OEmbedLink, url: string) {
  return <a href={url}>{data.title}</a>;
}

function renderRich(data: OEmbedRich) {
  const el = document.createElement('div');
  el.innerHTML = data.html;
  return <div dangerouslySetInnerHTML={{__html: data.html}} />;
}

function OEmbedComponent({
  className,
  format,
  loadingComponent = 'Loading...',
  nodeKey,
  onError,
  onLoad,
  url,
}: OEmbedComponentProps) {
  const [isLoading, setIsLoading] = useState(false);

  const [oembedData, setOEmbedData] = useState<OEmbedData | undefined>(
    undefined,
  );

  useEffect(() => {
    (async () => {
      if (!url) return;
      try {
        setIsLoading(true);

        const result = findProvider(url);
        if (!result) {
          console.error('result is', result);
          return;
        }
        const endpoint = result.fetchEndpoint;
        const params = new URLSearchParams({format: 'json', url});
        const res = await fetch(
          'https://cors.deno.dev/' + endpoint + '?' + params.toString(),
          {},
        );
        const data = await res.json();
        setIsLoading(false);

        setOEmbedData(data as OEmbedData);
      } catch (e: unknown) {
        if (e instanceof Error) {
          console.error(e);
        }
      }
    })();
  }, [url]);

  const renderEmbed = React.useCallback(() => {
    if (!url || isLoading || !oembedData) return loadingComponent;
    switch (oembedData.type) {
      case 'photo': {
        return renderPhoto(oembedData);
      }
      case 'video': {
        return renderVideo(oembedData);
      }
      case 'link': {
        return renderLink(oembedData, url);
      }
      case 'rich': {
        return renderRich(oembedData);
      }
      default: {
        return loadingComponent;
      }
    }
  }, [isLoading, loadingComponent, oembedData, url]);

  return (
    <BlockWithAlignableContents
      className={className}
      format={format}
      nodeKey={nodeKey}>
      <>{renderEmbed()}</>
    </BlockWithAlignableContents>
  );
}

export type SerializedOEmbedNode = Spread<
  {
    url: string;
    type: 'oembed';
    version: 1;
  },
  SerializedDecoratorBlockNode
>;

export class OEmbedNode extends DecoratorBlockNode {
  __url: string;

  static getType(): string {
    return 'oembed';
  }

  static clone(node: OEmbedNode): OEmbedNode {
    return new OEmbedNode(node.__url, node.__format, node.__key);
  }

  static importJSON(serializedNode: SerializedOEmbedNode): OEmbedNode {
    const node = $createOEmbedNode(serializedNode.url);
    node.setFormat(serializedNode.format);
    return node;
  }

  exportJSON(): SerializedOEmbedNode {
    return {
      ...super.exportJSON(),
      type: 'oembed',
      url: this.getUrl(),
      version: 1,
    };
  }

  static importDOM(): DOMConversionMap<HTMLDivElement> | null {
    return {
      div: (domNode: HTMLDivElement) => {
        if (!domNode.hasAttribute('data-lexical-oembed-url')) {
          return null;
        }
        return {
          conversion: convertOEmbedElement,
          priority: 2,
        };
      },
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('div');
    element.setAttribute('data-lexical-oembed-url', this.__url);
    return {element};
  }

  constructor(url: string, format?: ElementFormatType, key?: NodeKey) {
    super(format, key);
    this.__url = url;
  }

  getUrl(): string {
    return this.__url;
  }

  getTextContent(
    _includeInert?: boolean | undefined,
    _includeDirectionless?: false | undefined,
  ): string {
    return `https://twitter.com/i/web/status/${this.__url}`;
  }

  decorate(editor: LexicalEditor, config: EditorConfig): JSX.Element {
    const embedBlockTheme = config.theme.embedBlock || {};
    const className = {
      base: embedBlockTheme.base || '',
      focus: embedBlockTheme.focus || '',
    };
    return (
      <OEmbedComponent
        className={className}
        format={this.__format}
        loadingComponent="Loading..."
        nodeKey={this.getKey()}
        url={this.__url}
      />
    );
  }

  isTopLevel(): true {
    return true;
  }
}

export function $createOEmbedNode(url: string): OEmbedNode {
  return new OEmbedNode(url);
}

export function $isOEmbedNode(
  node: OEmbedNode | LexicalNode | null | undefined,
): node is OEmbedNode {
  return node instanceof OEmbedNode;
}
