// Posts (the yours tab, post/new, the past feed) are off in what ships: the tab has
// been hidden since 12.10.2026 and the owner decided on 20.10.2026 (F26) to take the
// rest down with it rather than find it a new home. The code stays; the two screens
// redirect, the setting is not shown, and 81_posts_off.sql keeps the pushes from
// leaving. Flip to true to bring it all back.
export const POSTS_ON = false;

// Every city's record under cities on the owner's account while the records are new
// (22.10.2026): development builds only; what ships lists the cities you have been to.
export const ALL_CITY_RECORDS = __DEV__;
