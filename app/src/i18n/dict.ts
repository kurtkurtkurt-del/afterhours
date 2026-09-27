import { common } from './parts/common';
import { home } from './parts/home';
import { tabs } from './parts/tabs';
import { pages } from './parts/pages';

// bütün sözler tek tabloda. aynı anahtar iki parçada olursa sonraki kazanır;
// bu yüzden her parça kendi ön ekini kullanır (home.* · flow.* · night.* …).
export const dict = { ...common, ...home, ...tabs, ...pages } as const;

export type Key = keyof typeof dict;
// 'x.one' + 'x.other' çifti olan anahtarların kökü: tn('x', n)
// koşullu tip ancak çıplak tip parametresinde dağılır; o yüzden iki adım
type Roots<K> = K extends `${infer Base}.other` ? Base : never;
export type CountKey = Roots<Key>;
