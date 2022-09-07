/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$insertBlockNode} from '@lexical/utils';
import {COMMAND_PRIORITY_EDITOR, createCommand, LexicalCommand} from 'lexical';
import {useEffect} from 'react';

import {$createOEmbedNode, OEmbedNode} from '../../nodes/OEmbedNode';

export const INSERT_OEMBED_COMMAND: LexicalCommand<string> = createCommand();

export default function OEmbedPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([OEmbedNode])) {
      throw new Error('OEmbedPlugin: OEmbedNode not registered on editor');
    }

    return editor.registerCommand<string>(
      INSERT_OEMBED_COMMAND,
      (payload) => {
        const oembedNode = $createOEmbedNode(payload);
        $insertBlockNode(oembedNode);

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}
