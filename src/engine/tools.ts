// The engine's functions, for the region's gimmicks (regions/gimmick.ts). The engine's files fill it in as they load,
// since a region can't import them: it's loaded first.
import type { Tools } from '../regions/gimmick';

export const tools = {} as Tools;
export const provide = (some: Partial<Tools>) => { Object.assign(tools, some); };
