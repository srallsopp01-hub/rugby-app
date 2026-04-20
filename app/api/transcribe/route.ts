import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ParsedTag = {
  normalized_text: string;
  player: string | null;
  action: "tackle" | "missed tackle" | "carry" | "turnover" | "unknown";
  confidence: "high" | "medium" | "low";
  should_keep: boolean;
  candidate_players: string[];
};

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const audio = formData.get("audio");
    const playersRaw = formData.get("players");

    if (!audio || !(audio instanceof File)) {
      return NextResponse.json(
        { error: "No audio file received" },
        { status: 400 }
      );
    }

    const players =
      typeof playersRaw === "string"
        ? playersRaw
            .split("\n")
            .map((p) => p.trim())
            .filter(Boolean)
        : [];

    const transcription = await client.audio.transcriptions.create({
      file: audio,
      model: "whisper-1",
    });

    const rawText = transcription.text?.trim() || "";

    if (!rawText) {
      return NextResponse.json({ text: "", rawText: "" });
    }

    const interpretation = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "developer",
          content: `
You clean up short rugby voice tags.

Use ONLY the provided player list.
Return valid JSON only.

Allowed actions:
- tackle
- missed tackle
- carry
- turnover
- unknown

Rules:
1. Prefer exact player names from the roster.
2. Correct obvious action mistakes:
   - tuckle => tackle
   - mistackle => missed tackle
   - miss tackle => missed tackle
   - carey => carry
3. If player and action are reasonably clear, confidence can be high or medium.
4. If action is clear but player is uncertain, set player to null and confidence to low.
5. candidate_players must only contain names from the roster.
6. Do NOT invent players not in the roster.
7. normalized_text should be:
   - "<Player> <action>" if both are known
   - "<action>" if only action is known
   - otherwise a cleaned best guess
8. should_keep should be true if this looks like a possible rugby event and false if it looks like junk.

Examples:

Transcript: "Ruby Tuckle"
Return:
{
  "normalized_text": "Ruby tackle",
  "player": "Ruby",
  "action": "tackle",
  "confidence": "high",
  "should_keep": true,
  "candidate_players": ["Ruby"]
}

Transcript: "Marion Carey"
Return:
{
  "normalized_text": "Marion carry",
  "player": "Marion",
  "action": "carry",
  "confidence": "medium",
  "should_keep": true,
  "candidate_players": ["Marion"]
}

Transcript: "Ali mistackle"
Roster: ["Ruby","Ellie","Marion"]
Return:
{
  "normalized_text": "missed tackle",
  "player": null,
  "action": "missed tackle",
  "confidence": "low",
  "should_keep": true,
  "candidate_players": ["Ellie","Marion"]
}

Transcript: "Maria and Terry"
Return:
{
  "normalized_text": "Maria and Terry",
  "player": null,
  "action": "unknown",
  "confidence": "low",
  "should_keep": false,
  "candidate_players": []
}
          `.trim(),
        },
        {
          role: "user",
          content: JSON.stringify({
            transcript: rawText,
            players,
          }),
        },
      ],
    });

    const content = interpretation.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json({
        text: rawText,
        rawText,
      });
    }

    const parsed = JSON.parse(content) as ParsedTag;

    let finalText = rawText;

    if (parsed.should_keep) {
      if (parsed.player && parsed.action !== "unknown") {
        finalText = `${parsed.player} ${parsed.action}`;
      } else if (!parsed.player && parsed.action !== "unknown") {
        finalText = parsed.action;
      } else if (parsed.normalized_text?.trim()) {
        finalText = parsed.normalized_text.trim();
      }
    }

    return NextResponse.json({
      text: finalText,
      rawText,
      parsed,
    });
  } catch (error: any) {
    console.error("Transcription error full:", error);

    return NextResponse.json(
      {
        error: error?.message || "Failed to transcribe audio",
      },
      { status: 500 }
    );
  }
}