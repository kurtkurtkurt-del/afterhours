# Onboarding E: bubbles and stickers (kept for later)

The owner chose design C (afterhours writes to you, as a chat) for the screen after sign up
on 28.10.2026, and asked to keep design E as a note for the future. The working prototype is
`prototypes/onboard-feed.html`, the fifth phone ("E · kabarcıklar ve çıkartmalar").

## The idea

A dark, night-feeling onboarding that plays like a small game instead of a form.

1. **Pop three.** The interests float on the dark ground as soft bubbles of three sizes, drifting
   slowly up and down. Tapping one turns it red and lifts it a little. On the third, the others
   pop and vanish one after another (40 ms apart), and the next step slides in.
2. **How do you browse?** The three looks (swipe, poster, classic) as big dark cards. Tapping one
   shows a small live preview of it above, drawn with the photos of the interests just picked,
   and a "use poster" button to take it.
3. **Stick your sparks on.** The spark kinds as stickers, each tilted a few degrees either way. A
   picked sticker straightens up, grows a little and turns gold.
4. **Add a friend?** Optional, with the small map: you in the middle, the friend you add linked to
   you, their own people as dim dots around them. Each add brightens the map. "later" skips.
5. **Ready.** "tonight, for you." and the feed drawn from the choices.

## Why it was kept, not chosen

- It is the most playful and the strongest night mood, but it asks for more taps than C.
- The rest of the app sits on a light ground. E is dark, so it would read as a different app on
  the first screen.

## If it comes back

- The steps and the saving are the same as in C (`app/src/app/onboard.tsx`): only the screens
  differ. The look goes to `flow.view` (`setFlowView` in `components/FlowViews.tsx`), and the
  friends become friend requests (`friendRequest`).
- The interests and sparks steps are not in the app today: the owner asked for friends and the
  look only. They are in the prototype; storing them needs a place on the account first (a new
  table with its own access rules: a heavy-risk change under `.claude/prompts/hat.md`).
- The bubbles float with a CSS keyframe in the prototype. In the app use Reanimated
  (`withRepeat(withTiming(...))`), one shared value per bubble, and stop them once the step is gone.
