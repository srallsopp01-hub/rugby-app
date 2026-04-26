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
      You know the pattern. Match ends around 5pm. You&apos;re home by 7. You eat
      something, spend some time with the family, and then — somewhere around 9
      or 10pm — you open the laptop.
    </p>
    <p className={p}>
      You&apos;ve got rough notes. A few lines on your phone from halftime. Some
      mental notes you were going to write up after the game but didn&apos;t because
      the changing room was chaos and then you got pulled into a conversation with
      a parent. A couple of things you know happened but can&apos;t quite pin to a
      player or a timestamp.
    </p>
    <p className={p}>
      And for the next two or three hours, you rebuild the match from memory.
    </p>

    <h2 className={h2}>What we tried first</h2>
    <p className={p}>
      We tried everything the coaching community uses. Clipboards and paper —
      fine during the game, completely useless by Monday. Excel spreadsheets —
      powerful if you can keep them updated in real time, which nobody can while
      also watching the game and making substitution calls. Video analysis apps —
      mostly built for elite academies or imported from football and basketball,
      with no concept of what a lineout call is or why you&apos;d care about a
      carries-per-involvement stat.
    </p>
    <p className={p}>
      The WhatsApp-note-to-yourself approach. The voice memo you never transcribed.
      The spreadsheet you built two seasons ago and keep meaning to update.
    </p>
    <p className={p}>
      None of it solved the fundamental problem: the data didn&apos;t exist in a
      useful form until you sat down and created it after the fact.
    </p>

    <h2 className={h2}>The moment we knew</h2>
    <p className={p}>
      There was a specific Tuesday evening that made us build this properly.
      It was late. The match report was already a day overdue. And I was rewinding
      the same passage of play for the third time trying to confirm whether Walsh
      had made 3 carries or 4. Report due at 8am. Twenty-two players to grade.
      Confident numbers on maybe eight of them.
    </p>
    <p className={p}>
      The rest was guesswork dressed up as analysis.
    </p>
    <p className={p}>
      That&apos;s the bit that gets you. It&apos;s not that the work is hard — it&apos;s
      that you spend hours reconstructing something that should already exist. The
      game happened. You were there. But the data didn&apos;t get captured, so now
      you&apos;re forensically rebuilding it from a 90-minute video and some notes
      on your phone.
    </p>

    <h2 className={h2}>What RugbyCoach does instead</h2>
    <p className={p}>
      The premise is simple: tag live, review later, ship Monday morning.
    </p>
    <p className={p}>
      During the game, you hold the spacebar and say what you see. &quot;Walsh carry.&quot;
      &quot;Lineout won throw tight.&quot; &quot;Murphy missed tackle.&quot; The app transcribes it,
      matches the player name against your squad, and logs the event with a
      timestamp. Eyes on the pitch the whole time.
    </p>
    <p className={p}>
      After the game, you open the film review screen. Your tagged events are
      there, sorted by timestamp, already linked to the video. You can add coaching
      notes, mark clips for the team meeting, and export a full match report —
      grades, set piece stats, player output, the lot — as a spreadsheet.
    </p>

    <div className={callout}>
      <div className={calloutLabel}>What Monday looks like now</div>
      <ul className="space-y-2">
        {[
          "Open saved match",
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
      It&apos;s not magic. You still need to watch the game. You still need to coach.
      But the admin — the Sunday evening spreadsheet rebuilding — mostly disappears.
    </p>

    <h2 className={h2}>Where we are now</h2>
    <p className={p}>
      RugbyCoach is in active private beta with real clubs and real matches. It&apos;s
      free to use while in beta, runs entirely in your browser, and doesn&apos;t
      require an account or any installation. Everything stays on your machine —
      no data goes anywhere until we build cloud sync, which is on the roadmap for
      when the core experience is proven.
    </p>
    <p className={p}>
      It&apos;s desktop-first, built for the laptop in the film room. If you coach at
      any level — club, academy, school — and you recognise the Sunday evening
      problem, it&apos;s worth a look.
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

export const blogPosts: BlogPost[] = [
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
    slug: "why-we-built-rugbycoach",
    title: "Why We Built RugbyCoach",
    description:
      "The Sunday-evening spreadsheet problem that made us build this.",
    date: "April 2026",
    dateISO: "2026-04-20",
    readingTime: "5 min read",
    tags: ["Behind the build"],
    content: post1Content,
  },
];
