import {
  dedupeSimilarityThreshold,
  maxCardsPerDeck,
  maxChunksForGeneration,
  passBConceptBatchSize,
} from "@/lib/constants/generation";
import {
  generateLlmText,
  getActiveLlmProvider,
  missingLlmKeyMessage,
} from "./generate-llm-text";
import { buildPassAPrompt, buildPassBBatchPrompt, parsePassAOutput, parsePassBOutput } from "./passes";
import { tonePresetOrDefault } from "./tone-presets";
import type { CardType, InsertableCard, PassAConcept, RawCard } from "./types";
import { CARD_TYPES } from "./types";
import { STALE_GENERATING_MS } from "@/lib/decks/recover-stale-generating";
import { isDuplicateFront, validateCard } from "./validator";
import type { SupabaseClient } from "@supabase/supabase-js";

function normalizeCardType(raw: string): CardType {
  const t = raw.trim().toLowerCase();
  return CARD_TYPES.includes(t as CardType) ? (t as CardType) : "definition";
}

function normalizeRawToInsertable(r: RawCard, tonePreset: string): InsertableCard | null {
  const card_type = normalizeCardType(r.card_type);
  const front = r.front?.trim() ?? "";
  const back = r.back?.trim() ?? "";
  if (!front || !back) return null;
  let difficulty = typeof r.difficulty === "number" ? Math.round(r.difficulty) : 2;
  if (difficulty < 1 || difficulty > 3) difficulty = 2;
  let importance: number | null =
    typeof r.importance === "number" ? Math.round(r.importance) : null;
  if (importance !== null && (importance < 1 || importance > 3)) importance = null;
  const v = validateCard({ ...r, card_type } as RawCard, tonePreset);
  if (!v.valid) return null;
  return {
    card_type,
    front: front.slice(0, 500),
    back: back.slice(0, 2000),
    difficulty,
    importance,
    source_page: typeof r.source_page === "number" ? r.source_page : null,
    source_hint: r.source_hint?.trim()?.slice(0, 200) ?? null,
  };
}

export type RunDeckGenerationResult =
  | { ok: true; inserted: number; skipped_invalid: number }
  | { ok: false; message: string; httpStatus?: number; detail?: string };

export async function runDeckGeneration(
  supabase: SupabaseClient,
  params: { deckId: string; userId: string },
): Promise<RunDeckGenerationResult> {
  const { deckId, userId } = params;

  const provider = getActiveLlmProvider();
  const keyMissing = missingLlmKeyMessage(provider);
  if (keyMissing) {
    return { ok: false, message: keyMissing, httpStatus: 500 };
  }

  const { data: deckRaw, error: dErr } = await supabase
    .from("decks")
    .select("id, user_id, title, tone_preset, status, updated_at")
    .eq("id", deckId)
    .eq("user_id", userId)
    .maybeSingle();

  if (dErr || !deckRaw) {
    return { ok: false, message: "Deck not found.", httpStatus: 404 };
  }

  let deck = deckRaw;

  if (deck.status === "generating") {
    const u = deck.updated_at ? new Date(deck.updated_at).getTime() : 0;
    const ageMs = u ? Date.now() - u : Number.POSITIVE_INFINITY;
    if (ageMs <= STALE_GENERATING_MS) {
      return {
        ok: false,
        message:
          "This deck is already generating. Wait a few minutes, refresh the page, or try again after it finishes.",
        httpStatus: 409,
      };
    }
    await supabase
      .from("decks")
      .update({ status: "ready", generation_error: null })
      .eq("id", deckId)
      .eq("user_id", userId);
    const { data: refreshed } = await supabase
      .from("decks")
      .select("id, user_id, title, tone_preset, status, updated_at")
      .eq("id", deckId)
      .eq("user_id", userId)
      .maybeSingle();
    if (refreshed) deck = refreshed;
    else deck = { ...deck, status: "ready" };
  }

  const allowed = new Set(["ready", "error"]);
  if (!allowed.has(deck.status)) {
    return {
      ok: false,
      message: "Deck must finish upload and extraction (status ready) before generation.",
      httpStatus: 400,
    };
  }

  const chunkLimit = maxChunksForGeneration();
  const { data: chunks, error: cErr } = await supabase
    .from("deck_chunks")
    .select("chunk_index, content")
    .eq("deck_id", deckId)
    .order("chunk_index", { ascending: true })
    .limit(chunkLimit);

  if (cErr || !chunks?.length) {
    return {
      ok: false,
      message: "No text chunks for this deck. Upload a PDF first.",
      httpStatus: 400,
    };
  }

  const hasNonemptyChunk = chunks.some((r) => (r.content?.trim() ?? "").length > 0);
  if (!hasNonemptyChunk) {
    return {
      ok: false,
      message:
        "No extractable text was found in this PDF's chunks. Use a PDF with a real text layer (export from the app where you wrote the notes), not a flat scan.",
      httpStatus: 400,
    };
  }

  const toneKey = tonePresetOrDefault(deck.tone_preset ?? "exam-crisp");
  const maxCards = maxCardsPerDeck();
  const threshold = dedupeSimilarityThreshold();
  const batchSize = passBConceptBatchSize();

  await supabase
    .from("decks")
    .update({ status: "generating", generation_error: null })
    .eq("id", deckId)
    .eq("user_id", userId);

  await supabase.from("cards").delete().eq("deck_id", deckId);

  const accepted: InsertableCard[] = [];
  const frontsLower: string[] = [];
  let skippedInvalid = 0;
  const llmErrorRef: { last: string | null } = { last: null };

  function noteLlmError(e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg) llmErrorRef.last = msg.slice(0, 500);
  }

  try {
    for (const row of chunks) {
      if (accepted.length >= maxCards) break;
      const content = row.content?.trim() ?? "";
      if (!content) continue;

      let passARaw: string;
      try {
        passARaw = await generateLlmText(buildPassAPrompt(content, toneKey));
      } catch (e) {
        noteLlmError(e);
        skippedInvalid += 1;
        continue;
      }

      const concepts = parsePassAOutput(passARaw);
      if (!concepts.length) {
        skippedInvalid += 1;
        continue;
      }

      for (let i = 0; i < concepts.length; i += batchSize) {
        if (accepted.length >= maxCards) break;
        const batch = concepts.slice(i, i + batchSize) as PassAConcept[];
        let passBRaw: string;
        try {
          passBRaw = await generateLlmText(buildPassBBatchPrompt(batch, toneKey));
        } catch (e) {
          noteLlmError(e);
          skippedInvalid += batch.length;
          continue;
        }

        const rawCards = parsePassBOutput(passBRaw);
        for (const rc of rawCards) {
          if (accepted.length >= maxCards) break;
          const normalized = normalizeRawToInsertable(rc, toneKey);
          if (!normalized) {
            skippedInvalid += 1;
            continue;
          }
          if (isDuplicateFront(normalized.front, frontsLower, threshold)) {
            skippedInvalid += 1;
            continue;
          }
          frontsLower.push(normalized.front.toLowerCase());
          accepted.push(normalized);
        }
      }
    }

    if (!accepted.length) {
      const lastApi = llmErrorRef.last;
      const apiHint = lastApi
        ? ` API: ${lastApi.slice(0, 280)}`
        : " No LLM call succeeded, or every response failed JSON/validation.";
      await supabase
        .from("decks")
        .update({
          status: "error",
          generation_error: `No valid flashcards passed validation.${apiHint}`.slice(0, 2000),
        })
        .eq("id", deckId)
        .eq("user_id", userId);
      const userMsg = lastApi
        ? "No valid flashcards were produced. The model or network may have failed — see detail."
        : "No valid flashcards were produced. The PDF text may be too thin, or every model response failed validation. Try another export or try again in a minute.";
      return {
        ok: false,
        message: userMsg,
        /** 422: deck OK but no cards passed — usually LLM/validation; not “site down”. */
        httpStatus: 422,
        detail: lastApi ? lastApi.slice(0, 400) : undefined,
      };
    }

    const rows = accepted.map((c) => ({
      deck_id: deckId,
      user_id: userId,
      card_type: c.card_type,
      front: c.front,
      back: c.back,
      difficulty: c.difficulty,
      importance: c.importance,
      source_page: c.source_page,
      source_hint: c.source_hint,
    }));

    const chunkIns = 40;
    for (let i = 0; i < rows.length; i += chunkIns) {
      const slice = rows.slice(i, i + chunkIns);
      const { error: insErr } = await supabase.from("cards").insert(slice);
      if (insErr) {
        await supabase.from("cards").delete().eq("deck_id", deckId);
        await supabase
          .from("decks")
          .update({
            status: "error",
            generation_error: "Could not save cards to the database.",
          })
          .eq("id", deckId)
          .eq("user_id", userId);
        return {
          ok: false,
          message: "Failed to save generated cards.",
          httpStatus: 500,
        };
      }
    }

    await supabase
      .from("decks")
      .update({
        status: "ready",
        generation_error: null,
      })
      .eq("id", deckId)
      .eq("user_id", userId);

    return { ok: true, inserted: accepted.length, skipped_invalid: skippedInvalid };
  } catch {
    await supabase.from("cards").delete().eq("deck_id", deckId);
    await supabase
      .from("decks")
      .update({
        status: "error",
        generation_error: "Generation failed unexpectedly.",
      })
      .eq("id", deckId)
      .eq("user_id", userId);
    return { ok: false, message: "Generation failed.", httpStatus: 500 };
  }
}
