---
status: reference
last_verified: 2026-08-08
---

# Dasha quiz research

Reference for the prepared, unpublished branching quiz.

## Product decision

The quiz uses Demigod's useful Typeform-like pattern—one large question, honest progress, large answer targets,
number-key shortcuts and reduced-motion support—without importing its site code. The scored path is 12 steps:
one route choice, five lane questions and six shared questions. Its 11 scored answers normalize to 60 points.
The full 20-step bank remains available only as an unscored practice replay.

The four lanes are cinema, podcast/internet lore, public-post memory and the `$dasha` project. The Worker stores
the active attempt and returns only the current public question. It never sends the answer or branch graph to the
browser. Completion, not X OAuth alone, enrolls the account on the Board. Sharing remains an explicit X intent.

## Sources used

- [Kim's Video / Letterboxd interview](https://letterboxd.com/kimsvideo/story/dasha-nekrasova-visits-kims-video-collection/): early horror interest, video-store work and the *Mystery Science Theater 3000* anecdote.
- [Criterion's Berlinale lineup](https://www.criterion.com/current/posts/7281-berlinale-2021-lineup): *The Scary of Sixty-First* as her first feature and its apartment premise.
- [Los Angeles Times interview](https://www.latimes.com/entertainment-arts/movies/story/2021-03-02/scary-of-sixty-first-jeffrey-epstein-conspiracy-dasha-nekrasova): the Kubrick influence.
- [Screen Daily interview](https://www.screendaily.com/features/word-of-mouth-succession-actress-dasha-nekrasova-im-not-allowed-to-shitpost-anymore/5168430.article): Madeline Quinn, Comfry and filmmaking through instinct and the subconscious.
- [Interview Magazine](https://www.interviewmagazine.com/film/dasha-nekrasova-softness-of-bodies-amazon): the David Letterman ambition and first USC student-film role.
- [Red Scare's own feed](https://redscarepodcast.libsyn.com/summer-dress-sadness): show name, co-host, cultural-commentary label and its deadpan host description.
- [@dash_eats](https://x.com/dash_eats): canonical public-post account; exact coin and timeline lines are recorded in `docs/X-RESEARCH-DASHA-2026-08-08.md`.
- [getdasha.com](https://www.getdasha.com/): current project facts, safety language, Board rules and Studio/Lobby behavior.
- [ComingSoon interview](https://www.comingsoon.net/movies/features/1205998-dasha-nekrasova-scary-of-sixty-first-interview):
  *The Tenant* as the clearest storytelling reference; affection for *Hellraiser*, *Nightmare on Elm Street* and
  *Texas Chainsaw Massacre*; and the playful irony of horror sequels.
- [Max Raskin interview](https://www.maxraskin.com/interviews/dasha-nekrasova): *The Exorcist* or *Rosemary's Baby*
  as favorite scary-film answers and the childhood VHS story. These are good reserve questions because they are
  first-person, specific and reveal taste rather than private information.

Questions deliberately avoid inferred private facts and contentious biographical trivia. Source links support the
answer explanations but are not themselves proof of endorsement.

## Fun and sharing research

The implementation favors identity, feedback and a strong ending over timers or noisy game chrome:

- A peer-reviewed analysis of viral online quizzes describes their results as compact, shareable online identities.
  The result tiers therefore use names a player can comfortably claim rather than a generic percentage.
- Gamification reviews consistently identify immediate feedback, points, quizzes, badges, leaderboards and visible
  progress as common engagement elements. The quiz already has the useful subset; adding all of them again would
  make it busier without creating a better joke.
- Research on game feedback favors specific feedback close to the action. Each answer gets a short factual reveal,
  not merely a red or green state.
- Qualtrics warns that progress becomes misleading when branch lengths vary. Every Dasha route is the same length,
  so `N of 20` remains honest.
- Mobile survey guidance cautions against long lists and heavy scrolling. The interface keeps one question and three
  concise answers on screen.

Sources: [Berberick & McAllister (2016)](https://ijoc.org/index.php/ijoc/article/viewFile/5265/1718),
[Frontiers gamification review (2022)](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.1030790/full),
[Gaming science and immediate feedback](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2013.00607/full),
[Qualtrics branch logic](https://www.qualtrics.com/support/survey-platform/survey-module/survey-flow/standard-elements/branch-logic/), and
[Qualtrics drop-off guidance](https://www.qualtrics.com/blog/4-tips-for-preventing-drop-offs-in-surveys/).

## Result-card suite

Five result tiers now select five different public Dasha photographs and exact sourced lines. The card preserves the
original photo, adds the quote, score, result title, linked handle and `getdasha.com`, and renders at 1200×675. On
supporting mobile browsers the native share sheet receives the PNG. The desktop fallback downloads the PNG and opens
an X Web Intent; X Web Intents cannot pre-attach a local image.

| Result | Caption | Source post |
|---|---|---|
| Dasha scholar | “It’s time $dasha” | [2085544531739754651](https://x.com/dash_eats/status/2085544531739754651) |
| Confirmed simp | “How u crying at the casino and u can’t even get in” | [2085405075686801789](https://x.com/dash_eats/status/2085405075686801789) |
| Deep in the lore | “It’s time this time” | [2085524407225884699](https://x.com/dash_eats/status/2085524407225884699) |
| Watching respectfully | “Did you buy my coin” | [2008730208350990657](https://x.com/dash_eats/status/2008730208350990657) |
| Dasha curious | “It’s an old coin and Im not the dev” | [2085532923063853316](https://x.com/dash_eats/status/2085532923063853316) |

The source photographs come from public `@dash_eats` posts/profile media or the established PerryALPHA Dasha-photo
series recorded in `docs/X-RESEARCH-DASHA-IMAGES-2026-08-08.md`. No synthetic face or body alteration is used.

## Audit pass

The 2026-08-08 audit removed six administrative questions about OAuth, attempt limits, point totals, sharing,
licensing and editorial ranking from the shared path. They were accurate but made the quiz feel like documentation.
The replacements cover her horror taste, *The Tenant*, a favorite sequel, growing up near Las Vegas, teenage message
boards and the unusual premise of her first student film. Essential mint verification, canonical-account and risk
questions remain.

The audit also fixed three implementation defects:

- feedback now owns its own screen with a source and Continue action instead of appearing under the next question;
- cancelling a native share no longer opens X as an error fallback;
- correct choices are distributed across positions instead of making repeated `1` guesses disproportionately useful.

New structural tests require 44 unique sourced prompts, four distinct 20-step practice routes, valid choice/answer shapes,
all five score-title boundaries and no route with more than eight correct answers in one button position.

## Result identity and preview

The opening route now survives into the result as a second identity axis: Cinema obsessive, Podcast casualty,
Timeline archaeologist or `$dasha` operator. A result can therefore read “Confirmed simp · Timeline archaeologist”
instead of reducing the player to a score alone.

Sharing now begins with the rendered card preview. The player can Share, Save, cycle through Another photo, or close
with Done. The quote remains tied to the score tier while the photograph can change. The card URL is revoked when
replaced or closed so repeated previews do not accumulate browser object URLs.

Completed players can replay every path for fun without replacing their scored result or adding leaderboard points.
The existing Worker also keeps four anonymous aggregate counters—starts, completions, replays and share attempts—so
completion and sharing can be evaluated without storing an event stream or attaching metrics to an X identity.

## Final product pass

The scored cut now starts without OAuth and asks for X only after the final answer, before revealing or saving the
result. Anonymous attempts use short-lived opaque bearer IDs; stale attempts are pruned, mutations require an allowed
site origin, and the browser still never receives the answer graph. Feedback auto-advances after 1.2 seconds with a
Pause control and short voice leads such as “Fake lore” or “Correct. Unfortunate level of recall.” The final answer
gets the same feedback treatment instead of being skipped.

Each scored lane includes one locally served visual question. Approved quiz/card photographs are packaged with the
Worker assets rather than fetched from X during play. Completed scored attempts receive an opaque permanent result
URL with score, lane, Open Graph metadata, a local large image and a “Beat this score” challenge link; no X identifier
or answer history is stored in the public result record.

Aggregate analytics now include question reach, answer distribution, lane, result tier and coarse elapsed-time
buckets in addition to starts, completions, replays and share attempts. Values are counters only, validated against
the fixed question/lane/tier sets, and are not keyed to an account.
