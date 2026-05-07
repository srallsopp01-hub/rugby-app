import type React from "react";

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  dateISO: string;
  readingTime: string;
  tags: string[];
  content: React.ReactNode;
};

const h2 = "text-2xl font-black uppercase text-foreground-strong mt-10 mb-4 leading-tight";
const p = "text-base leading-7 text-foreground mb-5";
const ul = "list-disc list-outside ml-5 mb-5 space-y-2";
const li = "text-base leading-7 text-foreground";
const strong = "font-semibold text-foreground-strong";
const callout = "rounded-xl border border-border bg-panel-2 p-5 mb-6";
const calloutLabel = "font-mono text-[10px] font-bold uppercase text-muted-2 mb-3";
const calloutItem = "text-sm leading-6 text-foreground";

const post1Content = (
  <>
    <p className={p}>
      If you coach rugby at club level, you already know the Sunday evening drill.
      You sit down with the video. You watch a passage of play. You rewind it.
      You watch it again to confirm what you thought you saw. You open a spreadsheet,
      type in some numbers, and try to remember whether that carry was in the first
      half or the second. An hour later you&apos;re still going, and you haven&apos;t
      even started on set piece yet.
    </p>
    <p className={p}>
      It&apos;s not that coaches don&apos;t work hard enough. It&apos;s that the tools they&apos;ve
      been handed were never built for them.
    </p>

    <h2 className={h2}>The expensive option and the DIY option</h2>
    <p className={p}>
      Professional analysis software exists. It&apos;s genuinely powerful. It&apos;s also
      priced for professional clubs — the kind with a budget, a performance
      analyst, and a dedicated film room. That&apos;s not most rugby. Most rugby is
      run by coaches who volunteer their time, pay their own expenses, and do the
      analysis at the kitchen table after everyone else has gone to bed.
    </p>
    <p className={p}>
      So clubs default to the DIY option: spreadsheets, paper notes, voice memos
      that never get transcribed. These things work well enough until you actually
      try to get something useful out of them. By the time you&apos;ve consolidated
      your notes into a format you can share with players, Monday training is
      already over.
    </p>

    <h2 className={h2}>The assumption nobody questioned</h2>
    <p className={p}>
      The assumption baked into every existing tool is that coaching analysis is
      a technical task — that you need to learn the software, tag events through
      a complex interface, and invest weeks of time before you get anything back.
    </p>
    <p className={p}>
      But coaches are sports people. They know the game. They can watch a
      passage of play and tell you immediately what happened, who did it, and
      why it mattered. That knowledge exists — it&apos;s just never been captured in
      a way that&apos;s useful.
    </p>
    <p className={p}>
      The easiest thing — the most natural thing — is to just say what you see.
    </p>

    <h2 className={h2}>Watch once. Talk through it. Done.</h2>
    <p className={p}>
      That&apos;s the premise behind FYNL Whistle. You upload the match video. You watch
      it back — which you were going to do anyway. As you watch, you hold the
      spacebar and say what you see.
    </p>
    <p className={p}>
      &quot;Walsh carry.&quot; &quot;Lineout won — throw tight.&quot; &quot;Murphy missed tackle.&quot; The
      app transcribes what you say, matches the player name against your squad, and
      logs the event with the video timestamp. You watch the game once, talking
      through it the way you&apos;d talk through it with another coach, and by the end
      the analysis has built itself.
    </p>
    <p className={p}>
      No rewinding to count carries. No scrubbing back to find timestamps. No
      learning a complex system. If you can watch rugby and describe what you see,
      you can use this.
    </p>

    <div className={callout}>
      <div className={calloutLabel}>What Monday looks like now</div>
      <ul className="space-y-2">
        {[
          "Upload video, watch once — talk through what you see",
          "Review tagged events — 2 minutes",
          "Check player grades — generated from tagged data",
          "Export .xlsx report",
          "Send to squad before training",
        ].map((step, i) => (
          <li key={step} className="flex items-center gap-3 text-sm">
            <span className="font-mono text-[10px] text-muted-2">{String(i + 1).padStart(2, "0")}</span>
            <span className={calloutItem}>{step}</span>
          </li>
        ))}
      </ul>
    </div>

    <p className={p}>
      What you get out the other end is real: tackle percentages, carry counts,
      set piece win rates, individual player grades, a full coaching plan for each
      player, and a downloadable match report. Not because you spent three hours
      building a spreadsheet — because you watched the video and described what happened.
    </p>

    <h2 className={h2}>Where we are now</h2>
    <p className={p}>
      FYNL Whistle is live with real clubs and real matches. It&apos;s
      free to use, runs entirely in your browser, and just needs a coach account
      to get started. Everything stays on your machine — no data goes anywhere.
    </p>
    <p className={p}>
      It&apos;s built for coaches at every level — club, academy, school — who know
      the game and want the analysis without the admin. If you can describe a
      rugby match, you can use it.
    </p>
  </>
);

const post2Content = (
  <>
    <p className={p}>
      After a game, most coaches give feedback that sounds something like this:
      &quot;You need to be more aggressive in the tackle.&quot; Or &quot;Your decision-making
      wasn&apos;t great today.&quot; Or the classic: &quot;You weren&apos;t at the races in the second
      half.&quot;
    </p>
    <p className={p}>
      None of these are wrong, exactly. But none of them are useful, either. By
      Tuesday, the player has filed them away alongside every other vague thing
      they&apos;ve been told since they were 14, and nothing changes.
    </p>

    <h2 className={h2}>Why vague feedback doesn&apos;t work</h2>
    <p className={p}>
      The problem with vague feedback isn&apos;t that it&apos;s too harsh or too soft —
      it&apos;s that it doesn&apos;t give the player anything to act on.
    </p>
    <p className={p}>
      &quot;Be more aggressive&quot; lands differently for every player on your squad.
      The 19-year-old who&apos;s still finding his feet hears it as a character
      critique. The experienced player who&apos;s been around forever nods along and
      wonders what you actually want from him next week. Neither of them knows
      what to do differently on Saturday.
    </p>
    <p className={p}>
      The other thing that happens with vague feedback: players push back. Not
      always out loud, but internally. &quot;You weren&apos;t aggressive enough&quot; is an
      opinion. Players know it&apos;s an opinion. And the ones who disagree — or who
      felt they did give everything — quietly dismiss it and move on.
    </p>

    <h2 className={h2}>The structure that actually sticks</h2>
    <p className={p}>
      The feedback that changes behaviour follows a simple structure:
      <br />
      <span className={strong}>Specific → Contextual → Forward-looking.</span>
    </p>

    <div className={callout}>
      <div className={calloutLabel}>Instead of this</div>
      <p className="text-sm leading-6 text-danger mb-4">&quot;You weren&apos;t aggressive enough in the tackle.&quot;</p>
      <div className={calloutLabel}>Try this</div>
      <p className="text-sm leading-6 text-foreground">
        &quot;At around 62 minutes, you came off your feet in two tackles in a row —
        both times you hit high and the ball carrier was able to offload. That&apos;s
        a pattern we&apos;ve seen a few times this season. Next week, think about
        getting your hips lower before contact. Aim to make the tackle below the
        ball carrier&apos;s waist every time.&quot;
      </p>
    </div>

    <p className={p}>
      That&apos;s the same message — tackle technique needs to improve — but now the
      player knows exactly what happened, when it happened, and what to do
      differently. That&apos;s something they can actually work on.
    </p>
    <p className={p}>
      Here&apos;s what each part is doing:
    </p>
    <ul className={ul}>
      <li className={li}>
        <span className={strong}>Specific</span> — A real moment, not a generalisation. &quot;62 minutes, two tackles in a row.&quot; Not &quot;a few times today.&quot;
      </li>
      <li className={li}>
        <span className={strong}>Contextual</span> — Why it matters. &quot;The ball carrier was able to offload.&quot; &quot;We&apos;ve seen this a few times this season.&quot; Connect the action to the outcome.
      </li>
      <li className={li}>
        <span className={strong}>Forward-looking</span> — Something to do differently. &quot;Get your hips lower before contact.&quot; One clear change, not a list.
      </li>
    </ul>

    <h2 className={h2}>A lineout example</h2>
    <p className={p}>
      Let&apos;s say you want to give feedback to your hooker on lineout throwing. The
      vague version: &quot;Your lineout throwing wasn&apos;t consistent today.&quot;
    </p>
    <p className={p}>
      The structured version: &quot;We lost the throw at 34 minutes and 71 minutes —
      both were off the back of the lineout, both went slightly short. That cost
      us field position both times. This week at training, let&apos;s spend 10 minutes
      on your back-of-the-line throws specifically. I want to see you release
      slightly higher on those.&quot;
    </p>
    <p className={p}>
      Same message. Completely different impact.
    </p>

    <h2 className={h2}>How data changes the conversation</h2>
    <p className={p}>
      One reason coaches default to vague feedback is that they don&apos;t have the
      numbers in front of them. When you&apos;re working from memory two days after the
      game, &quot;you weren&apos;t aggressive enough&quot; is about all you can offer.
    </p>
    <p className={p}>
      When you have actual data — tackle percentage, missed tackle count,
      involvement numbers — the conversation changes. You&apos;re not telling a player
      how it felt. You&apos;re showing them what happened. &quot;You made 4 tackles and
      missed 2 — that&apos;s a 67% success rate. Your season average is 84%. Two of
      the misses were in the second half, both in open play.&quot;
    </p>
    <p className={p}>
      Players push back less on numbers than they do on opinions. Not because
      numbers are always right, but because they give the conversation a concrete
      starting point. You can have a real discussion about what happened instead
      of arguing about whether the coach&apos;s perception matches the player&apos;s.
    </p>

    <h2 className={h2}>One thing to change this week</h2>
    <p className={p}>
      Before your next debrief, pick two players. For each one, find one specific
      moment from the game — something you actually remember, or can find quickly
      on the video. Then structure your feedback:
    </p>
    <ul className={ul}>
      <li className={li}><span className={strong}>Specific:</span> what happened, when</li>
      <li className={li}><span className={strong}>Contextual:</span> why it mattered</li>
      <li className={li}><span className={strong}>Forward-looking:</span> one thing to do differently</li>
    </ul>
    <p className={p}>
      That&apos;s it. Two players. One specific moment each. You don&apos;t have to overhaul
      your whole debrief process in one week. Just try the structure with two
      players and see whether it lands differently.
    </p>
    <p className={p}>
      The coaches who do this consistently — who show up with specific, evidenced
      feedback instead of general impressions — are the ones players actually
      remember. Not because they were the loudest or the most experienced, but
      because they made the player feel seen.
    </p>
  </>
);

const post3Content = (
  <>
    <p className="italic text-muted mb-5">
      Penalty count gets too much attention. Turnovers won and lost get nowhere near enough. Here&apos;s why that matters.
    </p>

    <p className={p}>
      Walk into any club rugby debrief and you&apos;ll hear the same number quoted: penalty count. &ldquo;We gave away 14 penalties today, lads.&rdquo; It&apos;s the first stat off the tongue, the first thing on the whiteboard, the easiest thing to point at when a game gets away from you.
    </p>

    <p className={p}>
      It&apos;s also one of the least useful stats you can lead a debrief with.
    </p>

    <h2 className={h2}>Why penalty count is overrated</h2>

    <p className={p}>
      Penalties are visible. They stop the game, they get whistled, they often get talked about by the referee. So they&apos;re easy to remember and easy to count. That&apos;s why coaches default to them. Not because they&apos;re the most important stat, but because they&apos;re the most available one.
    </p>

    <p className={p}>
      The problem is that penalty count without context doesn&apos;t tell you much. Fourteen penalties might be a discipline disaster, or it might be a side that pushed the breakdown hard for 80 minutes against a referee who was strict on the jackal. The number on its own can&apos;t tell those two stories apart.
    </p>

    <p className={p}>
      Worse, leading with penalty count tends to push players towards a specific kind of dressing-room reaction: defensive, individual, slightly sulky. The flanker who got pinged twice for not rolling away will hear &ldquo;14 penalties&rdquo; and think the coach is talking about him. The loosehead who got done for boring in will check out for the rest of the meeting. You haven&apos;t taught anyone anything; you&apos;ve just made a few players feel singled out.
    </p>

    <h2 className={h2}>The stat almost no one tracks</h2>

    <p className={p}>
      Now ask the same coach how many turnovers their side won. Or, harder question, how many turnovers their side conceded.
    </p>

    <p className={p}>
      Most coaches can&apos;t tell you. They might remember the obvious ones: the ball lost over the top in midfield, the intercepted pass that led to a try. But the steady drip of turnovers across 80 minutes is almost never tracked at club level. The breakdown, the tackle, the deck after a poor offload.
    </p>

    <p className={p}>
      That&apos;s a problem, because turnovers are usually the single most important stat in the game.
    </p>

    <p className={p}>A turnover does three things at once:</p>

    <ul className={ul}>
      <li className={li}>It ends your attack</li>
      <li className={li}>It hands the opposition possession</li>
      <li className={li}>
        It often hands them territory too, because the turnover usually happens when you&apos;ve committed players to the breakdown and they&apos;re now out of the defensive line
      </li>
    </ul>

    <p className={p}>
      A penalty against you costs you possession too, but at least the opposition has to do something with it. A turnover often gives them a free run at unstructured space.
    </p>

    <p className={p}>
      <strong className={strong}>
        If you only have time to track one number from a match, track turnover differential. Not penalty count.
      </strong>
    </p>

    <h2 className={h2}>Why coaches don&apos;t track it</h2>

    <p className={p}>Three reasons, all reasonable.</p>

    <p className={p}>
      First, turnovers are harder to spot than penalties. The whistle doesn&apos;t go. The game keeps moving. By the time the next phase has started, the moment is gone. So unless you&apos;re actively watching for them, you miss most of them.
    </p>

    <p className={p}>
      Second, turnovers don&apos;t fit cleanly into a spreadsheet column. A penalty is a binary thing: given away, or not. A turnover has more shape to it. Was it a poor offload? A failed jackal? A held-up over the line? A knock-on under pressure? Most coaches don&apos;t have a structure for capturing that, so they don&apos;t capture any of it.
    </p>

    <p className={p}>
      Third, and this is the one that matters: most match analysis tools are built around tagging events that get a whistle. Penalties, scores, set pieces. Turnovers fall through the cracks.
    </p>

    <h2 className={h2}>Starting without adding another spreadsheet</h2>

    <p className={p}>
      Here&apos;s the test. Watch the next match back, your own side or someone else&apos;s, doesn&apos;t matter. Every time possession changes hands without a whistle, mark it. Just a tick on a bit of paper. Don&apos;t worry about who or how, just count.
    </p>

    <p className={p}>
      Most coaches who do this for the first time are surprised by the number. A typical club match has somewhere between 8 and 18 turnovers per side. That&apos;s a lot of changes of possession that nobody is reviewing.
    </p>

    <p className={p}>
      Once you&apos;ve got the count, the next step is to capture a small amount of context. Not 10 fields per turnover, just two:
    </p>

    <ul className={ul}>
      <li className={li}>Where on the pitch did it happen?</li>
      <li className={li}>
        What kind of turnover was it (breakdown, tackle, handling error, lineout/scrum)?
      </li>
    </ul>

    <p className={p}>
      Two fields. That&apos;s enough to start finding patterns. If half your turnovers are happening in your own 22 from breakdown contests you didn&apos;t need to take, that&apos;s a coaching message. If most of them are handling errors in their own 22, that&apos;s a different message entirely.
    </p>

    <p className={p}>
      You don&apos;t need a full analysis system to do this. You can do it on paper while you watch the video back. The point isn&apos;t the tooling, it&apos;s the habit of looking.
    </p>

    <h2 className={h2}>The shift in the dressing room</h2>

    <p className={p}>
      Once you start leading debriefs with turnover differential instead of penalty count, two things change.
    </p>

    <p className={p}>
      The conversation gets less personal. &ldquo;We conceded eleven turnovers and won five&rdquo; is a team stat. Nobody feels singled out. The whole side owns it together.
    </p>

    <p className={p}>
      And the conversation gets more useful. Penalties are usually about discipline, a hard thing to coach in a 30-minute Tuesday session. Turnovers are usually about decisions and skills, both of which are very coachable. &ldquo;We&apos;re losing the ball at the breakdown when we have three forwards committed and the carrier hasn&apos;t presented&rdquo; is a problem you can run a session on. &ldquo;We gave away too many penalties&rdquo; is a problem you can only tell people to stop doing.
    </p>

    <p className={p}>
      If you&apos;re a coach trying to spend less time chasing the symptoms of a bad performance and more time fixing the causes, change which number you lead with. We built FYNL Whistle so coaches can tag turnovers as easily as penalties (same voice command, same one-second log), but you don&apos;t need our tool to start. You just need a pen, a piece of paper, and a willingness to count something different.
    </p>
  </>
);

export const blogPosts: BlogPost[] = [
  {
    slug: "the-one-stat-club-coaches-under-track",
    title: "The One Stat Club Coaches Over-Track (and the One They Under-Track)",
    description:
      "Penalty count gets too much attention in club rugby. Turnovers won and lost get nowhere near enough. Here's why, and how to start tracking turnovers properly.",
    date: "May 2026",
    dateISO: "2026-05-07",
    readingTime: "5 min read",
    tags: ["Analysis"],
    content: post3Content,
  },
  {
    slug: "what-good-coaching-feedback-looks-like",
    title: "What Good Coaching Feedback Actually Looks Like",
    description:
      "Most coaches tell players what they did wrong. The best coaches change what players do next time.",
    date: "April 2026",
    dateISO: "2026-04-26",
    readingTime: "6 min read",
    tags: ["Coaching"],
    content: post2Content,
  },
  {
    slug: "why-we-built-fynl-whistle",
    title: "Why We Built FYNL Whistle",
    description:
      "Built for sports people, not technical people. Watch the video, say what you see, get the analysis.",
    date: "April 2026",
    dateISO: "2026-04-20",
    readingTime: "5 min read",
    tags: ["Behind the build"],
    content: post1Content,
  },
];
