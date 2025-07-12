import type { JSONDocument, ILogger, NodeIO, WebIO } from '@gltf-transform/core';
import { TableFormat } from './util.js';
export declare function inspect(jsonDoc: JSONDocument, io: NodeIO | WebIO, logger: ILogger, format: TableFormat): Promise<void>;
