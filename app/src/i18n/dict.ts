import { common } from './parts/common';
import { home } from './parts/home';
import { tabs } from './parts/tabs';
import { pages } from './parts/pages';
import { staff } from './parts/staff';
import { tips } from './parts/tips';
import { groups } from './parts/groups';
import { posts } from './parts/posts';

// Every string in one table. When a key appears in two parts the later wins,
// so each part uses its own prefix (home.* · flow.* · night.* …).
export const dict = { ...common, ...home, ...tabs, ...pages, ...staff, ...tips, ...groups, ...posts } as const;

export type Key = keyof typeof dict;
// Root of keys that have an 'x.one' + 'x.other' pair: tn('x', n).
// Conditional types only distribute over a naked type parameter, hence two steps.
type Roots<K> = K extends `${infer Base}.other` ? Base : never;
export type CountKey = Roots<Key>;
