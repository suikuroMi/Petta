import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser, unauthorizedResponse } from '@/lib/auth';
import type { Pet } from '@/types';

const EMERGENCY_PATTERNS = [
  /seizure/i,
  /convulsion/i,
  /nangingisay/i,
  /kombulsyon/i,
  /bumubula.*bibig/i,
  /hirap\s*huminga/i,
  /difficulty\s*breathing/i,
  /not\s*breathing/i,
  /nakabuka.*bibig/i,
  /chocolate/i,
  /xylitol/i,
  /rat\s*poison/i,
  /\blason\b/i,
  /toxin/i,
  /poison/i,
  /permethrin/i,
  /bleeding/i,
  /dumudugo/i,
  /suka\s*ng\s*dugo/i,
  /collapse/i,
  /unconscious/i,
  /walang\s*malay/i,
];

function isEmergencyQuery(text: string): boolean {
  return EMERGENCY_PATTERNS.some((re) => re.test(text));
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const message = String(body.message || '').trim();
    const petId = body.pet_id ? Number(body.pet_id) : null;
    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];

    if (!message) {
      return NextResponse.json({ message: 'Message is required' }, { status: 400 });
    }

    let petContext = '';
    if (petId && Number.isInteger(petId)) {
      const db = await getDb();
      const pet = await db.get<Pet>(
        `SELECT * FROM pets WHERE pet_id = ? AND (? != 'owner' OR owner_id = ?)`,
        [petId, user.role, user.user_id]
      );
      if (pet) {
        petContext =
          `Patient Context: Name=${pet.name}, Species=${pet.species}, Breed=${pet.breed}, ` +
          `Sex=${pet.sex}, DOB=${pet.date_of_birth}, ` +
          `Weight=${pet.current_weight_kg ? `${pet.current_weight_kg} kg` : 'unknown'}, ` +
          `Allergies=${pet.allergies || 'none reported'}.`;
      }
    }

    // 1. Deterministic Safety Guardrail (runs before any LLM call)
    if (isEmergencyQuery(message)) {
      return NextResponse.json({
        urgent: true,
        source: 'petta_safety_guardrail',
        reply:
          `⚠️ URGENT VETERINARY EMERGENCY\n\n` +
          `Your message describes critical red-flag symptoms that require immediate in-person veterinary care.\n\n` +
          `Immediate safe steps:\n` +
          `1. Keep your pet calm, warm, and away from hazards—do NOT force food, water, or home remedies into their mouth.\n` +
          `2. Bring any suspected toxin/chocolate packaging with you for the veterinarian.\n` +
          `3. Proceed directly to the nearest emergency veterinary hospital or book an urgent clinic slot below.\n\n` +
          `Note: Petta AI cannot diagnose or manage medical emergencies.`,
      });
    }

    // 2. Call hosted Qwen2.5-3B + MinamiYuki1/petta-qwen2.5-3b-lora inference server
    const aiUrl = process.env.PETTA_AI_URL?.trim();
    if (!aiUrl) {
      return NextResponse.json({
        urgent: false,
        source: 'unconfigured',
        reply:
          `Your trained model (MinamiYuki1/petta-qwen2.5-3b-lora) is ready on Hugging Face, ` +
          `but PETTA_AI_URL is not configured yet in Render.\n\n` +
          `Start ai/serve_petta_colab.ipynb in Google Colab and set PETTA_AI_URL on Render to its Cloudflare Tunnel URL.`,
      });
    }

    const endpoint = aiUrl.endsWith('/chat') ? aiUrl : `${aiUrl.replace(/\/$/, '')}/chat`;

    const llmRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.PETTA_AI_SECRET
          ? { 'x-petta-secret': process.env.PETTA_AI_SECRET }
          : {}),
      },
      body: JSON.stringify({
        message,
        pet_context: petContext,
        history,
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!llmRes.ok) {
      const errText = await llmRes.text().catch(() => '');
      throw new Error(`Inference server returned ${llmRes.status}: ${errText}`);
    }

    const data = (await llmRes.json()) as { reply?: string };
    const reply = (data.reply || '').trim();

    if (!reply) {
      throw new Error('Empty response from inference server');
    }

    return NextResponse.json({
      urgent: false,
      source: 'petta_qwen2.5_3b_lora',
      reply,
    });
  } catch (error) {
    console.error('Assistant error:', error);
    return NextResponse.json(
      {
        urgent: false,
        source: 'offline',
        reply:
          'The Petta AI inference server is currently offline or timed out. ' +
          'Make sure your Colab inference cell (ai/serve_petta_colab.ipynb) is running and PETTA_AI_URL is up to date.',
      },
      { status: 200 }
    );
  }
}
